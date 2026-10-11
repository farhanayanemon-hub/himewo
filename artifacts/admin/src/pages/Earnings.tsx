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
  const [activeTab, setActiveTab] = useState<"hub" | "points">("hub");

  return (
    <div>
      <PageHeader
        title="Earnings & Hub Monetization"
        description="Configure Hub monetization rates for Post, Reels, Videos & Live, approve Hubs, and manage user earnings."
      />
      <div className="mb-6 flex flex-wrap gap-2 border-b border-slate-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("hub")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "hub"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          Hub Monetization (Post / Reels / Videos / Live)
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("points")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            activeTab === "points"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          User Points & Daily Tasks
        </button>
      </div>

      {activeTab === "hub" ? (
        <HubMonetizationAdminSection canManage={canManage} />
      ) : (
        <div className="space-y-6">
          <StatsSection />
          <ConfigSection canManage={canManage} />
          <DailyTasksAdminSection canManage={canManage} />
          <WithdrawalsSection canManage={canManage} />
          <AdjustSection canManage={canManage} />
        </div>
      )}
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
  | "pointsPerReel"
  | "pointsPerDollar"
  | "minWithdrawDollars"
  | "dailyPointCap";

const NUM_FIELDS: { key: NumKey; label: string; hint?: string }[] = [
  { key: "pointsPerPost", label: "Points per post" },
  { key: "pointsPerLike", label: "Points per like" },
  { key: "pointsPerComment", label: "Points per comment" },
  { key: "pointsPerShare", label: "Points per share" },
  { key: "pointsPerReel", label: "Points per reel created", hint: "Points granted for creating and publishing a reel (default 20)." },
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
    pointsPerReel: "20",
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
        pointsPerReel: String(query.data.pointsPerReel ?? 20),
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
      pointsPerReel: Number(form.pointsPerReel),
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

/* ----------------------------- Daily Tasks ---------------------------- */

interface AdminDailyTask {
  id: number;
  title: string;
  description: string | null;
  action: string;
  rewardPoints: number;
  targetCount: number;
  active: boolean;
  createdAt: string;
}

function DailyTasksAdminSection({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [action, setAction] = useState("reel");
  const [rewardPoints, setRewardPoints] = useState("20");
  const [targetCount, setTargetCount] = useState("1");
  const [active, setActive] = useState(true);

  const query = useQuery({
    queryKey: ["admin-daily-tasks"],
    queryFn: () => api.get<AdminDailyTask[]>("/admin/earnings/daily-tasks"),
  });

  const createMutation = useMutation({
    mutationFn: (body: any) => api.post("/admin/earnings/daily-tasks", body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-daily-tasks"] });
      setModalOpen(false);
      resetForm();
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api.put(`/admin/earnings/daily-tasks/${id}`, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-daily-tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.del(`/admin/earnings/daily-tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin-daily-tasks"] }),
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setAction("reel");
    setRewardPoints("20");
    setTargetCount("1");
    setActive(true);
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || null,
      action,
      rewardPoints: Number(rewardPoints) || 20,
      targetCount: Number(targetCount) || 1,
      active,
    });
  };

  const tasks = query.data ?? [];

  return (
    <Card>
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Daily Tasks Management</h2>
          <p className="text-xs text-slate-500">
            Configure daily tasks users complete on HiMewo to claim reward points.
          </p>
        </div>
        {canManage && (
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Add Daily Task
          </Button>
        )}
      </div>

      {query.isLoading && <Loading />}
      <ErrorNote error={query.error || createMutation.error || toggleMutation.error} />

      {!query.isLoading && tasks.length === 0 ? (
        <EmptyState
          title="No daily tasks configured"
          description="Add your first daily task so users can earn points."
        />
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Title & Description</Th>
              <Th>Action</Th>
              <Th>Target</Th>
              <Th>Reward</Th>
              <Th>Status</Th>
              {canManage && <Th>Actions</Th>}
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.id} className="hover:bg-slate-50/50">
                <Td>
                  <div>
                    <span className="font-medium text-slate-900">{task.title}</span>
                    {task.description && (
                      <p className="text-xs text-slate-500">{task.description}</p>
                    )}
                  </div>
                </Td>
                <Td>
                  <Badge tone="violet">{task.action.toUpperCase()}</Badge>
                </Td>
                <Td className="text-slate-700 font-medium">{task.targetCount}x</Td>
                <Td className="text-emerald-600 font-semibold">+{task.rewardPoints} pts</Td>
                <Td>
                  <Badge tone={task.active ? "green" : "neutral"}>
                    {task.active ? "Active" : "Disabled"}
                  </Badge>
                </Td>
                {canManage && (
                  <Td>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() =>
                          toggleMutation.mutate({ id: task.id, active: !task.active })
                        }
                      >
                        {task.active ? "Disable" : "Enable"}
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => {
                          if (confirm(`Delete daily task "${task.title}"?`)) {
                            deleteMutation.mutate(task.id);
                          }
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {/* Add Daily Task Modal */}
      {modalOpen && (
        <Modal
          open={modalOpen}
          title="Add New Daily Task"
          onClose={() => {
            setModalOpen(false);
            resetForm();
          }}
        >
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Task Title *
              </label>
              <Input
                placeholder="e.g. Create a Reel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Description
              </label>
              <Textarea
                placeholder="Explanation of how to complete the task"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Trigger Action *
                </label>
                <Select
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                >
                  <option value="reel">Create Reel (reel)</option>
                  <option value="like">React/Like Posts & Reels (like)</option>
                  <option value="post">Create a Post (post)</option>
                  <option value="comment">Comment on Post or Reel (comment)</option>
                  <option value="share">Share a Post or Reel (share)</option>
                  <option value="custom">Custom Activity (custom)</option>
                </Select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Target Count *
                </label>
                <Input
                  type="number"
                  min="1"
                  value={targetCount}
                  onChange={(e) => setTargetCount(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Reward Points *
                </label>
                <Input
                  type="number"
                  min="1"
                  placeholder="e.g. 20"
                  value={rewardPoints}
                  onChange={(e) => setRewardPoints(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-6">
                <Toggle checked={active} onChange={setActive} />
                <span className="text-xs font-medium text-slate-700">
                  {active ? "Active immediately" : "Disabled"}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || !title.trim()}
              >
                {createMutation.isPending ? "Creating..." : "Save Daily Task"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Card>
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

/* ======================== Hub Monetization Admin ======================== */

interface HubMonetizationSummary {
  monetizedHubsCount: number;
  pendingApplicationsCount: number;
  totalEarningsDollars: number;
  pendingPayoutDollars: number;
  pendingPayoutCount: number;
  totalPaidDollars: number;
}

interface HubMonetizationConfigDto {
  id: number;
  enabled: boolean;
  postRpmCents: number;
  reelRpmCents: number;
  videoRpmCents: number;
  liveRpmCents: number;
  likeMicroDollars: number;
  commentMicroDollars: number;
  shareMicroDollars: number;
  minWithdrawDollars: number;
  dailyHubCapMicroDollars: number;
  updatedAt?: string;
}

interface HubApplicationRow {
  id: number;
  name: string;
  category: string;
  description: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  owner: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  followersCount: number;
  totalContentCount: number;
  monetizationStatus: "none" | "pending" | "approved" | "rejected" | "suspended";
  monetizationAppliedAt: string | null;
  monetizationApprovedAt: string | null;
  monetizationNote: string | null;
  earnedBalanceDollars: number;
}

interface HubWithdrawalRow {
  id: number;
  pageId: number;
  page: {
    id: number;
    name: string;
    avatarUrl: string | null;
    category: string;
  } | null;
  ownerId: string;
  owner: {
    id: string;
    displayName: string;
    username: string;
    avatarUrl: string | null;
  } | null;
  amountDollars: number;
  microDollars: number;
  method: string;
  accountDetails: Record<string, unknown>;
  status: WithdrawalStatus;
  adminNote: string | null;
  createdAt: string;
  processedAt: string | null;
}

const HUB_STATUS_TONE: Record<string, "amber" | "blue" | "green" | "red" | "neutral"> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
  suspended: "red",
  none: "neutral",
};

function HubMonetizationAdminSection({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();

  const summaryQuery = useQuery({
    queryKey: ["hub-monetization-summary"],
    queryFn: () => api.get<HubMonetizationSummary>("/admin/hub-monetization/summary"),
  });

  const configQuery = useQuery({
    queryKey: ["hub-monetization-config"],
    queryFn: () => api.get<HubMonetizationConfigDto>("/admin/hub-monetization/config"),
  });

  const [appStatusFilter, setAppStatusFilter] = useState<string>("all");
  const applicationsQuery = useQuery({
    queryKey: ["hub-monetization-applications", appStatusFilter],
    queryFn: () =>
      api.get<HubApplicationRow[]>("/admin/hub-monetization/applications", {
        status: appStatusFilter,
      }),
  });

  const [withdrawalStatusFilter, setWithdrawalStatusFilter] = useState<string>("pending");
  const withdrawalsQuery = useQuery({
    queryKey: ["hub-monetization-withdrawals", withdrawalStatusFilter],
    queryFn: () =>
      api.get<HubWithdrawalRow[]>("/admin/hub-monetization/withdrawals", {
        status: withdrawalStatusFilter,
      }),
  });

  // Rate inputs in user-friendly USD
  const [rateForm, setRateForm] = useState({
    postRpmDollars: "1.00",
    reelRpmDollars: "2.00",
    videoRpmDollars: "3.00",
    liveRpmDollars: "4.00",
    likeBonusDollars: "0.001",
    commentBonusDollars: "0.002",
    shareBonusDollars: "0.005",
    minWithdrawDollars: "20",
    dailyCapDollars: "50",
  });
  const [rateSaved, setRateSaved] = useState(false);

  useEffect(() => {
    if (configQuery.data) {
      const c = configQuery.data;
      setRateForm({
        postRpmDollars: (c.postRpmCents / 100).toFixed(2),
        reelRpmDollars: (c.reelRpmCents / 100).toFixed(2),
        videoRpmDollars: (c.videoRpmCents / 100).toFixed(2),
        liveRpmDollars: (c.liveRpmCents / 100).toFixed(2),
        likeBonusDollars: String(c.likeMicroDollars / 1_000_000),
        commentBonusDollars: String(c.commentMicroDollars / 1_000_000),
        shareBonusDollars: String(c.shareMicroDollars / 1_000_000),
        minWithdrawDollars: String(c.minWithdrawDollars),
        dailyCapDollars: String(Math.round(c.dailyHubCapMicroDollars / 1_000_000)),
      });
    }
  }, [configQuery.data]);

  const updateConfigMut = useMutation({
    mutationFn: (body: Partial<HubMonetizationConfigDto>) =>
      api.put<HubMonetizationConfigDto>("/admin/hub-monetization/config", body),
    onSuccess: (data) => {
      qc.setQueryData(["hub-monetization-config"], data);
      setRateSaved(true);
      window.setTimeout(() => setRateSaved(false), 2500);
    },
  });

  const handleSaveRates = () => {
    updateConfigMut.mutate({
      postRpmCents: Math.max(0, Math.round(Number(rateForm.postRpmDollars || 0) * 100)),
      reelRpmCents: Math.max(0, Math.round(Number(rateForm.reelRpmDollars || 0) * 100)),
      videoRpmCents: Math.max(0, Math.round(Number(rateForm.videoRpmDollars || 0) * 100)),
      liveRpmCents: Math.max(0, Math.round(Number(rateForm.liveRpmDollars || 0) * 100)),
      likeMicroDollars: Math.max(0, Math.round(Number(rateForm.likeBonusDollars || 0) * 1_000_000)),
      commentMicroDollars: Math.max(0, Math.round(Number(rateForm.commentBonusDollars || 0) * 1_000_000)),
      shareMicroDollars: Math.max(0, Math.round(Number(rateForm.shareBonusDollars || 0) * 1_000_000)),
      minWithdrawDollars: Math.max(1, Math.round(Number(rateForm.minWithdrawDollars || 1))),
      dailyHubCapMicroDollars: Math.max(0, Math.round(Number(rateForm.dailyCapDollars || 0) * 1_000_000)),
    });
  };

  // Hub status update mutation
  const updateHubStatusMut = useMutation({
    mutationFn: (v: { pageId: number; status: string; note?: string }) =>
      api.post(`/admin/hub-monetization/pages/${v.pageId}/status`, {
        status: v.status,
        note: v.note,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hub-monetization-applications"] });
      void qc.invalidateQueries({ queryKey: ["hub-monetization-summary"] });
    },
  });

  // Hub withdrawal processing modal
  const [activeWithdrawal, setActiveWithdrawal] = useState<HubWithdrawalRow | null>(null);
  const [withdrawalAction, setWithdrawalAction] = useState<WithdrawalStatus | null>(null);
  const [withdrawalNote, setWithdrawalNote] = useState("");

  const processWithdrawalMut = useMutation({
    mutationFn: (v: { id: number; status: WithdrawalStatus; adminNote?: string }) =>
      api.post(`/admin/hub-monetization/withdrawals/${v.id}/process`, {
        status: v.status,
        ...(v.adminNote ? { adminNote: v.adminNote } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["hub-monetization-withdrawals"] });
      void qc.invalidateQueries({ queryKey: ["hub-monetization-summary"] });
      void qc.invalidateQueries({ queryKey: ["hub-monetization-applications"] });
      setActiveWithdrawal(null);
      setWithdrawalAction(null);
      setWithdrawalNote("");
    },
  });

  const enabled = configQuery.data?.enabled ?? true;

  return (
    <div className="space-y-6">
      {/* 1. KPI Summary */}
      <Card>
        <CardHeader
          title="Hub Monetization Overview"
          subtitle="Active monetized Hubs, pending applications, and total creator revenue across Post, Reels, Videos & Live."
        />
        {summaryQuery.isLoading && <Loading />}
        <ErrorNote error={summaryQuery.error} />
        {summaryQuery.data && (
          <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <StatTile
              tone="emerald"
              icon={<BadgeDollarSign className="h-5 w-5" />}
              label="Monetized Hubs"
              value={fmtNumber(summaryQuery.data.monetizedHubsCount)}
              sub={`${fmtNumber(summaryQuery.data.pendingApplicationsCount)} pending application(s)`}
            />
            <StatTile
              tone="violet"
              icon={<Coins className="h-5 w-5" />}
              label="Total Hub Earnings"
              value={`$${summaryQuery.data.totalEarningsDollars.toFixed(2)}`}
              sub={`Paid out: $${summaryQuery.data.totalPaidDollars.toFixed(2)}`}
            />
            <StatTile
              tone="amber"
              icon={<Clock className="h-5 w-5" />}
              label="Pending Hub Payouts"
              value={usd(summaryQuery.data.pendingPayoutDollars)}
              sub={`${fmtNumber(summaryQuery.data.pendingPayoutCount)} Hub withdrawal request(s)`}
            />
          </div>
        )}
      </Card>

      {/* 2. Master Switch & Format Earning Rates (Post, Reels, Videos, Live) */}
      <Card>
        <CardHeader
          title="Format Earning Rates (Post, Reels, Videos & Live)"
          subtitle="Set how much USD Hubs earn for Posts, Reels, Videos, and Live streams."
          action={
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-slate-600">
                  {enabled ? "Monetization Active" : "Paused"}
                </span>
                <Toggle
                  checked={enabled}
                  disabled={!canManage || updateConfigMut.isPending}
                  onChange={(v) => updateConfigMut.mutate({ enabled: v })}
                />
              </div>
              {rateSaved && (
                <span className="text-xs font-semibold text-emerald-600">Rates Saved!</span>
              )}
              <Button
                size="sm"
                disabled={!canManage}
                loading={updateConfigMut.isPending}
                onClick={handleSaveRates}
              >
                <Save className="h-4 w-4" />
                Save Rates
              </Button>
            </div>
          }
        />
        {configQuery.isLoading && <Loading />}
        <ErrorNote error={configQuery.error || updateConfigMut.error} />
        {configQuery.data && (
          <div className="space-y-6 px-5 py-4">
            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Content Format Earning Rates (USD per 1,000 Views / Plays)
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    📝 Post Earning Rate ($ / 1K views)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1.5 bg-white"
                    value={rateForm.postRpmDollars}
                    disabled={!canManage}
                    onChange={(e) =>
                      setRateForm((p) => ({ ...p, postRpmDollars: e.target.value }))
                    }
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    ${(Number(rateForm.postRpmDollars || 0) / 1000).toFixed(4)} per Post view
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    🎬 Reels Earning Rate ($ / 1K plays)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1.5 bg-white"
                    value={rateForm.reelRpmDollars}
                    disabled={!canManage}
                    onChange={(e) =>
                      setRateForm((p) => ({ ...p, reelRpmDollars: e.target.value }))
                    }
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    ${(Number(rateForm.reelRpmDollars || 0) / 1000).toFixed(4)} per Reel play
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    📹 Videos Earning Rate ($ / 1K views)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1.5 bg-white"
                    value={rateForm.videoRpmDollars}
                    disabled={!canManage}
                    onChange={(e) =>
                      setRateForm((p) => ({ ...p, videoRpmDollars: e.target.value }))
                    }
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    ${(Number(rateForm.videoRpmDollars || 0) / 1000).toFixed(4)} per Video view
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    🔴 Live Earning Rate ($ / 1K viewers)
                  </label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="mt-1.5 bg-white"
                    value={rateForm.liveRpmDollars}
                    disabled={!canManage}
                    onChange={(e) =>
                      setRateForm((p) => ({ ...p, liveRpmDollars: e.target.value }))
                    }
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    ${(Number(rateForm.liveRpmDollars || 0) / 1000).toFixed(4)} per Live viewer
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-500">
                Engagement Bonuses & Payout Thresholds (USD)
              </h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5">
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Like Bonus ($ per like)
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    className="mt-1"
                    value={rateForm.likeBonusDollars}
                    disabled={!canManage}
                    onChange={(e) =>
                      setRateForm((p) => ({ ...p, likeBonusDollars: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Comment Bonus ($ per comment)
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    className="mt-1"
                    value={rateForm.commentBonusDollars}
                    disabled={!canManage}
                    onChange={(e) =>
                      setRateForm((p) => ({ ...p, commentBonusDollars: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Share Bonus ($ per share)
                  </label>
                  <Input
                    type="number"
                    step="0.0001"
                    min="0"
                    className="mt-1"
                    value={rateForm.shareBonusDollars}
                    disabled={!canManage}
                    onChange={(e) =>
                      setRateForm((p) => ({ ...p, shareBonusDollars: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Min Withdrawal ($ USD)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    className="mt-1"
                    value={rateForm.minWithdrawDollars}
                    disabled={!canManage}
                    onChange={(e) =>
                      setRateForm((p) => ({ ...p, minWithdrawDollars: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600">
                    Daily Cap per Hub ($ USD)
                  </label>
                  <Input
                    type="number"
                    step="1"
                    min="1"
                    className="mt-1"
                    value={rateForm.dailyCapDollars}
                    disabled={!canManage}
                    onChange={(e) =>
                      setRateForm((p) => ({ ...p, dailyCapDollars: e.target.value }))
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* 3. Hub Monetization Applications & Status Management */}
      <Card>
        <CardHeader
          title="Hub Monetization Applications & Active Hubs"
          subtitle="Approve, reject, or suspend Hub monetization for any Hub on HiMewo."
          action={
            <Select
              value={appStatusFilter}
              onChange={(e) => setAppStatusFilter(e.target.value)}
            >
              <option value="all">All Hubs</option>
              <option value="pending">Pending Applications</option>
              <option value="approved">Approved (Monetized)</option>
              <option value="rejected">Rejected</option>
              <option value="suspended">Suspended</option>
              <option value="none">Not Applied</option>
            </Select>
          }
        />
        {applicationsQuery.isLoading && <Loading />}
        <ErrorNote error={applicationsQuery.error || updateHubStatusMut.error} />
        {applicationsQuery.data && applicationsQuery.data.length === 0 && (
          <EmptyState
            title="No Hubs found"
            description="No Hubs match the selected status filter."
          />
        )}
        {applicationsQuery.data && applicationsQuery.data.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Hub (Page)</Th>
                <Th>Owner</Th>
                <Th>Followers & Content</Th>
                <Th>Available Balance</Th>
                <Th>Status</Th>
                {canManage && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {applicationsQuery.data.map((hub) => (
                <tr key={hub.id} className="hover:bg-slate-50">
                  <Td>
                    <div className="flex items-center gap-3">
                      <Avatar src={hub.avatarUrl} name={hub.name} size={36} />
                      <div>
                        <div className="font-semibold text-slate-900">{hub.name}</div>
                        <div className="text-xs text-slate-500">{hub.category}</div>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    {hub.owner ? (
                      <div>
                        <div className="text-sm font-medium text-slate-800">
                          {hub.owner.displayName}
                        </div>
                        <div className="text-xs text-slate-500">@{hub.owner.username}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </Td>
                  <Td>
                    <div className="text-sm font-medium text-slate-800">
                      {fmtNumber(hub.followersCount)} followers
                    </div>
                    <div className="text-xs text-slate-500">
                      {fmtNumber(hub.totalContentCount)} content items
                    </div>
                  </Td>
                  <Td>
                    <span className="font-semibold text-emerald-600">
                      ${hub.earnedBalanceDollars.toFixed(4)}
                    </span>
                  </Td>
                  <Td>
                    <Badge tone={HUB_STATUS_TONE[hub.monetizationStatus] ?? "neutral"}>
                      {hub.monetizationStatus.toUpperCase()}
                    </Badge>
                    {hub.monetizationAppliedAt && (
                      <div className="mt-0.5 text-[11px] text-slate-400">
                        Applied {fmtDateTime(hub.monetizationAppliedAt)}
                      </div>
                    )}
                  </Td>
                  {canManage && (
                    <Td>
                      <div className="flex flex-wrap gap-1.5">
                        {hub.monetizationStatus !== "approved" && (
                          <Button
                            size="sm"
                            variant="primary"
                            loading={updateHubStatusMut.isPending}
                            onClick={() =>
                              updateHubStatusMut.mutate({
                                pageId: hub.id,
                                status: "approved",
                              })
                            }
                          >
                            Approve
                          </Button>
                        )}
                        {hub.monetizationStatus === "approved" && (
                          <Button
                            size="sm"
                            variant="secondary"
                            loading={updateHubStatusMut.isPending}
                            onClick={() =>
                              updateHubStatusMut.mutate({
                                pageId: hub.id,
                                status: "suspended",
                              })
                            }
                          >
                            Suspend
                          </Button>
                        )}
                        {hub.monetizationStatus !== "rejected" && (
                          <Button
                            size="sm"
                            variant="danger"
                            loading={updateHubStatusMut.isPending}
                            onClick={() =>
                              updateHubStatusMut.mutate({
                                pageId: hub.id,
                                status: "rejected",
                              })
                            }
                          >
                            Reject
                          </Button>
                        )}
                      </div>
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* 4. Hub Withdrawal Requests */}
      <Card>
        <CardHeader
          title="Hub Withdrawal Requests"
          subtitle="Process Hub creator payouts (bKash, Nagad, Binance, PayPal, Wise, Bybit)."
          action={
            <Select
              value={withdrawalStatusFilter}
              onChange={(e) => setWithdrawalStatusFilter(e.target.value)}
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
              <option value="all">All Statuses</option>
            </Select>
          }
        />
        {withdrawalsQuery.isLoading && <Loading />}
        <ErrorNote error={withdrawalsQuery.error} />
        {withdrawalsQuery.data && withdrawalsQuery.data.length === 0 && (
          <EmptyState
            title="No Hub withdrawal requests"
            description="No Hub payout requests match this filter."
          />
        )}
        {withdrawalsQuery.data && withdrawalsQuery.data.length > 0 && (
          <Table>
            <thead>
              <tr>
                <Th>Hub</Th>
                <Th>Owner</Th>
                <Th>Amount</Th>
                <Th>Method & Details</Th>
                <Th>Requested</Th>
                <Th>Status</Th>
                {canManage && <Th>Actions</Th>}
              </tr>
            </thead>
            <tbody>
              {withdrawalsQuery.data.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50">
                  <Td>
                    <div className="font-semibold text-slate-900">
                      {w.page?.name ?? `Hub #${w.pageId}`}
                    </div>
                    <div className="text-xs text-slate-500">{w.page?.category ?? ""}</div>
                  </Td>
                  <Td>
                    {w.owner ? (
                      <div className="text-xs text-slate-700">
                        {w.owner.displayName} (@{w.owner.username})
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </Td>
                  <Td className="font-semibold text-slate-900">{usd(w.amountDollars)}</Td>
                  <Td>
                    <div className="text-xs font-semibold text-slate-800">
                      {methodLabel(w.method)}
                    </div>
                    <div className="text-xs text-slate-500">
                      {Object.entries(w.accountDetails ?? {})
                        .map(([k, v]) => `${k}: ${String(v)}`)
                        .join(", ") || "—"}
                    </div>
                  </Td>
                  <Td className="text-xs text-slate-500">{fmtDateTime(w.createdAt)}</Td>
                  <Td>
                    <Badge tone={STATUS_TONE[w.status] ?? "amber"}>{w.status}</Badge>
                    {w.adminNote && (
                      <div className="mt-1 text-xs text-slate-400">{w.adminNote}</div>
                    )}
                  </Td>
                  {canManage && (
                    <Td>
                      {w.status === "pending" || w.status === "approved" ? (
                        <div className="flex flex-wrap gap-1.5">
                          {w.status === "pending" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setActiveWithdrawal(w);
                                setWithdrawalAction("approved");
                                setWithdrawalNote("");
                              }}
                            >
                              Approve
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => {
                              setActiveWithdrawal(w);
                              setWithdrawalAction("paid");
                              setWithdrawalNote("");
                            }}
                          >
                            Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => {
                              setActiveWithdrawal(w);
                              setWithdrawalAction("rejected");
                              setWithdrawalNote("");
                            }}
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </Td>
                  )}
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <Modal
          open={!!activeWithdrawal && !!withdrawalAction}
          onClose={() => {
            setActiveWithdrawal(null);
            setWithdrawalAction(null);
            setWithdrawalNote("");
          }}
          title={
            withdrawalAction === "approved"
              ? "Approve Hub Withdrawal"
              : withdrawalAction === "paid"
                ? "Mark Hub Withdrawal Paid"
                : "Reject Hub Withdrawal"
          }
          footer={
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  setActiveWithdrawal(null);
                  setWithdrawalAction(null);
                  setWithdrawalNote("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant={withdrawalAction === "rejected" ? "danger" : "primary"}
                loading={processWithdrawalMut.isPending}
                onClick={() =>
                  activeWithdrawal &&
                  withdrawalAction &&
                  processWithdrawalMut.mutate({
                    id: activeWithdrawal.id,
                    status: withdrawalAction,
                    adminNote: withdrawalNote.trim() || undefined,
                  })
                }
              >
                Confirm
              </Button>
            </>
          }
        >
          {activeWithdrawal && withdrawalAction && (
            <div className="space-y-4">
              <ErrorNote error={processWithdrawalMut.error} />
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Hub</span>
                  <span className="font-semibold text-slate-800">
                    {activeWithdrawal.page?.name ?? `Hub #${activeWithdrawal.pageId}`}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Amount</span>
                  <span className="font-semibold text-slate-800">
                    {usd(activeWithdrawal.amountDollars)}
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-slate-500">Method</span>
                  <span className="font-semibold text-slate-800">
                    {methodLabel(activeWithdrawal.method)}
                  </span>
                </div>
              </div>
              {withdrawalAction === "rejected" && (
                <p className="text-xs text-amber-600">
                  Rejecting automatically refunds {usd(activeWithdrawal.amountDollars)} back to the Hub's available balance.
                </p>
              )}
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Admin Note (optional)</label>
                <Textarea
                  rows={3}
                  value={withdrawalNote}
                  onChange={(e) => setWithdrawalNote(e.target.value)}
                  placeholder="Optional note or transaction reference..."
                />
              </div>
            </div>
          )}
        </Modal>
      </Card>
    </div>
  );
}

