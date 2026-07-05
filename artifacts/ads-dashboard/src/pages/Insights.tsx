import React, { useState, useMemo } from "react";
import { subDays, format } from "date-fns";
import {
  useListAdAccounts,
  useListAdCampaigns,
  useListAdSets,
  useGetInsights,
  getGetInsightsQueryKey,
  getListAdCampaignsQueryKey,
  getListAdSetsQueryKey,
  GetInsightsLevel
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, LayoutDashboard, Calendar as CalendarIcon, Loader2, Filter } from "lucide-react";
import { formatCurrency, formatNumber, formatPercentage } from "@/lib/formatters";
import { exportInsightsToCsv } from "@/lib/export-csv";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

export default function InsightsPage() {
  // Filters State
  const [selectedAccountId, setSelectedAccountId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 30),
    to: new Date()
  });
  const [level, setLevel] = useState<GetInsightsLevel>("campaign");
  const [selectedCampaignId, setSelectedCampaignId] = useState<number | "all">("all");
  const [selectedAdSetId, setSelectedAdSetId] = useState<number | "all">("all");

  // Format dates for API
  const fromStr = format(dateRange.from, "yyyy-MM-dd");
  const toStr = format(dateRange.to, "yyyy-MM-dd");

  // Queries
  const { data: accounts, isLoading: accountsLoading } = useListAdAccounts();

  // Auto-select first account when loaded
  React.useEffect(() => {
    if (accounts && accounts.length > 0 && !selectedAccountId) {
      setSelectedAccountId(accounts[0].id);
    }
  }, [accounts, selectedAccountId]);

  const { data: campaigns } = useListAdCampaigns(
    { accountId: selectedAccountId as number },
    { query: { enabled: !!selectedAccountId, queryKey: getListAdCampaignsQueryKey({ accountId: selectedAccountId as number }) } }
  );

  const { data: adSets } = useListAdSets(
    { 
      accountId: selectedAccountId as number, 
      ...(selectedCampaignId !== "all" ? { campaignId: selectedCampaignId } : {}) 
    },
    { 
      query: { 
        enabled: !!selectedAccountId, 
        queryKey: getListAdSetsQueryKey({ 
          accountId: selectedAccountId as number, 
          ...(selectedCampaignId !== "all" ? { campaignId: selectedCampaignId } : {}) 
        }) 
      } 
    }
  );

  const insightsParams = {
    accountId: selectedAccountId as number,
    from: fromStr,
    to: toStr,
    level,
    ...(selectedCampaignId !== "all" ? { campaignId: selectedCampaignId } : {}),
    ...(selectedAdSetId !== "all" ? { adSetId: selectedAdSetId } : {})
  };

  const { data: insights, isLoading: insightsLoading, isFetching: insightsFetching } = useGetInsights(
    insightsParams,
    { query: { enabled: !!selectedAccountId, queryKey: getGetInsightsQueryKey(insightsParams) } }
  );

  const activeAccount = accounts?.find(a => a.id === selectedAccountId);

  const handleExport = () => {
    if (!insights || !activeAccount) return;
    exportInsightsToCsv(insights, activeAccount.name, dateRange);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="bg-primary/10 p-2 rounded-md">
            <LayoutDashboard className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Ads Insights</h1>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarIcon className="w-4 h-4" />
            <span>Last 30 Days</span>
          </div>
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={!insights || insightsLoading}
            className="gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full flex flex-col gap-6">
        
        {/* Controls Bar */}
        <Card className="shadow-sm">
          <CardContent className="p-4 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ad Account</label>
              <Select 
                value={selectedAccountId?.toString() || ""} 
                onValueChange={(val) => setSelectedAccountId(Number(val))}
                disabled={accountsLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select account..." />
                </SelectTrigger>
                <SelectContent>
                  {accounts?.map(acc => (
                    <SelectItem key={acc.id} value={acc.id.toString()}>{acc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Campaign Filter</label>
              <Select 
                value={selectedCampaignId.toString()} 
                onValueChange={(val) => {
                  setSelectedCampaignId(val === "all" ? "all" : Number(val));
                  setSelectedAdSetId("all"); // Reset ad set when campaign changes
                }}
                disabled={!campaigns || campaigns.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Campaigns" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {campaigns?.map(c => (
                    <SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Ad Set Filter</label>
              <Select 
                value={selectedAdSetId.toString()} 
                onValueChange={(val) => setSelectedAdSetId(val === "all" ? "all" : Number(val))}
                disabled={!adSets || adSets.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Ad Sets" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ad Sets</SelectItem>
                  {adSets?.map(a => (
                    <SelectItem key={a.id} value={a.id.toString()}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Breakdown Level</label>
              <Tabs value={level} onValueChange={(v) => setLevel(v as GetInsightsLevel)} className="w-full">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="campaign">Campaign</TabsTrigger>
                  <TabsTrigger value="adset">Ad Set</TabsTrigger>
                  <TabsTrigger value="ad">Ad</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {insightsFetching && !insights && (
          <div className="flex-1 flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!selectedAccountId && !accountsLoading && (
           <div className="flex-1 flex items-center justify-center min-h-[400px] border border-dashed rounded-lg">
             <div className="text-center space-y-2">
                <Filter className="w-10 h-10 text-muted-foreground mx-auto opacity-50" />
                <h3 className="text-lg font-medium text-foreground">No Account Selected</h3>
                <p className="text-sm text-muted-foreground">Please select an ad account to view insights.</p>
             </div>
           </div>
        )}

        {insights && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <KpiCard title="Spend" value={formatCurrency(insights.summary.spendCents)} />
              <KpiCard title="Impressions" value={formatNumber(insights.summary.impressions)} />
              <KpiCard title="Clicks" value={formatNumber(insights.summary.clicks)} />
              <KpiCard title="Conversions" value={formatNumber(insights.summary.conversions)} />
              <KpiCard title="CTR" value={formatPercentage(insights.summary.ctr)} />
              <KpiCard title="Cost per Result" value={formatCurrency(insights.summary.costPerResultCents)} />
              <KpiCard title="CPC" value={formatCurrency(insights.summary.cpcCents)} />
              <KpiCard title="CPM" value={formatCurrency(insights.summary.cpmCents)} />
              <KpiCard title="Reach" value={formatNumber(insights.summary.reach)} />
            </div>

            {/* Chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">Performance Over Time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] w-full mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={insights.series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSpend" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(val) => format(new Date(val), "MMM d")}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        dy={10}
                      />
                      <YAxis 
                        yAxisId="left"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickFormatter={(val) => `$${val / 100}`}
                      />
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        tickFormatter={(val) => formatNumber(val)}
                      />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', boxShadow: 'var(--shadow-md)' }}
                        formatter={(value: number, name: string) => {
                          if (name === "spendCents") return [formatCurrency(value), "Spend"];
                          return [formatNumber(value), name.charAt(0).toUpperCase() + name.slice(1)];
                        }}
                        labelFormatter={(label) => format(new Date(label), "MMM d, yyyy")}
                      />
                      <Area 
                        yAxisId="left"
                        type="monotone" 
                        dataKey="spendCents" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorSpend)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Breakdown Table */}
            <Card className="shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium capitalize">{level} Breakdown</CardTitle>
                <CardDescription>Detailed performance metrics by {level}</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="w-[300px]">Name</TableHead>
                      <TableHead className="text-right">Spend</TableHead>
                      <TableHead className="text-right">Impr.</TableHead>
                      <TableHead className="text-right">Clicks</TableHead>
                      <TableHead className="text-right">CTR</TableHead>
                      <TableHead className="text-right">Conv.</TableHead>
                      <TableHead className="text-right">CPA</TableHead>
                      <TableHead className="text-right">CPC</TableHead>
                      <TableHead className="text-right">CPM</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {insights.breakdown.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No data available for the selected filters.
                        </TableCell>
                      </TableRow>
                    )}
                    {insights.breakdown.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium truncate max-w-[300px]" title={row.name}>
                          {row.name}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{formatCurrency(row.spendCents)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{formatNumber(row.impressions)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{formatNumber(row.clicks)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{formatPercentage(row.ctr)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{formatNumber(row.conversions)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{formatCurrency(row.costPerResultCents)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{formatCurrency(row.cpcCents)}</TableCell>
                        <TableCell className="text-right tabular-nums text-sm text-muted-foreground">{formatCurrency(row.cpmCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

function KpiCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="shadow-sm hover-elevate transition-all duration-200">
      <CardContent className="p-4 flex flex-col gap-1">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{title}</span>
        <span className="text-2xl font-semibold tracking-tight tabular-nums">{value}</span>
      </CardContent>
    </Card>
  );
}
