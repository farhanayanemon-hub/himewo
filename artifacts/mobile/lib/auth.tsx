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

interface AuthContextValue {
  user: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
  supabaseEnabled: boolean;
  devUsers: DevUser[];
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (args: SignUpArgs) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPhoneOtp: (phone: string) => Promise<void>;
  verifyPhoneOtp: (phone: string, token: string) => Promise<void>;
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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const pendingProfile = useRef<SignUpArgs | null>(null);

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

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      const sb = requireSupabase();
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if (error) throw error;
      await loadUser();
    },
    [loadUser],
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
      await loadUser();
    },
    [loadUser],
  );

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
    signUpWithEmail,
    signInWithGoogle,
    sendPhoneOtp,
    verifyPhoneOtp,
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
