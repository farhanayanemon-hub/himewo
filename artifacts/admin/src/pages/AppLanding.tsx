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
} from "lucide-react";
import { api } from "../lib/api";
import { Button, Input, Card, Badge, Switch, Spinner } from "../components/ui";

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

export function AppLanding() {
  const [config, setConfig] = useState<AppLandingConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AppLandingConfig>("/app-landing/config")
      .then((data) => {
        setConfig(data);
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

  if (loading || !config) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="h-8 w-8 text-indigo-500" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-12 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Smartphone className="h-7 w-7 text-indigo-500" />
            App Landing Page Manager
          </h1>
          <p className="text-sm text-slate-500">
            Control all headlines, descriptions, download links & "Coming Soon" badges for <strong>app.himewo.com</strong>.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://app.himewo.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 shadow-sm"
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

      {/* 1. Hero Section */}
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
          <Sparkles className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-bold">1. Hero Header Section</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Badge Text</label>
            <Input
              value={config.hero.badge}
              onChange={(e) => setConfig({ ...config, hero: { ...config.hero, badge: e.target.value } })}
              placeholder="e.g. Available on All Platforms"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Main Headline</label>
            <Input
              value={config.hero.headline}
              onChange={(e) => setConfig({ ...config, hero: { ...config.hero, headline: e.target.value } })}
              placeholder="e.g. Connect, Share & Chat seamlessly with HiMewo"
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Sub-headline Description</label>
            <Input
              value={config.hero.subheadline}
              onChange={(e) => setConfig({ ...config, hero: { ...config.hero, subheadline: e.target.value } })}
              placeholder="e.g. Experience next-generation social networking and instant messaging."
            />
          </div>
        </div>
      </Card>

      {/* 2. Web App Section */}
      <Card className="p-6 space-y-4 border-l-4 border-l-indigo-500">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-indigo-500" />
            <h2 className="text-lg font-bold">2. HiMewo Web Section</h2>
          </div>
          <Badge variant="secondary">Tier 1: Web</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Section Title</label>
            <Input
              value={config.webSection.title}
              onChange={(e) => setConfig({ ...config, webSection: { ...config.webSection, title: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Web App URL</label>
            <Input
              value={config.webSection.url}
              onChange={(e) => setConfig({ ...config, webSection: { ...config.webSection, url: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tagline</label>
            <Input
              value={config.webSection.tagline}
              onChange={(e) => setConfig({ ...config, webSection: { ...config.webSection, tagline: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description</label>
            <Input
              value={config.webSection.description}
              onChange={(e) => setConfig({ ...config, webSection: { ...config.webSection, description: e.target.value } })}
            />
          </div>
        </div>
      </Card>

      {/* 3. HiMewo Mobile Social App */}
      <Card className="p-6 space-y-5 border-l-4 border-l-sky-500">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-sky-500" />
            <h2 className="text-lg font-bold">3. HiMewo Mobile App (Social App)</h2>
          </div>
          <Badge variant="secondary">Tier 2: Mobile Social</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">App Title</label>
            <Input
              value={config.mobileApp.title}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, title: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Version Tag</label>
            <Input
              value={config.mobileApp.version}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, version: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tagline</label>
            <Input
              value={config.mobileApp.tagline}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, tagline: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description</label>
            <Input
              value={config.mobileApp.description}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, description: e.target.value } })}
            />
          </div>
        </div>

        {/* Download Buttons Config for Mobile App */}
        <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Download Buttons & Links (Mobile App)</h3>

          {/* Option A: Direct APK */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Download className="h-4 w-4 text-emerald-500" />
                1. Direct APK Download Link
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Enable button</span>
                <input
                  type="checkbox"
                  checked={config.mobileApp.directEnabled}
                  onChange={(e) => setConfig({
                    ...config,
                    mobileApp: { ...config.mobileApp, directEnabled: e.target.checked }
                  })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>
            </div>
            <Input
              value={config.mobileApp.directUrl}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, directUrl: e.target.value } })}
              placeholder="https://himewo.com/downloads/himewo-social.apk"
            />
          </div>

          {/* Option B: Google Play Store */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a2.036 2.036 0 0 1-.22-.964V2.778c0-.36.08-.69.22-.964zM15.207 13.414l2.585-2.586a1.414 1.414 0 0 0 0-2l-2.585-2.585-1.415 1.414 5 5-5 5 1.415-1.243zM4.732.691l10.061 10.06-2.586 2.586L2.146 3.276A2.04 2.04 0 0 1 4.732.69zM14.793 13.25l-10.06 10.06a2.04 2.04 0 0 1-2.587-2.586l10.061-10.06 2.586 2.586z"/></svg>
                2. Google Play Store Link
              </div>
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
                  Mark as "Coming Soon"
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.mobileApp.playStoreEnabled}
                    onChange={(e) => setConfig({
                      ...config,
                      mobileApp: { ...config.mobileApp, playStoreEnabled: e.target.checked }
                    })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  Enable
                </label>
              </div>
            </div>
            <Input
              value={config.mobileApp.playStoreUrl}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, playStoreUrl: e.target.value } })}
              placeholder="https://play.google.com/store/apps/details?id=com.himewo.social"
            />
          </div>

          {/* Option C: Apple App Store */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Apple className="h-4 w-4 text-slate-900 dark:text-white" />
                3. Apple App Store Link
              </div>
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
                  Mark as "Coming Soon"
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.mobileApp.appStoreEnabled}
                    onChange={(e) => setConfig({
                      ...config,
                      mobileApp: { ...config.mobileApp, appStoreEnabled: e.target.checked }
                    })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  Enable
                </label>
              </div>
            </div>
            <Input
              value={config.mobileApp.appStoreUrl}
              onChange={(e) => setConfig({ ...config, mobileApp: { ...config.mobileApp, appStoreUrl: e.target.value } })}
              placeholder="https://apps.apple.com/app/himewo-social/id123456789"
            />
          </div>
        </div>
      </Card>

      {/* 4. HiMewo Chat Messenger App */}
      <Card className="p-6 space-y-5 border-l-4 border-l-purple-500">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-purple-500" />
            <h2 className="text-lg font-bold">4. HiMewo Chat App (Messenger)</h2>
          </div>
          <Badge variant="secondary">Tier 3: Standalone Messenger</Badge>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">App Title</label>
            <Input
              value={config.chatApp.title}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, title: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Version Tag</label>
            <Input
              value={config.chatApp.version}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, version: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Tagline</label>
            <Input
              value={config.chatApp.tagline}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, tagline: e.target.value } })}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-slate-600 dark:text-slate-400">Description</label>
            <Input
              value={config.chatApp.description}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, description: e.target.value } })}
            />
          </div>
        </div>

        {/* Download Buttons Config for Chat App */}
        <div className="space-y-4 border-t border-slate-100 dark:border-slate-800 pt-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">Download Buttons & Links (Chat App)</h3>

          {/* Option A: Direct APK */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Download className="h-4 w-4 text-purple-500" />
                1. Direct APK Download Link
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Enable button</span>
                <input
                  type="checkbox"
                  checked={config.chatApp.directEnabled}
                  onChange={(e) => setConfig({
                    ...config,
                    chatApp: { ...config.chatApp, directEnabled: e.target.checked }
                  })}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
              </div>
            </div>
            <Input
              value={config.chatApp.directUrl}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, directUrl: e.target.value } })}
              placeholder="https://himewo.com/downloads/himewo-chat.apk"
            />
          </div>

          {/* Option B: Google Play Store */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="currentColor"><path d="M3.609 1.814L13.792 12 3.61 22.186a2.036 2.036 0 0 1-.22-.964V2.778c0-.36.08-.69.22-.964zM15.207 13.414l2.585-2.586a1.414 1.414 0 0 0 0-2l-2.585-2.585-1.415 1.414 5 5-5 5 1.415-1.243zM4.732.691l10.061 10.06-2.586 2.586L2.146 3.276A2.04 2.04 0 0 1 4.732.69zM14.793 13.25l-10.06 10.06a2.04 2.04 0 0 1-2.587-2.586l10.061-10.06 2.586 2.586z"/></svg>
                2. Google Play Store Link
              </div>
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
                  Mark as "Coming Soon"
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.chatApp.playStoreEnabled}
                    onChange={(e) => setConfig({
                      ...config,
                      chatApp: { ...config.chatApp, playStoreEnabled: e.target.checked }
                    })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  Enable
                </label>
              </div>
            </div>
            <Input
              value={config.chatApp.playStoreUrl}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, playStoreUrl: e.target.value } })}
              placeholder="https://play.google.com/store/apps/details?id=com.himewo.chat"
            />
          </div>

          {/* Option C: Apple App Store */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <Apple className="h-4 w-4 text-slate-900 dark:text-white" />
                3. Apple App Store Link
              </div>
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
                  Mark as "Coming Soon"
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.chatApp.appStoreEnabled}
                    onChange={(e) => setConfig({
                      ...config,
                      chatApp: { ...config.chatApp, appStoreEnabled: e.target.checked }
                    })}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  Enable
                </label>
              </div>
            </div>
            <Input
              value={config.chatApp.appStoreUrl}
              onChange={(e) => setConfig({ ...config, chatApp: { ...config.chatApp, appStoreUrl: e.target.value } })}
              placeholder="https://apps.apple.com/app/himewo-chat/id987654321"
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
