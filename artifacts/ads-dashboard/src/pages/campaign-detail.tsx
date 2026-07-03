import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAdCampaign,
  useListAdSets,
  useCreateAdSet,
  useDeleteAdSet,
  useListSavedAudiences,
  getGetAdCampaignQueryKey,
  getListAdSetsQueryKey,
  getListSavedAudiencesQueryKey,
  type AdSetInput,
  type AdTargetingSpec,
} from "@workspace/api-client-react";
import { formatCents, toCents, formatDay } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";
import { TargetingForm } from "@/components/targeting-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { ArrowLeft, Plus, Trash2 } from "lucide-react";

type Status = NonNullable<AdSetInput["status"]>;
type Billing = NonNullable<AdSetInput["billingEvent"]>;
type Goal = NonNullable<AdSetInput["optimizationGoal"]>;

const STATUSES: Status[] = ["draft", "active", "paused", "completed", "archived"];
const BILLING: Billing[] = ["impressions", "clicks"];
const GOALS: Goal[] = ["reach", "link_clicks", "engagement", "conversions"];

const NO_AUDIENCE = "__none__";

function toIso(local: string): string | undefined {
  if (!local) return undefined;
  const d = new Date(local);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export default function CampaignDetailPage() {
  const params = useParams<{ campaignId: string }>();
  const campaignId = Number(params.campaignId);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: campaign } = useGetAdCampaign(campaignId, {
    query: {
      enabled: Number.isFinite(campaignId),
      queryKey: getGetAdCampaignQueryKey(campaignId),
    },
  });
  const { data: adSets, isLoading } = useListAdSets(campaignId, {
    query: {
      enabled: Number.isFinite(campaignId),
      queryKey: getListAdSetsQueryKey(campaignId),
    },
  });
  const accountId = campaign?.accountId ?? 0;
  const { data: audiences } = useListSavedAudiences(accountId, {
    query: {
      enabled: accountId > 0,
      queryKey: getListSavedAudiencesQueryKey(accountId),
    },
  });

  const create = useCreateAdSet();
  const del = useDeleteAdSet();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [status, setStatus] = useState<Status>("draft");
  const [billing, setBilling] = useState<Billing>("impressions");
  const [goal, setGoal] = useState<Goal>("reach");
  const [daily, setDaily] = useState("");
  const [lifetime, setLifetime] = useState("");
  const [audienceId, setAudienceId] = useState<string>(NO_AUDIENCE);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [targeting, setTargeting] = useState<AdTargetingSpec>({});

  if (!Number.isFinite(campaignId)) {
    return (
      <div className="p-8 text-muted-foreground">Campaign khuje pawa jayni.</div>
    );
  }

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListAdSetsQueryKey(campaignId) });

  const hasTargeting =
    (targeting.locations?.length ?? 0) > 0 ||
    (targeting.interests?.length ?? 0) > 0 ||
    (targeting.genders?.length ?? 0) > 0 ||
    (targeting.languages?.length ?? 0) > 0 ||
    targeting.ageMin != null ||
    targeting.ageMax != null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: AdSetInput = {
      name: name.trim(),
      status,
      billingEvent: billing,
      optimizationGoal: goal,
      dailyBudgetCents: toCents(daily),
      lifetimeBudgetCents: toCents(lifetime),
      savedAudienceId:
        audienceId === NO_AUDIENCE ? undefined : Number(audienceId),
      startAt: toIso(startAt),
      endAt: toIso(endAt),
      targeting: hasTargeting ? targeting : undefined,
    };
    create.mutate(
      { id: campaignId, data },
      {
        onSuccess: () => {
          invalidate();
          setOpen(false);
          setName("");
          setDaily("");
          setLifetime("");
          setTargeting({});
          setAudienceId(NO_AUDIENCE);
          setStartAt("");
          setEndAt("");
          toast({ title: "Ad set toiri hoyeche" });
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
          toast({ title: "Ad set delete hoyeche" });
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
      <div className="flex items-center gap-3">
        <Link href="/campaigns">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{campaign?.name ?? "Campaign"}</h1>
          <p className="text-sm capitalize text-muted-foreground">
            {campaign ? `${campaign.objective.replace(/_/g, " ")} · ${campaign.status}` : ""}
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-adset">
              <Plus className="mr-2 h-4 w-4" /> New ad set
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>New ad set</DialogTitle>
            </DialogHeader>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
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
                <div className="space-y-1.5">
                  <Label>Billing event</Label>
                  <Select value={billing} onValueChange={(v) => setBilling(v as Billing)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {BILLING.map((b) => (
                        <SelectItem key={b} value={b}>
                          {b}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Optimization goal</Label>
                <Select value={goal} onValueChange={(v) => setGoal(v as Goal)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GOALS.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Daily budget</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={daily}
                    onChange={(e) => setDaily(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lifetime budget</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={lifetime}
                    onChange={(e) => setLifetime(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Start</Label>
                  <Input
                    type="datetime-local"
                    value={startAt}
                    onChange={(e) => setStartAt(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>End</Label>
                  <Input
                    type="datetime-local"
                    value={endAt}
                    onChange={(e) => setEndAt(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Saved audience</Label>
                <Select value={audienceId} onValueChange={setAudienceId}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_AUDIENCE}>None</SelectItem>
                    {(audiences ?? []).map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium">Targeting (optional)</p>
                <TargetingForm value={targeting} onChange={setTargeting} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Toiri hocche..." : "Create ad set"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !adSets || adSets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Kono ad set nei. Notun ekta toiri korun.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>Daily</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {adSets.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <Link href={`/adsets/${s.id}`} className="hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.status}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">
                    {s.optimizationGoal.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    {s.dailyBudgetCents != null
                      ? formatCents(s.dailyBudgetCents)
                      : "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDay(s.createdAt)}
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
                          <AlertDialogTitle>Delete ad set?</AlertDialogTitle>
                          <AlertDialogDescription>
                            "{s.name}" o er ad gulo delete hobe.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => remove(s.id)}>
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
