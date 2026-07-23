import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Star, CheckCircle2, Trash2 } from "lucide-react";
import { api } from "../lib/api";
import { fmtDate } from "../lib/format";
import { useAuth } from "../lib/auth";
import type { GroupRow, PageRow, Paged } from "../lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  Loading,
  Pagination,
  Table,
  Td,
  Th,
} from "../components/ui";
import { PageHeader } from "../components/Layout";

type Tab = "groups" | "pages";

const TAB_LABELS: Record<Tab, string> = {
  groups: "Circles",
  pages: "Hubs",
};

const KIND_LABELS: Record<Tab, string> = {
  groups: "circles",
  pages: "hubs",
};

export function Communities() {
  const [tab, setTab] = useState<Tab>("groups");
  return (
    <div>
      <PageHeader title="Communities" description="Moderate circles and hubs." />
      <div className="mb-4 flex gap-1 rounded-xl border border-slate-200 bg-white p-1">
        {(["groups", "pages"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={
              "flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors " +
              (tab === t ? "bg-brand-50 text-brand-700" : "text-slate-500 hover:bg-slate-50")
            }
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>
      <CommunityTab kind={tab} />
    </div>
  );
}

function CommunityTab({ kind }: { kind: Tab }) {
  const qc = useQueryClient();
  const { can } = useAuth();
  const [q, setQ] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const query = useQuery({
    queryKey: [kind, q, offset],
    queryFn: () =>
      api.get<Paged<GroupRow | PageRow>>(`/admin/${kind}`, { q, limit, offset }),
  });

  const patch = useMutation({
    mutationFn: (v: { id: number; body: Record<string, unknown> }) =>
      api.patch(`/admin/${kind}/${v.id}`, v.body),
    onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.del(`/admin/${kind}/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: [kind] }),
  });

  const canManage = can("communities.manage");

  return (
    <>
      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input value={q} onChange={(e) => { setQ(e.target.value); setOffset(0); }} placeholder={`Search ${KIND_LABELS[kind]} by name`} className="pl-9" />
        </div>
      </Card>
      <Card>
        {query.isLoading && <Loading />}
        <ErrorNote error={query.error || patch.error || remove.error} />
        {query.data?.items.length === 0 && <EmptyState title={`No ${KIND_LABELS[kind]}`} />}
        {query.data && query.data.items.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar src={c.avatarUrl} name={c.name} />
                        <div>
                          <div className="font-medium text-slate-900">{c.name}</div>
                          <div className="text-xs text-slate-500 line-clamp-1">
                            {"category" in c && c.category ? c.category : c.description ?? "—"}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <div className="flex gap-1">
                        {c.featured && <Badge tone="amber">Featured</Badge>}
                        {c.isApproved ? <Badge tone="green">Approved</Badge> : <Badge tone="neutral">Pending</Badge>}
                      </div>
                    </Td>
                    <Td className="text-xs text-slate-500">{fmtDate(c.createdAt)}</Td>
                    <Td>
                      <div className="flex justify-end">
                        <button title="Feature" disabled={!canManage || patch.isPending} onClick={() => patch.mutate({ id: c.id, body: { featured: !c.featured } })} className={"rounded-lg p-2 transition-colors disabled:opacity-40 " + (c.featured ? "bg-amber-100 text-amber-700" : "text-slate-400 hover:bg-slate-100")}>
                          <Star size={16} />
                        </button>
                        <button title="Approve" disabled={!canManage || patch.isPending} onClick={() => patch.mutate({ id: c.id, body: { isApproved: !c.isApproved } })} className={"rounded-lg p-2 transition-colors disabled:opacity-40 " + (c.isApproved ? "bg-emerald-100 text-emerald-700" : "text-slate-400 hover:bg-slate-100")}>
                          <CheckCircle2 size={16} />
                        </button>
                        <button title="Delete" disabled={!canManage || remove.isPending} onClick={() => { if (confirm(`Delete ${c.name}?`)) remove.mutate(c.id); }} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-100 hover:text-rose-600 disabled:opacity-40">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination offset={offset} limit={limit} count={query.data.items.length} onChange={setOffset} />
          </>
        )}
      </Card>
    </>
  );
}
