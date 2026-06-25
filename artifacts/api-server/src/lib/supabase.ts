import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env, isSupabaseConfigured } from "./env";

let cached: SupabaseClient | null = null;

/**
 * Returns a Supabase admin client (service-role) when Supabase env is
 * configured, otherwise null. Used for Storage signed uploads and any
 * server-side admin operations.
 */
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (!cached) {
    cached = createClient(env.supabaseUrl!, env.supabaseServiceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return cached;
}
