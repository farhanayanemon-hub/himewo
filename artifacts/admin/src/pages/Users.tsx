import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, ShieldCheck, KeyRound, Trash2, Copy } from "lucide-react";
import { api } from "../lib/api";
import { fmtDate } from "../lib/format";
import { useAuth } from "../lib/auth";
import type { AdminProfile, Paged, UserRole } from "../lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Input,
  Loading,
  Modal,
  Pagination,
  Select,
  Table,
  Td,
  Th,
  Toggle,
} from "../components/ui";
import { PageHeader } from "../components/Layout";

const ROLE_TONE: Record<UserRole, "violet" | "blue" | "green" | "neutral"> = {
  admin: "violet",
  moderator: "blue",
  support: "green",
  user: "neutral",
};

function statusBadge(u: AdminProfile) {
  if (u.isBanned) return <Badge tone="red">Banned</Badge>;
  if (u.isSuspended) return <Badge tone="amber">Suspended</Badge>;
  return <Badge tone="green">Active</Badge>;
}

export function Users() {
  const { can, me } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<AdminProfile | null>(null);
  const limit = 25;

  const query = useQuery({
    queryKey: ["users", q, role, status, offset],
    queryFn: () =>
      api.get<Paged<AdminProfile>>("/admin/users", {
        q,
        role,
        status,
        limit,
        offset,
      }),
  });

  const mutate = useMutation({
    mutationFn: (vars: { id: string; body: Record<string, unknown> }) =>
      api.patch<AdminProfile>(`/admin/users/${vars.id}`, vars.body),
    onSuccess: (updated) => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      setSelected((s) => (s && s.id === updated.id ? { ...s, ...updated } : s));
    },
  });

  const remove = useMutation({
    mutationFn: (id: string) => api.del(`/admin/users/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["users"] });
      setSelected(null);
    },
  });

  const impersonate = useMutation({
    mutationFn: (id: string) =>
      api.post<{ mode: string; devToken?: string; actionLink?: string }>(
        `/admin/users/${id}/impersonate`,
      ),
  });

  const canManage = can("users.manage");
  const canRole = me?.role === "admin";

  return (
    <div>
      <PageHeader title="Users" description="Search, moderate and manage accounts." />

      <Card className="mb-4 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setOffset(0);
              }}
              placeholder="Search by name, username or email"
              className="pl-9"
            />
          </div>
          <Select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All roles</option>
            <option value="user">User</option>
            <option value="support">Support</option>
            <option value="moderator">Moderator</option>
            <option value="admin">Admin</option>
          </Select>
          <Select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="verified">Verified</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </Select>
        </div>
      </Card>

      <Card>
        {query.isLoading && <Loading />}
        <ErrorNote error={query.error} />
        {query.data && query.data.items.length === 0 && (
          <EmptyState title="No users found" description="Try adjusting filters." />
        )}
        {query.data && query.data.items.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>User</Th>
                  <Th>Role</Th>
                  <Th>Status</Th>
                  <Th>Joined</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar src={u.avatarUrl} name={u.displayName} />
                        <div>
                          <div className="flex items-center gap-1 font-medium text-slate-900">
                            {u.displayName}
                            {u.isVerified && (
                              <ShieldCheck className="h-3.5 w-3.5 text-sky-500" />
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            @{u.username}
                          </div>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                    </Td>
                    <Td>{statusBadge(u)}</Td>
                    <Td className="text-xs text-slate-500">
                      {fmtDate(u.createdAt)}
                    </Td>
                    <Td>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(u)}
                      >
                        Manage
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination
              offset={offset}
              limit={limit}
              total={query.data.total}
              count={query.data.items.length}
              onChange={setOffset}
            />
          </>
        )}
      </Card>

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Manage @${selected.username}` : ""}
        footer={
          <>
            {can("users.impersonate") && selected && (
              <Button
                variant="secondary"
                loading={impersonate.isPending}
                onClick={() =>
                  impersonate.mutate(selected.id, {
                    onSuccess: (r) => {
                      const v = r.actionLink ?? r.devToken ?? "";
                      void navigator.clipboard?.writeText(v);
                      alert(
                        r.mode === "magiclink"
                          ? "Magic login link copied to clipboard."
                          : `Dev token copied: ${v}`,
                      );
                    },
                  })
                }
              >
                <KeyRound className="h-4 w-4" />
                Impersonate
              </Button>
            )}
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Close
            </Button>
          </>
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Avatar src={selected.avatarUrl} name={selected.displayName} size={48} />
              <div>
                <p className="font-semibold text-slate-900">
                  {selected.displayName}
                </p>
                <p className="text-xs text-slate-500">{selected.email ?? "—"}</p>
              </div>
            </div>

            <ErrorNote error={mutate.error || remove.error} />

            <ToggleRow
              label="Verified"
              checked={selected.isVerified}
              disabled={!canManage || mutate.isPending}
              onChange={(v) =>
                mutate.mutate({ id: selected.id, body: { isVerified: v } })
              }
            />
            <ToggleRow
              label="Suspended"
              checked={selected.isSuspended}
              disabled={!canManage || mutate.isPending}
              onChange={(v) =>
                mutate.mutate({ id: selected.id, body: { isSuspended: v } })
              }
            />
            <ToggleRow
              label="Banned"
              checked={selected.isBanned}
              disabled={!canManage || mutate.isPending}
              onChange={(v) =>
                mutate.mutate({ id: selected.id, body: { isBanned: v } })
              }
            />

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-600">Role</span>
              <Select
                value={selected.role}
                disabled={!canRole || mutate.isPending}
                onChange={(e) =>
                  mutate.mutate({
                    id: selected.id,
                    body: { role: e.target.value },
                  })
                }
              >
                <option value="user">User</option>
                <option value="support">Support</option>
                <option value="moderator">Moderator</option>
                <option value="admin">Admin</option>
              </Select>
            </div>
            {!canRole && (
              <p className="text-xs text-slate-400">
                Only admins can change roles.
              </p>
            )}

            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Copy className="h-3 w-3" /> {selected.id}
              </span>
              {can("users.delete") && selected.id !== me?.userId && (
                <Button
                  variant="danger"
                  size="sm"
                  loading={remove.isPending}
                  onClick={() => {
                    if (
                      confirm(
                        `Permanently delete @${selected.username}? This cannot be undone.`,
                      )
                    )
                      remove.mutate(selected.id);
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-slate-600">{label}</span>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} />
    </div>
  );
}
