import { Link } from "wouter";
import { useQueries } from "@tanstack/react-query";
import {
  useListAdCampaigns,
  getListAdCampaignsQueryKey,
  getListAdSetsQueryOptions,
  type AdSet,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { formatCents, formatDay } from "@/lib/money";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function statusVariant(status: string) {
  if (status === "active") return "default" as const;
  if (status === "paused") return "secondary" as const;
  return "outline" as const;
}

type Row = AdSet & { campaignName: string };

export function AdSetsPanel() {
  const { selectedAccountId, selectedAccount } = useAccount();
  const accountId = selectedAccountId ?? 0;

  const { data: campaigns, isLoading: campaignsLoading } = useListAdCampaigns(
    accountId,
    {
      query: {
        enabled: selectedAccountId != null,
        queryKey: getListAdCampaignsQueryKey(accountId),
      },
    },
  );

  const list = campaigns ?? [];
  const adSetQueries = useQueries({
    queries: list.map((c) => getListAdSetsQueryOptions(c.id)),
  });

  const loading = campaignsLoading || adSetQueries.some((q) => q.isLoading);
  const rows: Row[] = adSetQueries.flatMap((q, i) =>
    (q.data ?? []).map((s) => ({ ...s, campaignName: list[i]?.name ?? "—" })),
  );

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (rows.length === 0)
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No ad sets yet. Open a campaign to create one.
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Daily</TableHead>
            <TableHead>Lifetime</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium">
                <Link href={`/adsets/${s.id}`} className="hover:underline">
                  {s.name}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/campaigns/${s.campaignId}`}
                  className="hover:underline text-muted-foreground"
                >
                  {s.campaignName}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(s.status)}>{s.status}</Badge>
              </TableCell>
              <TableCell>
                {s.dailyBudgetCents != null
                  ? formatCents(s.dailyBudgetCents, selectedAccount?.currency)
                  : "—"}
              </TableCell>
              <TableCell>
                {s.lifetimeBudgetCents != null
                  ? formatCents(s.lifetimeBudgetCents, selectedAccount?.currency)
                  : "—"}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDay(s.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
