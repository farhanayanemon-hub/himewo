import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Save,
  Search,
  RotateCcw,
  Plus,
  Minus,
  BadgeDollarSign,
  Clock,
  Coins,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fmtDateTime, fmtNumber } from "../lib/format";
import type {
  AdjustPointsResult,
  AdminEarningsSummary,
  AdminProfile,
  AdminWithdrawalRequest,
  Paged,
  PointConfig,
  PointConfigUpdate,
  WithdrawalStatus,
} from "../lib/types";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorNote,
  Input,
  Loading,
  Modal,
  Select,
  Table,
  Td,
  Th,
  Textarea,
  Toggle,
} from "../components/ui";
import { PageHeader } from "../components/Layout";

const METHOD_LABELS: Record<string, string> = {
  paypal: "PayPal",
  wise: "Wise",
  binance: "Binance",
  bybit: "Bybit",
  bkash: "bKash",
  nagad: "Nagad",
};

const STATUS_TONE: Record<WithdrawalStatus, "amber" | "blue" | "green" | "red"> = {
  pending: "amber",
  approved: "blue",
  paid: "green",
  rejected: "red",
};

function usd(n: number): string {
  return `$${n.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}
function methodLabel(m: string): string {
  return METHOD_LABELS[m] ?? m;
}

export function Earnings() {
  const { can } = useAuth();
  const canManage = can("earnings.manage");

  return (
    <div>
      <PageHeader
        title="Earnings"
        description="Control the points system, economics and payouts."
      />
      <div className="space-y-6">
        <StatsSection />
        <ConfigSection canManage={canManage} />
        <WithdrawalsSection canManage={canManage} />
        <AdjustSection canManage={canManage} />
      </div>
    </div>
  );
}

/* -------------------------------- Stats ------------------------------- */

function StatTile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: "emerald" | "amber" | "violet";
}) {
  const toneClasses: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
  };
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <div className={`rounded-lg p-2 ${toneClasses[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold text-slate-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function StatsSection() {
  const query = useQuery({
    queryKey: ["earnings-summary"],
    queryFn: () => api.get<AdminEarningsSummary>("/admin/earnings/summary"),
  });

  return (
    <Card>
      <CardHeader
        title="Program overview"
        subtitle="Money paid, money owed, and outstanding balances across all users. All values in USD."
      />
      {query.isLoading && <Loading />}
      <ErrorNote error={query.error} />
      {query.data && (
        <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
          <StatTile
            tone="emerald"
            icon={<BadgeDollarSign className="h-5 w-5" />}
            label="Total paid out"
            value={usd(query.data.totalPaidDollars)}
            sub="Withdrawals marked paid"
          />
          <StatTile
            tone="amber"
            icon={<Clock className="h-5 w-5" />}
            label="Pending payout"
            value={usd(query.data.pendingPayoutDollars)}
            sub={`${fmtNumber(query.data.pendingPayoutCount)} request${
              query.data.pendingPayoutCount === 1 ? "" : "s"
            } awaiting payout`}
          />
          <StatTile
            tone="violet"
            icon={<Coins className="h-5 w-5" />}
            label="Outstanding balances"
            value={usd(query.data.outstandingDollars)}
            sub={`${fmtNumber(query.data.outstandingPoints)} pts held by users`}
          />
        </div>
      )}
    </Card>
  );
}

/* ------------------------------- Config ------------------------------- */

type NumKey =
  | "pointsPerPost"
  | "pointsPerLike"
  | "pointsPerComment"
  | "pointsPerShare"
  | "pointsPerDollar"
  | "minWithdrawDollars"
  | "dailyPointCap";

const NUM_FIELDS: { key: NumKey; label: string; hint?: string }[] = [
  { key: "pointsPerPost", label: "Points per post" },
  { key: "pointsPerLike", label: "Points per like" },
  { key: "pointsPerComment", label: "Points per comment" },
  { key: "pointsPerShare", label: "Points per share" },
  { key: "pointsPerDollar", label: "Points per $1", hint: "How many points equal one US dollar." },
  { key: "minWithdrawDollars", label: "Minimum withdrawal (USD)" },
  { key: "dailyPointCap", label: "Daily points cap", hint: "Max points a user can earn per day. 0 = no cap." },
];

function ConfigSection({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["earnings-config"],
    queryFn: () => api.get<PointConfig>("/admin/earnings/config"),
  });

  const update = useMutation({
    mutationFn: (body: PointConfigUpdate) =>
      api.put<PointConfig>("/admin/earnings/config", body),
    onSuccess: (data) => qc.setQueryData(["earnings-config"], data),
  });

  const [form, setForm] = useState<Record<NumKey, string>>({
    pointsPerPost: "",
    pointsPerLike: "",
    pointsPerComment: "",
    pointsPerShare: "",
    pointsPerDollar: "",
    minWithdrawDollars: "",
    dailyPointCap: "",
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (query.data) {
      setForm({
        pointsPerPost: String(query.data.pointsPerPost),
        pointsPerLike: String(query.data.pointsPerLike),
        pointsPerComment: String(query.data.pointsPerComment),
        pointsPerShare: String(query.data.pointsPerShare),
        pointsPerDollar: String(query.data.pointsPerDollar),
        minWithdrawDollars: String(query.data.minWithdrawDollars),
        dailyPointCap: String(query.data.dailyPointCap),
      });
    }
  }, [query.data]);

  const enabled = query.data?.enabled ?? false;

  const validationError = (() => {
    for (const f of NUM_FIELDS) {
      const raw = form[f.key].trim();
      if (raw === "") return `${f.label} is required.`;
      const n = Number(raw);
      if (!Number.isInteger(n) || n < 0) return `${f.label} must be a whole number (0 or more).`;
    }
    if (Number(form.pointsPerDollar) < 1) return "Points per $1 must be at least 1.";
    if (Number(form.minWithdrawDollars) < 1) return "Minimum withdrawal must be at least $1.";
    return null;
  })();

  const save = () => {
    if (validationError) return;
    const body: PointConfigUpdate = {
      pointsPerPost: Number(form.pointsPerPost),
      pointsPerLike: Number(form.pointsPerLike),
      pointsPerComment: Number(form.pointsPerComment),
      pointsPerShare: Number(form.pointsPerShare),
      pointsPerDollar: Number(form.pointsPerDollar),
      minWithdrawDollars: Number(form.minWithdrawDollars),
      dailyPointCap: Number(form.dailyPointCap),
    };
    update.mutate(body, {
      onSuccess: () => {
        setSaved(true);
        window.setTimeout(() => setSaved(false), 2500);
      },
    });
  };

  return (
    <>
      {query.isLoading && <Loading />}
      <ErrorNote error={query.error || update.error} />

      {query.data && (
        <>
          <Card className={enabled ? "" : "border-amber-300"}>
            <CardHeader
              title="Earnings system"
              subtitle="Master switch. When off, the Earnings feature disappears for all web and mobile users."
            />
            <div className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-2">
                <AlertTriangle
                  className={enabled ? "h-5 w-5 text-emerald-500" : "h-5 w-5 text-amber-500"}
                />
                <span className="text-sm font-medium text-slate-700">
                  {enabled ? "Earnings is ON" : "Earnings is off"}
                </span>
              </div>
              <Toggle
                checked={enabled}
                disabled={!canManage || update.isPending}
                onChange={(v) => update.mutate({ enabled: v })}
              />
            </div>
          </Card>

          <Card>
            <CardHeader
              title="Economics"
              subtitle="Reward amounts and payout thresholds. All money values are in USD."
              action={
                <div className="flex items-center gap-2">
                  {saved && <span className="text-xs font-medium text-emerald-600">Saved</span>}
                  <Button
                    size="sm"
                    disabled={!canManage || !!validationError}
                    loading={update.isPending}
                    onClick={save}
                  >
                    <Save className="h-4 w-4" />
                    Save
                  </Button>
                </div>
              }
            />
            <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">
              {NUM_FIELDS.map((f) => (
                <div key={f.key} className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">{f.label}</label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={form[f.key]}
                    disabled={!canManage}
                    onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                  />
                  {f.hint && <p className="text-xs text-slate-400">{f.hint}</p>}
                </div>
              ))}
            </div>
            {validationError && (
              <p className="px-5 pb-4 text-xs font-medium text-rose-600">{validationError}</p>
            )}
            {query.data.updatedAt && (
              <p className="px-5 pb-4 text-xs text-slate-400">
                Last updated {fmtDateTime(query.data.updatedAt)}
              </p>
            )}
          </Card>
        </>
      )}
    </>
  );
}

/* ----------------------------- Withdrawals ---------------------------- */

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "paid", label: "Paid" },
  { value: "rejected", label: "Rejected" },
  { value: "", label: "All statuses" },
];

function WithdrawalsSection({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("pending");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<AdminWithdrawalRequest[]>([]);
  const limit = 30;

  const query = useQuery({
    queryKey: ["earnings-withdrawals", status, cursor],
    queryFn: () =>
      api.get<AdminWithdrawalRequest[]>("/admin/earnings/withdrawals", {
        status,
        limit,
        ...(cursor ? { cursor } : {}),
      }),
  });

  // Reset the accumulated list whenever the status filter changes.
  useEffect(() => {
    setItems([]);
    setCursor(undefined);
  }, [status]);

  const page = query.data;
  useEffect(() => {
    if (!page) return;
    if (cursor === undefined) {
      setItems(page);
      return;
    }
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...page.filter((p) => !seen.has(p.id))];
    });
  }, [page, cursor]);

  const hasMore = (page?.length ?? 0) === limit;
  const loadMore = () => {
    if (items.length > 0) setCursor(items[items.length - 1].id);
  };

  const [active, setActive] = useState<AdminWithdrawalRequest | null>(null);
  const [action, setAction] = useState<WithdrawalStatus | null>(null);
  const [note, setNote] = useState("");

  const process = useMutation({
    mutationFn: (v: { id: number; status: WithdrawalStatus; adminNote?: string }) =>
      api.post<AdminWithdrawalRequest>(`/admin/earnings/withdrawals/${v.id}/process`, {
        status: v.status,
        ...(v.adminNote ? { adminNote: v.adminNote } : {}),
      }),
    onSuccess: () => {
      // Re-load from the first page so processed rows move out of the filter.
      setItems([]);
      setCursor(undefined);
      void qc.invalidateQueries({ queryKey: ["earnings-withdrawals"] });
      void qc.invalidateQueries({ queryKey: ["earnings-summary"] });
      closeModal();
    },
  });

  const openAction = (req: AdminWithdrawalRequest, next: WithdrawalStatus) => {
    setActive(req);
    setAction(next);
    setNote("");
  };
  const closeModal = () => {
    setActive(null);
    setAction(null);
    setNote("");
  };

  const rows = items;

  return (
    <Card>
      <CardHeader
        title="Withdrawal requests"
        subtitle="Approve, mark paid, or reject (rejecting refunds the user's points)."
        action={
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
        }
      />

      {query.isLoading && rows.length === 0 && <Loading />}
      <ErrorNote error={query.error} />

      {query.data && rows.length === 0 && !query.isLoading && (
        <EmptyState title="No withdrawal requests" description="Nothing matches this filter." />
      )}

      {rows.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>User</Th>
              <Th>Amount</Th>
              <Th>Method</Th>
              <Th>Account details</Th>
              <Th>Requested</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <Td>
                  {r.user ? (
                    <div className="flex items-center gap-3">
                      <Avatar src={r.user.avatarUrl} name={r.user.displayName} size={32} />
                      <div>
                        <div className="font-medium text-slate-900">{r.user.displayName}</div>
                        <div className="text-xs text-slate-500">@{r.user.username}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">{r.userId.slice(0, 8)}</span>
                  )}
                </Td>
                <Td>
                  <div className="font-semibold text-slate-900">{usd(r.amountDollars)}</div>
                  <div className="text-xs text-slate-500">{fmtNumber(r.pointsSpent)} pts</div>
                </Td>
                <Td>{methodLabel(r.method)}</Td>
                <Td className="max-w-[16rem]">
                  <span className="text-xs text-slate-600">
                    {Object.entries(r.details)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ") || "—"}
                  </span>
                </Td>
                <Td className="text-xs text-slate-500">{fmtDateTime(r.createdAt)}</Td>
                <Td>
                  <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                  {r.adminNote && (
                    <div className="mt-1 max-w-[12rem] text-xs text-slate-400">{r.adminNote}</div>
                  )}
                </Td>
                <Td>
                  {canManage && (r.status === "pending" || r.status === "approved") ? (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {r.status === "pending" && (
                        <Button size="sm" variant="outline" onClick={() => openAction(r, "approved")}>
                          Approve
                        </Button>
                      )}
                      <Button size="sm" variant="secondary" onClick={() => openAction(r, "paid")}>
                        Mark paid
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => openAction(r, "rejected")}>
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {hasMore && rows.length > 0 && (
        <div className="flex justify-center px-5 py-4">
          <Button
            variant="outline"
            size="sm"
            loading={query.isFetching}
            onClick={loadMore}
          >
            Load more
          </Button>
        </div>
      )}

      <Modal
        open={!!active && !!action}
        onClose={closeModal}
        title={
          action === "approved"
            ? "Approve withdrawal"
            : action === "paid"
              ? "Mark as paid"
              : "Reject withdrawal"
        }
        footer={
          <>
            <Button variant="ghost" onClick={closeModal}>
              Cancel
            </Button>
            <Button
              variant={action === "rejected" ? "danger" : "primary"}
              loading={process.isPending}
              onClick={() =>
                active &&
                action &&
                process.mutate({ id: active.id, status: action, adminNote: note.trim() || undefined })
              }
            >
              Confirm
            </Button>
          </>
        }
      >
        {active && action && (
          <div className="space-y-4">
            <ErrorNote error={process.error} />
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">User</span>
                <span className="font-medium text-slate-800">
                  {active.user ? `@${active.user.username}` : active.userId.slice(0, 8)}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-medium text-slate-800">{usd(active.amountDollars)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Method</span>
                <span className="font-medium text-slate-800">{methodLabel(active.method)}</span>
              </div>
            </div>
            {action === "rejected" && (
              <p className="text-xs text-amber-600">
                Rejecting refunds {fmtNumber(active.pointsSpent)} points to the user.
              </p>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Note {action === "rejected" ? "(shown to the user)" : "(optional)"}
              </label>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={
                  action === "rejected" ? "Reason for rejection…" : "Optional note…"
                }
              />
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

/* --------------------------- Adjust points ---------------------------- */

function AdjustSection({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<AdminProfile | null>(null);
  const [points, setPoints] = useState("");
  const [note, setNote] = useState("");
  const [result, setResult] = useState<AdjustPointsResult | null>(null);

  const search = useQuery({
    queryKey: ["earnings-user-search", submitted],
    queryFn: () =>
      api.get<Paged<AdminProfile>>("/admin/users", { q: submitted, limit: 8 }),
    enabled: submitted.trim().length > 0,
  });

  const adjust = useMutation({
    mutationFn: (v: { userId: string; points: number; note?: string }) =>
      api.post<AdjustPointsResult>(`/admin/earnings/users/${v.userId}/adjust`, {
        points: v.points,
        ...(v.note ? { note: v.note } : {}),
      }),
    onSuccess: (data) => {
      setResult(data);
      setPoints("");
      void qc.invalidateQueries({ queryKey: ["earnings-summary"] });
    },
  });

  const reset = useMutation({
    mutationFn: (userId: string) =>
      api.post<AdjustPointsResult>(`/admin/earnings/users/${userId}/reset`),
    onSuccess: (data) => {
      setResult(data);
      void qc.invalidateQueries({ queryKey: ["earnings-summary"] });
    },
  });

  const select = (u: AdminProfile) => {
    setSelected(u);
    setResult(null);
    setPoints("");
    setNote("");
  };

  const pointsNum = Number(points);
  const pointsValid = points.trim() !== "" && Number.isInteger(pointsNum) && pointsNum !== 0;

  return (
    <Card>
      <CardHeader
        title="Adjust user points"
        subtitle="Find a user and add, remove or reset their points balance."
      />
      <div className="space-y-4 px-5 py-4">
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(q);
          }}
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by name, username or email"
              className="pl-9"
            />
          </div>
          <Button type="submit" variant="secondary" loading={search.isFetching && !!submitted}>
            Search
          </Button>
        </form>

        <ErrorNote error={search.error} />

        {submitted && search.data && search.data.items.length === 0 && (
          <p className="text-sm text-slate-500">No users found.</p>
        )}

        {search.data && search.data.items.length > 0 && (
          <div className="divide-y divide-slate-50 rounded-lg border border-slate-200">
            {search.data.items.map((u) => (
              <button
                key={u.id}
                onClick={() => select(u)}
                className={
                  "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 " +
                  (selected?.id === u.id ? "bg-brand-50" : "")
                }
              >
                <Avatar src={u.avatarUrl} name={u.displayName} size={32} />
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-slate-900">{u.displayName}</div>
                  <div className="truncate text-xs text-slate-500">@{u.username}</div>
                </div>
                {selected?.id === u.id && <Badge tone="violet">Selected</Badge>}
              </button>
            ))}
          </div>
        )}

        {selected && (
          <div className="space-y-4 rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <Avatar src={selected.avatarUrl} name={selected.displayName} size={40} />
              <div>
                <p className="font-semibold text-slate-900">{selected.displayName}</p>
                <p className="text-xs text-slate-500">@{selected.username}</p>
              </div>
            </div>

            <ErrorNote error={adjust.error || reset.error} />

            {result && (
              <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                New balance: <span className="font-semibold">{fmtNumber(result.balancePoints)} pts</span>{" "}
                ({usd(result.balanceDollars)})
              </div>
            )}

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Points change (use a negative number to subtract)
              </label>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canManage}
                  onClick={() => setPoints((p) => String(-Math.abs(Number(p) || 0)))}
                  title="Make negative"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  step={1}
                  value={points}
                  disabled={!canManage}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="e.g. 500 or -200"
                  className="max-w-40"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canManage}
                  onClick={() => setPoints((p) => String(Math.abs(Number(p) || 0)))}
                  title="Make positive"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Note (optional)</label>
              <Input
                value={note}
                disabled={!canManage}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for this adjustment"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <Button
                variant="danger"
                size="sm"
                disabled={!canManage}
                loading={reset.isPending}
                onClick={() => {
                  if (confirm(`Reset @${selected.username}'s points to 0?`))
                    reset.mutate(selected.id);
                }}
              >
                <RotateCcw className="h-4 w-4" />
                Reset to 0
              </Button>
              <Button
                disabled={!canManage || !pointsValid}
                loading={adjust.isPending}
                onClick={() =>
                  adjust.mutate({
                    userId: selected.id,
                    points: pointsNum,
                    note: note.trim() || undefined,
                  })
                }
              >
                Apply adjustment
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
