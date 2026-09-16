import { Router, type IRouter } from "express";
import { SignJWT } from "jose";
import { db, profilesTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { requireAuth } from "../lib/auth";
import { env, isCallsConfigured } from "../lib/env";

const router: IRouter = Router();

const TOKEN_TTL_SECONDS = 60 * 60 * 24;

async function makeStreamServerToken(): Promise<string> {
  const secret = new TextEncoder().encode(env.streamApiSecret);
  const now = Math.floor(Date.now() / 1000);
  return await new SignJWT({ server: true })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(secret);
}

/**
 * Upserts users to Stream Video so they can be referenced in calls.
 */
export async function upsertStreamUsers(
  users: Array<{ id: string; displayName?: string | null; avatarUrl?: string | null }>
): Promise<void> {
  if (!isCallsConfigured() || !env.streamApiKey || !env.streamApiSecret || users.length === 0) {
    return;
  }
  try {
    const serverToken = await makeStreamServerToken();
    const usersMap: Record<string, any> = {};
    for (const u of users) {
      if (!u.id) continue;
      usersMap[u.id] = {
        id: u.id,
        name: u.displayName || "HiMewo User",
        image: u.avatarUrl || undefined,
        role: "user",
      };
    }
    if (Object.keys(usersMap).length === 0) return;

    const url = `https://video.stream-io-api.com/api/v2/users?api_key=${env.streamApiKey}`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "stream-auth-type": "jwt",
        Authorization: serverToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ users: usersMap }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.warn("Stream Video user upsert failed:", res.status, err);
    }
  } catch (err) {
    console.warn("Error upserting Stream Video users:", err);
  }
}

/**
 * Issues a Stream Video user token for the authenticated user and ensures
 * they exist in Stream Video.
 */
router.get("/calls/token", requireAuth, async (req, res): Promise<void> => {
  if (!isCallsConfigured() || !env.streamApiSecret) {
    res.status(503).json({
      error:
        "Calls are not configured. Set STREAM_API_KEY and STREAM_API_SECRET.",
    });
    return;
  }

  const userId = req.userId as string;
  const secret = new TextEncoder().encode(env.streamApiSecret);
  const now = Math.floor(Date.now() / 1000);

  const token = await new SignJWT({ user_id: userId })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt(now)
    .setExpirationTime(now + TOKEN_TTL_SECONDS)
    .sign(secret);

  try {
    const [profile] = await db
      .select({ displayName: profilesTable.displayName, avatarUrl: profilesTable.avatarUrl })
      .from(profilesTable)
      .where(eq(profilesTable.id, userId));

    void upsertStreamUsers([{ id: userId, displayName: profile?.displayName, avatarUrl: profile?.avatarUrl }]);
  } catch {
    // Non-blocking
  }

  res.json({ apiKey: env.streamApiKey, token, userId });
});

/**
 * Ensures caller and peer exist in Stream Video before placing a call.
 */
router.post("/calls/prepare", requireAuth, async (req, res): Promise<void> => {
  if (!isCallsConfigured() || !env.streamApiSecret) {
    res.status(503).json({ error: "Calls are not configured." });
    return;
  }

  const { peerId } = req.body ?? {};
  if (!peerId || typeof peerId !== "string") {
    res.status(400).json({ error: "peerId is required." });
    return;
  }

  const userIds = [req.userId as string, peerId];
  try {
    const profiles = await db
      .select({
        id: profilesTable.id,
        displayName: profilesTable.displayName,
        avatarUrl: profilesTable.avatarUrl,
      })
      .from(profilesTable)
      .where(inArray(profilesTable.id, userIds));

    const toUpsert = userIds.map((id) => {
      const found = profiles.find((p) => p.id === id);
      return {
        id,
        displayName: found?.displayName || "HiMewo User",
        avatarUrl: found?.avatarUrl,
      };
    });

    await upsertStreamUsers(toUpsert);
  } catch (err) {
    console.warn("Failed to prepare users for call:", err);
  }

  res.json({ ok: true });
});

export default router;
