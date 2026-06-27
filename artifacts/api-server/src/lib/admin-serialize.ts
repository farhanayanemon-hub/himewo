import { db, profilesTable } from "@workspace/db";
import type { Profile as ProfileRow } from "@workspace/db";
import { inArray } from "drizzle-orm";

// Minimal profile shape used across admin list/detail responses.
export function toAdminProfile(row: ProfileRow) {
  return {
    id: row.id,
    username: row.username,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    email: row.email,
    isVerified: row.isVerified,
    role: row.role,
    isSuspended: row.isSuspended,
    suspendedUntil: row.suspendedUntil,
    isBanned: row.isBanned,
    createdAt: row.createdAt,
  };
}

export type AdminProfile = ReturnType<typeof toAdminProfile>;

export async function loadAdminProfileMap(
  ids: (string | null | undefined)[],
): Promise<Map<string, AdminProfile>> {
  const unique = [...new Set(ids)].filter((x): x is string => Boolean(x));
  if (unique.length === 0) return new Map();
  const rows = await db
    .select()
    .from(profilesTable)
    .where(inArray(profilesTable.id, unique));
  return new Map(rows.map((r) => [r.id, toAdminProfile(r)]));
}

// Parse ?limit / ?offset query params with safe bounds.
export function parsePaging(query: unknown): { limit: number; offset: number } {
  const q = (query ?? {}) as Record<string, unknown>;
  const rawLimit = Number(q.limit);
  const rawOffset = Number(q.offset);
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 25;
  const offset = Number.isFinite(rawOffset) && rawOffset > 0 ? rawOffset : 0;
  return { limit, offset };
}
