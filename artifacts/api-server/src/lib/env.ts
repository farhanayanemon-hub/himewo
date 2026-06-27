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
  // Cloudflare R2 (S3-compatible object storage for images/files). When unset,
  // media uploads return 503 and clients degrade gracefully.
  r2AccountId: process.env.R2_ACCOUNT_ID,
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  r2Bucket: process.env.R2_BUCKET ?? "media",
  // Public base URL for the R2 bucket (r2.dev URL or a custom domain), used to
  // build the public URL returned to clients after upload.
  r2PublicUrl: process.env.R2_PUBLIC_URL,
  // Dev convenience: when set (non-production only), unauthenticated requests
  // are treated as this user so clients work before Supabase Auth is wired.
  devUserId: process.env.DEV_USER_ID,
  // Stream Video (getstream.io) — powers real voice/video calls. The API key is
  // public (sent to the app); the secret stays server-side to sign call tokens.
  // When unset, the calls token endpoint returns 503 and the app degrades.
  streamApiKey: process.env.STREAM_API_KEY,
  streamApiSecret: process.env.STREAM_API_SECRET,
};

export function isSupabaseConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}

export function isCallsConfigured(): boolean {
  return Boolean(env.streamApiKey && env.streamApiSecret);
}

export function isR2Configured(): boolean {
  return Boolean(
    env.r2AccountId &&
      env.r2AccessKeyId &&
      env.r2SecretAccessKey &&
      env.r2PublicUrl,
  );
}
