import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Upload, RotateCcw, Save } from "lucide-react";
import { api } from "../lib/api";
import { Button, Card, CardHeader, ErrorNote, Input } from "./ui";

// Must match NAV_ICON_KEYS on the API server.
const NAV_ITEMS: { key: string; label: string; group: "Top navigation" | "Sidebar shortcuts" }[] = [
  { key: "home", label: "Home", group: "Top navigation" },
  { key: "friends", label: "Friends", group: "Top navigation" },
  { key: "reels", label: "Reels", group: "Top navigation" },
  { key: "circles", label: "Circles", group: "Top navigation" },
  { key: "hubs", label: "Hubs", group: "Top navigation" },
  { key: "shop", label: "Shop", group: "Top navigation" },
  { key: "earnings", label: "Earnings", group: "Top navigation" },
  { key: "live", label: "Live", group: "Sidebar shortcuts" },
  { key: "watch", label: "Watch", group: "Sidebar shortcuts" },
  { key: "events", label: "Events", group: "Sidebar shortcuts" },
  { key: "stories", label: "Stories", group: "Sidebar shortcuts" },
  { key: "memories", label: "Memories", group: "Sidebar shortcuts" },
  { key: "saved", label: "Saved", group: "Sidebar shortcuts" },
  { key: "verified", label: "Verified Badge", group: "Sidebar shortcuts" },
];

const MAX_BYTES = 512 * 1024; // 512KB — icons should be tiny

function parseIcons(raw: string | undefined): Record<string, string> {
  try {
    const v = JSON.parse(raw || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function NavIconsCard({
  rawValue,
  canManage,
}: {
  rawValue: string | undefined;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const [icons, setIcons] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    if (!dirty) setIcons(parseIcons(rawValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawValue]);

  const save = useMutation({
    mutationFn: (value: Record<string, string>) =>
      api.put("/admin/settings/nav_icons", { value: JSON.stringify(value) }),
    onSuccess: () => {
      setDirty(false);
      qc.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  async function handleFile(key: string, file: File) {
    setUploadError(null);
    if (!/^image\/(png|webp|svg\+xml|jpeg|gif)$/.test(file.type)) {
      setUploadError("Only PNG, WebP, SVG, JPG or GIF images are allowed.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setUploadError("Icon file too large — keep it under 512 KB.");
      return;
    }
    setUploadingKey(key);
    try {
      const signed = await api.post<{ uploadUrl: string; publicUrl: string }>(
        "/media/upload-url",
        { fileName: file.name, contentType: file.type },
      );
      const put = await fetch(signed.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) throw new Error(`Upload failed (${put.status})`);
      setIcons((v) => ({ ...v, [key]: signed.publicUrl }));
      setDirty(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Upload failed";
      setUploadError(
        msg.includes("503") || msg.toLowerCase().includes("not configured")
          ? "Media storage is not configured in this environment — paste an image URL instead."
          : msg,
      );
    } finally {
      setUploadingKey(null);
    }
  }

  function setUrl(key: string, url: string) {
    setIcons((v) => {
      const next = { ...v };
      const trimmed = url.trim();
      if (!trimmed) delete next[key];
      else next[key] = trimmed;
      return next;
    });
    setDirty(true);
  }

  const invalid = Object.values(icons).some((u) => !/^https?:\/\//i.test(u));

  const groups = ["Top navigation", "Sidebar shortcuts"] as const;

  return (
    <Card>
      <CardHeader
        title="Navigation icons"
        subtitle="Upload custom icons for the web app's top navigation and sidebar shortcuts. Square transparent PNG, 128×128 px recommended (max 512 KB). Leave an item empty to keep the built-in default icon."
      />
      <div className="space-y-5 px-5 py-4">
        <ErrorNote error={save.error} />
        {uploadError && (
          <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{uploadError}</p>
        )}
        {groups.map((group) => (
          <div key={group}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              {group}
            </p>
            <div className="divide-y divide-slate-50 rounded-lg border border-slate-100">
              {NAV_ITEMS.filter((i) => i.group === group).map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3 px-4 py-2.5">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50">
                    {icons[key] && /^https?:\/\//i.test(icons[key]) ? (
                      <img src={icons[key]} alt={label} className="h-7 w-7 object-contain" />
                    ) : (
                      <span className="text-[10px] text-slate-400">default</span>
                    )}
                  </div>
                  <span className="w-28 shrink-0 text-sm text-slate-700">{label}</span>
                  <Input
                    value={icons[key] ?? ""}
                    onChange={(e) => setUrl(key, e.target.value)}
                    disabled={!canManage}
                    placeholder="https://… (or upload)"
                    className="flex-1"
                  />
                  <input
                    ref={(el) => {
                      fileRefs.current[key] = el;
                    }}
                    type="file"
                    accept="image/png,image/webp,image/svg+xml,image/jpeg,image/gif"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFile(key, f);
                      e.target.value = "";
                    }}
                  />
                  <Button
                    variant="secondary"
                    disabled={!canManage || uploadingKey !== null}
                    loading={uploadingKey === key}
                    onClick={() => fileRefs.current[key]?.click()}
                    title="Upload image"
                  >
                    <Upload className="h-4 w-4" />
                  </Button>
                  {icons[key] && (
                    <Button
                      variant="secondary"
                      disabled={!canManage}
                      onClick={() => setUrl(key, "")}
                      title="Reset to default"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <div className="flex items-center justify-end gap-3">
          {invalid && (
            <p className="text-xs text-red-500">All icon URLs must start with http(s)://</p>
          )}
          <Button
            disabled={!canManage || !dirty || invalid}
            loading={save.isPending}
            onClick={() => save.mutate(icons)}
          >
            <Save className="mr-1.5 h-4 w-4" /> Save icons
          </Button>
        </div>
      </div>
    </Card>
  );
}
