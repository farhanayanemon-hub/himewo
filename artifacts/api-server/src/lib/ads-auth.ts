import {
  db,
  adAccountsTable,
  adAccountMembersTable,
  type AdRole,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export type AdAccountAccess = {
  // Whether the ad account exists at all (used to pick 404 vs 403).
  exists: boolean;
  ownerId: string | null;
  // The requester's effective role, or null if they have no access.
  role: AdRole | null;
};

/**
 * Resolve a user's role on an ad account. The account OWNER is always treated
 * as admin (even without an explicit member row). Otherwise the role comes from
 * the ad_account_members table.
 */
export async function resolveAdAccountAccess(
  userId: string,
  accountId: number,
): Promise<AdAccountAccess> {
  const [acct] = await db
    .select({ ownerId: adAccountsTable.ownerId })
    .from(adAccountsTable)
    .where(eq(adAccountsTable.id, accountId));
  if (!acct) return { exists: false, ownerId: null, role: null };
  if (acct.ownerId === userId) {
    return { exists: true, ownerId: acct.ownerId, role: "admin" };
  }
  const [member] = await db
    .select({ role: adAccountMembersTable.role })
    .from(adAccountMembersTable)
    .where(
      and(
        eq(adAccountMembersTable.accountId, accountId),
        eq(adAccountMembersTable.userId, userId),
      ),
    );
  return {
    exists: true,
    ownerId: acct.ownerId,
    role: (member?.role as AdRole | undefined) ?? null,
  };
}

// Any member (admin/advertiser/analyst) can read.
export function canRead(role: AdRole | null): boolean {
  return role === "admin" || role === "advertiser" || role === "analyst";
}

// Admin + advertiser can manage campaigns/ad sets/ads/creatives/audiences.
export function canManageAds(role: AdRole | null): boolean {
  return role === "admin" || role === "advertiser";
}

// Only admins can manage the account itself, members and billing.
export function canManageAccount(role: AdRole | null): boolean {
  return role === "admin";
}
