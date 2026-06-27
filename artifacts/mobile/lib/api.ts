import { setBaseUrl, setAuthTokenGetter } from "@workspace/api-client-react";
import { supabase, isSupabaseConfigured, getDevUserId } from "./supabase";

const domain = process.env.EXPO_PUBLIC_DOMAIN;
setBaseUrl(domain ? `https://${domain}` : null);

setAuthTokenGetter(async () => {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }
  const devId = await getDevUserId();
  return devId ? `dev:${devId}` : null;
});

export function getApiOrigin(): string | null {
  return domain ? `https://${domain}` : null;
}
