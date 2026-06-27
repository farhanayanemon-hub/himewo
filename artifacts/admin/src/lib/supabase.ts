import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

// Dev fallback (no Supabase): the API accepts `dev:<uuid>` bearer tokens.
export const DEV_USER_STORAGE_KEY = "himewo_admin_dev_user_id";

export function getDevUserId(): string | null {
  try {
    return localStorage.getItem(DEV_USER_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setDevUserId(id: string): void {
  localStorage.setItem(DEV_USER_STORAGE_KEY, id);
}

export function clearDevUserId(): void {
  localStorage.removeItem(DEV_USER_STORAGE_KEY);
}
