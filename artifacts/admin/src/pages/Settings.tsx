import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Save, MapPin, BadgeCheck } from "lucide-react";
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
    { key: "verification_monthly_fee", label: "Monthly fee (৳)", hint: "Shown to users on the apply page." },
  ];

  const maintenanceOn = query.data?.settings.maintenance_mode === "on";

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
