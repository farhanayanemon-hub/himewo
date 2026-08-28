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
  Video,
  ShoppingBag,
  Bell,
  Heart,
  Share2,
  Lock,
  PhoneCall,
  CheckCircle2,
  ChevronRight,
  Laptop,
  Layers,
  X,
  Send,
  MessageCircle,
} from "lucide-react";

function GooglePlayIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M48.7 18.2C44.8 22.3 42.6 28.6 42.6 36.8V475.2C42.6 483.4 44.8 489.7 48.7 493.8L50.2 495.2L282.8 262.6V249.4L50.2 16.8L48.7 18.2Z"
        fill="url(#gp_blue)"
      />
      <path
        d="M360.2 340.1L282.8 262.6V249.4L360.3 171.9L362 172.9L453.6 224.9C479.7 239.7 479.7 272.3 453.6 287.1L362 339.1L360.2 340.1Z"
        fill="url(#gp_yellow)"
      />
      <path
        d="M362 339.1L282.8 256L48.7 493.8C57.3 502.9 71.3 503.9 87.2 494.9L362 339.1Z"
        fill="url(#gp_red)"
      />
      <path
        d="M362 172.9L87.2 17.1C71.3 8.1 57.3 9.1 48.7 18.2L282.8 256L362 172.9Z"
        fill="url(#gp_green)"
      />
      <defs>
        <linearGradient id="gp_blue" x1="262.5" y1="42.6" x2="35.5" y2="269.6" gradientUnits="userSpaceOnUse">
          <stop stopColor="#00A0FF" />
          <stop offset="0.007" stopColor="#00A1FF" />
          <stop offset="0.26" stopColor="#00BEFF" />
          <stop offset="0.512" stopColor="#00D2FF" />
          <stop offset="0.76" stopColor="#00DFFF" />
          <stop offset="1" stopColor="#00E3FF" />
        </linearGradient>
        <linearGradient id="gp_yellow" x1="486.2" y1="256" x2="38.7" y2="256" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE000" />
          <stop offset="0.409" stopColor="#FFBD00" />
          <stop offset="0.775" stopColor="#FFA500" />
          <stop offset="1" stopColor="#FF9C00" />
        </linearGradient>
        <linearGradient id="gp_red" x1="384.6" y1="316.5" x2="114" y2="587.1" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF3A44" />
          <stop offset="1" stopColor="#C31162" />
        </linearGradient>
        <linearGradient id="gp_green" x1="114" y1="-75.1" x2="384.6" y2="195.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="#32A071" />
          <stop offset="0.069" stopColor="#2DA771" />
          <stop offset="0.476" stopColor="#15CF74" />
          <stop offset="0.801" stopColor="#06E775" />
          <stop offset="1" stopColor="#00F076" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AppStoreIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 512 512" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="512" height="512" rx="115" fill="url(#as_bg)" />
      <path
        d="M208.5 137.2c-5.2-9-15.6-13.8-25.9-12-10.3 1.8-18.4 9.8-20.3 20.1-1.9 10.3 2.9 20.7 11.9 25.9l121.2 210c5.2 9 15.6 13.8 25.9 12 10.3-1.8 18.4-9.8 20.3-20.1 1.9-10.3-2.9-20.7-11.9-25.9L208.5 137.2z"
        fill="white"
      />
      <path
        d="M327.4 137.2l-40.8 70.7 41.5 24 30.6-53c5.2-9 4-20.4-3-28.1-7-7.7-18.3-9.5-27.3-4.3l-.9.7-.1-.0z"
        fill="white"
      />
      <path
        d="M178.6 395.2l34.8-60.3-41.5-24-24.6 42.6c-5.2 9-4 20.4 3 28.1 7.1 7.8 18.4 9.6 27.5 4.3l.8-.7z"
        fill="white"
      />
      <path
        d="M136.2 299.7h239.6c10.4 0 19.8-6.4 23.5-16.1 3.7-9.7 1-20.7-6.8-27.5-7.8-6.8-19.1-8.3-28.5-3.8l-1.8.9H149.8c-10.4 0-19.8 6.4-23.5 16.1-3.7 9.7-1 20.7 6.8 27.5 3.3 2.9 7.4 4.5 11.7 4.5l11.4-1.6z"
        fill="white"
      />
      <defs>
        <linearGradient id="as_bg" x1="256" y1="0" x2="256" y2="512" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1E9DFB" />
          <stop offset="1" stopColor="#0B64FE" />
        </linearGradient>
      </defs>
    </svg>
  );
}

function AppleLogoIcon({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 170 170" fill="currentColor">
      <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.08-7.6-7.81-11.7-14.18-6.19-9.58-11.01-20.57-14.46-32.96-3.45-12.39-5.18-24.08-5.18-35.07 0-14.7 3.65-26.69 10.96-35.98 7.31-9.29 16.48-14.07 27.5-14.34 4.58 0 9.87 1.25 15.88 3.76 6 2.51 10.02 3.82 12.06 3.94 1.63 0 5.86-1.39 12.69-4.16 6.83-2.77 12.61-4.01 17.33-3.71 13.06.84 23.36 5.83 30.9 14.97-11.53 7.02-17.18 16.74-16.96 29.17.22 10.14 4.1 18.57 11.64 25.29 7.54 6.72 16.59 10.42 27.15 11.11-2.4 7.42-5.46 14.95-9.17 22.58zM119.22 31.84c0-7.39 2.66-14.4 7.98-21.03 5.32-6.63 11.93-10.45 19.82-11.45.22 1.09.33 2.07.33 2.94 0 7.39-2.77 14.28-8.31 20.67-5.54 6.39-12.26 10.23-20.15 11.51-.11-.87-.17-1.75-.17-2.64z" />
    </svg>
  );
}

interface FloatingMessage {
  sender: string;
  text: string;
  emoji: string;
  time: string;
  avatarColor: string;
}

interface AppLandingConfig {
  hero: {
    badge: string;
    headline: string;
    subheadline: string;
    webUrl: string;
    webButtonText: string;
  };
  images: {
    webDesktopImage: string;
    webMobileImage: string;
    socialMobileImage: string;
    chatMobileImage: string;
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
  floatingMessages: {
    social: FloatingMessage[];
    chat: FloatingMessage[];
  };
}

const DEFAULT_CONFIG: AppLandingConfig = {
  hero: {
    badge: "Available on Web, Android & iOS",
    headline: "Connect, Share & Chat seamlessly with HiMewo",
    subheadline:
      "Experience next-generation social networking and instant messaging. Designed with a clean, ultra-fast purple & white experience.",
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
    description:
      "Connect with friends, share stories, explore creator feeds, buy & sell on digital stalls without installing anything.",
    url: "https://himewo.com",
    buttonText: "Open HiMewo Web",
    features: [
      "Rich newsfeed, stories & HD reels",
      "Full e-commerce shop & digital stalls",
      "Live streaming & community groups",
      "Clean purple & white ultra-fast interface",
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
    directUrl: "https://github.com/farhanayanemon-hub/himewo/releases/download/v1.0.0/himewo-social.apk",
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
    directUrl: "https://github.com/farhanayanemon-hub/himewo/releases/download/v1.0.0/himewo-chat.apk",
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

export default function App() {
  const [config, setConfig] = useState<AppLandingConfig>(DEFAULT_CONFIG);
  const [activeModal, setActiveModal] = useState<{
    appName: string;
    store: "Play Store" | "App Store";
    directUrl: string;
  } | null>(null);

  useEffect(() => {
    fetch("https://workspaceapi-server-production-5e99.up.railway.app/api/app-landing/config")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.hero) {
          setConfig({
            ...DEFAULT_CONFIG,
            ...data,
            images: { ...DEFAULT_CONFIG.images, ...(data.images || {}) },
            floatingMessages: { ...DEFAULT_CONFIG.floatingMessages, ...(data.floatingMessages || {}) }
          });
        }
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

  const socialFloating = config.floatingMessages?.social?.length ? config.floatingMessages.social : DEFAULT_CONFIG.floatingMessages.social;
  const chatFloating = config.floatingMessages?.chat?.length ? config.floatingMessages.chat : DEFAULT_CONFIG.floatingMessages.chat;

  return (
    <div className="min-h-screen bg-[#faf5ff] text-[#1e1b4b] relative overflow-hidden font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Background Ambient Purple Glow */}
      <div className="pointer-events-none absolute top-[-5%] left-[10%] h-[550px] w-[550px] rounded-full bg-purple-300/30 blur-[130px]" />
      <div className="pointer-events-none absolute top-[25%] right-[-5%] h-[600px] w-[600px] rounded-full bg-fuchsia-300/25 blur-[150px]" />
      <div className="pointer-events-none absolute bottom-[10%] left-[-5%] h-[500px] w-[500px] rounded-full bg-indigo-300/25 blur-[140px]" />

      {/* Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-purple-100 bg-white/90 backdrop-blur-md shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <a href="https://himewo.com" className="flex items-center gap-3 group">
            <div className="purple-gradient h-11 w-11 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-[0_8px_20px_rgba(147,51,234,0.3)] group-hover:scale-105 transition-transform">
              H
            </div>
            <span className="font-['Outfit',sans-serif] text-2xl font-black tracking-tight purple-gradient-text">
              HiMewo
            </span>
          </a>

          <nav className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600">
            <a href="#web" className="hover:text-purple-700 transition-colors">
              Web Platform
            </a>
            <a href="#mobile" className="hover:text-purple-700 transition-colors flex items-center gap-1.5">
              <Smartphone className="h-4 w-4 text-purple-600" />
              Social App
            </a>
            <a href="#chat" className="hover:text-purple-700 transition-colors flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-fuchsia-600" />
              Chat Messenger
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href={config.hero.webUrl || "https://himewo.com"}
              className="purple-gradient purple-gradient-hover px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-lg shadow-purple-500/25 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-2"
            >
              <Globe className="h-4 w-4" />
              {config.hero.webButtonText || "Launch Web App"}
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-16 sm:pt-24 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-100/80 border border-purple-200 text-xs font-bold text-purple-800 mb-6 shadow-xs">
          <Sparkles className="h-4 w-4 text-purple-600 animate-pulse" />
          <span>{config.hero.badge}</span>
        </div>

        <h1 className="font-['Outfit',sans-serif] text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] max-w-4xl mx-auto text-slate-900">
          {config.hero.headline.split("HiMewo")[0]}
          <span className="purple-gradient-text">HiMewo</span>
          {config.hero.headline.split("HiMewo")[1] || ""}
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
          {config.hero.subheadline}
        </p>

        {/* Quick Tier Jump Navigation */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <a
            href="#mobile"
            className="clean-card px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-900 flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-700">
              <Smartphone className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-purple-600 font-semibold uppercase tracking-wider">Social App</div>
              <div className="text-sm font-bold text-slate-900">HiMewo Mobile</div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 ml-1" />
          </a>

          <a
            href="#chat"
            className="clean-card px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-900 flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-xl bg-fuchsia-100 flex items-center justify-center text-fuchsia-700">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-fuchsia-600 font-semibold uppercase tracking-wider">Dedicated Chat</div>
              <div className="text-sm font-bold text-slate-900">HiMewo Messenger</div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 ml-1" />
          </a>

          <a
            href="#web"
            className="clean-card px-6 py-3.5 rounded-2xl font-bold text-sm text-slate-900 flex items-center gap-3"
          >
            <div className="h-9 w-9 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-700">
              <Globe className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">Browser Version</div>
              <div className="text-sm font-bold text-slate-900">Web Platform</div>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-400 ml-1" />
          </a>
        </div>
      </section>

      {/* TIER 1: HiMewo Web Platform (Laptop + Companion Mobile Mockups) */}
      <section id="web" className="py-20 bg-white border-y border-purple-100 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="clean-glass-panel rounded-3xl p-8 sm:p-12 lg:p-16 relative overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Text Information */}
              <div className="lg:col-span-5 space-y-6">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold uppercase tracking-wider border border-indigo-200">
                  <Globe className="h-3.5 w-3.5" />
                  Tier 1 · Direct Web Access
                </div>
                <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                  {config.webSection.title}
                </h2>
                <p className="text-lg font-semibold text-purple-700">
                  {config.webSection.tagline}
                </p>
                <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                  {config.webSection.description}
                </p>

                {/* Features List */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  {config.webSection.features.map((feat, idx) => (
                    <div key={idx} className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
                      <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-4 flex flex-wrap items-center gap-4">
                  <a
                    href={config.webSection.url || "https://himewo.com"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="purple-gradient purple-gradient-hover px-8 py-4 rounded-xl text-base font-bold text-white shadow-xl shadow-purple-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all inline-flex items-center gap-2.5"
                  >
                    <Globe className="h-5 w-5" />
                    {config.webSection.buttonText || "Open HiMewo Web"}
                    <ArrowRight className="h-4 w-4" />
                  </a>
                  <span className="text-xs text-slate-500 font-medium">
                    No installation required · Works in all browsers
                  </span>
                </div>
              </div>

              {/* Laptop + Companion Phone Dual Mockup Display */}
              <div className="lg:col-span-7 relative flex items-center justify-center">
                {/* Main Laptop / Desktop Screen Frame */}
                <div className="laptop-mockup-white w-full">
                  <div className="h-8 bg-slate-100 px-4 flex items-center gap-2 border-b border-purple-100">
                    <div className="flex gap-1.5">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    </div>
                    <div className="ml-3 flex-1 max-w-xs bg-white text-[11px] font-mono text-purple-900 px-3 py-0.5 rounded-md border border-purple-100 truncate shadow-xs">
                      https://himewo.com
                    </div>
                  </div>

                  {config.images?.webDesktopImage ? (
                    <img
                      src={config.images.webDesktopImage}
                      alt="HiMewo Web Platform Desktop"
                      className="w-full h-auto object-cover max-h-[380px]"
                    />
                  ) : (
                    <div className="p-6 bg-gradient-to-b from-purple-50/50 to-white min-h-[300px] space-y-4">
                      <div className="flex items-center justify-between border-b border-purple-100 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl purple-gradient flex items-center justify-center text-white font-bold">H</div>
                          <div>
                            <div className="h-3 w-32 bg-purple-200 rounded" />
                            <div className="h-2 w-20 bg-purple-100 rounded mt-1.5" />
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <div className="w-8 h-8 rounded-lg bg-purple-100" />
                          <div className="w-8 h-8 rounded-lg bg-purple-100" />
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl bg-purple-50 p-3 border border-purple-100 space-y-2">
                          <div className="h-3 w-20 bg-purple-200 rounded" />
                          <div className="h-16 w-full rounded-lg bg-white border border-purple-100 flex items-center justify-center text-[10px] text-purple-700 font-bold">
                            Live Newsfeed
                          </div>
                        </div>
                        <div className="rounded-xl bg-fuchsia-50 p-3 border border-fuchsia-100 space-y-2">
                          <div className="h-3 w-20 bg-fuchsia-200 rounded" />
                          <div className="h-16 w-full rounded-lg bg-white border border-fuchsia-100 flex items-center justify-center text-[10px] text-fuchsia-700 font-bold">
                            Creator Reels 🎥
                          </div>
                        </div>
                        <div className="rounded-xl bg-indigo-50 p-3 border border-indigo-100 space-y-2">
                          <div className="h-3 w-20 bg-indigo-200 rounded" />
                          <div className="h-16 w-full rounded-lg bg-white border border-indigo-100 flex items-center justify-center text-[10px] text-indigo-700 font-bold">
                            Shop Stalls 🛍️
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Companion Mobile Phone Frame Overlay */}
                <div className="absolute -bottom-6 -right-2 sm:-right-4 w-[160px] sm:w-[190px] h-[320px] sm:h-[380px] rounded-[32px] bg-white border-[6px] sm:border-[8px] border-[#f3e8ff] shadow-2xl overflow-hidden z-20 hidden md:block">
                  <div className="pt-4 px-2.5 pb-2 border-b border-purple-100 bg-purple-50 flex items-center justify-between text-[10px] font-bold text-purple-900">
                    <span>HiMewo Web</span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  </div>
                  {config.images?.webMobileImage ? (
                    <img
                      src={config.images.webMobileImage}
                      alt="HiMewo Web Mobile View"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="p-3 bg-white space-y-2">
                      <div className="w-full h-16 rounded-xl purple-gradient-subtle border border-purple-100 p-2 flex flex-col justify-between">
                        <span className="text-[9px] font-bold text-purple-900">Mobile Responsive</span>
                        <span className="text-[8px] text-purple-600">Synced in Real-time ⚡</span>
                      </div>
                      <div className="space-y-1.5">
                        <div className="h-2 w-3/4 bg-slate-200 rounded" />
                        <div className="h-2 w-1/2 bg-slate-100 rounded" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TIER 2: HiMewo Mobile App (Social App) with Auto-Floating Messages */}
      <section id="mobile" className="py-24 relative bg-[#faf5ff]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Phone Frame + Continuous Floating Comments/Messages */}
            <div className="lg:col-span-5 flex justify-center order-2 lg:order-1 relative">
              {/* Floating Stream of Messages Emerging Upward from the Phone */}
              <div className="absolute -top-16 inset-x-0 flex flex-col items-center pointer-events-none z-30 space-y-2">
                {socialFloating.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className={`clean-card px-4 py-2.5 rounded-2xl shadow-xl border border-purple-200/80 bg-white/95 backdrop-blur-md flex items-center gap-3 w-[270px] ${
                      idx === 0
                        ? "animate-float-up-1"
                        : idx === 1
                        ? "animate-float-up-2"
                        : "animate-float-up-3"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${item.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs`}>
                      {item.sender.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">{item.sender}</span>
                        <span className="text-[10px] text-purple-600 font-semibold">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">{item.text}</p>
                    </div>
                    <span className="text-base">{item.emoji}</span>
                  </div>
                ))}
              </div>

              {/* White & Purple Social Phone Frame */}
              <div className="phone-mockup-white relative flex flex-col z-10 mt-6">
                <div className="pt-8 px-4 pb-3 border-b border-purple-100 bg-purple-50/50 flex items-center justify-between">
                  <span className="font-bold text-sm text-purple-900">HiMewo Social</span>
                  <div className="flex gap-2 text-purple-600">
                    <Bell className="h-4 w-4" />
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                </div>

                {config.images?.socialMobileImage ? (
                  <img
                    src={config.images.socialMobileImage}
                    alt="HiMewo Social App Screenshot"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex-1 p-4 space-y-3 bg-white overflow-hidden">
                    <div className="flex gap-2 overflow-x-hidden pb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="w-14 h-20 rounded-xl bg-purple-50 border border-purple-200 shrink-0 flex flex-col justify-end p-1.5 text-[9px] font-bold text-purple-900"
                        >
                          Story {i}
                        </div>
                      ))}
                    </div>
                    <div className="rounded-2xl bg-purple-50/40 p-3 border border-purple-100 space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full purple-gradient flex items-center justify-center text-white text-xs font-bold">F</div>
                        <div>
                          <div className="text-[11px] font-bold text-slate-900">Farhan Ayan Emon</div>
                          <div className="text-[9px] text-purple-500">2h ago · 🌍</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-slate-700">
                        Loving the clean purple & white design on HiMewo Mobile! 💜✨
                      </div>
                      <div className="h-28 w-full rounded-xl bg-gradient-to-tr from-purple-600/10 to-fuchsia-600/10 border border-purple-100 flex items-center justify-center text-[10px] text-purple-800 font-bold">
                        HiMewo Social App Experience
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
                        <span className="flex items-center gap-1 text-rose-500 font-semibold"><Heart className="h-3 w-3 fill-rose-500" /> 184 Likes</span>
                        <span className="flex items-center gap-1 text-purple-700 font-semibold"><Share2 className="h-3 w-3" /> Share</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-3 border-t border-purple-100 bg-purple-50/40 flex justify-around text-purple-600">
                  <Globe className="h-4 w-4" />
                  <Video className="h-4 w-4" />
                  <ShoppingBag className="h-4 w-4" />
                  <Bell className="h-4 w-4" />
                </div>
              </div>
            </div>

            {/* Content & 3 Download Buttons */}
            <div className="lg:col-span-7 space-y-6 order-1 lg:order-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-100 text-purple-800 text-xs font-bold uppercase tracking-wider border border-purple-200">
                <Smartphone className="h-3.5 w-3.5" />
                Tier 2 · Mobile Social Experience
              </div>

              <div className="flex items-center gap-3">
                <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                  {config.mobileApp.title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full border border-purple-200 bg-purple-50 text-purple-800 text-xs font-mono font-bold">
                  {config.mobileApp.version}
                </span>
              </div>

              <p className="text-lg font-semibold text-purple-700">
                {config.mobileApp.tagline}
              </p>

              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                {config.mobileApp.description}
              </p>

              {/* Features List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {config.mobileApp.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-purple-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* 3 Download Buttons */}
              <div className="pt-4 space-y-3">
                <div className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Choose your download option:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Button 1: Direct APK */}
                  {config.mobileApp.directEnabled && (
                    <a
                      href={config.mobileApp.directUrl}
                      download
                      className="clean-card p-4 rounded-2xl flex flex-col justify-between group hover:border-purple-500 bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Download className="h-6 w-6 text-purple-600 group-hover:translate-y-0.5 transition-transform" />
                        <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                          41.8 MB · Direct APK
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Instant Download · Verified APK</div>
                        <div className="text-sm font-bold text-slate-900">
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
                      className="clean-card p-4 rounded-2xl flex flex-col justify-between text-left group hover:border-purple-500 bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <GooglePlayIcon className="h-7 w-7 shrink-0 group-hover:scale-105 transition-transform" />
                        {config.mobileApp.playStoreComingSoon ? (
                          <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            Available
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium">GET IT ON</div>
                        <div className="text-sm font-bold text-slate-900">Google Play</div>
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
                      className="clean-card p-4 rounded-2xl flex flex-col justify-between text-left group hover:border-purple-500 bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <AppleLogoIcon className="h-7 w-7 text-slate-900 shrink-0 group-hover:scale-105 transition-transform" />
                        {config.mobileApp.appStoreComingSoon ? (
                          <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                            Available
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium">Download on the</div>
                        <div className="text-sm font-bold text-slate-900">App Store</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TIER 3: HiMewo Chat App (Messenger) with Auto-Floating Messages */}
      <section id="chat" className="py-24 relative bg-white border-t border-purple-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Content & 3 Download Buttons */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-100 text-fuchsia-800 text-xs font-bold uppercase tracking-wider border border-fuchsia-200">
                <MessageSquare className="h-3.5 w-3.5" />
                Tier 3 · Standalone Messenger
              </div>

              <div className="flex items-center gap-3">
                <h2 className="font-['Outfit',sans-serif] text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
                  {config.chatApp.title}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full border border-fuchsia-200 bg-fuchsia-50 text-fuchsia-800 text-xs font-mono font-bold">
                  {config.chatApp.version}
                </span>
              </div>

              <p className="text-lg font-semibold text-fuchsia-700">
                {config.chatApp.tagline}
              </p>

              <p className="text-slate-600 leading-relaxed text-sm sm:text-base">
                {config.chatApp.description}
              </p>

              {/* Features List */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                {config.chatApp.features.map((feat, idx) => (
                  <div key={idx} className="flex items-center gap-2.5 text-sm text-slate-700 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-fuchsia-600 shrink-0" />
                    <span>{feat}</span>
                  </div>
                ))}
              </div>

              {/* 3 Download Buttons */}
              <div className="pt-4 space-y-3">
                <div className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                  Choose your download option:
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Button 1: Direct APK */}
                  {config.chatApp.directEnabled && (
                    <a
                      href={config.chatApp.directUrl}
                      download
                      className="clean-card p-4 rounded-2xl flex flex-col justify-between group hover:border-fuchsia-500 bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <Download className="h-6 w-6 text-fuchsia-600 group-hover:translate-y-0.5 transition-transform" />
                        <span className="text-[10px] font-bold uppercase bg-fuchsia-100 text-fuchsia-800 px-2 py-0.5 rounded-full">
                          56.0 MB · Direct APK
                        </span>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 font-medium">Instant Download · Verified APK</div>
                        <div className="text-sm font-bold text-slate-900">
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
                      className="clean-card p-4 rounded-2xl flex flex-col justify-between text-left group hover:border-fuchsia-500 bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <GooglePlayIcon className="h-7 w-7 shrink-0 group-hover:scale-105 transition-transform" />
                        {config.chatApp.playStoreComingSoon ? (
                          <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                            Available
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium">GET IT ON</div>
                        <div className="text-sm font-bold text-slate-900">Google Play</div>
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
                      className="clean-card p-4 rounded-2xl flex flex-col justify-between text-left group hover:border-fuchsia-500 bg-white"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <AppleLogoIcon className="h-7 w-7 text-slate-900 shrink-0 group-hover:scale-105 transition-transform" />
                        {config.chatApp.appStoreComingSoon ? (
                          <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                            Coming Soon
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold uppercase bg-fuchsia-100 text-fuchsia-800 px-2 py-0.5 rounded-full">
                            Available
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="text-[11px] text-slate-500 font-medium">Download on the</div>
                        <div className="text-sm font-bold text-slate-900">App Store</div>
                      </div>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Chat Phone Frame + Continuous Floating Messages */}
            <div className="lg:col-span-5 flex justify-center relative">
              {/* Floating Stream of Messages Emerging Upward from the Chat Phone */}
              <div className="absolute -top-16 inset-x-0 flex flex-col items-center pointer-events-none z-30 space-y-2">
                {chatFloating.slice(0, 3).map((item, idx) => (
                  <div
                    key={idx}
                    className={`clean-card px-4 py-2.5 rounded-2xl shadow-xl border border-fuchsia-200/80 bg-white/95 backdrop-blur-md flex items-center gap-3 w-[270px] ${
                      idx === 0
                        ? "animate-float-up-1"
                        : idx === 1
                        ? "animate-float-up-2"
                        : "animate-float-up-3"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full ${item.avatarColor} text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs`}>
                      {item.sender.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 truncate">{item.sender}</span>
                        <span className="text-[10px] text-fuchsia-600 font-semibold">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-slate-600 truncate">{item.text}</p>
                    </div>
                    <span className="text-base">{item.emoji}</span>
                  </div>
                ))}
              </div>

              {/* White & Purple Chat Phone Frame */}
              <div className="phone-mockup-white relative flex flex-col z-10 mt-6 shadow-[0_25px_60px_-15px_rgba(192,38,211,0.2)]">
                <div className="pt-8 px-4 pb-3 border-b border-fuchsia-100 bg-fuchsia-50/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-fuchsia-600 text-white flex items-center justify-center text-xs font-bold">O</div>
                    <div>
                      <div className="text-xs font-bold leading-none text-slate-900">Ovi Rajemon</div>
                      <div className="text-[9px] text-emerald-600 font-semibold">● Active now</div>
                    </div>
                  </div>
                  <PhoneCall className="h-4 w-4 text-fuchsia-600" />
                </div>

                {config.images?.chatMobileImage ? (
                  <img
                    src={config.images.chatMobileImage}
                    alt="HiMewo Chat App Screenshot"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex-1 p-4 space-y-3 flex flex-col justify-end bg-white">
                    <div className="self-center text-[10px] text-purple-800 font-semibold py-1 px-3 bg-purple-50 border border-purple-100 rounded-full flex items-center gap-1">
                      <Lock className="h-2.5 w-2.5 text-purple-600" /> End-to-end encrypted
                    </div>
                    <div className="self-start max-w-[80%] rounded-2xl rounded-tl-sm bg-purple-50 border border-purple-100 p-2.5 text-xs text-slate-800">
                      Hey! Have you downloaded the new HiMewo Chat app? 💬✨
                    </div>
                    <div className="self-end max-w-[80%] rounded-2xl rounded-tr-sm purple-gradient p-2.5 text-xs text-white shadow-md">
                      Yes! Voice calls and messaging are ultra smooth! 🚀
                    </div>
                    <div className="self-start max-w-[80%] rounded-2xl rounded-tl-sm bg-purple-50 border border-purple-100 p-2.5 text-xs text-slate-800">
                      Audio messages & stickers load instantly! 🎉
                    </div>
                  </div>
                )}

                <div className="p-3 border-t border-purple-100 bg-purple-50/40 flex items-center gap-2">
                  <div className="flex-1 h-8 rounded-full bg-white border border-purple-200 px-3 flex items-center text-xs text-slate-400">
                    Type a message...
                  </div>
                  <div className="w-8 h-8 rounded-full purple-gradient flex items-center justify-center text-white text-xs">
                    ➤
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-purple-100 bg-white text-xs text-slate-500 text-center space-y-4">
        <div className="flex flex-wrap justify-center gap-6 text-purple-800 font-semibold">
          <a href="https://himewo.com" className="hover:text-purple-600 transition-colors">
            HiMewo Social Web
          </a>
          <a href="https://ads.himewo.com" className="hover:text-purple-600 transition-colors">
            Ads Manager
          </a>
          <a href="https://admin.himewo.com" className="hover:text-purple-600 transition-colors">
            Admin Console
          </a>
          <a href="https://himewo.com/privacy" className="hover:text-purple-600 transition-colors">
            Privacy Policy
          </a>
          <a href="https://himewo.com/terms" className="hover:text-purple-600 transition-colors">
            Terms of Service
          </a>
        </div>
        <p className="text-slate-400">HiMewo Ecosystem © 2026 · All Rights Reserved.</p>
      </footer>

      {/* "Coming Soon" Modal Dialog */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="clean-card rounded-3xl p-6 sm:p-8 max-w-md w-full relative shadow-2xl space-y-5 bg-white border-purple-200">
            <button
              type="button"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-purple-50 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-purple-100 flex items-center justify-center shadow-xs">
              {activeModal.store === "Play Store" ? (
                <GooglePlayIcon className="h-9 w-9" />
              ) : (
                <AppleLogoIcon className="h-9 w-9 text-slate-900" />
              )}
            </div>

            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {activeModal.store} Release Coming Soon!
              </h3>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                <strong>{activeModal.appName}</strong> is currently undergoing store review for {activeModal.store}. In the meantime, you can download the <strong>Direct APK</strong> right now!
              </p>
            </div>

            <div className="pt-2 space-y-3">
              {activeModal.directUrl && (
                <a
                  href={activeModal.directUrl}
                  download
                  onClick={() => setActiveModal(null)}
                  className="w-full purple-gradient purple-gradient-hover py-3.5 px-4 rounded-xl text-sm font-bold text-white shadow-lg flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Download className="h-4 w-4" />
                  Download Direct APK Now
                </a>
              )}
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
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
