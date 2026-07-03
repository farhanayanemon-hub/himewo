import {
  useGetAdWallet,
  useListAdWalletTransactions,
  useListAdCoupons,
  getGetAdWalletQueryKey,
  getListAdWalletTransactionsQueryKey,
  getListAdCouponsQueryKey,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { formatCents, formatDate } from "@/lib/money";
import { NoAccount } from "@/components/no-account";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wallet as WalletIcon } from "lucide-react";

export default function WalletPage() {
  const { selectedAccountId, selectedAccount } = useAccount();
  const accountId = selectedAccountId ?? 0;
  const enabled = selectedAccountId != null;

  const { data: wallet } = useGetAdWallet(accountId, {
    query: { enabled, queryKey: getGetAdWalletQueryKey(accountId) },
  });
  const { data: txns, isLoading } = useListAdWalletTransactions(accountId, {
    query: {
      enabled,
      queryKey: getListAdWalletTransactionsQueryKey(accountId),
    },
  });
  const { data: coupons } = useListAdCoupons(accountId, {
    query: { enabled, queryKey: getListAdCouponsQueryKey(accountId) },
  });

  if (selectedAccountId == null) return <NoAccount />;

  const currency = wallet?.currency ?? selectedAccount?.currency;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Wallet</h1>
        <p className="text-sm text-muted-foreground">
          Balance, transaction o coupon dekhun.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Current balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <WalletIcon className="h-5 w-5" />
              </span>
              <span className="text-3xl font-bold">
                {formatCents(wallet?.balanceCents, currency)}
              </span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Add funds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button disabled className="w-full">
              Top up (coming soon)
            </Button>
            <p className="text-xs text-muted-foreground">
              Online payment shigghri asche.
            </p>
          </CardContent>
        </Card>
      </div>

      {coupons && coupons.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Coupons</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Expires</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {coupons.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.code}</TableCell>
                    <TableCell>
                      {formatCents(c.amountCents, c.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{c.status}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {c.expiresAt ? formatDate(c.expiresAt) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transactions</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-muted-foreground">Loading...</p>
          ) : !txns || txns.length === 0 ? (
            <p className="p-6 text-center text-muted-foreground">
              Kono transaction nei.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Balance after</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {txns.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="capitalize">
                      {t.type.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell
                      className={
                        t.amountCents < 0
                          ? "text-destructive"
                          : "text-emerald-600"
                      }
                    >
                      {formatCents(t.amountCents, t.currency)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.balanceAfterCents != null
                        ? formatCents(t.balanceAfterCents, t.currency)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {t.description ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(t.createdAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
