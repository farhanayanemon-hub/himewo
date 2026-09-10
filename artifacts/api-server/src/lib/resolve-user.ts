import { db, profilesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { normalizeUsername } from "./username";

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Robustly resolves any user identifier (UUID, username, @username, URL-encoded username)
 * to a confirmed profile ID in the database. Returns null if no matching profile exists.
 */
export async function resolveUserId(
  raw: string | null | undefined,
): Promise<string | null> {
  if (!raw) return null;
  let cleaned = String(raw).trim();
  try {
    cleaned = decodeURIComponent(cleaned).trim();
  } catch {}
  // Strip leading '@' or '/' and trailing '/' or '@'
  cleaned = cleaned.replace(/^[/@]+/, "").replace(/[/@]+$/, "").trim();
  if (!cleaned) return null;

  // 1. Direct UUID lookup if valid UUID format
  if (UUID_RE.test(cleaned)) {
    const [byUuid] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.id, cleaned));
    if (byUuid) return byUuid.id;
  }

  // 2. Lookup by username (case-insensitive)
  const uname = cleaned.toLowerCase();
  const [byUsername] = await db
    .select({ id: profilesTable.id })
    .from(profilesTable)
    .where(sql`lower(${profilesTable.username}) = ${uname}`);
  if (byUsername) return byUsername.id;

  // 3. Normalized username fallback (strips any stray symbols)
  const norm = normalizeUsername(cleaned);
  if (norm && norm !== uname) {
    const [byNorm] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(sql`lower(${profilesTable.username}) = ${norm}`);
    if (byNorm) return byNorm.id;
  }

  // 4. Raw fallback if input was uncleaned UUID matching DB
  const rawTrimmed = String(raw).trim();
  if (rawTrimmed !== cleaned && UUID_RE.test(rawTrimmed)) {
    const [byRawUuid] = await db
      .select({ id: profilesTable.id })
      .from(profilesTable)
      .where(eq(profilesTable.id, rawTrimmed));
    if (byRawUuid) return byRawUuid.id;
  }

  return null;
}
