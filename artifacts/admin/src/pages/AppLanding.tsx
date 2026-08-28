import { useEffect, useState } from "react";
import {
  Smartphone,
  MessageSquare,
  Globe,
  Save,
  ExternalLink,
  Sparkles,
  Download,
  Apple,
  CheckCircle2,
  Image as ImageIcon,
  Plus,
  Trash2,
  Layers,
  Laptop,
} from "lucide-react";
import { api } from "../lib/api";
import { Button, Input, Card, Badge, Switch, Spinner } from "../components/ui";

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

export function AppLanding() {
  const [config, setConfig] = useState<AppLandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AppLandingConfig>("/app-landing/config")
      .then((data) => {
        setConfig({
          ...data,
          images: data.images || {
            webDesktopImage: "",
            webMobileImage: "",
            socialMobileImage: "",
            chatMobileImage: "",
          },
          floatingMessages: data.floatingMessages || {
            social: [],
            chat: [],
          },
        });
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!config) return;
    setSaving(true);
    setMsg(null);
    try {
      await api.put("/admin/app-landing/config", config);
      setMsg("App landing page settings saved successfully!");
    } catch (e: any) {
      setMsg(`Error: ${e?.message || "Failed to save"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleAddFloatingSocial = () => {
    if (!config) return;
    const current = config.floatingMessages?.social || [];
    setConfig({
      ...config,
      floatingMessages: {
        ...config.floatingMessages,
        social: [
          ...current,
          {
            sender: "User",
            text: "Loving HiMewo Mobile! 🚀",
            emoji: "🔥",
            time: "Just now",
            avatarColor: "bg-purple-500",
          },
        ],
      },
    });
  };

  const handleRemoveFloatingSocial = (index: number) => {
    if (!config) return;
    const current = [...(config.floatingMessages?.social || [])];
    current.splice(index, 1);
    setConfig({
      ...config,
      floatingMessages: {
        ...config.floatingMessages,
        social: current,
      },
    });
  };

  const handleAddFloatingChat = () => {
    if (!config) return;
    const current = config.floatingMessages?.chat || [];
    setConfig({
      ...config,
      floatingMessages: {
        ...config.floatingMessages,
        chat: [
          ...current,
          {
            sender: "Friend",
            text: "Let's voice call now! 🎙️",
            emoji: "📞",
            time: "Active now",
            avatarColor: "bg-purple-600",
          },
        ],
      },
    });
  };

  const handleRemoveFloatingChat = (index: number) => {
    if (!config) return;
    const current = [...(config.floatingMessages?.chat || [])];
    current.splice(index, 1);
    setConfig({
      ...config,
      floatingMessages: {
        ...config.floatingMessages,
        chat: current,
      },
    });
  };

  if (loading || !config) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-purple-600" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Smartphone className="h-7 w-7 text-purple-600" />
            App Landing Page Manager
          </h1>
          <p className="text-sm text-slate-500">
            Control all 4 screenshots, floating messages, headlines, download links & "Coming Soon" badges for <strong>app.himewo.com</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://app.himewo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-purple-200 bg-purple-50 px-3.5 py-2 text-xs font-semibold text-purple-800 hover:bg-purple-100 shadow-sm"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Live Preview (app.himewo.com)
          </a>
          <Button
            type="submit"
            disabled={saving}
            className="aurora-button text-white inline-flex items-center gap-1.5 px-5 py-2 font-semibold shadow-md"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving Changes..." : "Save All Changes"}
          </Button>
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-xl text-sm font-medium flex items-center gap-2 ${msg.startsWith("Error") ? "bg-rose-50 text-rose-700 border border-rose-200" : "bg-emerald-50 text-emerald-700 border border-emerald-200"}`}>
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          {msg}
        </div>
      )}

      {/* 1. Screenshots & Mockup Images Section (4 Images) */}
      <Card className="p-6 space-y-5 border-l-4 border-l-purple-600">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold">1. App Screenshots & Mockup Images (4 Image Slots)</h2>
          </div>
          <Badge variant="secondary">Visual Customization</Badge>
        </div>

        <p className="text-xs text-slate-500">
          Paste image URLs for each screen. If left empty, the landing page displays high-resolution stylized mockups automatically.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Image 1: Web Desktop Screenshot */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Laptop className="h-4 w-4 text-purple-600" />
                1. Web Desktop / Laptop Screenshot
              </span>
            </div>
            <Input
              value={config.images?.webDesktopImage || ""}
              onChange={(e) => setConfig({
                ...config,
                images: { ...config.images, webDesktopImage: e.target.value }
              })}
              placeholder="https://example.com/web-desktop.png"
            />
            {config.images?.webDesktopImage && (
              <img
                src={config.images.webDesktopImage}
                alt="Web Desktop Preview"
                className="h-24 w-full object-cover rounded-lg border border-slate-200"
              />
            )}
          </div>

          {/* Image 2: Web Mobile View Screenshot */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-indigo-600" />
                2. Web Mobile View Screenshot
              </span>
            </div>
            <Input
              value={config.images?.webMobileImage || ""}
              onChange={(e) => setConfig({
                ...config,
                images: { ...config.images, webMobileImage: e.target.value }
              })}
              placeholder="https://example.com/web-mobile.png"
            />
            {config.images?.webMobileImage && (
              <img
                src={config.images.webMobileImage}
                alt="Web Mobile Preview"
                className="h-24 w-full object-cover rounded-lg border border-slate-200"
              />
            )}
          </div>

          {/* Image 3: HiMewo Social Mobile App Screenshot */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Smartphone className="h-4 w-4 text-purple-600" />
                3. HiMewo Social App Mobile Screenshot
              </span>
            </div>
            <Input
              value={config.images?.socialMobileImage || ""}
              onChange={(e) => setConfig({
                ...config,
                images: { ...config.images, socialMobileImage: e.target.value }
              })}
              placeholder="https://example.com/social-app-screen.png"
            />
            {config.images?.socialMobileImage && (
              <img
                src={config.images.socialMobileImage}
                alt="Social App Preview"
                className="h-24 w-full object-cover rounded-lg border border-slate-200"
              />
            )}
          </div>

          {/* Image 4: HiMewo Chat Messenger App Screenshot */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <MessageSquare className="h-4 w-4 text-fuchsia-600" />
                4. HiMewo Chat Messenger Mobile Screenshot
              </span>
            </div>
            <Input
              value={config.images?.chatMobileImage || ""}
              onChange={(e) => setConfig({
                ...config,
                images: { ...config.images, chatMobileImage: e.target.value }
              })}
              placeholder="https://example.com/chat-app-screen.png"
            />
            {config.images?.chatMobileImage && (
              <img
                src={config.images.chatMobileImage}
                alt="Chat App Preview"
                className="h-24 w-full object-cover rounded-lg border border-slate-200"
              />
            )}
          </div>
        </div>
      </Card>

      {/* 2. Floating Messages & Replies Manager */}
      <Card className="p-6 space-y-6 border-l-4 border-l-fuchsia-600">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-fuchsia-600" />
            <h2 className="text-lg font-bold">2. Auto-Floating Messages & Replies (Rising Out of Phone Screens)</h2>
          </div>
          <Badge variant="secondary">Live Animation Content</Badge>
        </div>

        {/* Social Floating Messages */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-purple-900 dark:text-purple-300">
              A. Floating Messages for HiMewo Social App
            </h3>
            <button
              type="button"
              onClick={handleAddFloatingSocial}
              className="inline-flex items-center gap-1 text-xs font-bold text-purple-700 hover:text-purple-900 bg-purple-100 hover:bg-purple-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Message
            </button>
          </div>

          <div className="space-y-2">
            {(config.floatingMessages?.social || []).map((msg, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <Input
                  className="w-32"
                  value={msg.sender}
                  onChange={(e) => {
                    const list = [...(config.floatingMessages?.social || [])];
                    list[idx].sender = e.target.value;
                    setConfig({
                      ...config,
                      floatingMessages: { ...config.floatingMessages, social: list },
                    });
                  }}
                  placeholder="Sender"
                />
                <Input
                  className="flex-1"
                  value={msg.text}
                  onChange={(e) => {
                    const list = [...(config.floatingMessages?.social || [])];
                    list[idx].text = e.target.value;
                    setConfig({
                      ...config,
                      floatingMessages: { ...config.floatingMessages, social: list },
                    });
                  }}
                  placeholder="Message text"
                />
                <Input
                  className="w-16 text-center"
                  value={msg.emoji}
                  onChange={(e) => {
                    const list = [...(config.floatingMessages?.social || [])];
                    list[idx].emoji = e.target.value;
                    setConfig({
                      ...config,
                      floatingMessages: { ...config.floatingMessages, social: list },
                    });
                  }}
                  placeholder="🔥"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveFloatingSocial(idx)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Chat Floating Messages */}
        <div className="space-y-3 pt-3 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-fuchsia-900 dark:text-fuchsia-300">
              B. Floating Messages for HiMewo Chat Messenger App
            </h3>
            <button
              type="button"
              onClick={handleAddFloatingChat}
              className="inline-flex items-center gap-1 text-xs font-bold text-fuchsia-700 hover:text-fuchsia-900 bg-fuchsia-100 hover:bg-fuchsia-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              <Plus className="h-3.5 w-3.5" /> Add Message
            </button>
          </div>

          <div className="space-y-2">
            {(config.floatingMessages?.chat || []).map((msg, idx) => (
              <div key={idx} className="p-3 rounded-xl border border-slate-200 bg-slate-50 flex items-center gap-3">
                <Input
                  className="w-32"
                  value={msg.sender}
                  onChange={(e) => {
                    const list = [...(config.floatingMessages?.chat || [])];
                    list[idx].sender = e.target.value;
                    setConfig({
                      ...config,
                      floatingMessages: { ...config.floatingMessages, chat: list },
                    });
                  }}
                  placeholder="Sender"
                />
                <Input
                  className="flex-1"
                  value={msg.text}
                  onChange={(e) => {
                    const list = [...(config.floatingMessages?.chat || [])];
                    list[idx].text = e.target.value;
                    setConfig({
                      ...config,
                      floatingMessages: { ...config.floatingMessages, chat: list },
                    });
                  }}
                  placeholder="Message text"
                />
                <Input
                  className="w-16 text-center"
                  value={msg.emoji}
                  onChange={(e) => {
                    const list = [...(config.floatingMessages?.chat || [])];
                    list[idx].emoji = e.target.value;
                    setConfig({
                      ...config,
                      floatingMessages: { ...config.floatingMessages, chat: list },
                    });
                  }}
                  placeholder="💬"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveFloatingChat(idx)}
                  className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* 3. Hero Section Headlines */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold">3. Hero Header Section</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Badge Text</label>
            <Input
              value={config.hero.badge}
              onChange={(e) => setConfig({ ...config, hero: { ...config.hero, badge: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Main Headline</label>
            <Input
              value={config.hero.headline}
              onChange={(e) => setConfig({ ...config, hero: { ...config.hero, headline: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Sub-headline Description</label>
            <Input
              value={config.hero.subheadline}
              onChange={(e) => setConfig({ ...config, hero: { ...config.hero, subheadline: e.target.value } })}
            />
          </div>
        </div>
      </Card>

      {/* 4. HiMewo Web Section */}
      <Card className="p-6 space-y-4 border-l-4 border-l-indigo-500">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold">4. HiMewo Web Platform Section</h2>
          </div>
          <Badge variant="secondary">Tier 1: Web</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Section Title</label>
            <Input
              value={config.webSection.title}
              onChange={(e) => setConfig({ ...config, webSection: { ...config.webSection, title: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Web App URL</label>
            <Input
              value={config.webSection.url}
              onChange={(e) => setConfig({ ...config, webSection: { ...config.webSection, url: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Tagline</label>
            <Input
              value={config.webSection.tagline}
              onChange={(e) => setConfig({ ...config, webSection: { ...config.webSection, tagline: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Description</label>
            <Input
              value={config.webSection.description}
              onChange={(e) => setConfig({ ...config, webSection: { ...config.webSection, description: e.target.value } })}
            />
          </div>
        </div>
      </Card>

      {/* 5. HiMewo Mobile App (Social App) */}
      <Card className="p-6 space-y-5 border-l-4 border-l-purple-600">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold">5. HiMewo Mobile App (Social App)</h2>
          </div>
          <Badge variant="secondary">Tier 2: Mobile Social</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">App Title</label>
            <Input
              value={config.mobileApp.title}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, title: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Version Tag</label>
            <Input
              value={config.mobileApp.version}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, version: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Tagline</label>
            <Input
              value={config.mobileApp.tagline}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, tagline: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Description</label>
            <Input
              value={config.mobileApp.description}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, description: e.target.value } })}
            />
          </div>
        </div>

        {/* Download Buttons Config */}
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-bold text-slate-800">Download Buttons & Links (Mobile App)</h3>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Download className="h-4 w-4 text-purple-600" />
                1. Direct APK Download Link
              </span>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.mobileApp.directEnabled}
                  onChange={(e) => setConfig({
                    ...config,
                    mobileApp: { ...config.mobileApp, directEnabled: e.target.checked }
                  })}
                  className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                />
                Enable
              </label>
            </div>
            <Input
              value={config.mobileApp.directUrl}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, directUrl: e.target.value } })}
              placeholder="https://github.com/farhanayanemon-hub/himewo/releases/download/v1.0.0/himewo-social.apk"
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a2.036 2.036 0 0 1-.22-.964V2.778c0-.36.08-.69.22-.964zM15.207 13.414l2.585-2.586a1.414 1.414 0 0 0 0-2l-2.585-2.585-1.415 1.414 5 5-5 5 1.415-1.243zM4.732.691l10.061 10.06-2.586 2.586L2.146 3.276A2.04 2.04 0 0 1 4.732.69zM14.793 13.25l-10.06 10.06a2.04 2.04 0 0 1-2.587-2.586l10.061-10.06 2.586 2.586z"/></svg>
                2. Google Play Store Link
              </span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-amber-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.mobileApp.playStoreComingSoon}
                    onChange={(e) => setConfig({
                      ...config,
                      mobileApp: { ...config.mobileApp, playStoreComingSoon: e.target.checked }
                    })}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  Coming Soon
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.mobileApp.playStoreEnabled}
                    onChange={(e) => setConfig({
                      ...config,
                      mobileApp: { ...config.mobileApp, playStoreEnabled: e.target.checked }
                    })}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  Enable
                </label>
              </div>
            </div>
            <Input
              value={config.mobileApp.playStoreUrl}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, playStoreUrl: e.target.value } })}
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Apple className="h-4 w-4 text-slate-900" />
                3. Apple App Store Link
              </span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-amber-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.mobileApp.appStoreComingSoon}
                    onChange={(e) => setConfig({
                      ...config,
                      mobileApp: { ...config.mobileApp, appStoreComingSoon: e.target.checked }
                    })}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  Coming Soon
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.mobileApp.appStoreEnabled}
                    onChange={(e) => setConfig({
                      ...config,
                      mobileApp: { ...config.mobileApp, appStoreEnabled: e.target.checked }
                    })}
                    className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  Enable
                </label>
              </div>
            </div>
            <Input
              value={config.mobileApp.appStoreUrl}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, appStoreUrl: e.target.value } })}
            />
          </div>
        </div>
      </Card>

      {/* 6. HiMewo Chat App */}
      <Card className="p-6 space-y-5 border-l-4 border-l-fuchsia-600">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-fuchsia-600" />
            <h2 className="text-lg font-bold">6. HiMewo Chat App (Messenger)</h2>
          </div>
          <Badge variant="secondary">Tier 3: Messenger</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">App Title</label>
            <Input
              value={config.chatApp.title}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, title: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600">Version Tag</label>
            <Input
              value={config.chatApp.version}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, version: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Tagline</label>
            <Input
              value={config.chatApp.tagline}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, tagline: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600">Description</label>
            <Input
              value={config.chatApp.description}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, description: e.target.value } })}
            />
          </div>
        </div>

        {/* Download Buttons Config */}
        <div className="space-y-4 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-bold text-slate-800">Download Buttons & Links (Chat App)</h3>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Download className="h-4 w-4 text-fuchsia-600" />
                1. Direct APK Download Link
              </span>
              <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.chatApp.directEnabled}
                  onChange={(e) => setConfig({
                    ...config,
                    chatApp: { ...config.chatApp, directEnabled: e.target.checked }
                  })}
                  className="rounded text-fuchsia-600 focus:ring-fuchsia-500 h-4 w-4"
                />
                Enable
              </label>
            </div>
            <Input
              value={config.chatApp.directUrl}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, directUrl: e.target.value } })}
              placeholder="https://github.com/farhanayanemon-hub/himewo/releases/download/v1.0.0/himewo-chat.apk"
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a2.036 2.036 0 0 1-.22-.964V2.778c0-.36.08-.69.22-.964zM15.207 13.414l2.585-2.586a1.414 1.414 0 0 0 0-2l-2.585-2.585-1.415 1.414 5 5-5 5 1.415-1.243zM4.732.691l10.061 10.06-2.586 2.586L2.146 3.276A2.04 2.04 0 0 1 4.732.69zM14.793 13.25l-10.06 10.06a2.04 2.04 0 0 1-2.587-2.586l10.061-10.06 2.586 2.586z"/></svg>
                2. Google Play Store Link
              </span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-amber-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.chatApp.playStoreComingSoon}
                    onChange={(e) => setConfig({
                      ...config,
                      chatApp: { ...config.chatApp, playStoreComingSoon: e.target.checked }
                    })}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  Coming Soon
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.chatApp.playStoreEnabled}
                    onChange={(e) => setConfig({
                      ...config,
                      chatApp: { ...config.chatApp, playStoreEnabled: e.target.checked }
                    })}
                    className="rounded text-fuchsia-600 focus:ring-fuchsia-500 h-4 w-4"
                  />
                  Enable
                </label>
              </div>
            </div>
            <Input
              value={config.chatApp.playStoreUrl}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, playStoreUrl: e.target.value } })}
            />
          </div>

          <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold flex items-center gap-2">
                <Apple className="h-4 w-4 text-slate-900" />
                3. Apple App Store Link
              </span>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1.5 text-xs text-amber-600 font-medium cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.chatApp.appStoreComingSoon}
                    onChange={(e) => setConfig({
                      ...config,
                      chatApp: { ...config.chatApp, appStoreComingSoon: e.target.checked }
                    })}
                    className="rounded border-amber-400 text-amber-600 focus:ring-amber-500 h-4 w-4"
                  />
                  Coming Soon
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.chatApp.appStoreEnabled}
                    onChange={(e) => setConfig({
                      ...config,
                      chatApp: { ...config.chatApp, appStoreEnabled: e.target.checked }
                    })}
                    className="rounded text-fuchsia-600 focus:ring-fuchsia-500 h-4 w-4"
                  />
                  Enable
                </label>
              </div>
            </div>
            <Input
              value={config.chatApp.appStoreUrl}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, appStoreUrl: e.target.value } })}
            />
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3 pt-2">
        <Button
          type="submit"
          disabled={saving}
          className="aurora-button text-white px-8 py-3 font-bold text-base shadow-lg"
        >
          <Save className="h-5 w-5 mr-2" />
          {saving ? "Saving Changes..." : "Save All Changes"}
        </Button>
      </div>
    </form>
  );
}
