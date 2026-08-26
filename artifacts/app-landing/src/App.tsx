import { useEffect, useState } from "react";
import {
  Smartphone,
  MessageSquare,
  Globe,
  Download,
  Apple,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Zap,
  Video,
  ShoppingBag,
  Bell,
  Heart,
  Share2,
  Lock,
  PhoneCall,
  CheckCircle2,
  ExternalLink,
  ChevronRight,
  QrCode,
  Layers,
  X,
} from "lucide-react";

interface AppDownloadOption {
  directUrl: string;
  directEnabled: boolean;
  directButtonText: string;
  playStoreUrl: string;
  playStoreComingSoon: boolean;
  playStoreEnabled: boolean;
  appStoreUrl: string;
  appStoreComingSoon: boolean;
  appStoreEnabled: boolean;
}

interface AppLandingConfig {
  hero: {
    badge: string;
    headline: string;
    subheadline: string;
    webUrl: string;
    webButtonText: string;
  };
  webSection: {
    title: string;
    tagline: string;
    description: string;
    url: string;
    buttonText: string;
    features: string[];
  };
  mobileApp: {
    title: string;
    tagline: string;
    description: string;
    version: string;
    features: string[];
    directUrl: string;
    directEnabled: boolean;
    directButtonText: string;
    playStoreUrl: string;
    playStoreComingSoon: boolean;
    playStoreEnabled: boolean;
    appStoreUrl: string;
    appStoreComingSoon: boolean;
    appStoreEnabled: boolean;
  };
  chatApp: {
    title: string;
    tagline: string;
    description: string;
    version: string;
    features: string[];
    directUrl: string;
    directEnabled: boolean;
    directButtonText: string;
    playStoreUrl: string;
    playStoreComingSoon: boolean;
    playStoreEnabled: boolean;
    appStoreUrl: string;
    appStoreComingSoon: boolean;
    appStoreEnabled: boolean;
  };
}

const DEFAULT_CONFIG: AppLandingConfig = {
  hero: {
    badge: "Available on All Platforms",
    headline: "Connect, Share & Chat seamlessly with HiMewo",
    subheadline:
      "Experience next-generation social networking and instant messaging. Available on Web, Android, and iOS.",
    webUrl: "https://himewo.com",
    webButtonText: "Launch Web App",
  },
  webSection: {
    title: "HiMewo Web Platform",
    tagline: "Social networking, reels, shop, feeds & live streams directly in your browser.",
    description:
      "Connect with friends, share updates, discover trending reels, manage pages and stalls without downloading anything.",
    url: "https://himewo.com",
    buttonText: "Open HiMewo Web",
    features: [
      "Rich newsfeed, stories & HD reels",
      "Full e-commerce shop & digital stalls",
      "Live streaming & community groups",
      "Dark & light modern aurora experience",
    ],
  },
  mobileApp: {
    title: "HiMewo Social App",
    tagline: "The full social experience in your pocket.",
    description:
      "Stay connected with friends and family wherever you go. Share reels, explore creator feeds, buy & sell on shop stalls, and receive instant push notifications.",
    version: "v1.2.0 (Latest)",
    features: [
      "High quality video reels & stories",
      "Audio & video calling with friends",
      "Offline caching & lightning fast performance",
      "Full privacy controls & 2FA security",
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
    description:
      "Dedicated messaging built for speed. Enjoy end-to-end encrypted chats, crystal-clear voice & video calls, stickers, voice notes, and group chats without distractions.",
    version: "v1.0.4 (Latest)",
    features: [
      "Ultra-low latency instant messaging",
      "HD 1-on-1 and group voice/video calls",
      "Media, document & voice message sharing",
      "Synced seamlessly across all devices",
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
  },
};

export default function App() {
  const [config, setConfig] = useState<AppLandingConfig>(DEFAULT_CONFIG);
  const [activeModal, setActiveModal] = useState<{
    appName: string;
    store: "Play Store" | "App Store";
    directUrl: string;
  } | null>(null);

  useEffect(() => {
    // Attempt to load live configuration from backend API
    fetch("https://workspaceapi-server-production-5e99.up.railway.app/api/app-landing/config")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.hero) setConfig(data);
      })
      .catch(() => {
        // use fallback default config
      });
  }, []);

  const handleDownloadClick = (
    url: string,
    comingSoon: boolean,
    appName: string,
    store: "Play Store" | "App Store",
    directUrl: string
  ) => {
    if (comingSoon) {
      setActiveModal({ appName, store, directUrl });
    } else if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background Glow Blobs */}
      <div className="pointer-events-none absolute top-[-10%] left-[20%] h-[550px] w-[550px] rounded-full bg-indigo-600/20 blur-[130px]" />
      <div className="pointer-events-none absolute top-[30%] right-[-10%] h-[600px] w-[600px] rounded-full bg-purple-600/20 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-[15%] left-[-10%] h-[500px] w-[500px] rounded-full bg-pink-600/15 blur-[140px]" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 glass-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
          <a href="https://himewo.com" className="flex items-center gap-3 group">
            <div className="aurora-gradient h-10 w-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] group-hover:scale-105 transition-transform">
              H
            </div>
            <span className="font-['Outfit',sans-serif] text-2xl font-extrabold tracking-tight aurora-gradient-text">
              HiMewo
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#web" className="hover:text-white transition-colors">
              Web Platform
            </a>
            <a href="#mobile" className="hover:text-white transition-colors flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-sky-400" />
              Social App
            </a>
            <a href="#chat" className="hover:text-white transition-colors flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-purple-400" />
              Chat Messenger
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={config.hero.webUrl || "https://himewo.com"}
              className="aurora-gradient px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              {config.hero.webButtonText || "Launch Web App"}
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card text-xs font-semibold text-purple-300 mb-6 shadow-inner border border-purple-500/20">
          <Sparkles className="h-3.5 w-3.5 text-amber-400 animate-pulse" />
          <span>{config.hero.badge}</span>
        </div>

        <h1 className="font-['Outfit',sans-serif] text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.1] max-w-4xl mx-auto">
          {config.hero.headline.split("HiMewo")[0]}
          <span className="aurora-gradient-text">HiMewo</span>
          {config.hero.headline.split("HiMewo")[1] || ""}
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
          {config.hero.subheadline}
        </p>

        {/* Quick Tier Jump Buttons */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#mobile"
            className="glass-card hover:border-sky-500/50 px-6 py-3.5 rounded-2xl font-bold text-sm text-white flex items-center gap-3 transition-all hover:scale-105"
          >
            <div className="h-8 w-8 rounded-lg bg-sky-500/20 flex items-center justify-center text-sky-400">
              <Smartphone className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">Social App</div>
              <div className="text-sm font-bold">HiMewo Mobile</div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 ml-1" />
          </a>

          <a
            href="#chat"
            className="glass-card hover:border-purple-500/50 px-6 py-3.5 rounded-2xl font-bold text-sm text-white flex items-center gap-3 transition-all hover:scale-105"
          >
            <div className="h-8 w-8 rounded-lg bg-purple-500/20 flex items-center justify-center text-purple-400">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">Dedicated Chat</div>
              <div className="text-sm font-bold">HiMewo Messenger</div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 ml-1" />
          </a>

          <a
            href="#web"
            className="glass-card hover:border-pink-500/50 px-6 py-3.5 rounded-2xl font-bold text-sm text-white flex items-center gap-3 transition-all hover:scale-105"
          >
            <div className="h-8 w-8 rounded-lg bg-pink-500/20 flex items-center justify-center text-pink-400">
              <Globe className="h-4 w-4" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-slate-400 font-normal uppercase tracking-wider">Browser Version</div>
              <div className="text-sm font-bold">Web Platform</div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-500 ml-1" />
          </a>
        </div>
      </section>

      {/* TIER 1: HiMewo Web Platform Section */}
      <section id="web" className="py-20 border-t border-white/5 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="glass-panel rounded-3xl p-8 sm:p-12 lg:p-16 border border-white/10 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold uppercase tracking-wider border border-indigo-500/30">
                  <Globe className="h-3.5 w-3.5" />
                  Tier 1 · Direct Web Access
                </div>
                <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                  {config.webSection.title}
                </h2>
                <p className="text-lg font-medium text-purple-200">
                  {config.webSection.tagline}
                </p>
                <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                  {config.webSection.description}
                </p>

                {/* Features List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {config.webSection.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-sm text-slate-300">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <a
                    href={config.webSection.url || "https://himewo.com"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="aurora-gradient px-8 py-4 rounded-xl text-base font-bold text-white shadow-xl shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center gap-2.5"
                  >
                    <Globe className="h-5 w-5" />
                    {config.webSection.buttonText || "Open HiMewo Web"}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <span className="text-xs text-slate-400 font-medium">
                    No installation required · Works in all browsers
                  </span>
                </div>
              </div>

              {/* Browser Mockup Visual */}
              <div className="lg:col-span-6 relative">
                <div className="rounded-2xl border border-white/10 bg-[#0f172a] shadow-2xl overflow-hidden">
                  <div className="h-9 bg-[#1e293b] px-4 flex items-center gap-2 border-b border-white/5">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500/80" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                      <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    </div>
                    <div className="ml-4 flex-1 max-w-xs bg-[#0b0f19] text-[11px] font-mono text-slate-400 px-3 py-1 rounded-md border border-white/5 truncate">
                      https://himewo.com
                    </div>
                  </div>
                  <div className="p-6 bg-gradient-to-b from-[#111827] to-[#0b0f19] space-y-4">
                    <div className="flex items-center justify-between border-b border-white/10 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full aurora-gradient" />
                        <div>
                          <div className="h-3 w-28 bg-slate-700 rounded" />
                          <div className="h-2 w-16 bg-slate-800 rounded mt-1.5" />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-lg bg-slate-800" />
                        <div className="w-7 h-7 rounded-lg bg-slate-800" />
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-800/50 p-4 border border-white/5 space-y-2.5">
                      <div className="h-3 w-3/4 bg-slate-700 rounded" />
                      <div className="h-3 w-1/2 bg-slate-700 rounded" />
                      <div className="h-36 w-full rounded-lg bg-gradient-to-r from-purple-900/40 via-indigo-900/40 to-pink-900/40 border border-white/5 flex items-center justify-center text-slate-500 text-xs font-semibold">
                        HiMewo Dynamic Social Feed & Reels
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TIER 2: HiMewo Mobile App (Social App) Section */}
      <section id="mobile" className="py-24 relative border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Phone Frame Mockup */}
            <div className="lg:col-span-5 flex justify-center order-2 lg:order-1">
              <div className="phone-mockup relative flex flex-col">
                <div className="pt-8 px-4 pb-3 border-b border-white/10 flex items-center justify-between">
                  <span className="font-bold text-sm text-sky-400">HiMewo Social</span>
                  <div className="flex gap-2 text-slate-400">
                    <Bell className="h-4 w-4" />
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                </div>
                <div className="flex-1 p-4 space-y-3 overflow-hidden">
                  <div className="flex gap-2 overflow-x-hidden pb-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className="w-14 h-20 rounded-xl bg-gradient-to-b from-sky-600/30 to-indigo-600/30 border border-sky-400/30 shrink-0 flex flex-col justify-end p-1.5 text-[9px] font-bold"
                      >
                        Story {i}
                      </div>
                    ))}
                  </div>
                  <div className="rounded-xl bg-slate-900/80 p-3 border border-white/10 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-sky-500" />
                      <div>
                        <div className="text-[11px] font-bold">Farhan Ayan Emon</div>
                        <div className="text-[9px] text-slate-500">2h ago · 🌍</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-300">
                      Exploring the new features on HiMewo Mobile! 🚀💙
                    </div>
                    <div className="h-24 w-full rounded-lg bg-gradient-to-tr from-sky-900/40 to-blue-900/40 border border-white/5 flex items-center justify-center text-[10px] text-sky-300 font-bold">
                      HiMewo Social App Experience
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1"><Heart className="h-3 w-3 text-rose-400" /> 142 Likes</span>
                      <span className="flex items-center gap-1"><Share2 className="h-3 w-3" /> Share</span>
                    </div>
                  </div>
                </div>
                <div className="p-3 border-t border-white/10 flex justify-around text-slate-400">
                  <Globe className="h-4 w-4 text-sky-400" />
                  <Video className="h-4 w-4" />
                  <ShoppingBag className="h-4 w-4" />
                  <Bell className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Content & 3 Download Buttons */}
            <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold uppercase tracking-wider border border-sky-500/30">
                <Smartphone className="h-3.5 w-3.5" />
                Tier 2 · Mobile Social Experience
              </div>

              <div className="flex items-center gap-3">
                <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                  {config.mobileApp.title}
                </h2>
                <Badge variant="outline" className="border-sky-500/30 text-sky-300 text-xs font-mono">
                  {config.mobileApp.version}
                </Badge>
              </div>

              <p className="text-lg font-medium text-sky-200">
                {config.mobileApp.tagline}
              </p>

              <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                {config.mobileApp.description}
              </p>

              {/* Features List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {config.mobileApp.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-sky-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* 3 Download Buttons */}
              <div className="pt-4 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Choose your download option:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Button 1: Direct APK */}
                  {config.mobileApp.directEnabled && (
                    <a
                      href={config.mobileApp.directUrl}
                      download
                      className="glass-card hover:border-emerald-500/50 p-4 rounded-2xl flex flex-col justify-between group transition-all hover:scale-[1.02] bg-emerald-950/20 border-emerald-500/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Download className="h-6 w-6 text-emerald-400 group-hover:translate-y-0.5 transition-transform" />
                        <span className="text-[10px] font-bold uppercase bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full">
                          Direct APK
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Instant Download</div>
                        <div className="text-sm font-bold text-white">
                          {config.mobileApp.directButtonText || "Download APK"}
                        </div>
                      </div>
                    </a>
                  )}

                  {/* Button 2: Google Play Store */}
                  {config.mobileApp.playStoreEnabled && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadClick(
                          config.mobileApp.playStoreUrl,
                          config.mobileApp.playStoreComingSoon,
                          "HiMewo Social",
                          "Play Store",
                          config.mobileApp.directUrl
                        )
                      }
                      className="glass-card hover:border-sky-500/50 p-4 rounded-2xl flex flex-col justify-between text-left group transition-all hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <svg className="h-6 w-6 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3.609 1.814L13.792 12 3.61 22.186a2.036 2.036 0 0 1-.22-.964V2.778c0-.36.08-.69.22-.964zM15.207 13.414l2.585-2.586a1.414 1.414 0 0 0 0-2l-2.585-2.585-1.415 1.414 5 5-5 5 1.415-1.243zM4.732.691l10.061 10.06-2.586 2.586L2.146 3.276A2.04 2.04 0 0 1 4.732.69zM14.793 13.25l-10.06 10.06a2.04 2.04 0 0 1-2.587-2.586l10.061-10.06 2.586 2.586z"/>
                        </svg>
                        {config.mobileApp.playStoreComingSoon ? (
                          <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full">
                            Available
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">GET IT ON</div>
                        <div className="text-sm font-bold text-white">Google Play</div>
                      </div>
                    </button>
                  )}

                  {/* Button 3: Apple App Store */}
                  {config.mobileApp.appStoreEnabled && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadClick(
                          config.mobileApp.appStoreUrl,
                          config.mobileApp.appStoreComingSoon,
                          "HiMewo Social",
                          "App Store",
                          config.mobileApp.directUrl
                        )
                      }
                      className="glass-card hover:border-slate-400 p-4 rounded-2xl flex flex-col justify-between text-left group transition-all hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Apple className="h-6 w-6 text-slate-100" />
                        {config.mobileApp.appStoreComingSoon ? (
                          <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase bg-slate-500/20 text-slate-300 px-2 py-0.5 rounded-full">
                            Available
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Download on the</div>
                        <div className="text-sm font-bold text-white">App Store</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TIER 3: HiMewo Chat App (Messenger) Section */}
      <section id="chat" className="py-24 relative border-t border-white/5 bg-slate-950/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Content & 3 Download Buttons */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold uppercase tracking-wider border border-purple-500/30">
                <MessageSquare className="h-3.5 w-3.5" />
                Tier 3 · Standalone Messenger
              </div>

              <div className="flex items-center gap-3">
                <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-5xl font-extrabold tracking-tight text-white">
                  {config.chatApp.title}
                </h2>
                <Badge variant="outline" className="border-purple-500/30 text-purple-300 text-xs font-mono">
                  {config.chatApp.version}
                </Badge>
              </div>

              <p className="text-lg font-medium text-purple-200">
                {config.chatApp.tagline}
              </p>

              <p className="text-slate-400 leading-relaxed text-sm sm:text-base">
                {config.chatApp.description}
              </p>

              {/* Features List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {config.chatApp.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-sm text-slate-300">
                    <CheckCircle2 className="h-4 w-4 text-purple-400 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* 3 Download Buttons */}
              <div className="pt-4 space-y-3">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Choose your download option:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Button 1: Direct APK */}
                  {config.chatApp.directEnabled && (
                    <a
                      href={config.chatApp.directUrl}
                      download
                      className="glass-card hover:border-purple-500/50 p-4 rounded-2xl flex flex-col justify-between group transition-all hover:scale-[1.02] bg-purple-950/20 border-purple-500/30"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Download className="h-6 w-6 text-purple-400 group-hover:translate-y-0.5 transition-transform" />
                        <span className="text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                          Direct APK
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-slate-400">Instant Download</div>
                        <div className="text-sm font-bold text-white">
                          {config.chatApp.directButtonText || "Download APK"}
                        </div>
                      </div>
                    </a>
                  )}

                  {/* Button 2: Google Play Store */}
                  {config.chatApp.playStoreEnabled && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadClick(
                          config.chatApp.playStoreUrl,
                          config.chatApp.playStoreComingSoon,
                          "HiMewo Messenger",
                          "Play Store",
                          config.chatApp.directUrl
                        )
                      }
                      className="glass-card hover:border-purple-500/50 p-4 rounded-2xl flex flex-col justify-between text-left group transition-all hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <svg className="h-6 w-6 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M3.609 1.814L13.792 12 3.61 22.186a2.036 2.036 0 0 1-.22-.964V2.778c0-.36.08-.69.22-.964zM15.207 13.414l2.585-2.586a1.414 1.414 0 0 0 0-2l-2.585-2.585-1.415 1.414 5 5-5 5 1.415-1.243zM4.732.691l10.061 10.06-2.586 2.586L2.146 3.276A2.04 2.04 0 0 1 4.732.69zM14.793 13.25l-10.06 10.06a2.04 2.04 0 0 1-2.587-2.586l10.061-10.06 2.586 2.586z"/>
                        </svg>
                        {config.chatApp.playStoreComingSoon ? (
                          <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                            Available
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">GET IT ON</div>
                        <div className="text-sm font-bold text-white">Google Play</div>
                      </div>
                    </button>
                  )}

                  {/* Button 3: Apple App Store */}
                  {config.chatApp.appStoreEnabled && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadClick(
                          config.chatApp.appStoreUrl,
                          config.chatApp.appStoreComingSoon,
                          "HiMewo Messenger",
                          "App Store",
                          config.chatApp.directUrl
                        )
                      }
                      className="glass-card hover:border-slate-400 p-4 rounded-2xl flex flex-col justify-between text-left group transition-all hover:scale-[1.02]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Apple className="h-6 w-6 text-slate-100" />
                        {config.chatApp.appStoreComingSoon ? (
                          <span className="text-[10px] font-bold uppercase bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase bg-slate-500/20 text-slate-300 px-2 py-0.5 rounded-full">
                            Available
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-400">Download on the</div>
                        <div className="text-sm font-bold text-white">App Store</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Phone Frame Mockup */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="phone-mockup relative flex flex-col shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_40px_-10px_rgba(168,85,247,0.3)]">
                <div className="pt-8 px-4 pb-3 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center text-xs font-bold">O</div>
                    <div>
                      <div className="text-xs font-bold leading-none">Ovi Rajemon</div>
                      <div className="text-[9px] text-emerald-400">● Active now</div>
                    </div>
                  </div>
                  <PhoneCall className="h-4 w-4 text-purple-400" />
                </div>
                <div className="flex-1 p-4 space-y-3 flex flex-col justify-end">
                  <div className="self-center text-[10px] text-slate-500 font-mono py-1 px-3 bg-white/5 rounded-full flex items-center gap-1">
                    <Lock className="h-2.5 w-2.5 text-purple-400" /> End-to-end encrypted
                  </div>
                  <div className="self-start max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-800 p-2.5 text-xs text-slate-200">
                    Hey! Have you downloaded the new HiMewo Chat app? 💬✨
                  </div>
                  <div className="self-end max-w-[80%] rounded-2xl rounded-tr-sm aurora-gradient p-2.5 text-xs text-white shadow-md">
                    Yes! Voice calls and messaging are ultra smooth! 🚀
                  </div>
                  <div className="self-start max-w-[80%] rounded-2xl rounded-tl-sm bg-slate-800 p-2.5 text-xs text-slate-200">
                    Audio messages & stickers load instantly! 🎉
                  </div>
                </div>
                <div className="p-3 border-t border-white/10 flex items-center gap-2">
                  <div className="flex-1 h-8 rounded-full bg-slate-900 border border-white/10 px-3 flex items-center text-xs text-slate-500">
                    Type a message...
                  </div>
                  <div className="w-8 h-8 rounded-full aurora-gradient flex items-center justify-center text-white text-xs">
                    ➤
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/10 bg-[#080c14] text-xs text-slate-500 text-center space-y-4">
        <div className="flex flex-wrap justify-center gap-6 text-slate-400 font-medium">
          <a href="https://himewo.com" className="hover:text-white transition-colors">
            HiMewo Social Web
          </a>
          <a href="https://ads.himewo.com" className="hover:text-white transition-colors">
            Ads Manager
          </a>
          <a href="https://admin.himewo.com" className="hover:text-white transition-colors">
            Admin Console
          </a>
          <a href="https://himewo.com/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </a>
          <a href="https://himewo.com/terms" className="hover:text-white transition-colors">
            Terms of Service
          </a>
        </div>
        <p>HiMewo Ecosystem © 2026 · All Rights Reserved.</p>
      </footer>

      {/* "Coming Soon" Dialog Modal */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="glass-panel border border-white/20 rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl space-y-5">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Sparkles className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">
                {activeModal.store} Release Coming Soon!
              </h3>
              <p className="text-sm text-slate-400 mt-1.5 leading-relaxed">
                <strong>{activeModal.appName}</strong> is currently undergoing store review for {activeModal.store}. In the meantime, you can download the <strong>Direct APK</strong> right now!
              </p>
            </div>

            <div className="pt-2 space-y-3">
              {activeModal.directUrl && (
                <a
                  href={activeModal.directUrl}
                  download
                  onClick={() => setActiveModal(null)}
                  className="w-full aurora-gradient py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download Direct APK Now
                </a>
              )}
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
