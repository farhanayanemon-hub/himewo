import { getApiOrigin, getAuthToken } from "./api";

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

/**
 * Fetches a short-lived Stream Video token (minted server-side) plus the public
 * API key, so the client can connect as the authenticated user.
 */
export async function fetchStreamCredentials(): Promise<StreamCredentials> {
  const origin = getApiOrigin();
  if (!origin) throw new Error("API origin not configured");

  const authToken = await getAuthToken();
  const res = await fetch(`${origin}/api/calls/token`, {
    headers: authToken ? { Authorization: `Bearer ${authToken}` } : {},
  });

  if (res.status === 503) throw new CallsUnavailableError();
  if (!res.ok) throw new Error(`Could not get a call token (${res.status})`);

  return (await res.json()) as StreamCredentials;
}

/**
 * Ensures the peer and caller are registered in Stream Video before placing a call.
 */
export async function prepareCall(peerId: string): Promise<void> {
  const origin = getApiOrigin();
  if (!origin) return;

  const authToken = await getAuthToken();
  try {
    const res = await fetch(`${origin}/api/calls/prepare`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({ peerId }),
    });
    if (!res.ok && res.status !== 503) {
      console.warn(`Could not prepare call for peer ${peerId}: status ${res.status}`);
    }
  } catch (err) {
    console.warn("Error calling /api/calls/prepare:", err);
  }
}

