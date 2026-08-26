import { Router, type IRouter } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod/v4";
import { requirePermission } from "../lib/admin-auth";
import { writeAudit } from "../lib/audit";

export const DEFAULT_APP_LANDING_CONFIG = {
  hero: {
    badge: "Available on All Platforms",
    headline: "Connect, Share & Chat seamlessly with HiMewo",
    subheadline: "Experience next-generation social networking and instant messaging. Available on Web, Android, and iOS.",
    webUrl: "https://himewo.com",
    webButtonText: "Launch Web App",
  },
  webSection: {
    title: "HiMewo Web Platform",
    tagline: "Social networking, reels, shop, feeds & live streams directly in your browser.",
    description: "Connect with friends, share updates, discover trending reels, manage pages and stalls without downloading anything.",
    url: "https://himewo.com",
    buttonText: "Open HiMewo Web",
    features: [
      "Rich newsfeed, stories & reels",
      "Full e-commerce shop & digital stalls",
      "Live streaming & community groups",
      "Dark & light modern aurora experience"
    ]
  },
  mobileApp: {
    title: "HiMewo Social App",
    tagline: "The full social experience in your pocket.",
    description: "Stay connected with friends and family wherever you go. Share reels, explore creator feeds, buy & sell on shop stalls, and receive instant push notifications.",
    version: "v1.2.0 (Latest)",
    features: [
      "High quality video reels & stories",
      "Audio & video calling with friends",
      "Offline caching & lightning fast performance",
      "Full privacy controls & 2FA security"
    ],
    directUrl: "https://himewo.com/downloads/himewo-social.apk",
    directEnabled: true,
    directButtonText: "Direct APK Download",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.himewo.social",
    playStoreComingSoon: true,
    playStoreEnabled: true,
    appStoreUrl: "https://apps.apple.com/app/himewo-social/id123456789",
    appStoreComingSoon: true,
    appStoreEnabled: true,
  },
  chatApp: {
    title: "HiMewo Chat Messenger",
    tagline: "Ultra-fast, private & standalone messaging app.",
    description: "Dedicated messaging built for speed. Enjoy end-to-end encrypted chats, crystal-clear voice & video calls, stickers, voice notes, and group chats without distractions.",
    version: "v1.0.4 (Latest)",
    features: [
      "Ultra-low latency instant messaging",
      "HD 1-on-1 and group voice/video calls",
      "Media, document & voice message sharing",
      "Synced seamlessly across all devices"
    ],
    directUrl: "https://himewo.com/downloads/himewo-chat.apk",
    directEnabled: true,
    directButtonText: "Direct APK Download",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.himewo.chat",
    playStoreComingSoon: true,
    playStoreEnabled: true,
    appStoreUrl: "https://apps.apple.com/app/himewo-chat/id987654321",
    appStoreComingSoon: true,
    appStoreEnabled: true,
  }
};

const router: IRouter = Router();

// Public endpoint for the app.himewo.com landing page
router.get("/app-landing/config", async (_req, res): Promise<void> => {
  try {
    const [row] = await db
      .select({ value: siteSettingsTable.value })
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "app_landing_config"));
    if (row && row.value) {
      try {
        const parsed = JSON.parse(row.value);
        res.json({ ...DEFAULT_APP_LANDING_CONFIG, ...parsed });
        return;
      } catch {
        // fallback
      }
    }
  } catch {
    // fallback
  }
  res.json(DEFAULT_APP_LANDING_CONFIG);
});

// Admin-only endpoint to update app landing configuration
router.put(
  "/admin/app-landing/config",
  requirePermission("settings.manage"),
  async (req, res): Promise<void> => {
    const body = req.body;
    if (!body || typeof body !== "object") {
      res.status(400).json({ error: "Invalid configuration object" });
      return;
    }
    const jsonString = JSON.stringify(body);
    await db
      .insert(siteSettingsTable)
      .values({
        key: "app_landing_config",
        value: jsonString,
        updatedBy: req.userId!,
      })
      .onConflictDoUpdate({
        target: siteSettingsTable.key,
        set: {
          value: jsonString,
          updatedBy: req.userId!,
        },
      });

    await writeAudit({
      actorId: req.userId,
      action: "app_landing.update",
      targetType: "site_setting",
      targetId: "app_landing_config",
      metadata: { keys: Object.keys(body) },
    });

    res.json({ success: true, config: body });
  }
);

export default router;
