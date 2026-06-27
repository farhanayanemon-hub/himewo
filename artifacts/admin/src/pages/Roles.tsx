import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Save, ShieldCheck } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import type { Permission, RolesResponse } from "../lib/types";
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ErrorNote,
  Loading,
} from "../components/ui";
import { PageHeader } from "../components/Layout";

function groupOf(p: Permission): string {
  return p.split(".")[0];
}

export function Roles() {
  const { can } = useAuth();
  const qc = useQueryClient();
  const canManage = can("roles.manage");

  const query = useQuery({
    queryKey: ["roles"],
    queryFn: () => api.get<RolesResponse>("/admin/roles"),
  });

  const save = useMutation({
    mutationFn: (v: { role: string; permissions: Permission[] }) =>
      api.put(`/admin/roles/${v.role}`, { permissions: v.permissions }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["roles"] }),
  });

  const [edits, setEdits] = useState<Record<string, Set<Permission>>>({});

  useEffect(() => {
    if (query.data) {
      const next: Record<string, Set<Permission>> = {};
      for (const r of query.data.roles) {
        if (r.editable) next[r.role] = new Set(r.permissions);
      }
      setEdits(next);
    }
  }, [query.data]);

  const catalog = query.data?.catalog ?? [];
  const groups = [...new Set(catalog.map(groupOf))];

  return (
    <div>
      <PageHeader
        title="Roles & permissions"
        description="Configure what each role can do. Admins always have full access."
      />

      {query.isLoading && <Loading />}
      <ErrorNote error={query.error || save.error} />

      <div className="space-y-6">
        {query.data?.roles.map((r) => {
          const editable = r.editable && canManage;
          const current = edits[r.role];
          const perms = r.editable && current ? current : new Set(r.permissions);
          const dirty =
            r.editable &&
            current &&
            (current.size !== r.permissions.length ||
              ![...current].every((p) => r.permissions.includes(p)));

          return (
            <Card key={r.role}>
              <CardHeader
                title={
                  <span className="flex items-center gap-2 capitalize">
                    <ShieldCheck className="h-4 w-4 text-brand-500" />
                    {r.role}
                    {!r.editable && (
                      <Badge tone="neutral">{r.role === "admin" ? "Full access" : "Fixed"}</Badge>
                    )}
                  </span>
                }
                subtitle={`${perms.size} of ${catalog.length} permissions`}
                action={
                  editable && dirty ? (
                    <Button
                      size="sm"
                      loading={save.isPending}
                      onClick={() =>
                        save.mutate({ role: r.role, permissions: [...perms] })
                      }
                    >
                      <Save className="h-4 w-4" /> Save
                    </Button>
                  ) : undefined
                }
              />
              <div className="space-y-4 px-5 py-4">
                {groups.map((g) => (
                  <div key={g}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      {g}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {catalog
                        .filter((p) => groupOf(p) === g)
                        .map((p) => {
                          const active = perms.has(p);
                          return (
                            <button
                              key={p}
                              disabled={!editable}
                              onClick={() => {
                                if (!editable) return;
                                setEdits((prev) => {
                                  const set = new Set(prev[r.role] ?? r.permissions);
                                  if (set.has(p)) set.delete(p);
                                  else set.add(p);
                                  return { ...prev, [r.role]: set };
                                });
                              }}
                              className={
                                "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors " +
                                (active
                                  ? "bg-brand-100 text-brand-700"
                                  : "bg-slate-100 text-slate-400") +
                                (editable ? " hover:opacity-80" : " cursor-default")
                              }
                            >
                              {p.split(".")[1]}
                            </button>
                          );
                        })}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
