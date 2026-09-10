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
  monthlyFee: number; // global fallback fee
  countryPricing: Record<string, CountryPrice>; // per-country overrides
}

export interface CountryPrice {
  amount: number;
  currency: string; // ISO 4217, e.g. "BDT", "USD"
  symbol: string;   // display prefix, e.g. "৳", "$"
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
    countryPricing: parseCountryPricing(s.verification_country_pricing),
  };
}

/** Parse and sanitise the admin-set JSON country pricing map. */
function parseCountryPricing(raw: string | undefined): Record<string, CountryPrice> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const out: Record<string, CountryPrice> = {};
    for (const [cc, val] of Object.entries(parsed as Record<string, unknown>)) {
      if (
        typeof val === "object" && val !== null &&
        typeof (val as Record<string, unknown>).amount === "number" &&
        typeof (val as Record<string, unknown>).currency === "string" &&
        typeof (val as Record<string, unknown>).symbol === "string"
      ) {
        out[cc.toUpperCase()] = val as CountryPrice;
      }
    }
    return out;
  } catch {
    return {};
  }
}

/**
 * Resolve the displayed price for a given ISO alpha-2 country code.
 * Falls back to the global monthlyFee with a ৳ symbol (Taka) when no override exists.
 */
export function resolveVerificationPrice(
  req: VerificationRequirements,
  countryCode: string | null,
): CountryPrice {
  if (countryCode) {
    const match = req.countryPricing[countryCode.toUpperCase()];
    if (match) return match;
  }
  // Global fallback — admin sets this in Taka by default
  return { amount: req.monthlyFee, currency: "BDT", symbol: "৳" };
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
