import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Megaphone } from "lucide-react";
import { api } from "../lib/api";
import { fmtDate, fmtDateTime } from "../lib/format";
import { useAuth } from "../lib/auth";
import type { AnnouncementLevel, AnnouncementRow } from "../lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  Loading,
  Modal,
  Select,
  Textarea,
  Toggle,
} from "../components/ui";
import { PageHeader } from "../components/Layout";

const LEVEL_TONE: Record<AnnouncementLevel, "blue" | "amber" | "red"> = {
  info: "blue",
  warning: "amber",
  critical: "red",
};

interface Draft {
  id?: number;
  title: string;
  body: string;
  level: AnnouncementLevel;
  active: boolean;
  expiresAt: string;
}

const EMPTY: Draft = {
  title: "",
  body: "",
  level: "info",
  active: true,
  expiresAt: "",
};

export function Announcements() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft | null>(null);

  const query = useQuery({
    queryKey: ["announcements"],
    queryFn: () => api.get<AnnouncementRow[]>("/admin/announcements"),
  });

  const save = useMutation({
    mutationFn: (d: Draft) => {
      const body = {
        title: d.title,
        body: d.body,
        level: d.level,
        active: d.active,
        expiresAt: d.expiresAt ? new Date(d.expiresAt).toISOString() : null,
      };
      return d.id
        ? api.patch(`/admin/announcements/${d.id}`, body)
        : api.post("/admin/announcements", body);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["announcements"] });
      setDraft(null);
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/admin/announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements"] }),
  });

  const canManage = can("announcements.manage");

  return (
    <div>
      <PageHeader
        title="Announcements"
        description="Broadcast banners shown across the HiMewo apps."
        action={
          canManage && (
            <Button onClick={() => setDraft({ ...EMPTY })}>
              <Plus className="h-4 w-4" /> New announcement
            </Button>
          )
        }
      />

      {query.isLoading && <Loading />}
      <ErrorNote error={query.error || remove.error} />

      {query.data?.length === 0 && (
        <Card>
          <EmptyState
            icon={<Megaphone size={32} />}
            title="No announcements yet"
            description="Create one to show a banner to all users."
          />
        </Card>
      )}

      <div className="space-y-3">
        {query.data?.map((a) => (
          <Card key={a.id} className="p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Badge tone={LEVEL_TONE[a.level]}>{a.level}</Badge>
                  {a.active ? (
                    <Badge tone="green">Active</Badge>
                  ) : (
                    <Badge tone="neutral">Inactive</Badge>
                  )}
                </div>
                <h3 className="mt-2 font-semibold text-slate-900">{a.title}</h3>
                {a.body && <p className="mt-1 text-sm text-slate-600">{a.body}</p>}
                <p className="mt-2 text-xs text-slate-400">
                  Created {fmtDate(a.createdAt)}
                  {a.expiresAt ? ` · Expires ${fmtDateTime(a.expiresAt)}` : ""}
                </p>
              </div>
              {canManage && (
                <div className="flex shrink-0 gap-1">
                  <button
                    title="Edit"
                    onClick={() =>
                      setDraft({
                        id: a.id,
                        title: a.title,
                        body: a.body,
                        level: a.level,
                        active: a.active,
                        expiresAt: a.expiresAt
                          ? a.expiresAt.slice(0, 16)
                          : "",
                      })
                    }
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => {
                      if (confirm(`Delete "${a.title}"?`)) remove.mutate(a.id);
                    }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-rose-100 hover:text-rose-600"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      <Modal
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "Edit announcement" : "New announcement"}
        footer={
          <>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button
              loading={save.isPending}
              disabled={!draft?.title.trim()}
              onClick={() => draft && save.mutate(draft)}
            >
              Save
            </Button>
          </>
        }
      >
        {draft && (
          <div className="space-y-4">
            <ErrorNote error={save.error} />
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Title</label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Scheduled maintenance"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Body</label>
              <Textarea
                rows={3}
                value={draft.body}
                onChange={(e) => setDraft({ ...draft, body: e.target.value })}
                placeholder="Details shown to users"
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-slate-600">Level</label>
                <Select
                  className="w-full"
                  value={draft.level}
                  onChange={(e) =>
                    setDraft({ ...draft, level: e.target.value as AnnouncementLevel })
                  }
                >
                  <option value="info">Info</option>
                  <option value="warning">Warning</option>
                  <option value="critical">Critical</option>
                </Select>
              </div>
              <div className="flex-1 space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  Expires (optional)
                </label>
                <Input
                  type="datetime-local"
                  value={draft.expiresAt}
                  onChange={(e) =>
                    setDraft({ ...draft, expiresAt: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-600">Active</span>
              <Toggle
                checked={draft.active}
                onChange={(v) => setDraft({ ...draft, active: v })}
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
