
import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAdCampaigns,
  useUpdateAdCampaign,
  useDeleteAdCampaign,
  getListAdCampaignsQueryKey,
  updateAdCampaign,
  updateAdSet,
  listAdSets,
  listAds,
  submitAdForReview,
  type AdCampaignInput,
  type AdCampaignUpdate,
  type AdCampaign,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { formatCents, toCents, centsToAmount } from "@/lib/money";
import { formatDay } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";
import { NoAccount } from "@/components/no-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
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
import { Pencil, Trash2, Rocket } from "lucide-react";

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

function statusVariant(status: string) {
  if (status === "active") return "default" as const;
  if (status === "paused") return "secondary" as const;
  return "outline" as const;
}

function objectiveLabel(objective: string) {
  if (objective === "page_boost") return "hub boost";
  return objective.replace(/_/g, " ");
}

export function CampaignsPanel() {
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
  const update = useUpdateAdCampaign();
  const del = useDeleteAdCampaign();

  const [editId, setEditId] = useState<number | null>(null);
  const [eName, setEName] = useState("");
  const [eObjective, setEObjective] = useState<Objective>("traffic");
  const [eStatus, setEStatus] = useState<Status>("active");
  const [eDaily, setEDaily] = useState("");
  const [eLifetime, setELifetime] = useState("");
  const [publishingId, setPublishingId] = useState<number | null>(null);

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListAdCampaignsQueryKey(accountId) });

  if (selectedAccountId == null) return <NoAccount />;

  const remove = (id: number) =>
    del.mutate(
      { id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Campaign deleted" });
        },
        onError: (err) =>
          toast({
            title: "Couldn't delete",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );

  const toggleCampaign = (c: AdCampaign, on: boolean) =>
    update.mutate(
      { id: c.id, data: { status: on ? "active" : "paused" } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: on ? "Campaign on" : "Campaign off" });
        },
        onError: (err) =>
          toast({
            title: "Something went wrong",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );

  const publishCampaign = async (c: AdCampaign) => {
    setPublishingId(c.id);
    try {
      if (c.status === "draft") {
        await updateAdCampaign(c.id, { status: "active" });
      }
      const adSets = await listAdSets(c.id);
      for (const s of adSets) {
        if (s.status === "draft") {
          await updateAdSet(s.id, { status: "active" });
        }
        const ads = await listAds(s.id);
        for (const a of ads) {
          if (a.status === "draft") {
            await submitAdForReview(a.id);
          }
        }
      }
      invalidate();
      toast({
        title: "Published",
        description: "Your ads were sent for review. They'll run once an admin approves.",
      });
    } catch (err) {
      toast({
        title: "Publish failed",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setPublishingId(null);
    }
  };

  const openEdit = (c: AdCampaign) => {
    setEditId(c.id);
    setEName(c.name);
    setEObjective(c.objective as Objective);
    setEStatus(c.status as Status);
    setEDaily(centsToAmount(c.dailyBudgetCents));
    setELifetime(centsToAmount(c.lifetimeBudgetCents));
  };

  const submitEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editId == null) return;
    const data: AdCampaignUpdate = {
      name: eName.trim(),
      objective: eObjective,
      status: eStatus,
      dailyBudgetCents: toCents(eDaily),
      lifetimeBudgetCents: toCents(eLifetime),
    };
    update.mutate(
      { id: editId, data },
      {
        onSuccess: () => {
          invalidate();
          setEditId(null);
          toast({ title: "Campaign updated" });
        },
        onError: (err) =>
          toast({
            title: "Couldn't update",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !campaigns || campaigns.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No campaigns yet. Create a new one.
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
                    {objectiveLabel(c.objective)}
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
                    <div className="flex items-center justify-end gap-1">
                    {c.status === "draft" ? (
                      <Button
                        size="sm"
                        onClick={() => publishCampaign(c)}
                        disabled={publishingId === c.id}
                        data-testid={`publish-campaign-${c.id}`}
                      >
                        <Rocket className="mr-1 h-3.5 w-3.5" />
                        {publishingId === c.id ? "Publishing..." : "Publish"}
                      </Button>
                    ) : (
                      <div className="mr-1 flex items-center gap-1.5">
                        <Switch
                          checked={c.status === "active"}
                          onCheckedChange={(on) => toggleCampaign(c, on)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {c.status === "active" ? "On" : "Off"}
                        </span>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEdit(c)}
                      data-testid={`edit-campaign-${c.id}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
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
                            "{c.name}" and its ad sets/ads will be deleted.
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
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog
        open={editId != null}
        onOpenChange={(o) => {
          if (!o) setEditId(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit campaign</DialogTitle>
          </DialogHeader>
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="e-name">Name</Label>
              <Input
                id="e-name"
                value={eName}
                onChange={(e) => setEName(e.target.value)}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Objective</Label>
                <Select
                  value={eObjective}
                  onValueChange={(v) => setEObjective(v as Objective)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OBJECTIVES.map((o) => (
                      <SelectItem key={o} value={o}>
                        {objectiveLabel(o)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <div className="flex h-10 items-center gap-2">
                  <Switch
                    checked={eStatus === "active"}
                    onCheckedChange={(on) => setEStatus(on ? "active" : "paused")}
                  />
                  <span className="text-sm text-muted-foreground">
                    {eStatus === "active" ? "Active" : "Paused"}
                  </span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Daily budget ({selectedAccount?.currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={eDaily}
                  onChange={(e) => setEDaily(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Lifetime budget ({selectedAccount?.currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={eLifetime}
                  onChange={(e) => setELifetime(e.target.value)}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit" disabled={update.isPending}>
                {update.isPending ? "Updating..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function CampaignsPage() {
  const { selectedAccount } = useAccount();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Campaigns</h1>
        <p className="text-sm text-muted-foreground">{selectedAccount?.name}</p>
      </div>
      <CampaignsPanel />
    </div>
  );
}
