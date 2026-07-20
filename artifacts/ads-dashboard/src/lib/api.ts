import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import {
  supabase,
  isSupabaseConfigured,
  DEV_USER_STORAGE_KEY,
} from "./supabase";

// In dev use relative /api URLs (local API server); VITE_API_URL is production.
const rawApiBaseUrl = import.meta.env.DEV
  ? undefined
  : (import.meta.env.VITE_API_URL as string | undefined);
const apiBaseUrl = rawApiBaseUrl
  ? /^https?:\/\//.test(rawApiBaseUrl)
    ? rawApiBaseUrl
    : `https://${rawApiBaseUrl}`
  : undefined;
setBaseUrl(apiBaseUrl ?? null);

setAuthTokenGetter(async () => {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
    if (!import.meta.env.DEV) return null;
    // Dev-only: fall through to the dev bypass token below.
  }
  const devId = localStorage.getItem(DEV_USER_STORAGE_KEY);
  return devId ? `dev:${devId}` : null;
});
