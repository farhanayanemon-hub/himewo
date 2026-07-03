import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAdCampaigns,
  useCreateAdCampaign,
  useDeleteAdCampaign,
  getListAdCampaignsQueryKey,
  type AdCampaignInput,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { formatCents, toCents } from "@/lib/money";
import { formatDay } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";
import { NoAccount } from "@/components/no-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Plus, Trash2 } from "lucide-react";

type Objective = NonNullable<AdCampaignInput["objective"]>;
type Status = NonNullable<AdCampaignInput["status"]>;

const OBJECTIVES: Objective[] = [
  "awareness",
  "traffic",
  "engagement",
  "leads",
  "sales",
  "app_promotion",
  "page_boost",
  "post_boost",
];
const STATUSES: Status[] = ["draft", "active", "paused", "completed", "archived"];

function statusVariant(status: string) {
  if (status === "active") return "default" as const;
  if (status === "paused") return "secondary" as const;
  return "outline" as const;
}

export default function CampaignsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { selectedAccountId, selectedAccount } = useAccount();
  const accountId = selectedAccountId ?? 0;

  const { data: campaigns, isLoading } = useListAdCampaigns(accountId, {
    query: {
      enabled: selectedAccountId != null,
      queryKey: getListAdCampaignsQueryKey(accountId),
    },
  });
  const create = useCreateAdCampaign();
  const del = useDeleteAdCampaign();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [objective, setObjective] = useState<Objective>("traffic");
  const [status, setStatus] = useState<Status>("draft");
  const [daily, setDaily] = useState("");
  const [lifetime, setLifetime] = useState("");

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListAdCampaignsQueryKey(accountId) });

  if (selectedAccountId == null) return <NoAccount />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: AdCampaignInput = {
      name: name.trim(),
      objective,
      status,
      dailyBudgetCents: toCents(daily),
      lifetimeBudgetCents: toCents(lifetime),
    };
    create.mutate(
      { id: accountId, data },
      {
        onSuccess: () => {
          invalidate();
          setOpen(false);
          setName("");
          setDaily("");
          setLifetime("");
          toast({ title: "Campaign toiri hoyeche" });
        },
        onError: (err) =>
          toast({
            title: "Toiri hoyni",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );
  };

  const remove = (id: number) =>
    del.mutate(
      { id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Campaign delete hoyeche" });
        },
        onError: (err) =>
          toast({
            title: "Delete hoyni",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Campaigns</h1>
          <p className="text-sm text-muted-foreground">{selectedAccount?.name}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-campaign">
              <Plus className="mr-2 h-4 w-4" /> New campaign
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New campaign</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="c-name">Name</Label>
                <Input
                  id="c-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Objective</Label>
                  <Select
                    value={objective}
                    onValueChange={(v) => setObjective(v as Objective)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {OBJECTIVES.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={status}
                    onValueChange={(v) => setStatus(v as Status)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Daily budget ({selectedAccount?.currency})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={daily}
                    onChange={(e) => setDaily(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lifetime budget ({selectedAccount?.currency})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={lifetime}
                    onChange={(e) => setLifetime(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Toiri hocche..." : "Create"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !campaigns || campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Kono campaign nei. Notun ekta toiri korun.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Objective</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Daily</TableHead>
                <TableHead>Lifetime</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">
                    <Link
                      href={`/campaigns/${c.id}`}
                      className="hover:underline"
                    >
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell className="capitalize">
                    {c.objective.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status)}>{c.status}</Badge>
                  </TableCell>
                  <TableCell>
                    {c.dailyBudgetCents != null
                      ? formatCents(c.dailyBudgetCents, selectedAccount?.currency)
                      : "—"}
                  </TableCell>
                  <TableCell>
                    {c.lifetimeBudgetCents != null
                      ? formatCents(
                          c.lifetimeBudgetCents,
                          selectedAccount?.currency,
                        )
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDay(c.createdAt)}
                  </TableCell>
                  <TableCell>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete campaign?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{c.name}" o er ad set/ad gulo delete hobe.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(c.id)}>
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
