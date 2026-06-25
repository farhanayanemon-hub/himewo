const nodeEnv = process.env.NODE_ENV ?? "development";

export const env = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  // Supabase (production). When unset, the server runs in dev mode against the
  // local Postgres and accepts dev auth tokens / storage falls back to local.
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  supabaseJwtSecret: process.env.SUPABASE_JWT_SECRET,
  storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "media",
  // Dev convenience: when set (non-production only), unauthenticated requests
  // are treated as this user so clients work before Supabase Auth is wired.
  devUserId: process.env.DEV_USER_ID,
};

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}
