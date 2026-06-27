import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { fmtDateTime, fmtRelative } from "../lib/format";
import { useAuth } from "../lib/auth";
import type {
  Paged,
  ReportRow,
  ReportStatus,
  ReportTargetType,
} from "../lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Loading,
  Modal,
  Pagination,
  Select,
  Table,
  Td,
  Textarea,
  Th,
} from "../components/ui";
import { PageHeader } from "../components/Layout";

const STATUS_TONE: Record<ReportStatus, "red" | "amber" | "green" | "neutral"> = {
  open: "red",
  reviewing: "amber",
  resolved: "green",
  dismissed: "neutral",
};

const TARGETS: ReportTargetType[] = ["post", "comment", "user", "reel", "story"];

export function Reports() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("open");
  const [type, setType] = useState<string>("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<ReportRow | null>(null);
  const [note, setNote] = useState("");
  const limit = 25;

  const query = useQuery({
    queryKey: ["reports", status, type, offset],
    queryFn: () =>
      api.get<Paged<ReportRow>>("/admin/reports", { status, type, limit, offset }),
  });

  const update = useMutation({
    mutationFn: (v: { id: number; status: ReportStatus; resolutionNote?: string }) =>
      api.patch(`/admin/reports/${v.id}`, {
        status: v.status,
        resolutionNote: v.resolutionNote,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["reports"] });
      setSelected(null);
    },
  });

  const canManage = can("reports.manage");

  return (
    <div>
      <PageHeader
        title="Reports"
        description="User-submitted reports awaiting moderation."
      />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap gap-2">
          <Select value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
            <option value="">All statuses</option>
            <option value="open">Open</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </Select>
          <Select value={type} onChange={(e) => { setType(e.target.value); setOffset(0); }}>
            <option value="">All types</option>
            {TARGETS.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </div>
      </Card>

      <Card>
        {query.isLoading && <Loading />}
        <ErrorNote error={query.error} />
        {query.data?.items.length === 0 && (
          <EmptyState title="No reports" description="Nothing matches these filters." />
        )}
        {query.data && query.data.items.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Target</Th>
                  <Th>Reason</Th>
                  <Th>Reporter</Th>
                  <Th>Status</Th>
                  <Th>Filed</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50">
                    <Td>
                      <Badge tone="blue">{r.targetType}</Badge>
                      <span className="ml-2 text-xs text-slate-400">#{r.targetId}</span>
                    </Td>
                    <Td className="max-w-xs">
                      <p className="line-clamp-1 font-medium text-slate-800">{r.reason}</p>
                    </Td>
                    <Td>
                      {r.reporter ? (
                        <div className="flex items-center gap-2">
                          <Avatar src={r.reporter.avatarUrl} name={r.reporter.displayName} size={24} />
                          <span className="text-xs text-slate-600">@{r.reporter.username}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </Td>
                    <Td><Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge></Td>
                    <Td className="text-xs text-slate-500">{fmtRelative(r.createdAt)}</Td>
                    <Td>
                      <Button size="sm" variant="outline" onClick={() => { setSelected(r); setNote(r.resolutionNote ?? ""); }}>
                        Review
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination offset={offset} limit={limit} total={query.data.total} count={query.data.items.length} onChange={setOffset} />
          </>
        )}
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Report #${selected.id}` : ""}
        footer={
          canManage && selected ? (
            <>
              <Button variant="ghost" onClick={() => update.mutate({ id: selected.id, status: "dismissed", resolutionNote: note })} loading={update.isPending}>
                Dismiss
              </Button>
              <Button variant="secondary" onClick={() => update.mutate({ id: selected.id, status: "reviewing", resolutionNote: note })} loading={update.isPending}>
                Mark reviewing
              </Button>
              <Button onClick={() => update.mutate({ id: selected.id, status: "resolved", resolutionNote: note })} loading={update.isPending}>
                Resolve
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
          )
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <ErrorNote error={update.error} />
            <Field label="Target">
              <Badge tone="blue">{selected.targetType}</Badge>
              <span className="ml-2 text-slate-500">#{selected.targetId}</span>
            </Field>
            <Field label="Reason">{selected.reason}</Field>
            {selected.details && <Field label="Details">{selected.details}</Field>}
            <Field label="Reporter">
              {selected.reporter ? `@${selected.reporter.username}` : "Unknown"}
            </Field>
            <Field label="Filed">{fmtDateTime(selected.createdAt)}</Field>
            {selected.handler && (
              <Field label="Handled by">@{selected.handler.username}</Field>
            )}
            {canManage && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Resolution note</label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note about the action taken" />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <div className="mt-0.5 text-slate-700">{children}</div>
    </div>
  );
}
