import { supabase, isSupabaseConfigured, DEV_USER_STORAGE_KEY } from "./supabase";

/** Thrown when the server has no Stream credentials configured (503). */
export class CallsUnavailableError extends Error {
  constructor() {
    super("Calls are not configured");
    this.name = "CallsUnavailableError";
  }
}

export interface StreamCredentials {
  apiKey: string;
  token: string;
  userId: string;
}

const rawApiBaseUrl = import.meta.env.DEV ? undefined : (import.meta.env.VITE_API_URL as string | undefined);
const apiBaseUrl = rawApiBaseUrl
  ? /^https?:\/\//.test(rawApiBaseUrl)
    ? rawApiBaseUrl
    : `https://${rawApiBaseUrl}`
  : "";

async function getAuthToken(): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) return data.session.access_token;
    if (!import.meta.env.DEV) return null;
    // Dev-only: fall through to the dev bypass token below.
  }
  const devId = localStorage.getItem(DEV_USER_STORAGE_KEY);
  return devId ? `dev:${devId}` : null;
}

/**
 * Fetches a short-lived Stream Video token (minted server-side) plus the public
 * API key, so the web client can connect to the SAME Stream app the mobile chat
 * app uses — which is what lets web <-> mobile calls actually connect.
 */
export async function fetchStreamCredentials(): Promise<StreamCredentials> {
  const authToken = await getAuthToken();
  const res = await fetch(`${apiBaseUrl}/api/calls/token`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });

  if (res.status === 503) throw new CallsUnavailableError();
  if (!res.ok) throw new Error(`Could not get a call token (${res.status})`);

  return (await res.json()) as StreamCredentials;
}
