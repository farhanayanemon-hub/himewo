import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListAdCreatives,
  getListAdCreativesQueryKey,
  getListAdCampaignsQueryKey,
  createAdCampaign,
  createAdCreative,
  createAdSet,
  createAd,
  updateAdCampaign,
  updateAdSet,
  submitAdForReview,
  type AdCampaignInput,
  type AdCreativeInput,
  type AdSetInput,
  type AdTargetingSpec,
} from "@workspace/api-client-react";
import { useAccount } from "@/lib/account-context";
import { toCents } from "@/lib/money";
import { useToast } from "@/hooks/use-toast";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";
import { TargetingForm } from "@/components/targeting-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Sparkles, ArrowLeft, ArrowRight, Rocket, Upload } from "lucide-react";

type Objective = NonNullable<AdCampaignInput["objective"]>;
type Format = NonNullable<AdCreativeInput["format"]>;
type Cta = NonNullable<AdCreativeInput["callToAction"]>;
type Billing = NonNullable<AdSetInput["billingEvent"]>;
type Goal = NonNullable<AdSetInput["optimizationGoal"]>;

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
const FORMATS: Format[] = ["single_image", "video", "carousel"];
const CTAS: Cta[] = [
  "learn_more",
  "shop_now",
  "sign_up",
  "book_now",
  "contact_us",
  "download",
  "none",
];
const BILLING: Billing[] = ["impressions", "clicks"];
const GOALS: Goal[] = ["reach", "link_clicks", "engagement", "conversions"];

const NEW_CREATIVE = "__new__";
const STEPS = ["Campaign", "Audience", "Creative & Ad", "Review"];

function toList(v: string): string[] {
  return v
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function CreateAdWizard() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { selectedAccountId, selectedAccount } = useAccount();
  const accountId = selectedAccountId ?? 0;
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: creatives } = useListAdCreatives(accountId, {
    query: {
      enabled: accountId > 0,
      queryKey: getListAdCreativesQueryKey(accountId),
    },
  });

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);

  // Step 1 — Campaign
  const [cName, setCName] = useState("");
  const [objective, setObjective] = useState<Objective>("traffic");
  const [cDaily, setCDaily] = useState("");
  const [cLifetime, setCLifetime] = useState("");

  // Step 2 — Audience (ad set)
  const [sName, setSName] = useState("");
  const [billing, setBilling] = useState<Billing>("impressions");
  const [goal, setGoal] = useState<Goal>("reach");
  const [sDaily, setSDaily] = useState("");
  const [targeting, setTargeting] = useState<AdTargetingSpec>({});

  // Step 3 — Creative + Ad
  const [creativeMode, setCreativeMode] = useState<string>(NEW_CREATIVE);
  const [crName, setCrName] = useState("");
  const [format, setFormat] = useState<Format>("single_image");
  const [cta, setCta] = useState<Cta>("learn_more");
  const [headline, setHeadline] = useState("");
  const [primaryText, setPrimaryText] = useState("");
  const [mediaText, setMediaText] = useState("");
  const [uploading, setUploading] = useState(false);
  const [aName, setAName] = useState("");
  const [aUrl, setAUrl] = useState("");

  const reset = () => {
    setStep(0);
    setCName("");
    setObjective("traffic");
    setCDaily("");
    setCLifetime("");
    setSName("");
    setBilling("impressions");
    setGoal("reach");
    setSDaily("");
    setTargeting({});
    setCreativeMode(NEW_CREATIVE);
    setCrName("");
    setFormat("single_image");
    setCta("learn_more");
    setHeadline("");
    setPrimaryText("");
    setMediaText("");
    setAName("");
    setAUrl("");
  };

  const hasTargeting =
    (targeting.locations?.length ?? 0) > 0 ||
    (targeting.interests?.length ?? 0) > 0 ||
    (targeting.genders?.length ?? 0) > 0 ||
    (targeting.languages?.length ?? 0) > 0 ||
    targeting.ageMin != null ||
    targeting.ageMax != null;

  const makingNewCreative = creativeMode === NEW_CREATIVE;
  const canNext =
    (step === 0 && cName.trim().length > 0) ||
    (step === 1 && sName.trim().length > 0) ||
    (step === 2 && aName.trim().length > 0) ||
    step === 3;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await uploadMedia(file);
      setMediaText((prev) => (prev ? `${prev}\n${url}` : url));
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        toast({
          title: "Upload off ache",
          description: "Media URL manually paste korun.",
        });
      } else {
        toast({
          title: "Upload hoyni",
          description: err instanceof Error ? err.message : "Try again.",
          variant: "destructive",
        });
      }
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const run = async (publish: boolean) => {
    setBusy(true);
    try {
      // 1) Campaign (draft)
      const campaign = await createAdCampaign(accountId, {
        name: cName.trim(),
        objective,
        status: "draft",
        dailyBudgetCents: toCents(cDaily),
        lifetimeBudgetCents: toCents(cLifetime),
      });

      // 2) Creative — reuse existing OR make a new one inline
      let creativeId: number | undefined;
      if (!makingNewCreative) {
        creativeId = Number(creativeMode);
      } else if (crName.trim()) {
        const creative = await createAdCreative(accountId, {
          name: crName.trim(),
          format,
          callToAction: cta,
          headline: headline.trim() || undefined,
          primaryText: primaryText.trim() || undefined,
          linkUrl: aUrl.trim() || undefined,
          mediaUrls: toList(mediaText),
        });
        creativeId = creative.id;
      }

      // 3) Ad set (audience + targeting, draft)
      const adSet = await createAdSet(campaign.id, {
        name: sName.trim(),
        status: "draft",
        billingEvent: billing,
        optimizationGoal: goal,
        dailyBudgetCents: toCents(sDaily),
        targeting: hasTargeting ? targeting : undefined,
      });

      // 4) Ad (draft)
      const ad = await createAd(adSet.id, {
        name: aName.trim(),
        creativeId,
        destinationUrl: aUrl.trim() || undefined,
      });

      // 5) Publish cascade (optional)
      if (publish) {
        await updateAdCampaign(campaign.id, { status: "active" });
        await updateAdSet(adSet.id, { status: "active" });
        await submitAdForReview(ad.id);
      }

      qc.invalidateQueries({
        queryKey: getListAdCampaignsQueryKey(accountId),
      });
      qc.invalidateQueries({
        queryKey: getListAdCreativesQueryKey(accountId),
      });
      toast({
        title: publish ? "Publish hoyeche" : "Draft save hoyeche",
        description: publish
          ? "Ad review-e gelo. Admin approve korle run korbe."
          : "Campaign, ad set o ad draft hishebe toiri holo.",
      });
      reset();
      setOpen(false);
    } catch (err) {
      toast({
        title: "Hoyni",
        description: err instanceof Error ? err.message : "Try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  const currency = selectedAccount?.currency;
  const selectedCreativeName =
    creatives?.find((c) => String(c.id) === creativeMode)?.name ?? null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <DialogTrigger asChild>
        <Button data-testid="create-ad-wizard" disabled={selectedAccountId == null}>
          <Sparkles className="mr-2 h-4 w-4" /> Create ad
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create ad — ek shathe</DialogTitle>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-2 text-xs">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              <span
                className={
                  "flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold " +
                  (i <= step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground")
                }
              >
                {i + 1}
              </span>
              <span
                className={
                  i === step ? "font-medium" : "text-muted-foreground"
                }
              >
                {label}
              </span>
              {i < STEPS.length - 1 && (
                <span className="mx-1 text-muted-foreground">›</span>
              )}
            </div>
          ))}
        </div>
        <Separator />

        <div className="space-y-4 py-1">
          {/* STEP 1 — Campaign */}
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <Label>Campaign name</Label>
                <Input
                  value={cName}
                  onChange={(e) => setCName(e.target.value)}
                  placeholder="Eid Sale 2026"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Objective (mul goal)</Label>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Daily budget ({currency})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cDaily}
                    onChange={(e) => setCDaily(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Lifetime budget ({currency})</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={cLifetime}
                    onChange={(e) => setCLifetime(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          {/* STEP 2 — Audience (ad set) */}
          {step === 1 && (
            <>
              <div className="space-y-1.5">
                <Label>Ad set name</Label>
                <Input
                  value={sName}
                  onChange={(e) => setSName(e.target.value)}
                  placeholder="Dhaka · 18-35"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1.5">
                  <Label>Billing event</Label>
                  <Select
                    value={billing}
                    onValueChange={(v) => setBilling(v as Billing)}
                  >
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
                <Label>Daily budget ({currency})</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={sDaily}
                  onChange={(e) => setSDaily(e.target.value)}
                />
              </div>
              <Separator />
              <div>
                <p className="mb-2 text-sm font-medium">
                  Audience — kake dekhabo (optional)
                </p>
                <TargetingForm value={targeting} onChange={setTargeting} />
              </div>
            </>
          )}

          {/* STEP 3 — Creative + Ad */}
          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <Label>Ad name</Label>
                <Input
                  value={aName}
                  onChange={(e) => setAName(e.target.value)}
                  placeholder="Eid Sale — image ad"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <Label>Creative</Label>
                <Select value={creativeMode} onValueChange={setCreativeMode}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NEW_CREATIVE}>
                      + Notun creative banai
                    </SelectItem>
                    {(creatives ?? []).map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {makingNewCreative && (
                <div className="space-y-4 rounded-lg border p-3">
                  <div className="space-y-1.5">
                    <Label>Creative name</Label>
                    <Input
                      value={crName}
                      onChange={(e) => setCrName(e.target.value)}
                      placeholder="Khali rakhle creative chara ad hobe"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Format</Label>
                      <Select
                        value={format}
                        onValueChange={(v) => setFormat(v as Format)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {FORMATS.map((f) => (
                            <SelectItem key={f} value={f}>
                              {f.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Call to action</Label>
                      <Select value={cta} onValueChange={(v) => setCta(v as Cta)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CTAS.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Headline</Label>
                    <Input
                      value={headline}
                      onChange={(e) => setHeadline(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Primary text</Label>
                    <Textarea
                      value={primaryText}
                      onChange={(e) => setPrimaryText(e.target.value)}
                      rows={2}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label>Media URLs</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={uploading}
                        onClick={() => fileRef.current?.click()}
                      >
                        <Upload className="mr-2 h-3.5 w-3.5" />
                        {uploading ? "Uploading..." : "Upload"}
                      </Button>
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*,video/*"
                        className="hidden"
                        onChange={handleUpload}
                      />
                    </div>
                    <Textarea
                      placeholder="https://... (each line ekta URL)"
                      value={mediaText}
                      onChange={(e) => setMediaText(e.target.value)}
                      rows={2}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Destination URL</Label>
                <Input
                  type="url"
                  placeholder="https://..."
                  value={aUrl}
                  onChange={(e) => setAUrl(e.target.value)}
                />
              </div>
            </>
          )}

          {/* STEP 4 — Review */}
          {step === 3 && (
            <div className="space-y-3 text-sm">
              <p className="text-muted-foreground">
                Ekbar dekhe nin. Publish korle campaign + ad set chalu hobe ar ad
                review-e jabe.
              </p>
              <div className="rounded-lg border">
                <Row label="Campaign" value={cName || "—"} sub={objective.replace(/_/g, " ")} />
                <Separator />
                <Row
                  label="Audience (ad set)"
                  value={sName || "—"}
                  sub={
                    hasTargeting
                      ? [
                          (targeting.locations ?? []).join(", "),
                          targeting.ageMin || targeting.ageMax
                            ? `${targeting.ageMin ?? 13}-${targeting.ageMax ?? 65}`
                            : "",
                          (targeting.genders ?? []).join(", "),
                        ]
                          .filter(Boolean)
                          .join(" · ") || "sobar jonno"
                      : "sobar jonno"
                  }
                />
                <Separator />
                <Row
                  label="Creative"
                  value={
                    makingNewCreative
                      ? crName || "Creative chara"
                      : selectedCreativeName ?? "—"
                  }
                  sub={makingNewCreative && crName ? format.replace(/_/g, " ") : ""}
                />
                <Separator />
                <Row label="Ad" value={aName || "—"} sub={aUrl} />
              </div>
            </div>
          )}
        </div>

        <Separator />
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0 || busy}
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext}
            >
              Next <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => run(false)}
                disabled={busy}
              >
                {busy ? "..." : "Save draft"}
              </Button>
              <Button
                onClick={() => run(true)}
                disabled={busy}
                data-testid="wizard-publish"
              >
                <Rocket className="mr-2 h-4 w-4" />
                {busy ? "Publish hocche..." : "Publish now"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-3 py-2">
      <span className="text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <div className="text-right">
        <div className="font-medium">{value}</div>
        {sub ? (
          <div className="text-xs capitalize text-muted-foreground">{sub}</div>
        ) : null}
      </div>
    </div>
  );
}
