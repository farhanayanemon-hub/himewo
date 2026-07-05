import { Link } from "wouter";
import { useQueries } from "@tanstack/react-query";
import {
  useListAdCampaigns,
  getListAdCampaignsQueryKey,
  getListAdSetsQueryOptions,
  getListAdsQueryOptions,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { formatDay } from "@/lib/money";
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

function reviewVariant(status: string) {
  if (status === "approved") return "default" as const;
  if (status === "rejected") return "destructive" as const;
  return "secondary" as const;
}

export function AdsPanel() {
  const { selectedAccountId } = useAccount();
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
  const campaignList = campaigns ?? [];

  const adSetQueries = useQueries({
    queries: campaignList.map((c) => getListAdSetsQueryOptions(c.id)),
  });

  const adSets = adSetQueries.flatMap((q, i) =>
    (q.data ?? []).map((s) => ({
      ...s,
      campaignName: campaignList[i]?.name ?? "—",
    })),
  );

  const adQueries = useQueries({
    queries: adSets.map((s) => getListAdsQueryOptions(s.id)),
  });

  const loading =
    campaignsLoading ||
    adSetQueries.some((q) => q.isLoading) ||
    adQueries.some((q) => q.isLoading);

  const rows = adQueries.flatMap((q, i) =>
    (q.data ?? []).map((a) => ({
      ...a,
      adSetName: adSets[i]?.name ?? "—",
      campaignName: adSets[i]?.campaignName ?? "—",
      campaignId: adSets[i]?.campaignId,
    })),
  );

  if (loading) return <p className="text-muted-foreground">Loading...</p>;
  if (rows.length === 0)
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Kono ad nei. Ekta ad set-e dhuke ad toiri korun.
        </CardContent>
      </Card>
    );

  return (
    <Card>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Ad set</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Review</TableHead>
            <TableHead>Created</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-medium">
                <Link href={`/adsets/${a.adSetId}`} className="hover:underline">
                  {a.name}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/adsets/${a.adSetId}`}
                  className="hover:underline text-muted-foreground"
                >
                  {a.adSetName}
                </Link>
              </TableCell>
              <TableCell>
                {a.campaignId != null ? (
                  <Link
                    href={`/campaigns/${a.campaignId}`}
                    className="hover:underline text-muted-foreground"
                  >
                    {a.campaignName}
                  </Link>
                ) : (
                  <span className="text-muted-foreground">{a.campaignName}</span>
                )}
              </TableCell>
              <TableCell>
                <Badge variant={statusVariant(a.status)}>{a.status}</Badge>
              </TableCell>
              <TableCell>
                <Badge variant={reviewVariant(a.reviewStatus)}>
                  {a.reviewStatus}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDay(a.createdAt)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  );
}
