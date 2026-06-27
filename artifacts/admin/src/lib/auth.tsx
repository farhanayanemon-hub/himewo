import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { api, ApiError } from "./api";
import {
  supabase,
  isSupabaseConfigured,
  getDevUserId,
  setDevUserId,
  clearDevUserId,
} from "./supabase";
import type { AdminMe, Permission } from "./types";

type Status = "loading" | "anonymous" | "denied" | "ready";

interface AuthContextValue {
  status: Status;
  me: AdminMe | null;
  supabaseEnabled: boolean;
  error: string | null;
  can: (perm: Permission) => boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInAsDev: (uuid: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [me, setMe] = useState<AdminMe | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadMe = useCallback(async (): Promise<void> => {
    try {
      const data = await api.get<AdminMe>("/admin/me");
      setMe(data);
      setStatus("ready");
      setError(null);
    } catch (e) {
      setMe(null);
      if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
        // 401 = no/expired credential; 403 = signed in but not staff.
        setStatus(e.status === 403 ? "denied" : "anonymous");
      } else {
        setStatus("anonymous");
        setError(e instanceof Error ? e.message : "Failed to reach the server");
      }
    }
  }, []);

  const hasCredential = useCallback(async (): Promise<boolean> => {
    if (isSupabaseConfigured && supabase) {
      const { data } = await supabase.auth.getSession();
      if (data.session) return true;
    }
    return Boolean(getDevUserId());
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (await hasCredential()) {
        await loadMe();
      } else if (active) {
        setStatus("anonymous");
      }
    })();

    if (isSupabaseConfigured && supabase) {
      const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
        if (!active) return;
        if (session) {
          void loadMe();
        } else if (!getDevUserId()) {
          setMe(null);
          setStatus("anonymous");
        }
      });
      return () => {
        active = false;
        sub.subscription.unsubscribe();
      };
    }
    return () => {
      active = false;
    };
  }, [hasCredential, loadMe]);

  const signInWithEmail = useCallback(
    async (email: string, password: string) => {
      if (!supabase) throw new Error("Supabase is not configured.");
      const { error: e } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (e) throw e;
      await loadMe();
    },
    [loadMe],
  );

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.href },
    });
    if (e) throw e;
  }, []);

  const signInAsDev = useCallback(
    async (uuid: string) => {
      const trimmed = uuid.trim();
      if (!trimmed) throw new Error("Enter a user id.");
      setDevUserId(trimmed);
      setStatus("loading");
      await loadMe();
    },
    [loadMe],
  );

  const signOut = useCallback(async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    clearDevUserId();
    setMe(null);
    setStatus("anonymous");
  }, []);

  const can = useCallback(
    (perm: Permission) =>
      me?.role === "admin" || (me?.permissions ?? []).includes(perm),
    [me],
  );

  const value: AuthContextValue = {
    status,
    me,
    supabaseEnabled: isSupabaseConfigured,
    error,
    can,
    signInWithEmail,
    signInWithGoogle,
    signInAsDev,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
