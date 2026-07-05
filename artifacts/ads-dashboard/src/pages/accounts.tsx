import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateAdAccount,
  getListAdAccountsQueryKey,
  type AdAccountInput,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { formatCents } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Plus, Check } from "lucide-react";

const guessTz = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
};

export default function AccountsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { accounts, isLoading, selectedAccountId, setSelectedAccountId } =
    useAccount();
  const create = useCreateAdAccount();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [timezone, setTimezone] = useState(guessTz());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: AdAccountInput = {
      name: name.trim(),
      currency: currency.trim() || "USD",
      timezone: timezone.trim() || "UTC",
    };
    create.mutate(
      { data },
      {
        onSuccess: (acc) => {
          qc.invalidateQueries({ queryKey: getListAdAccountsQueryKey() });
          setSelectedAccountId(acc.id);
          setOpen(false);
          setName("");
          toast({ title: "Ad account created" });
        },
        onError: (err) =>
          toast({
            title: "Couldn't create",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Ad Accounts</h1>
          <p className="text-sm text-muted-foreground">
            Select an account or create a new one.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-account">
              <Plus className="mr-2 h-4 w-4" /> New account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New ad account</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="acc-name">Name</Label>
                <Input
                  id="acc-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My Business Ads"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="acc-cur">Currency</Label>
                  <Input
                    id="acc-cur"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="acc-tz">Timezone</Label>
                  <Input
                    id="acc-tz"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Creating..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No ad accounts yet. Create one first.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => {
            const active = a.id === selectedAccountId;
            return (
              <Card
                key={a.id}
                className={active ? "border-primary ring-1 ring-primary" : ""}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{a.name}</CardTitle>
                    <Badge variant={a.status === "active" ? "default" : "secondary"}>
                      {a.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Balance:{" "}
                    <span className="font-medium text-foreground">
                      {formatCents(a.balanceCents, a.currency)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {a.currency} · {a.timezone}
                    {a.viewerRole ? ` · ${a.viewerRole}` : ""}
                  </div>
                  <Button
                    variant={active ? "secondary" : "outline"}
                    className="w-full"
                    onClick={() => setSelectedAccountId(a.id)}
                  >
                    {active ? (
                      <>
                        <Check className="mr-2 h-4 w-4" /> Selected
                      </>
                    ) : (
                      "Select"
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
