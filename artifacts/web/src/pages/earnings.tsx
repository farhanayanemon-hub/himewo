import { useEffect, useMemo, useState } from "react";
import { Redirect } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  useGetEarningsSummary,
  getGetEarningsSummaryQueryKey,
  useGetEarningsHistory,
  getGetEarningsHistoryQueryKey,
  useListWithdrawalAccounts,
  getListWithdrawalAccountsQueryKey,
  useAddWithdrawalAccount,
  useDeleteWithdrawalAccount,
  useListMyWithdrawals,
  getListMyWithdrawalsQueryKey,
  useCreateWithdrawal,
  type EarningsSummary,
  type PointTransaction,
  type WithdrawalAccount,
  type WithdrawalRequest,
} from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Wallet,
  Loader2,
  Plus,
  Trash2,
  TrendingUp,
  CalendarDays,
  Coins,
  ArrowDownToLine,
  Info,
} from "lucide-react";

/** A saved-account method and the field(s) the user must fill for it. */
type MethodField = {
  key: string;
  label: string;
  type: string;
  placeholder?: string;
};
type MethodConfig = {
  value: string;
  label: string;
  fields: MethodField[];
  guide: string;
};

const METHODS: MethodConfig[] = [
  {
    value: "paypal",
    label: "PayPal",
    fields: [
      { key: "email", label: "PayPal email", type: "email", placeholder: "you@example.com" },
    ],
    guide: "Use the email address tied to your PayPal account.",
  },
  {
    value: "wise",
    label: "Wise",
    fields: [
      { key: "email", label: "Wise email", type: "email", placeholder: "you@example.com" },
    ],
    guide: "Open a free Wise account and use its registered email.",
  },
  {
    value: "binance",
    label: "Binance",
    fields: [
      { key: "payId", label: "Binance Pay ID or email", type: "text", placeholder: "Pay ID / email" },
    ],
    guide: "Find your Binance Pay ID under Binance → Pay → profile.",
  },
  {
    value: "bybit",
    label: "Bybit",
    fields: [{ key: "uid", label: "Bybit UID", type: "text", placeholder: "Your Bybit UID" }],
    guide: "Your UID is shown at the top of the Bybit app home screen.",
  },
  {
    value: "bkash",
    label: "bKash",
    fields: [{ key: "phone", label: "bKash number", type: "tel", placeholder: "01XXXXXXXXX" }],
    guide: "Use your personal bKash wallet number.",
  },
  {
    value: "nagad",
    label: "Nagad",
    fields: [{ key: "phone", label: "Nagad number", type: "tel", placeholder: "01XXXXXXXXX" }],
    guide: "Use your personal Nagad wallet number.",
  },
];

const ACTION_LABELS: Record<string, string> = {
  post: "Created a post",
  like: "Reacted to a post",
  comment: "Commented on a post",
  share: "Shared a post",
  withdraw: "Withdrawal",
  withdraw_refund: "Withdrawal refund",
  admin_adjust: "Admin adjustment",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  approved: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  paid: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400",
  rejected: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400",
};

function usd(n: number): string {
  return `$${n.toFixed(2)}`;
}

function pointsToUsd(points: number, rate: number): number {
  return rate > 0 ? points / rate : 0;
}

function methodLabel(value: string): string {
  return METHODS.find((m) => m.value === value)?.label ?? value;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-card border border-border rounded-xl shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-base font-bold mb-3">{children}</h2>;
}

export default function EarningsPage() {
  const { data: summary, isLoading } = useGetEarningsSummary();

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </MainLayout>
    );
  }

  // When the system is OFF, the whole experience is hidden — bounce home.
  if (!summary || !summary.enabled) {
    return <Redirect to="/" />;
  }

  return <EarningsContent summary={summary} />;
}

function EarningsContent({ summary }: { summary: EarningsSummary }) {
  const rate = summary.pointsPerDollar;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto animate-in fade-in space-y-4 pb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">Earnings</h1>
            <p className="text-sm text-muted-foreground">
              Earn points for your activity and cash out in US dollars
            </p>
          </div>
        </div>

        <BalanceHeader summary={summary} rate={rate} />
        <RulesSection summary={summary} rate={rate} />
        <WithdrawalAccountsSection />
        <WithdrawSection summary={summary} rate={rate} />
        <HistorySection rate={rate} />
      </div>
    </MainLayout>
  );
}

function BalanceHeader({
  summary,
  rate,
}: {
  summary: EarningsSummary;
  rate: number;
}) {
  return (
    <Card className="p-5 bg-gradient-to-br from-primary/10 to-card">
      <p className="text-sm text-muted-foreground">Available balance</p>
      <p className="text-4xl font-extrabold tracking-tight mt-1">
        {usd(summary.balanceDollars)}
      </p>
      <p className="text-xs text-muted-foreground mt-1">
        {summary.balancePoints.toLocaleString()} points
        {summary.pendingWithdrawalDollars > 0 && (
          <> · {usd(summary.pendingWithdrawalDollars)} pending</>
        )}
      </p>

      <div className="grid grid-cols-2 gap-3 mt-5">
        <div className="bg-background/60 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <TrendingUp className="w-3.5 h-3.5" /> Today
          </div>
          <p className="font-bold mt-0.5">
            {usd(pointsToUsd(summary.todayPoints, rate))}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {summary.todayPoints.toLocaleString()} pts
          </p>
        </div>
        <div className="bg-background/60 rounded-lg p-3">
          <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
            <CalendarDays className="w-3.5 h-3.5" /> This month
          </div>
          <p className="font-bold mt-0.5">
            {usd(pointsToUsd(summary.monthPoints, rate))}
          </p>
          <p className="text-[11px] text-muted-foreground">
            {summary.monthPoints.toLocaleString()} pts
          </p>
        </div>
      </div>
    </Card>
  );
}

function RulesSection({
  summary,
  rate,
}: {
  summary: EarningsSummary;
  rate: number;
}) {
  const rules = [
    { label: "Create a post", points: summary.rewards.post },
    { label: "React to a post", points: summary.rewards.like },
    { label: "Comment on a post", points: summary.rewards.comment },
    { label: "Share a post", points: summary.rewards.share },
  ];

  return (
    <Card className="p-5">
      <SectionTitle>How it works</SectionTitle>
      <p className="text-sm text-muted-foreground mb-4">
        You earn points for engaging with other people's posts. Every{" "}
        <span className="font-semibold text-foreground">
          {rate.toLocaleString()} points = $1
        </span>
        . You can request a payout once you reach{" "}
        <span className="font-semibold text-foreground">
          {usd(summary.minWithdrawDollars)}
        </span>
        .
      </p>
      <div className="grid grid-cols-2 gap-2">
        {rules.map((r) => (
          <div
            key={r.label}
            className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2"
          >
            <span className="text-sm">{r.label}</span>
            <span className="flex items-center gap-1 text-sm font-semibold text-primary">
              <Coins className="w-3.5 h-3.5" />+{r.points}
            </span>
          </div>
        ))}
      </div>
      {summary.dailyPointCap ? (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-3">
          <Info className="w-3.5 h-3.5" />
          You can earn up to {summary.dailyPointCap.toLocaleString()} points per
          day.
        </p>
      ) : null}
    </Card>
  );
}

function WithdrawalAccountsSection() {
  const qc = useQueryClient();
  const { data: accounts, isLoading } = useListWithdrawalAccounts();
  const add = useAddWithdrawalAccount();
  const remove = useDeleteWithdrawalAccount();

  const [open, setOpen] = useState(false);
  const [method, setMethod] = useState<string>(METHODS[0].value);
  const [fields, setFields] = useState<Record<string, string>>({});

  const config = METHODS.find((m) => m.value === method)!;

  const resetForm = () => {
    setMethod(METHODS[0].value);
    setFields({});
    setOpen(false);
  };

  const submit = () => {
    const missing = config.fields.find((f) => !(fields[f.key] ?? "").trim());
    if (missing) {
      toast.error(`Please enter your ${missing.label.toLowerCase()}`);
      return;
    }
    const details: Record<string, string> = {};
    for (const f of config.fields) details[f.key] = fields[f.key].trim();
    add.mutate(
      {
        data: {
          method: config.value as never,
          label: config.label,
          details,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListWithdrawalAccountsQueryKey() });
          toast.success(`${config.label} account added`);
          resetForm();
        },
        onError: () => toast.error("Couldn't add account, please try again"),
      },
    );
  };

  const onRemove = (acc: WithdrawalAccount) => {
    remove.mutate(
      { id: acc.id },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListWithdrawalAccountsQueryKey() });
          toast.success("Account removed");
        },
        onError: () => toast.error("Couldn't remove account"),
      },
    );
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <SectionTitle>Payout accounts</SectionTitle>
        {!open && (
          <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Add
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : accounts && accounts.length > 0 ? (
        <div className="space-y-2">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="font-medium text-sm">{methodLabel(acc.method)}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {Object.values(acc.details).join(" · ") || "—"}
                </p>
              </div>
              <button
                onClick={() => onRemove(acc)}
                disabled={remove.isPending}
                className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
                aria-label="Remove account"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        !open && (
          <p className="text-sm text-muted-foreground py-2">
            No payout accounts yet. Add one to request a withdrawal.
          </p>
        )
      )}

      {open && (
        <div className="mt-3 space-y-3 border-t border-border pt-4">
          <div className="space-y-1.5">
            <Label>Method</Label>
            <Select
              value={method}
              onValueChange={(v) => {
                setMethod(v);
                setFields({});
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {config.fields.map((f) => (
            <div key={f.key} className="space-y-1.5">
              <Label>{f.label}</Label>
              <Input
                type={f.type}
                placeholder={f.placeholder}
                value={fields[f.key] ?? ""}
                onChange={(e) =>
                  setFields((prev) => ({ ...prev, [f.key]: e.target.value }))
                }
              />
            </div>
          ))}
          <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
            <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {config.guide}
          </p>
          <div className="flex gap-2">
            <Button onClick={submit} disabled={add.isPending} className="flex-1">
              {add.isPending && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Save account
            </Button>
            <Button variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function WithdrawSection({
  summary,
  rate,
}: {
  summary: EarningsSummary;
  rate: number;
}) {
  const qc = useQueryClient();
  const { data: accounts } = useListWithdrawalAccounts();
  const { data: requests, isLoading } = useListMyWithdrawals();
  const create = useCreateWithdrawal();

  const [accountId, setAccountId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");

  const maxWhole = Math.floor(summary.balanceDollars);
  const min = summary.minWithdrawDollars;

  const submit = () => {
    if (!accountId) {
      toast.error("Choose a payout account first");
      return;
    }
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      toast.error("Enter a whole dollar amount");
      return;
    }
    if (value < min) {
      toast.error(`Minimum withdrawal is ${usd(min)}`);
      return;
    }
    if (value > maxWhole) {
      toast.error(`You can withdraw up to ${usd(maxWhole)}`);
      return;
    }
    create.mutate(
      { data: { amountDollars: value, accountId: Number(accountId) } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getListMyWithdrawalsQueryKey() });
          qc.invalidateQueries({ queryKey: getGetEarningsSummaryQueryKey() });
          qc.invalidateQueries({ queryKey: getGetEarningsHistoryQueryKey() });
          toast.success("Withdrawal request submitted");
          setAmount("");
        },
        onError: () => toast.error("Couldn't submit, please try again"),
      },
    );
  };

  const hasAccounts = (accounts?.length ?? 0) > 0;
  const canWithdraw = maxWhole >= min;

  return (
    <Card className="p-5">
      <SectionTitle>Withdraw</SectionTitle>

      {!hasAccounts ? (
        <p className="text-sm text-muted-foreground">
          Add a payout account above to request a withdrawal.
        </p>
      ) : !canWithdraw ? (
        <p className="text-sm text-muted-foreground">
          You need at least {usd(min)} to withdraw. Keep earning!
        </p>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Payout account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an account" />
              </SelectTrigger>
              <SelectContent>
                {accounts!.map((acc) => (
                  <SelectItem key={acc.id} value={String(acc.id)}>
                    {methodLabel(acc.method)} ·{" "}
                    {Object.values(acc.details).join(" ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Amount (USD)</Label>
            <Input
              type="number"
              min={min}
              max={maxWhole}
              step={1}
              placeholder={`${min}`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Min {usd(min)} · Available {usd(maxWhole)}
            </p>
          </div>
          <Button
            onClick={submit}
            disabled={create.isPending}
            className="w-full"
          >
            {create.isPending ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <ArrowDownToLine className="w-4 h-4 mr-1" />
            )}
            Request withdrawal
          </Button>
        </div>
      )}

      <div className="mt-5">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">
          Your requests
        </h3>
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : requests && requests.length > 0 ? (
          <div className="space-y-2">
            {requests.map((r) => (
              <WithdrawalRow key={r.id} request={r} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No requests yet.</p>
        )}
      </div>
    </Card>
  );
}

function WithdrawalRow({ request }: { request: WithdrawalRequest }) {
  return (
    <div className="flex items-center justify-between bg-muted/40 rounded-lg px-3 py-2.5">
      <div className="min-w-0">
        <p className="font-medium text-sm">
          {usd(request.amountDollars)} · {methodLabel(request.method)}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatDate(request.createdAt)}
          {request.adminNote ? ` · ${request.adminNote}` : ""}
        </p>
      </div>
      <span
        className={`text-xs font-semibold px-2.5 py-1 rounded-full capitalize shrink-0 ${
          STATUS_STYLES[request.status] ?? "bg-muted text-muted-foreground"
        }`}
      >
        {request.status}
      </span>
    </div>
  );
}

function HistorySection({ rate }: { rate: number }) {
  const PAGE = 20;
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<PointTransaction[]>([]);
  const { data: page, isLoading } = useGetEarningsHistory({
    limit: PAGE,
    ...(cursor ? { cursor } : {}),
  });

  useEffect(() => {
    if (!page) return;
    // First page (no cursor): replace so refetches keep newest-first order.
    // Subsequent pages (cursor set): append older rows, de-duped by id.
    if (cursor === undefined) {
      setItems(page);
      return;
    }
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...page.filter((p) => !seen.has(p.id))];
    });
  }, [page, cursor]);

  const hasMore = (page?.length ?? 0) === PAGE;
  const loadMore = () => {
    if (items.length > 0) setCursor(items[items.length - 1].id);
  };

  const empty = !isLoading && items.length === 0;

  return (
    <Card className="p-5">
      <SectionTitle>Points history</SectionTitle>
      {isLoading && items.length === 0 ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : empty ? (
        <p className="text-sm text-muted-foreground py-2">
          Nothing yet. Start posting and engaging to earn points!
        </p>
      ) : (
        <>
          <div className="divide-y divide-border">
            {items.map((t) => (
              <HistoryRow key={t.id} tx={t} rate={rate} />
            ))}
          </div>
          {hasMore && (
            <Button
              variant="ghost"
              className="w-full mt-3"
              onClick={loadMore}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Load more
            </Button>
          )}
        </>
      )}
    </Card>
  );
}

function HistoryRow({ tx, rate }: { tx: PointTransaction; rate: number }) {
  const positive = tx.points >= 0;
  const dollars = useMemo(
    () => pointsToUsd(Math.abs(tx.points), rate),
    [tx.points, rate],
  );
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-medium">
          {ACTION_LABELS[tx.action] ?? tx.action}
        </p>
        <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
      </div>
      <div className="text-right shrink-0">
        <p
          className={`text-sm font-semibold ${
            positive ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"
          }`}
        >
          {positive ? "+" : "−"}
          {Math.abs(tx.points).toLocaleString()} pts
        </p>
        <p className="text-[11px] text-muted-foreground">
          {positive ? "+" : "−"}
          {usd(dollars)}
        </p>
      </div>
    </div>
  );
}
