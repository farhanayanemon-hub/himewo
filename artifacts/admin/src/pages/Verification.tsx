import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Check, X } from "lucide-react";
import { api } from "../lib/api";
import { fmtDateTime, fmtRelative } from "../lib/format";
import { useAuth } from "../lib/auth";
import type { Paged, VerificationRow, VerificationStatus } from "../lib/types";
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

const STATUS_TONE: Record<VerificationStatus, "amber" | "green" | "red"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

export function Verification() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const [status, setStatus] = useState("pending");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<VerificationRow | null>(null);
  const [note, setNote] = useState("");
  const limit = 25;

  const query = useQuery({
    queryKey: ["verification", status, offset],
    queryFn: () =>
      api.get<Paged<VerificationRow>>("/admin/verification", {
        status,
        limit,
        offset,
      }),
  });

  const review = useMutation({
    mutationFn: (v: { id: number; status: "approved" | "rejected"; reviewNote?: string }) =>
      api.patch(`/admin/verification/${v.id}`, {
        status: v.status,
        reviewNote: v.reviewNote,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["verification"] });
      setSelected(null);
    },
  });

  const canManage = can("verification.manage");

  return (
    <div>
      <PageHeader
        title="Verification"
        description="Review blue-tick verification requests."
      />

      <Card className="mb-4 p-3">
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
      </Card>

      <Card>
        {query.isLoading && <Loading />}
        <ErrorNote error={query.error} />
        {query.data?.items.length === 0 && (
          <EmptyState icon={<BadgeCheck size={32} />} title="No requests" />
        )}
        {query.data && query.data.items.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>User</Th>
                  <Th>Note</Th>
                  <Th>Status</Th>
                  <Th>Requested</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50">
                    <Td>
                      {v.user ? (
                        <div className="flex items-center gap-3">
                          <Avatar src={v.user.avatarUrl} name={v.user.displayName} />
                          <div>
                            <div className="font-medium text-slate-900">{v.user.displayName}</div>
                            <div className="text-xs text-slate-500">@{v.user.username}</div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Unknown</span>
                      )}
                    </Td>
                    <Td className="max-w-xs"><p className="line-clamp-1 text-slate-600">{v.note || "—"}</p></Td>
                    <Td><Badge tone={STATUS_TONE[v.status]}>{v.status}</Badge></Td>
                    <Td className="text-xs text-slate-500">{fmtRelative(v.createdAt)}</Td>
                    <Td>
                      <Button size="sm" variant="outline" onClick={() => { setSelected(v); setNote(v.reviewNote ?? ""); }}>
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
        title={selected?.user ? `@${selected.user.username}` : "Verification request"}
        footer={
          canManage && selected && selected.status === "pending" ? (
            <>
              <Button variant="danger" loading={review.isPending} onClick={() => review.mutate({ id: selected.id, status: "rejected", reviewNote: note })}>
                <X className="h-4 w-4" /> Reject
              </Button>
              <Button loading={review.isPending} onClick={() => review.mutate({ id: selected.id, status: "approved", reviewNote: note })}>
                <Check className="h-4 w-4" /> Approve
              </Button>
            </>
          ) : (
            <Button variant="ghost" onClick={() => setSelected(null)}>Close</Button>
          )
        }
      >
        {selected && (
          <div className="space-y-4 text-sm">
            <ErrorNote error={review.error} />
            {selected.user && (
              <div className="flex items-center gap-3">
                <Avatar src={selected.user.avatarUrl} name={selected.user.displayName} size={48} />
                <div>
                  <p className="font-semibold text-slate-900">{selected.user.displayName}</p>
                  <p className="text-xs text-slate-500">{selected.user.email ?? "—"}</p>
                </div>
              </div>
            )}
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Their note</p>
              <p className="mt-0.5 text-slate-700">{selected.note || "—"}</p>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Requested</p>
              <p className="mt-0.5 text-slate-700">{fmtDateTime(selected.createdAt)}</p>
            </div>
            {selected.handler && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Handled by</p>
                <p className="mt-0.5 text-slate-700">@{selected.handler.username}</p>
              </div>
            )}
            {canManage && selected.status === "pending" && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Review note</label>
                <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional note" />
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
