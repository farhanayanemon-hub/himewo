import { type Request, type Response, type NextFunction } from "express";
import { db, featureFlagsTable, siteSettingsTable } from "@workspace/db";
import { getRole, PANEL_ROLES } from "./admin-auth";

// Known feature flags with their default (when no DB row exists).
export const FEATURE_FLAG_DEFAULTS: Record<string, boolean> = {
  posts: true,
  stories: true,
  reels: true,
  calls: true,
  groups: true,
  pages: true,
  messaging: true,
  signups: true,
};

// Known site settings with their defaults.
export const SITE_SETTING_DEFAULTS: Record<string, string> = {
  site_name: "HiMewo",
  logo_url: "",
  maintenance_mode: "off",
  maintenance_message:
    "HiMewo is undergoing maintenance. Please check back soon.",
  // JSON array of ISO 3166-1 alpha-2 codes (uppercase) that are BLOCKED from
  // phone signup. Empty array = every country allowed (block-list model).
  blocked_signup_countries: "[]",
};

type ConfigCache = {
  flags: Record<string, boolean>;
  settings: Record<string, string>;
  at: number;
};
let cache: ConfigCache | null = null;
const TTL_MS = 15_000;

async function load(): Promise<ConfigCache> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache;
  const [flagRows, settingRows] = await Promise.all([
    db.select().from(featureFlagsTable),
    db.select().from(siteSettingsTable),
  ]);
  const flags: Record<string, boolean> = { ...FEATURE_FLAG_DEFAULTS };
  for (const r of flagRows) flags[r.key] = r.enabled;
  const settings: Record<string, string> = { ...SITE_SETTING_DEFAULTS };
  for (const r of settingRows) if (r.value != null) settings[r.key] = r.value;
  cache = { flags, settings, at: Date.now() };
  return cache;
}

export function invalidateConfigCache(): void {
  cache = null;
}

export async function getFlags(): Promise<Record<string, boolean>> {
  return (await load()).flags;
}

export async function getSettings(): Promise<Record<string, string>> {
  return (await load()).settings;
}

export async function isFeatureEnabled(key: string): Promise<boolean> {
  const flags = await getFlags();
  return flags[key] ?? true;
}

export async function isMaintenanceMode(): Promise<boolean> {
  const settings = await getSettings();
  return settings.maintenance_mode === "on";
}

/**
 * ISO alpha-2 codes (uppercase) blocked from phone signup. Tolerant of a
 * missing/garbage setting value — returns [] (all allowed) rather than throwing.
 */
export async function getBlockedSignupCountries(): Promise<string[]> {
  const settings = await getSettings();
  const raw = settings.blocked_signup_countries;
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((c): c is string => typeof c === "string")
      .map((c) => c.trim().toUpperCase())
      .filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Middleware: block a route when its feature flag is disabled. Mount with a
 * path prefix, e.g. `router.use("/reels", requireFeature("reels"))`.
 */
export function requireFeature(key: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    void (async () => {
      if (await isFeatureEnabled(key)) {
        next();
        return;
      }
      res.status(403).json({
        error: `This feature is currently disabled.`,
        feature: key,
        disabled: true,
      });
    })().catch(next);
  };
}

/**
 * Middleware: when maintenance mode is on, only staff (panel roles) and a small
 * allow-list of paths (health, auth, admin, public config) can pass. Everyone
 * else receives 503 with the configured maintenance message.
 */
export function maintenanceGuard(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  void (async () => {
    if (!(await isMaintenanceMode())) {
      next();
      return;
    }
    const p = req.path;
    if (
      p === "/healthz" ||
      p === "/config" ||
      p.startsWith("/auth") ||
      p.startsWith("/admin") ||
      p.startsWith("/media")
    ) {
      next();
      return;
    }
    if (req.userId) {
      const role = await getRole(req.userId);
      if (role && PANEL_ROLES.includes(role)) {
        next();
        return;
      }
    }
    const settings = await getSettings();
    res
      .status(503)
      .json({ error: settings.maintenance_message, maintenance: true });
  })().catch(next);
}
