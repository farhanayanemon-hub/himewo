import { useMemo, useState } from "react";
import {
  useGetAdAccountInsights,
  useGetAdAccountPixel,
  useListAdAccountConversions,
  getGetAdAccountInsightsQueryKey,
  getGetAdAccountPixelQueryKey,
  getListAdAccountConversionsQueryKey,
  type GetAdAccountInsightsParams,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { formatCents, formatDate } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Copy, TrendingUp } from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

type Level = NonNullable<GetAdAccountInsightsParams["level"]>;

const RANGES = [
  { label: "7 din", days: 7 },
  { label: "30 din", days: 30 },
  { label: "90 din", days: 90 },
];

const LEVELS: { value: Level; label: string }[] = [
  { value: "campaign", label: "Campaign" },
  { value: "adset", label: "Ad set" },
  { value: "ad", label: "Ad" },
];

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function isoToday(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatPct(fraction: number): string {
  return `${(fraction * 100).toFixed(2)}%`;
}

function formatNum(n: number): string {
  return new Intl.NumberFormat().format(n);
}

function formatRoas(roas: number | null | undefined): string {
  if (roas == null) return "—";
  return `${roas.toFixed(2)}x`;
}

export default function InsightsPage() {
  const { selectedAccountId, selectedAccount } = useAccount();
  const { toast } = useToast();
  const [days, setDays] = useState(30);
  const [level, setLevel] = useState<Level>("campaign");

  const currency = selectedAccount?.currency ?? "USD";
  const accountId = selectedAccountId ?? 0;
  const enabled = accountId > 0;

  const params: GetAdAccountInsightsParams = useMemo(
    () => ({ from: isoDaysAgo(days), to: isoToday(), level }),
    [days, level],
  );

  const { data, isLoading } = useGetAdAccountInsights(accountId, params, {
    query: { enabled, queryKey: getGetAdAccountInsightsQueryKey(accountId, params) },
  });
  const { data: pixel } = useGetAdAccountPixel(accountId, {
    query: { enabled, queryKey: getGetAdAccountPixelQueryKey(accountId) },
  });
  const { data: conversions } = useListAdAccountConversions(
    accountId,
    { limit: 20 },
    {
      query: {
        enabled,
        queryKey: getListAdAccountConversionsQueryKey(accountId, { limit: 20 }),
      },
    },
  );

  const series = useMemo(
    () =>
      (data?.series ?? []).map((p) => ({
        ...p,
        spend: p.spentCents / 100,
      })),
    [data],
  );

  const copyPixel = async () => {
    if (!pixel?.snippet) return;
    try {
      await navigator.clipboard.writeText(pixel.snippet);
      toast({ title: "Pixel code copied" });
    } catch {
      toast({ title: "Couldn't copy, please select manually", variant: "destructive" });
    }
  };

  if (!enabled) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Insights</h1>
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Please select an ad account first.
          </CardContent>
        </Card>
      </div>
    );
  }

  const s = data?.summary;

  const kpis = [
    { label: "Impressions", value: s ? formatNum(s.impressions) : "—" },
    { label: "Reach", value: s ? formatNum(s.reach) : "—" },
    { label: "Clicks", value: s ? formatNum(s.clicks) : "—" },
    { label: "CTR", value: s ? formatPct(s.ctr) : "—" },
    { label: "Spend", value: s ? formatCents(s.spentCents, currency) : "—" },
    { label: "Conversions", value: s ? formatNum(s.conversions) : "—" },
    {
      label: "Conv. value",
      value: s ? formatCents(s.conversionValueCents, currency) : "—",
    },
    {
      label: "ROAS",
      value: s ? formatRoas(s.roas) : "—",
    },
    {
      label: "Cost / conversion",
      value: s ? (s.costPerResultCents != null ? formatCents(s.costPerResultCents, currency) : "—") : "—",
    },
    {
      label: "CPC",
      value: s ? formatCents(s.cpcCents ?? 0, currency) : "—",
    },
    {
      label: "CPM",
      value: s ? formatCents(s.cpmCents ?? 0, currency) : "—",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-sm text-muted-foreground">
            {selectedAccount?.name} · performance report
          </p>
        </div>
        <div className="flex rounded-lg border p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.days}
              onClick={() => setDays(r.days)}
              className={cn(
                "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                days === r.days
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{k.label}</div>
              <div className="mt-1 text-xl font-bold">
                {isLoading ? "…" : k.value}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Time series */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              Impressions &amp; Clicks
            </div>
            {series.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <LineChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="impressions"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    name="Impressions"
                  />
                  <Line
                    type="monotone"
                    dataKey="clicks"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                    name="Clicks"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <TrendingUp className="h-4 w-4 text-primary" />
              Spend &amp; Conversions
            </div>
            {series.length === 0 ? (
              <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
                No data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={256}>
                <BarChart data={series}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar
                    dataKey="spend"
                    fill="hsl(var(--primary))"
                    name={`Spend (${currency})`}
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="conversions"
                    fill="#f59e0b"
                    name="Conversions"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Breakdown */}
      <Card>
        <div className="flex items-center gap-3 border-b p-4">
          <h2 className="flex-1 font-semibold">Breakdown</h2>
          <div className="flex rounded-lg border p-0.5">
            {LEVELS.map((l) => (
              <button
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                  level === l.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
        {!data || data.breakdown.length === 0 ? (
          <CardContent className="py-12 text-center text-muted-foreground">
            No data for this range.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Impr.</TableHead>
                  <TableHead className="text-right">Reach</TableHead>
                  <TableHead className="text-right">Clicks</TableHead>
                  <TableHead className="text-right">CTR</TableHead>
                  <TableHead className="text-right">Spend</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                  <TableHead className="text-right">ROAS</TableHead>
                  <TableHead className="text-right">Cost / conv.</TableHead>
                  <TableHead className="text-right">CPC</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.breakdown.map((row) => (
                  <TableRow key={`${row.level}-${row.id}`}>
                    <TableCell className="font-medium">{row.name}</TableCell>
                    <TableCell className="text-right">
                      {formatNum(row.impressions)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNum(row.reach)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNum(row.clicks)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatPct(row.ctr)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCents(row.spentCents, currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNum(row.conversions)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatRoas(row.roas)}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.costPerResultCents != null
                        ? formatCents(row.costPerResultCents, currency)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.cpcCents != null
                        ? formatCents(row.cpcCents, currency)
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Recent conversions */}
      <Card>
        <div className="border-b p-4">
          <h2 className="font-semibold">Recent conversions</h2>
          <p className="text-xs text-muted-foreground">
            Pixel theke asha conversion events.
          </p>
        </div>
        {!conversions || conversions.length === 0 ? (
          <CardContent className="py-12 text-center text-muted-foreground">
            No conversions recorded yet.
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>Ad</TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversions.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <Badge variant="outline">{c.eventName}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.adName ?? (c.adId ? `Ad #${c.adId}` : "Unattributed")}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCents(c.valueCents, c.currency)}
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Pixel / conversion tracking */}
      <Card>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <h2 className="font-semibold">Conversion pixel</h2>
              <p className="text-xs text-muted-foreground">
                Place this code just before the &lt;/body&gt; tag on your website. After a purchase
                or signup, the conversion is tracked.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void copyPixel()}
              disabled={!pixel?.snippet}
            >
              <Copy className="mr-2 h-4 w-4" /> Copy
            </Button>
          </div>
          <Textarea
            readOnly
            value={pixel?.snippet ?? ""}
            className="font-mono text-xs"
            rows={3}
            onFocus={(e) => e.currentTarget.select()}
          />
        </CardContent>
      </Card>
    </div>
  );
}
