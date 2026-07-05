
import { useState } from "react";
import { Link, useParams } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetAdSet,
  useListAds,
  useCreateAd,
  useUpdateAd,
  useDeleteAd,
  useSubmitAdForReview,
  useListAdCreatives,
  useGetAdSetTargeting,
  useSetAdSetTargeting,
  useListAdSchedules,
  useSetAdSchedules,
  getGetAdSetQueryKey,
  getListAdsQueryKey,
  getListAdCreativesQueryKey,
  getGetAdSetTargetingQueryKey,
  getListAdSchedulesQueryKey,
  type AdInput,
  type AdTargetingSpec,
  type AdTargeting,
  type AdSchedule,
  type AdScheduleInput,
} from "@workspace/api-client-react";
import { formatDay } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";
import { TargetingForm } from "@/components/targeting-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ArrowLeft, Plus, Trash2, Send } from "lucide-react";

const NO_CREATIVE = "__none__";
const EVERY_DAY = "__every__";
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function reviewVariant(s: string) {
  if (s === "approved") return "default" as const;
  if (s === "rejected") return "destructive" as const;
  return "secondary" as const;
}

function minToTime(m: number): string {
  const clamped = Math.max(0, Math.min(1439, m));
  const h = Math.floor(clamped / 60);
  const mm = clamped % 60;
  return `${String(h).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}
function timeToMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function specFrom(t: AdTargeting | undefined): AdTargetingSpec {
  if (!t) return {};
  return {
    locations: t.locations,
    ageMin: t.ageMin ?? undefined,
    ageMax: t.ageMax ?? undefined,
    genders: t.genders,
    interests: t.interests,
    languages: t.languages,
  };
}

export default function AdSetDetailPage() {
  const params = useParams<{ adSetId: string }>();
  const adSetId = Number(params.adSetId);
  const enabled = Number.isFinite(adSetId);

  const { data: adSet } = useGetAdSet(adSetId, {
    query: { enabled, queryKey: getGetAdSetQueryKey(adSetId) },
  });
  const targetingQ = useGetAdSetTargeting(adSetId, {
    query: { enabled, queryKey: getGetAdSetTargetingQueryKey(adSetId) },
  });
  const schedulesQ = useListAdSchedules(adSetId, {
    query: { enabled, queryKey: getListAdSchedulesQueryKey(adSetId) },
  });

  if (!enabled) {
    return (
      <div className="p-8 text-muted-foreground">Ad set khuje pawa jayni.</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href={adSet ? `/campaigns/${adSet.campaignId}` : "/campaigns"}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{adSet?.name ?? "Ad set"}</h1>
          <p className="text-sm text-muted-foreground">
            {adSet ? `${adSet.status} · ${adSet.optimizationGoal.replace(/_/g, " ")}` : ""}
          </p>
        </div>
      </div>

      <Tabs defaultValue="ads">
        <TabsList>
          <TabsTrigger value="ads">Ads</TabsTrigger>
          <TabsTrigger value="targeting">Targeting</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
        </TabsList>

        <TabsContent value="ads" className="mt-4">
          {adSet ? (
            <AdsTab adSetId={adSetId} accountId={adSet.accountId} />
          ) : (
            <p className="text-muted-foreground">Loading...</p>
          )}
        </TabsContent>

        <TabsContent value="targeting" className="mt-4">
          {targetingQ.isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <TargetingTab adSetId={adSetId} initial={specFrom(targetingQ.data)} />
          )}
        </TabsContent>

        <TabsContent value="schedule" className="mt-4">
          {schedulesQ.isLoading ? (
            <p className="text-muted-foreground">Loading...</p>
          ) : (
            <ScheduleTab adSetId={adSetId} initial={schedulesQ.data ?? []} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AdsTab({ adSetId, accountId }: { adSetId: number; accountId: number }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: ads, isLoading } = useListAds(adSetId, {
    query: {
      enabled: Number.isFinite(adSetId),
      queryKey: getListAdsQueryKey(adSetId),
    },
  });
  const { data: creatives } = useListAdCreatives(accountId, {
    query: {
      enabled: accountId > 0,
      queryKey: getListAdCreativesQueryKey(accountId),
    },
  });
  const create = useCreateAd();
  const update = useUpdateAd();
  const del = useDeleteAd();
  const submit = useSubmitAdForReview();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [creativeId, setCreativeId] = useState(NO_CREATIVE);
  const [destinationUrl, setDestinationUrl] = useState("");

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: getListAdsQueryKey(adSetId) });

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: AdInput = {
      name: name.trim(),
      creativeId: creativeId === NO_CREATIVE ? undefined : Number(creativeId),
      destinationUrl: destinationUrl.trim() || undefined,
    };
    create.mutate(
      { id: adSetId, data },
      {
        onSuccess: () => {
          invalidate();
          setOpen(false);
          setName("");
          setDestinationUrl("");
          setCreativeId(NO_CREATIVE);
          toast({ title: "Ad created" });
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

  const remove = (id: number) =>
    del.mutate(
      { id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Ad deleted" });
        },
        onError: (err) =>
          toast({
            title: "Couldn't delete",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );

  const toggleAd = (id: number, on: boolean) =>
    update.mutate(
      { id, data: { status: on ? "active" : "paused" } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: on ? "Ad turned on" : "Ad turned off" });
        },
        onError: (err) =>
          toast({
            title: "Something went wrong",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );

  const sendReview = (id: number) =>
    submit.mutate(
      { id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Sent for review" });
        },
        onError: (err) =>
          toast({
            title: "Couldn't send",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-ad">
              <Plus className="mr-2 h-4 w-4" /> New ad
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New ad</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Creative</Label>
                <Select value={creativeId} onValueChange={setCreativeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select creative" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CREATIVE}>None</SelectItem>
                    {(creatives ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Destination URL</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={destinationUrl}
                  onChange={(e) => setDestinationUrl(e.target.value)}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                The new ad stays a draft. It goes for review when you publish the campaign.
              </p>
              <DialogFooter>
                <Button type="submit" disabled={create.isPending}>
                  {create.isPending ? "Creating..." : "Create ad"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : !ads || ads.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No ads yet. Create a new one.
          </CardContent>
        </Card>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Review</TableHead>
                <TableHead>Destination</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {ads.map((a) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{a.name}</TableCell>
                  <TableCell>
                    {a.reviewStatus === "approved" ? (
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={a.status === "active"}
                          onCheckedChange={(on) => toggleAd(a.id, on)}
                        />
                        <span className="text-xs text-muted-foreground">
                          {a.status === "active" ? "On" : "Off"}
                        </span>
                      </div>
                    ) : (
                      <Badge variant="outline">
                        {a.status === "in_review" ? "in review" : a.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {a.status === "draft" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      <Badge variant={reviewVariant(a.reviewStatus)}>
                        {a.reviewStatus}
                      </Badge>
                    )}
                    {a.reviewNote ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {a.reviewNote}
                      </p>
                    ) : null}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate text-muted-foreground">
                    {a.destinationUrl ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDay(a.createdAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      {a.reviewStatus !== "pending" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Submit for review"
                          onClick={() => sendReview(a.id)}
                        >
                          <Send className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove(a.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
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

function TargetingTab({
  adSetId,
  initial,
}: {
  adSetId: number;
  initial: AdTargetingSpec;
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [spec, setSpec] = useState<AdTargetingSpec>(initial);
  const save = useSetAdSetTargeting();

  const onSave = () =>
    save.mutate(
      { id: adSetId, data: spec },
      {
        onSuccess: () => {
          qc.invalidateQueries({
            queryKey: getGetAdSetTargetingQueryKey(adSetId),
          });
          toast({ title: "Targeting saved" });
        },
        onError: (err) =>
          toast({
            title: "Couldn't save",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <TargetingForm value={spec} onChange={setSpec} />
        <Button onClick={onSave} disabled={save.isPending}>
          {save.isPending ? "Saving..." : "Save targeting"}
        </Button>
      </CardContent>
    </Card>
  );
}

interface Row {
  dayOfWeek: number | null;
  start: string;
  end: string;
}

function ScheduleTab({
  adSetId,
  initial,
}: {
  adSetId: number;
  initial: AdSchedule[];
}) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>(
    initial.map((s) => ({
      dayOfWeek: s.dayOfWeek ?? null,
      start: minToTime(s.startMinute),
      end: minToTime(s.endMinute),
    })),
  );
  const save = useSetAdSchedules();

  const addRow = () =>
    setRows((r) => [...r, { dayOfWeek: null, start: "09:00", end: "17:00" }]);
  const removeRow = (i: number) =>
    setRows((r) => r.filter((_, idx) => idx !== i));
  const update = (i: number, patch: Partial<Row>) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));

  const onSave = () => {
    const data: AdScheduleInput[] = rows.map((r) => ({
      dayOfWeek: r.dayOfWeek ?? undefined,
      startMinute: timeToMin(r.start),
      endMinute: timeToMin(r.end),
    }));
    save.mutate(
      { id: adSetId, data },
      {
        onSuccess: () => {
          qc.invalidateQueries({
            queryKey: getListAdSchedulesQueryKey(adSetId),
          });
          toast({ title: "Schedule saved" });
        },
        onError: (err) =>
          toast({
            title: "Couldn't save",
            description: err instanceof Error ? err.message : "Try again.",
            variant: "destructive",
          }),
      },
    );
  };

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <p className="text-sm text-muted-foreground">
          Set when the ad runs. Leave empty to run all the time.
        </p>
        {rows.map((row, i) => (
          <div key={i} className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Day</Label>
              <Select
                value={row.dayOfWeek === null ? EVERY_DAY : String(row.dayOfWeek)}
                onValueChange={(v) =>
                  update(i, {
                    dayOfWeek: v === EVERY_DAY ? null : Number(v),
                  })
                }
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={EVERY_DAY}>Every day</SelectItem>
                  {DAYS.map((d, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Input
                type="time"
                className="w-[120px]"
                value={row.start}
                onChange={(e) => update(i, { start: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <Input
                type="time"
                className="w-[120px]"
                value={row.end}
                onChange={(e) => update(i, { end: e.target.value })}
              />
            </div>
            <Button variant="ghost" size="icon" onClick={() => removeRow(i)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" onClick={addRow}>
            <Plus className="mr-2 h-4 w-4" /> Add slot
          </Button>
          <Button onClick={onSave} disabled={save.isPending}>
            {save.isPending ? "Saving..." : "Save schedule"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

