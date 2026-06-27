import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { api } from "../lib/api";
import { fmtDateTime } from "../lib/format";
import type { AuditRow, Paged } from "../lib/types";
import {
  Avatar,
  Badge,
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

export function Audit() {
  const [action, setAction] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 25;

  const query = useQuery({
    queryKey: ["audit", action, offset],
    queryFn: () =>
      api.get<Paged<AuditRow>>("/admin/audit", { action, limit, offset }),
  });

  return (
    <div>
      <PageHeader
        title="Audit log"
        description="Every administrative action, newest first."
      />

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={action}
            onChange={(e) => { setAction(e.target.value); setOffset(0); }}
            placeholder="Filter by action (e.g. user.update)"
            className="pl-9"
          />
        </div>
      </Card>

      <Card>
        {query.isLoading && <Loading />}
        <ErrorNote error={query.error} />
        {query.data?.items.length === 0 && <EmptyState title="No audit entries" />}
        {query.data && query.data.items.length > 0 && (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Actor</Th>
                  <Th>Action</Th>
                  <Th>Target</Th>
                  <Th>When</Th>
                </tr>
              </thead>
              <tbody>
                {query.data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50">
                    <Td>
                      {row.actor ? (
                        <div className="flex items-center gap-2">
                          <Avatar src={row.actor.avatarUrl} name={row.actor.displayName} size={24} />
                          <span className="text-xs text-slate-600">@{row.actor.username}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">System</span>
                      )}
                    </Td>
                    <Td><Badge tone="blue">{row.action}</Badge></Td>
                    <Td className="text-xs text-slate-500">
                      {row.targetType ? `${row.targetType} #${row.targetId}` : "—"}
                    </Td>
                    <Td className="text-xs text-slate-500">{fmtDateTime(row.createdAt)}</Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination offset={offset} limit={limit} total={query.data.total} count={query.data.items.length} onChange={setOffset} />
          </>
        )}
      </Card>
    </div>
  );
}
