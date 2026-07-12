import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
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
  DEV_USER_STORAGE_KEY,
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

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  supabaseEnabled: boolean;
  devUsers: DevUser[];
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithPhonePassword: (phone: string, password: string) => Promise<void>;
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

function requireSupabase() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.",
    );
  }
  return supabase;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingProfile = useRef<SignUpArgs | null>(null);
  const wizardActive = useRef(false);

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
          await loadUser();
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
            if (wizardActive.current) return;
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
              // Ensure a profile row exists for OAuth / first sign-in.
              try {
                await getCurrentUser();
              } catch {
                const meta = session.user.user_metadata ?? {};
                const fallbackName =
                  (meta.full_name as string) ||
                  (meta.name as string) ||
                  session.user.email?.split("@")[0] ||
                  "New User";
                const fallbackUsername =
                  (session.user.email?.split("@")[0] ||
                    `user${session.user.id.slice(0, 8)}`).replace(
                    /[^a-zA-Z0-9_]/g,
                    "",
                  );
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
      const devId = localStorage.getItem(DEV_USER_STORAGE_KEY);
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

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const sb = requireSupabase();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await loadUser();
    },
    [loadUser],
  );

  const signInWithPhonePassword = useCallback(
    async (phone: string, password: string) => {
      const sb = requireSupabase();
      const { error } = await sb.auth.signInWithPassword({ phone, password });
      if (error) throw error;
      await loadUser();
    },
    [loadUser],
  );

  const signUpWithEmail = useCallback(async (args: SignUpArgs) => {
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
  }, [loadUser]);

  const signInWithGoogle = useCallback(async () => {
    const sb = requireSupabase();
    const { error } = await sb.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + import.meta.env.BASE_URL },
    });
    if (error) throw error;
  }, []);

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

  const completeWizardSignup = useCallback(
    async (args: WizardProfileArgs) => {
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
    },
    [],
  );

  const signInAsDevUser = useCallback(
    async (id: string) => {
      localStorage.setItem(DEV_USER_STORAGE_KEY, id);
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
    localStorage.removeItem(DEV_USER_STORAGE_KEY);
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
