import { useState } from "react";
import { Loader2, Rocket } from "lucide-react";
import {
  useBoostPost,
  useBoostPage,
  type BoostPostInputCallToAction,
} from "@workspace/api-client-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const ctaOptions: { value: BoostPostInputCallToAction; label: string }[] = [
  { value: "learn_more", label: "Learn more" },
  { value: "shop_now", label: "Shop now" },
  { value: "sign_up", label: "Sign up" },
  { value: "contact_us", label: "Contact us" },
  { value: "book_now", label: "Book now" },
];

function isSafeUrl(url: string) {
  return url.trim() === "" || /^https?:\/\//i.test(url.trim());
}

export function BoostDialog({
  type,
  id,
  open,
  onOpenChange,
  onDone,
}: {
  type: "post" | "page";
  id: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone?: () => void;
}) {
  const boostPost = useBoostPost();
  const boostPage = useBoostPage();
  const [budget, setBudget] = useState("5");
  const [days, setDays] = useState("7");
  const [headline, setHeadline] = useState("");
  const [cta, setCta] = useState<BoostPostInputCallToAction>("learn_more");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const pending = boostPost.isPending || boostPage.isPending;

  const reset = () => {
    setBudget("5");
    setDays("7");
    setHeadline("");
    setCta("learn_more");
    setDestinationUrl("");
    setError(null);
  };

  const handleBoost = () => {
    setError(null);
    const budgetCents = Math.round(parseFloat(budget) * 100);
    const dayCount = parseInt(days, 10);
    if (!Number.isFinite(budgetCents) || budgetCents < 100) {
      setError("Budget must be at least $1.");
      return;
    }
    if (!Number.isInteger(dayCount) || dayCount < 1 || dayCount > 30) {
      setError("Days must be between 1 and 30.");
      return;
    }
    if (!isSafeUrl(destinationUrl)) {
      setError("Link must start with http:// or https://");
      return;
    }
    const data = {
      budgetCents,
      days: dayCount,
      ...(headline.trim() ? { headline: headline.trim() } : {}),
      callToAction: cta,
      ...(destinationUrl.trim() ? { destinationUrl: destinationUrl.trim() } : {}),
    };
    const onSuccess = () => {
      reset();
      onOpenChange(false);
      onDone?.();
    };
    const onErr = (e: unknown) => {
      setError(e instanceof Error ? e.message : "Could not start boost.");
    };
    if (type === "post") {
      boostPost.mutate({ id, data }, { onSuccess, onError: onErr });
    } else {
      boostPage.mutate({ id, data }, { onSuccess, onError: onErr });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            Boost {type === "post" ? "post" : "hub"}
          </DialogTitle>
          <DialogDescription>
            Reach more people. Your boost goes for admin review before it runs.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="boost-budget">Budget (USD)</Label>
              <Input
                id="boost-budget"
                type="number"
                min={1}
                step={1}
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="boost-days">Days</Label>
              <Input
                id="boost-days"
                type="number"
                min={1}
                max={30}
                value={days}
                onChange={(e) => setDays(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="boost-headline">Headline (optional)</Label>
            <Input
              id="boost-headline"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
              placeholder="Say something catchy"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Button</Label>
            <Select value={cta} onValueChange={(v) => setCta(v as BoostPostInputCallToAction)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ctaOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="boost-url">Link (optional)</Label>
            <Input
              id="boost-url"
              value={destinationUrl}
              onChange={(e) => setDestinationUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={handleBoost} disabled={pending} className="rounded-lg">
            {pending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Start boost
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
