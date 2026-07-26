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
  OTP_EVENT_KEYS,
} from "../../lib/flags";

const router: IRouter = Router();

router.get(
  "/settings",
  requirePermission("settings.view"),
  async (_req, res): Promise<void> => {
    const [flags, rawSettings] = await Promise.all([getFlags(), getSettings()]);
    // Copy before redacting — getSettings() returns the shared config cache
    // and mutating it would corrupt the token used for actual SMS sends.
    const settings: Record<string, string> = { ...rawSettings };
    // Redact secret-ish settings: admins only see whether they are set.
    settings.sms_hook_secret = settings.sms_hook_secret ? "(set)" : "";
    settings.sms_greenweb_token = settings.sms_greenweb_token
      ? `••••••••${settings.sms_greenweb_token.slice(-4)}`
      : "";
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
    if (key === "otp_events" && parsed.data.value != null) {
      let obj: unknown;
      try {
        obj = JSON.parse(parsed.data.value);
      } catch {
        obj = null;
      }
      if (
        typeof obj !== "object" ||
        obj === null ||
        Array.isArray(obj) ||
        !Object.entries(obj as Record<string, unknown>).every(
          ([k, v]) =>
            (OTP_EVENT_KEYS as readonly string[]).includes(k) &&
            typeof v === "boolean",
        )
      ) {
        res.status(400).json({
          error: "otp_events must be a JSON object mapping known OTP event keys to booleans",
        });
        return;
      }
    }
    if (
      (key === "email_verification_enabled" ||
        key === "phone_verification_enabled") &&
      parsed.data.value != null &&
      !["on", "off"].includes(parsed.data.value)
    ) {
      res.status(400).json({ error: `${key} must be "on" or "off"` });
      return;
    }
    if (key === "sms_hook_secret") {
      // Ops-only value (part of the Supabase hook URI) — not editable from
      // the admin panel to avoid accidentally breaking OTP delivery.
      res.status(400).json({ error: "sms_hook_secret cannot be changed from the admin panel" });
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
