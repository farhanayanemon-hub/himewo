import { Router, type IRouter } from "express";
import { db, featureFlagsTable, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requirePermission } from "../../lib/admin-auth";
import { writeAudit } from "../../lib/audit";
import {
  getFlags,
  getSettings,
  invalidateConfigCache,
  FEATURE_FLAG_DEFAULTS,
  SITE_SETTING_DEFAULTS,
  NAV_ICON_KEYS,
} from "../../lib/flags";

const router: IRouter = Router();

router.get(
  "/settings",
  requirePermission("settings.view"),
  async (_req, res): Promise<void> => {
    const [flags, settings] = await Promise.all([getFlags(), getSettings()]);
    res.json({
      flags,
      settings,
      flagDefaults: FEATURE_FLAG_DEFAULTS,
      settingDefaults: SITE_SETTING_DEFAULTS,
    });
  },
);

const FlagBody = z.object({
  enabled: z.boolean(),
  description: z.string().max(500).optional(),
});

router.put(
  "/flags/:key",
  requirePermission("settings.manage"),
  async (req, res): Promise<void> => {
    const key = String(req.params.key);
    const parsed = FlagBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    const [row] = await db
      .insert(featureFlagsTable)
      .values({
        key,
        enabled: parsed.data.enabled,
        description: parsed.data.description ?? null,
        updatedBy: req.userId!,
      })
      .onConflictDoUpdate({
        target: featureFlagsTable.key,
        set: {
          enabled: parsed.data.enabled,
          description: parsed.data.description ?? null,
          updatedBy: req.userId!,
        },
      })
      .returning();
    invalidateConfigCache();
    await writeAudit({
      actorId: req.userId,
      action: "flag.update",
      targetType: "feature_flag",
      targetId: key,
      metadata: { enabled: parsed.data.enabled },
    });
    res.json(row);
  },
);

const SettingBody = z.object({ value: z.string().max(5000).nullable() });

/**
 * Write-side validation + normalization for nav_icons (stored-XSS guard,
 * defense in depth with the read-side filter in getNavIcons). Returns the
 * normalized JSON string, or null when invalid.
 */
function normalizeNavIcons(raw: string): string | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }
  const allowed = new Set<string>(NAV_ICON_KEYS);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (!allowed.has(key)) return null;
    if (
      typeof value !== "string" ||
      value.length > 2048 ||
      !/^https?:\/\//i.test(value)
    ) {
      return null;
    }
    out[key] = value;
  }
  return JSON.stringify(out);
}

router.put(
  "/settings/:key",
  requirePermission("settings.manage"),
  async (req, res): Promise<void> => {
    const key = String(req.params.key);
    const parsed = SettingBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.message });
      return;
    }
    if (key === "nav_icons" && parsed.data.value != null) {
      const normalized = normalizeNavIcons(parsed.data.value);
      if (normalized === null) {
        res.status(400).json({
          error:
            "nav_icons must be a JSON object mapping known nav keys to http(s) image URLs",
        });
        return;
      }
      parsed.data.value = normalized;
    }
    const [row] = await db
      .insert(siteSettingsTable)
      .values({ key, value: parsed.data.value, updatedBy: req.userId! })
      .onConflictDoUpdate({
        target: siteSettingsTable.key,
        set: { value: parsed.data.value, updatedBy: req.userId! },
      })
      .returning();
    invalidateConfigCache();
    await writeAudit({
      actorId: req.userId,
      action: "setting.update",
      targetType: "site_setting",
      targetId: key,
      metadata: { value: parsed.data.value },
    });
    res.json(row);
  },
);

export default router;
