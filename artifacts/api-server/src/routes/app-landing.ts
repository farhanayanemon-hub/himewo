import { Router, type IRouter } from "express";
import { db, siteSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requirePermission } from "../lib/admin-auth";
import { writeAudit } from "../lib/audit";

export const DEFAULT_APP_LANDING_CONFIG = {
  hero: {
    badge: "Available on Web, Android & iOS",
    headline: "Connect, Share & Chat seamlessly with HiMewo",
    subheadline: "Experience next-generation social networking and instant messaging. Designed with a clean, ultra-fast purple & white experience.",
    webUrl: "https://himewo.com",
    webButtonText: "Launch Web App",
  },
  images: {
    webDesktopImage: "",
    webMobileImage: "",
    socialMobileImage: "",
    chatMobileImage: "",
  },
  webSection: {
    title: "HiMewo Web Platform",
    tagline: "Social networking, reels, shop stalls, feeds & live streams in your browser.",
    description: "Connect with friends, share stories, explore creator feeds, buy & sell on digital stalls without installing anything.",
    url: "https://himewo.com",
    buttonText: "Open HiMewo Web",
    features: [
      "Rich newsfeed, stories & HD reels",
      "Full e-commerce shop & digital stalls",
      "Live streaming & community groups",
      "Clean purple & white ultra-fast interface"
    ]
  },
  mobileApp: {
    title: "HiMewo Mobile App",
    tagline: "The all-in-one social & messaging app in your pocket.",
    description: "Stay connected with friends and family wherever you go. Watch reels, share 24h stories, explore feeds, buy & sell on shop stalls, and chat instantly with voice notes and seen receipts.",
    version: "v1.2.0 (Latest)",
    features: [
      "High quality video reels & 24h stories",
      "Real-time chat, voice notes & seen receipts",
      "Digital marketplace stalls & creator hub",
      "Full privacy controls & ultra-fast performance"
    ],
    directUrl: "https://github.com/farhanayanemon-hub/himewo/releases/latest/download/himewo.apk",
    directEnabled: true,
    directButtonText: "Direct APK Download",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.himewo.app",
    playStoreComingSoon: true,
    playStoreEnabled: true,
    appStoreUrl: "https://apps.apple.com/app/himewo/id123456789",
    appStoreComingSoon: true,
    appStoreEnabled: true,
  },
  chatApp: {
    title: "HiMewo Chat Messenger",
    tagline: "Ultra-fast, private & standalone messaging app.",
    description: "Dedicated messaging built for speed. Enjoy end-to-end encrypted chats, crystal-clear voice & video calls, stickers, voice notes, and group chats without distractions.",
    version: "v1.2.0 (Latest)",
    features: [
      "Ultra-low latency instant messaging",
      "HD 1-on-1 and group voice/video calls",
      "Media, document & voice message sharing",
      "Synced seamlessly across all devices"
    ],
    directUrl: "https://github.com/farhanayanemon-hub/himewo/releases/latest/download/himewo-chat.apk",
    directEnabled: true,
    directButtonText: "Direct APK Download",
    playStoreUrl: "https://play.google.com/store/apps/details?id=com.himewo.chat",
    playStoreComingSoon: true,
    playStoreEnabled: true,
    appStoreUrl: "https://apps.apple.com/app/himewo-chat/id987654321",
    appStoreComingSoon: true,
    appStoreEnabled: true,
  },
  floatingMessages: {
    social: [
      { sender: "Farhan Ayan", text: "New reel just dropped! Check it out 🔥", emoji: "🔥", time: "Just now", avatarColor: "bg-purple-500" },
      { sender: "Sarah Khan", text: "Loved your recent story update! ❤️", emoji: "❤️", time: "2m ago", avatarColor: "bg-pink-500" },
      { sender: "Tanvir Ahmed", text: "Ordered from your shop stall 🛍️", emoji: "🛍️", time: "5m ago", avatarColor: "bg-indigo-500" },
      { sender: "Nusrat Jahan", text: "Started following you ✨", emoji: "✨", time: "10m ago", avatarColor: "bg-purple-600" },
      { sender: "HiMewo Community", text: "Your post is trending in Dhaka 🚀", emoji: "🚀", time: "15m ago", avatarColor: "bg-violet-500" }
    ],
    chat: [
      { sender: "Ovi Rajemon", text: "🎙️ Voice message (0:24)", emoji: "🎙️", time: "Active now", avatarColor: "bg-purple-600" },
      { sender: "Ayesha Noor", text: "Sent 4 photos & a file 📎", emoji: "📎", time: "1m ago", avatarColor: "bg-indigo-500" },
      { sender: "Group Project", text: "Meeting scheduled for 5 PM 📞", emoji: "📞", time: "3m ago", avatarColor: "bg-purple-500" },
      { sender: "HiMewo Secure", text: "🔒 End-to-end encrypted session", emoji: "🔒", time: "Secured", avatarColor: "bg-emerald-500" },
      { sender: "Rafiq Islam", text: "Let's start the video call now! 🎥", emoji: "🎥", time: "4m ago", avatarColor: "bg-pink-500" }
    ]
  }
};

const router: IRouter = Router();

export function mergeAppLandingConfig(
  base: typeof DEFAULT_APP_LANDING_CONFIG,
  parsed: any,
): typeof DEFAULT_APP_LANDING_CONFIG {
  if (!parsed || typeof parsed !== "object") return base;
  return {
    hero: { ...base.hero, ...(parsed.hero || {}) },
    images: { ...base.images, ...(parsed.images || {}) },
    webSection: {
      ...base.webSection,
      ...(parsed.webSection || {}),
      features: parsed.webSection?.features?.length ? parsed.webSection.features : base.webSection.features,
    },
    mobileApp: {
      ...base.mobileApp,
      ...(parsed.mobileApp || {}),
      features: parsed.mobileApp?.features?.length ? parsed.mobileApp.features : base.mobileApp.features,
    },
    chatApp: {
      ...base.chatApp,
      ...(parsed.chatApp || {}),
      features: parsed.chatApp?.features?.length ? parsed.chatApp.features : base.chatApp.features,
    },
    floatingMessages: {
      social: parsed.floatingMessages?.social?.length ? parsed.floatingMessages.social : base.floatingMessages.social,
      chat: parsed.floatingMessages?.chat?.length ? parsed.floatingMessages.chat : base.floatingMessages.chat,
    },
  };
}

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
        res.json(mergeAppLandingConfig(DEFAULT_APP_LANDING_CONFIG, parsed));
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

// Public endpoint for in-app version checking
router.get("/app/version", async (_req, res): Promise<void> => {
  try {
    const [row] = await db
      .select({ value: siteSettingsTable.value })
      .from(siteSettingsTable)
      .where(eq(siteSettingsTable.key, "app_landing_config"))
      .limit(1);

    let cfg: any = DEFAULT_APP_LANDING_CONFIG;
    if (row?.value) {
      try {
        cfg = { ...DEFAULT_APP_LANDING_CONFIG, ...JSON.parse(row.value) };
      } catch {
        // fallback
      }
    }

    res.json({
      latestVersion: cfg.mobileApp?.version?.split(" ")[0] || "1.2.0",
      latestVersionCode: 2,
      releaseNotes: "HiMewo All-in-One: Feed, Stories, Reels, Marketplace, and Instant Messaging in one unified app!",
      apkUrl: cfg.mobileApp?.directUrl || DEFAULT_APP_LANDING_CONFIG.mobileApp.directUrl,
      socialApkUrl: cfg.mobileApp?.directUrl || DEFAULT_APP_LANDING_CONFIG.mobileApp.directUrl,
      chatApkUrl: cfg.chatApp?.directUrl || DEFAULT_APP_LANDING_CONFIG.chatApp.directUrl,
    });
  } catch {
    res.json({
      latestVersion: "1.2.0",
      latestVersionCode: 2,
      releaseNotes: "HiMewo All-in-One: Feed, Stories, Reels, Marketplace, and Instant Messaging in one unified app!",
      apkUrl: DEFAULT_APP_LANDING_CONFIG.mobileApp.directUrl,
      socialApkUrl: DEFAULT_APP_LANDING_CONFIG.mobileApp.directUrl,
      chatApkUrl: DEFAULT_APP_LANDING_CONFIG.chatApp.directUrl,
    });
  }
});

export default router;
