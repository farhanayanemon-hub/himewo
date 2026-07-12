import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import {
  getCurrentUser,
  syncProfile,
  type Profile,
} from "@workspace/api-client-react";
import "./api";
import {
  supabase,
  isSupabaseConfigured,
  DEV_USERS,
  getDevUserId,
  setDevUserId,
  clearDevUserId,
  type DevUser,
} from "./supabase";

interface SignUpArgs {
  email: string;
  password: string;
  username: string;
  displayName: string;
}

export interface WizardProfileArgs {
  firstName: string;
  lastName: string;
  gender: "male" | "female";
  birthday: string; // YYYY-MM-DD
  country?: string; // ISO alpha-2
  email?: string;
  phone?: string;
}

export type PasswordSignInResult =
  | { mfaRequired: false }
  | { mfaRequired: true; factorId: string };

export interface TotpFactorInfo {
  id: string;
  status: "verified" | "unverified";
}

export interface TotpEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
  uri: string;
}

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  supabaseEnabled: boolean;
  devUsers: DevUser[];
  signInWithEmail: (
    email: string,
    password: string,
  ) => Promise<PasswordSignInResult>;
  signInWithPhonePassword: (
    phone: string,
    password: string,
  ) => Promise<PasswordSignInResult>;
  /** Complete an MFA-gated login with a 6-digit authenticator code. */
  verifyTotpForLogin: (factorId: string, code: string) => Promise<void>;
  /** Abort an MFA-gated login (drops the half-authenticated session). */
  cancelMfaLogin: () => Promise<void>;
  listTotpFactors: () => Promise<TotpFactorInfo[]>;
  enrollTotp: () => Promise<TotpEnrollment>;
  verifyTotpEnrollment: (factorId: string, code: string) => Promise<void>;
  unenrollTotp: (factorId: string, code: string) => Promise<void>;
  signUpWithEmail: (args: SignUpArgs) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>;
  /** Signup wizard: suppress the auto profile-sync fallback while active. */
  setWizardActive: (active: boolean) => void;
  sendEmailOtp: (email: string) => Promise<void>;
  /** Password reset: only sends the OTP when the account already exists. */
  sendResetEmailOtp: (email: string) => Promise<void>;
  sendResetPhoneOtp: (phone: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  verifyPhoneOtpNoSync: (phone: string, token: string) => Promise<void>;
  setPassword: (password: string) => Promise<void>;
  completeWizardSignup: (args: WizardProfileArgs) => Promise<void>;
  signInAsDevUser: (id: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function parseAuthUrl(url: string): {
  params: Record<string, string>;
  errorMessage: string | null;
} {
  const params: Record<string, string> = {};
  const hashIndex = url.indexOf("#");
  const queryIndex = url.indexOf("?");
  const fragment = hashIndex >= 0 ? url.slice(hashIndex + 1) : "";
  const query =
    queryIndex >= 0
      ? url.slice(queryIndex + 1, hashIndex >= 0 ? hashIndex : undefined)
      : "";

  for (const segment of [query, fragment]) {
    if (!segment) continue;
    for (const pair of segment.split("&")) {
      const [rawKey, rawValue] = pair.split("=");
      if (!rawKey) continue;
      params[decodeURIComponent(rawKey)] = decodeURIComponent(rawValue ?? "");
    }
  }

  return {
    params,
    errorMessage: params.error_description || params.error || null,
  };
}

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}

// A session on a 2FA-enabled account that never passed the TOTP step is only
// half-authenticated (AAL1). If such a session is restored (app restart after
// entering the password but before the code) or produced by a non-password
// login path, drop it instead of treating the user as logged in.
// Returns true when the session satisfies its required assurance level.
async function ensureFullAssurance(
  sb: NonNullable<typeof supabase>,
): Promise<boolean> {
  const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
  if (aal && aal.currentLevel !== "aal2" && aal.nextLevel === "aal2") {
    await sb.auth.signOut();
    return false;
  }
  return true;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingProfile = useRef<SignUpArgs | null>(null);
  const wizardActive = useRef(false);
  // True between a password sign-in and the TOTP verification for accounts
  // with two-factor auth — suppresses the auto-login in onAuthStateChange so
  // the app doesn't treat the half-authenticated (AAL1) session as logged in.
  const mfaPending = useRef(false);

  const loadUser = useCallback(async () => {
    try {
      const me = await getCurrentUser();
      setUser(me);
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      if (isSupabaseConfigured && supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          // Refuse to restore a half-authenticated (password-only) session on
          // a 2FA account — restarting mid-challenge must not bypass the code.
          if (await ensureFullAssurance(supabase)) {
            await loadUser();
          }
        }
        if (active) setLoading(false);

        const { data: sub } = supabase.auth.onAuthStateChange(
          async (_event, session) => {
            if (!session) {
              setUser(null);
              return;
            }
            // During the signup wizard the wizard itself syncs the profile
            // with the full field set — skip the fallback sync so we don't
            // create a half-empty profile from the email prefix.
            if (wizardActive.current || mfaPending.current) return;
            const pending = pendingProfile.current;
            if (pending && session.user) {
              try {
                await syncProfile({
                  id: session.user.id,
                  username: pending.username,
                  displayName: pending.displayName,
                  email: pending.email,
                });
              } catch {
                // profile may already exist; ignore
              }
              pendingProfile.current = null;
            } else if (session.user) {
              try {
                await getCurrentUser();
              } catch {
                const meta = session.user.user_metadata ?? {};
                const fallbackName =
                  (meta.full_name as string) ||
                  (meta.name as string) ||
                  session.user.email?.split("@")[0] ||
                  "New User";
                const fallbackUsername = (
                  session.user.email?.split("@")[0] ||
                  `user${session.user.id.slice(0, 8)}`
                ).replace(/[^a-zA-Z0-9_]/g, "");
                try {
                  await syncProfile({
                    id: session.user.id,
                    username: fallbackUsername,
                    displayName: fallbackName,
                    email: session.user.email ?? undefined,
                  });
                } catch {
                  // ignore
                }
              }
            }
            await loadUser();
          },
        );

        return () => sub.subscription.unsubscribe();
      }

      // Dev mode (no Supabase): restore selected seeded user.
      const devId = await getDevUserId();
      if (devId) {
        await loadUser();
      }
      if (active) setLoading(false);
      return undefined;
    }

    const cleanupPromise = bootstrap();
    return () => {
      active = false;
      void cleanupPromise.then((fn) => fn?.());
    };
  }, [loadUser]);

  // After a password sign-in: if the account has a verified TOTP factor and
  // the session is still AAL1, keep the login gated and hand the factor id
  // back to the login form so it can ask for the 6-digit code.
  const finishPasswordSignIn = useCallback(async (): Promise<PasswordSignInResult> => {
    const sb = requireSupabase();
    const { data: aal } = await sb.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.currentLevel !== "aal2" && aal.nextLevel === "aal2") {
      const { data: factors } = await sb.auth.mfa.listFactors();
      const totp = (factors?.all ?? []).find(
        (f) => f.factor_type === "totp" && f.status === "verified",
      );
      if (totp) return { mfaRequired: true, factorId: totp.id };
    }
    mfaPending.current = false;
    await loadUser();
    return { mfaRequired: false };
  }, [loadUser]);

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<PasswordSignInResult> => {
      const sb = requireSupabase();
      mfaPending.current = true;
      try {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return await finishPasswordSignIn();
      } catch (e) {
        mfaPending.current = false;
        throw e;
      }
    },
    [finishPasswordSignIn],
  );

  const signInWithPhonePassword = useCallback(
    async (phone: string, password: string): Promise<PasswordSignInResult> => {
      const sb = requireSupabase();
      mfaPending.current = true;
      try {
        const { error } = await sb.auth.signInWithPassword({ phone, password });
        if (error) throw error;
        return await finishPasswordSignIn();
      } catch (e) {
        mfaPending.current = false;
        throw e;
      }
    },
    [finishPasswordSignIn],
  );

  const verifyTotpForLogin = useCallback(
    async (factorId: string, code: string) => {
      const sb = requireSupabase();
      const { data: challenge, error: challengeError } =
        await sb.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error } = await sb.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (error) throw error;
      mfaPending.current = false;
      await loadUser();
    },
    [loadUser],
  );

  const cancelMfaLogin = useCallback(async () => {
    const sb = requireSupabase();
    await sb.auth.signOut();
    mfaPending.current = false;
    setUser(null);
  }, []);

  const listTotpFactors = useCallback(async (): Promise<TotpFactorInfo[]> => {
    const sb = requireSupabase();
    const { data, error } = await sb.auth.mfa.listFactors();
    if (error) throw error;
    return (data?.all ?? [])
      .filter((f) => f.factor_type === "totp")
      .map((f) => ({
        id: f.id,
        status: f.status === "verified" ? "verified" : "unverified",
      }));
  }, []);

  const enrollTotp = useCallback(async (): Promise<TotpEnrollment> => {
    const sb = requireSupabase();
    // Clean up abandoned enrollments first — a stale unverified factor would
    // otherwise make the new enroll fail with a friendly-name conflict.
    const { data: existing } = await sb.auth.mfa.listFactors();
    for (const f of existing?.all ?? []) {
      if (f.factor_type === "totp" && f.status !== "verified") {
        await sb.auth.mfa.unenroll({ factorId: f.id });
      }
    }
    const { data, error } = await sb.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Authenticator app",
    });
    if (error) throw error;
    return {
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    };
  }, []);

  const verifyTotpEnrollment = useCallback(
    async (factorId: string, code: string) => {
      const sb = requireSupabase();
      const { data: challenge, error: challengeError } =
        await sb.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error } = await sb.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (error) throw error;
    },
    [],
  );

  const unenrollTotp = useCallback(
    async (factorId: string, code: string) => {
      const sb = requireSupabase();
      // Disabling requires a valid current code: verify it first (this also
      // raises the session to AAL2, which unenroll of a verified factor needs).
      const { data: challenge, error: challengeError } =
        await sb.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await sb.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code,
      });
      if (verifyError) throw verifyError;
      const { error } = await sb.auth.mfa.unenroll({ factorId });
      if (error) throw error;
    },
    [],
  );

  const signUpWithEmail = useCallback(
    async (args: SignUpArgs) => {
      const sb = requireSupabase();
      pendingProfile.current = args;
      const { data, error } = await sb.auth.signUp({
        email: args.email,
        password: args.password,
        options: {
          data: { full_name: args.displayName, username: args.username },
        },
      });
      if (error) {
        pendingProfile.current = null;
        throw error;
      }
      if (data.session && data.user) {
        try {
          await syncProfile({
            id: data.user.id,
            username: args.username,
            displayName: args.displayName,
            email: args.email,
          });
        } catch {
          // ignore
        }
        pendingProfile.current = null;
        await loadUser();
      }
    },
    [loadUser],
  );

  const signInWithGoogle = useCallback(async () => {
    const sb = requireSupabase();

    if (Platform.OS === "web") {
      const { error } = await sb.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: Linking.createURL("/") },
      });
      if (error) throw error;
      return;
    }

    const redirectTo = Linking.createURL("/");
    const { data, error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data.url) throw new Error("Could not start Google sign-in.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) return;

    const { params, errorMessage } = parseAuthUrl(result.url);
    if (errorMessage) throw new Error(errorMessage);

    const accessToken = params.access_token;
    const refreshToken = params.refresh_token;
    if (accessToken && refreshToken) {
      const { error: sessionError } = await sb.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
      if (sessionError) throw sessionError;
      if (!(await ensureFullAssurance(sb))) {
        throw new Error(
          "This account has two-factor authentication turned on. Log in with your password and authenticator code instead.",
        );
      }
      await loadUser();
    }
  }, [loadUser]);

  const sendPhoneOtp = useCallback(async (phone: string) => {
    const sb = requireSupabase();
    const { error } = await sb.auth.signInWithOtp({ phone });
    if (error) throw error;
  }, []);

  const verifyPhoneOtp = useCallback(
    async (phone: string, token: string) => {
      const sb = requireSupabase();
      const { error } = await sb.auth.verifyOtp({ phone, token, type: "sms" });
      if (error) throw error;
      if (!(await ensureFullAssurance(sb))) {
        throw new Error(
          "This account has two-factor authentication turned on. Log in with your password and authenticator code instead.",
        );
      }
      await loadUser();
    },
    [loadUser],
  );

  const setWizardActive = useCallback((active: boolean) => {
    wizardActive.current = active;
  }, []);

  const sendEmailOtp = useCallback(async (email: string) => {
    const sb = requireSupabase();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
  }, []);

  const sendResetEmailOtp = useCallback(async (email: string) => {
    const sb = requireSupabase();
    const { error } = await sb.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    if (error) throw error;
  }, []);

  const sendResetPhoneOtp = useCallback(async (phone: string) => {
    const sb = requireSupabase();
    const { error } = await sb.auth.signInWithOtp({
      phone,
      options: { shouldCreateUser: false },
    });
    if (error) throw error;
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    const sb = requireSupabase();
    const { error } = await sb.auth.verifyOtp({ email, token, type: "email" });
    if (error) throw error;
  }, []);

  // Wizard phone verify: creates the session but does NOT load the user, so
  // the wizard can finish password + profile steps before the app redirects.
  const verifyPhoneOtpNoSync = useCallback(
    async (phone: string, token: string) => {
      const sb = requireSupabase();
      const { error } = await sb.auth.verifyOtp({ phone, token, type: "sms" });
      if (error) throw error;
    },
    [],
  );

  const setPassword = useCallback(async (password: string) => {
    const sb = requireSupabase();
    const { error } = await sb.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const completeWizardSignup = useCallback(async (args: WizardProfileArgs) => {
    const sb = requireSupabase();
    const { data } = await sb.auth.getUser();
    if (!data.user) throw new Error("Not signed in yet.");
    const displayName = `${args.firstName} ${args.lastName}`.trim();
    const username = `${args.firstName}.${args.lastName}`
      .toLowerCase()
      .replace(/[^a-z0-9._]/g, "");
    await syncProfile({
      id: data.user.id,
      username: username || "user",
      displayName,
      firstName: args.firstName,
      lastName: args.lastName,
      gender: args.gender,
      birthday: args.birthday,
      country: args.country,
      email: args.email ?? data.user.email ?? undefined,
      phone: args.phone ?? (data.user.phone || undefined),
    });
    wizardActive.current = false;
  }, []);

  const signInAsDevUser = useCallback(
    async (id: string) => {
      await setDevUserId(id);
      await loadUser();
    },
    [loadUser],
  );

  const refreshUser = useCallback(async () => {
    await loadUser();
  }, [loadUser]);

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    await clearDevUserId();
    setUser(null);
  }, []);

  const value: AuthContextValue = {
    user,
    loading,
    isAuthenticated: user !== null,
    supabaseEnabled: isSupabaseConfigured,
    devUsers: DEV_USERS,
    signInWithEmail,
    signInWithPhonePassword,
    verifyTotpForLogin,
    cancelMfaLogin,
    listTotpFactors,
    enrollTotp,
    verifyTotpEnrollment,
    unenrollTotp,
    signUpWithEmail,
    signInWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
    setWizardActive,
    sendEmailOtp,
    sendResetEmailOtp,
    sendResetPhoneOtp,
    verifyEmailOtp,
    verifyPhoneOtpNoSync,
    setPassword,
    completeWizardSignup,
    signInAsDevUser,
    refreshUser,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
