import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Save, MapPin, BadgeCheck, MessageSquareText } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { SettingsResponse } from "../lib/types";
import {
  Button,
  Card,
  CardHeader,
  ErrorNote,
  Input,
  Loading,
  Toggle,
} from "../components/ui";
import { PageHeader } from "../components/Layout";
import { NavIconsCard } from "../components/NavIconsCard";

const FLAG_LABELS: Record<string, string> = {
  posts: "Posts",
  stories: "Stories",
  reels: "Reels",
  calls: "Calls",
  groups: "Circles",
  pages: "Hubs",
  messaging: "Messaging",
  signups: "New signups",
};

export function Settings() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const canManage = can("settings.manage");

  const query = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.get<SettingsResponse>("/admin/settings"),
  });

  const setFlag = useMutation({
    mutationFn: (v: { key: string; enabled: boolean }) =>
      api.put(`/admin/flags/${v.key}`, { enabled: v.enabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  const setSetting = useMutation({
    mutationFn: (v: { key: string; value: string }) =>
      api.put(`/admin/settings/${v.key}`, { value: v.value }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["settings"] }),
  });

  const [siteName, setSiteName] = useState("");
  const [smsToken, setSmsToken] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [maintMsg, setMaintMsg] = useState("");
  const [verif, setVerif] = useState<Record<string, string>>({});

  useEffect(() => {
    if (query.data) {
      setSiteName(query.data.settings.site_name ?? "");
      setLogoUrl(query.data.settings.logo_url ?? "");
      setMaintMsg(query.data.settings.maintenance_message ?? "");
      const s = query.data.settings;
      setVerif({
        verification_min_account_age_days: s.verification_min_account_age_days ?? "15",
        verification_min_posts: s.verification_min_posts ?? "15",
        verification_min_reels: s.verification_min_reels ?? "5",
        verification_regular_post_days: s.verification_regular_post_days ?? "7",
        verification_monthly_fee: s.verification_monthly_fee ?? "299",
      });
    }
  }, [query.data]);

  const VERIF_FIELDS: { key: string; label: string; hint: string }[] = [
    { key: "verification_min_account_age_days", label: "Minimum account age (days)", hint: "New accounts must wait this many days before applying." },
    { key: "verification_min_posts", label: "Minimum posts", hint: "Total posts required before applying." },
    { key: "verification_min_reels", label: "Minimum reels", hint: "Total reels required before applying." },
    { key: "verification_regular_post_days", label: "Regular posting window (days)", hint: "Must have posted within the last N days. 0 disables this check." },
    { key: "verification_monthly_fee", label: "Monthly fee ($)", hint: "Shown to users on the apply page." },
  ];

  const maintenanceOn = query.data?.settings.maintenance_mode === "on";

  // ---- SMS / OTP ----
  const OTP_EVENT_FIELDS: { key: string; label: string; hint: string }[] = [
    { key: "login_phone", label: "Login with phone (OTP)", hint: "One-time code sent by SMS when someone logs in with a phone number." },
    { key: "login_email", label: "Login with email (OTP)", hint: "One-time code sent by email for email-based login." },
    { key: "signup_phone_verify", label: "Signup — phone verification", hint: "SMS code that verifies a new account's phone number." },
    { key: "signup_email_verify", label: "Signup — email verification", hint: "Email code that verifies a new account's email address." },
    { key: "password_reset_phone", label: "Password reset via SMS", hint: "SMS code for the forgot-password flow." },
    { key: "password_reset_email", label: "Password reset via email", hint: "Email code for the forgot-password flow." },
    { key: "account_recovery", label: "Account recovery", hint: "Codes sent from the find-your-account flow." },
    { key: "phone_change", label: "Phone number change", hint: "Code sent when a user changes their phone number." },
    { key: "email_change", label: "Email change", hint: "Code sent when a user changes their email address." },
    { key: "two_factor", label: "Two-factor authentication", hint: "Codes for setting up / using 2FA." },
    { key: "new_device_login", label: "New device login", hint: "Extra code when logging in from an unrecognized device." },
    { key: "account_deletion", label: "Account deletion", hint: "Confirmation code before deleting an account." },
  ];
  const otpEvents: Record<string, boolean> = (() => {
    try {
      const raw = JSON.parse(query.data?.settings.otp_events || "{}");
      return typeof raw === "object" && raw !== null && !Array.isArray(raw) ? raw : {};
    } catch {
      return {};
    }
  })();
  const setOtpEvent = (key: string, enabled: boolean) => {
    const next: Record<string, boolean> = {};
    for (const f of OTP_EVENT_FIELDS) {
      const cur = otpEvents[f.key] === false ? false : true;
      next[f.key] = f.key === key ? enabled : cur;
    }
    setSetting.mutate({ key: "otp_events", value: JSON.stringify(next) });
  };
  const emailVerifOn = query.data?.settings.email_verification_enabled !== "off";
  const phoneVerifOn = query.data?.settings.phone_verification_enabled !== "off";
  const tokenSet = !!query.data?.settings.sms_greenweb_token;

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Feature flags, branding and maintenance mode."
      />

      <Card className="mb-6 border-emerald-200">
        <CardHeader
          title="Marketplace location"
          subtitle="How buyers find listings near them."
        />
        <div className="flex items-start gap-3 px-5 py-4">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
            <MapPin className="h-5 w-5" />
          </div>
          <div className="space-y-1 text-sm">
            <p className="font-medium text-slate-700">
              Connected — OpenStreetMap (free)
            </p>
            <p className="text-slate-500">
              Location search and "near me" distance are powered by OpenStreetMap
              (Nominatim). It is completely free and needs no API key — there is
              nothing to paste or configure here. It works automatically.
            </p>
          </div>
        </div>
      </Card>

      {query.isLoading && <Loading />}
      <ErrorNote error={query.error || setFlag.error || setSetting.error} />

      {query.data && (
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Feature flags"
              subtitle="Disable a feature platform-wide. Disabled features return 403 to clients."
            />
            <div className="divide-y divide-slate-50">
              {Object.keys(query.data.flags).map((key) => (
                <div key={key} className="flex items-center justify-between px-5 py-3">
                  <span className="text-sm text-slate-700">
                    {FLAG_LABELS[key] ?? key}
                  </span>
                  <Toggle
                    checked={query.data!.flags[key]}
                    disabled={!canManage || setFlag.isPending}
                    onChange={(v) => setFlag.mutate({ key, enabled: v })}
                  />
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Branding" />
            <div className="space-y-4 px-5 py-4">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Site name</label>
                <div className="flex gap-2">
                  <Input value={siteName} onChange={(e) => setSiteName(e.target.value)} disabled={!canManage} />
                  <Button variant="secondary" disabled={!canManage} loading={setSetting.isPending} onClick={() => setSetting.mutate({ key: "site_name", value: siteName })}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Logo URL</label>
                <div className="flex gap-2">
                  <Input value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} disabled={!canManage} placeholder="https://…" />
                  <Button variant="secondary" disabled={!canManage} loading={setSetting.isPending} onClick={() => setSetting.mutate({ key: "logo_url", value: logoUrl })}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Verified badge requirements"
              subtitle="Facebook-style eligibility rules users must meet before they can apply for the blue badge."
            />
            <div className="space-y-4 px-5 py-4">
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <BadgeCheck className="h-5 w-5 shrink-0" />
                <span>Users who don't meet these rules see the checklist and can't submit a request.</span>
              </div>
              {VERIF_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{f.label}</label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      min={0}
                      value={verif[f.key] ?? ""}
                      onChange={(e) => setVerif((v) => ({ ...v, [f.key]: e.target.value }))}
                      disabled={!canManage}
                    />
                    <Button
                      variant="secondary"
                      disabled={!canManage || !/^\d+$/.test(verif[f.key] ?? "")}
                      loading={setSetting.isPending}
                      onClick={() => setSetting.mutate({ key: f.key, value: verif[f.key] })}
                    >
                      <Save className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-slate-400">{f.hint}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader
              title="SMS gateway & OTP (GreenWeb)"
              subtitle="Bangladeshi (+880) numbers only — OTP SMS are delivered through GreenWeb (bdbulksms.com)."
            />
            <div className="space-y-4 px-5 py-4">
              <div className="flex items-center gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
                <MessageSquareText className="h-5 w-5 shrink-0" />
                <span>
                  {tokenSet
                    ? `GreenWeb token is set (${query.data.settings.sms_greenweb_token}). Paste a new one below to replace it.`
                    : "No GreenWeb token yet — OTP SMS will fail until you paste one."}
                </span>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">GreenWeb API token</label>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    value={smsToken}
                    onChange={(e) => setSmsToken(e.target.value)}
                    disabled={!canManage}
                    placeholder="Paste your bdbulksms.com token"
                  />
                  <Button
                    variant="secondary"
                    disabled={!canManage || !smsToken.trim()}
                    loading={setSetting.isPending}
                    onClick={() => {
                      setSetting.mutate(
                        { key: "sms_greenweb_token", value: smsToken.trim() },
                        { onSuccess: () => setSmsToken("") },
                      );
                    }}
                  >
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Email verification</p>
                  <p className="text-xs text-slate-400">Require email codes for email signup/verification.</p>
                </div>
                <Toggle
                  checked={emailVerifOn}
                  disabled={!canManage || setSetting.isPending}
                  onChange={(v) =>
                    setSetting.mutate({ key: "email_verification_enabled", value: v ? "on" : "off" })
                  }
                />
              </div>
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-700">Phone (number) verification</p>
                  <p className="text-xs text-slate-400">Master switch — when off, NO OTP SMS are sent at all.</p>
                </div>
                <Toggle
                  checked={phoneVerifOn}
                  disabled={!canManage || setSetting.isPending}
                  onChange={(v) =>
                    setSetting.mutate({ key: "phone_verification_enabled", value: v ? "on" : "off" })
                  }
                />
              </div>

              <div>
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  OTP events
                </p>
                <div className="divide-y divide-slate-50 rounded-lg border border-slate-100">
                  {OTP_EVENT_FIELDS.map((f) => (
                    <div key={f.key} className="flex items-center justify-between px-4 py-3">
                      <div className="pr-4">
                        <p className="text-sm text-slate-700">{f.label}</p>
                        <p className="text-xs text-slate-400">{f.hint}</p>
                      </div>
                      <Toggle
                        checked={otpEvents[f.key] === false ? false : true}
                        disabled={!canManage || setSetting.isPending}
                        onChange={(v) => setOtpEvent(f.key, v)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          <NavIconsCard
            rawValue={query.data.settings.nav_icons}
            canManage={canManage}
          />

          <Card className={maintenanceOn ? "border-amber-300" : ""}>
            <CardHeader
              title="Maintenance mode"
              subtitle="When on, only staff can use the apps. Everyone else sees the message below."
            />
            <div className="space-y-4 px-5 py-4">
              <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className={maintenanceOn ? "h-5 w-5 text-amber-500" : "h-5 w-5 text-slate-400"} />
                  <span className="text-sm font-medium text-slate-700">
                    {maintenanceOn ? "Maintenance mode is ON" : "Maintenance mode is off"}
                  </span>
                </div>
                <Toggle
                  checked={maintenanceOn}
                  disabled={!canManage || setSetting.isPending}
                  onChange={(v) => setSetting.mutate({ key: "maintenance_mode", value: v ? "on" : "off" })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Maintenance message</label>
                <div className="flex gap-2">
                  <Input value={maintMsg} onChange={(e) => setMaintMsg(e.target.value)} disabled={!canManage} />
                  <Button variant="secondary" disabled={!canManage} loading={setSetting.isPending} onClick={() => setSetting.mutate({ key: "maintenance_message", value: maintMsg })}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
