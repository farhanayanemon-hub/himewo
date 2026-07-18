import {
  db,
  profilesTable,
  postsTable,
  reelsTable,
} from "@workspace/db";
import { count, desc, eq } from "drizzle-orm";
import { getSettings } from "./flags";

/**
 * Facebook-style eligibility rules for the verified badge. All thresholds are
 * admin-configurable through site settings (Admin Panel → Settings).
 */

export interface VerificationRequirements {
  minAccountAgeDays: number;
  minPosts: number;
  minReels: number;
  regularPostDays: number; // must have posted within the last N days (0 = off)
  monthlyFee: number; // in Taka, display/informational
}

export interface VerificationProgress {
  accountAgeDays: number;
  postCount: number;
  reelCount: number;
  lastPostDaysAgo: number | null; // null = never posted
}

function toInt(raw: string | undefined, fallback: number): number {
  // Strict: whole non-negative integer only ("15abc" falls back, not 15).
  if (!raw || !/^\d{1,9}$/.test(raw.trim())) return fallback;
  return Number.parseInt(raw.trim(), 10);
}

export async function getVerificationRequirements(): Promise<VerificationRequirements> {
  const s = await getSettings();
  return {
    minAccountAgeDays: toInt(s.verification_min_account_age_days, 15),
    minPosts: toInt(s.verification_min_posts, 15),
    minReels: toInt(s.verification_min_reels, 5),
    regularPostDays: toInt(s.verification_regular_post_days, 7),
    monthlyFee: toInt(s.verification_monthly_fee, 299),
  };
}

export async function getVerificationProgress(
  userId: string,
): Promise<VerificationProgress | null> {
  const [[profile], [posts], [reels], [lastPost]] = await Promise.all([
    db
      .select({ createdAt: profilesTable.createdAt })
      .from(profilesTable)
      .where(eq(profilesTable.id, userId)),
    db
      .select({ n: count() })
      .from(postsTable)
      .where(eq(postsTable.authorId, userId)),
    db
      .select({ n: count() })
      .from(reelsTable)
      .where(eq(reelsTable.authorId, userId)),
    db
      .select({ createdAt: postsTable.createdAt })
      .from(postsTable)
      .where(eq(postsTable.authorId, userId))
      .orderBy(desc(postsTable.createdAt))
      .limit(1),
  ]);
  if (!profile) return null;
  const dayMs = 24 * 60 * 60 * 1000;
  const accountAgeDays = Math.floor(
    (Date.now() - profile.createdAt.getTime()) / dayMs,
  );
  const lastPostDaysAgo = lastPost
    ? Math.floor((Date.now() - lastPost.createdAt.getTime()) / dayMs)
    : null;
  return {
    accountAgeDays,
    postCount: posts?.n ?? 0,
    reelCount: reels?.n ?? 0,
    lastPostDaysAgo,
  };
}

/** Human-readable unmet requirements; empty array = eligible. */
export function unmetRequirements(
  req: VerificationRequirements,
  p: VerificationProgress,
): string[] {
  const missing: string[] = [];
  if (p.accountAgeDays < req.minAccountAgeDays) {
    missing.push(
      `Account must be at least ${req.minAccountAgeDays} days old (yours is ${p.accountAgeDays})`,
    );
  }
  if (p.postCount < req.minPosts) {
    missing.push(`At least ${req.minPosts} posts required (you have ${p.postCount})`);
  }
  if (p.reelCount < req.minReels) {
    missing.push(`At least ${req.minReels} reels required (you have ${p.reelCount})`);
  }
  if (
    req.regularPostDays > 0 &&
    (p.lastPostDaysAgo === null || p.lastPostDaysAgo > req.regularPostDays)
  ) {
    missing.push(
      `You must post regularly (at least one post in the last ${req.regularPostDays} days)`,
    );
  }
  return missing;
}
