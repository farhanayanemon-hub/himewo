import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import {
  supabase,
  isSupabaseConfigured,
  DEV_USER_STORAGE_KEY,
} from "./supabase";

// In dev, always talk to the local API server via relative URLs (the proxy
// routes /api to artifacts/api-server) — VITE_API_URL points at production.
const PROD_API_FALLBACK = "https://workspaceapi-server-production-5e99.up.railway.app";
const rawApiBaseUrl = import.meta.env.DEV
  ? undefined
  : (() => {
      const u = import.meta.env.VITE_API_URL as string | undefined;
      if (!u || u.includes("api.himewo.com")) return PROD_API_FALLBACK;
      return /^https?:\/\//.test(u) ? u : `https://${u}`;
    })();
setBaseUrl(rawApiBaseUrl ?? null);

let _cachedToken: string | null = null;

export function setCachedToken(token: string | null): void {
  _cachedToken = token;
}

if (isSupabaseConfigured && supabase) {
  supabase.auth.onAuthStateChange((_event, session) => {
    _cachedToken = session?.access_token ?? null;
  });
}

setAuthTokenGetter(async () => {
  if (_cachedToken) return _cachedToken;
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) {
      _cachedToken = data.session.access_token;
      return data.session.access_token;
    }
    if (!import.meta.env.DEV) return null;
    // Dev-only: fall through to the dev bypass token below.
  }
  const devId = localStorage.getItem(DEV_USER_STORAGE_KEY);
  return devId ? `dev:${devId}` : null;
});
