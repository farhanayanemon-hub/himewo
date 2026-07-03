import { useEffect, useRef, useState } from "react";
import { ExternalLink } from "lucide-react";
import {
  ServedAd,
  useRecordAdImpression,
  useRecordAdClick,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";

const ctaLabels: Record<string, string> = {
  learn_more: "Learn more",
  shop_now: "Shop now",
  sign_up: "Sign up",
  book_now: "Book now",
  contact_us: "Contact us",
  download: "Download",
  get_offer: "Get offer",
  subscribe: "Subscribe",
};

function isSafeUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

export function SponsoredCard({ ad }: { ad: ServedAd }) {
  const recordImpression = useRecordAdImpression();
  const recordClick = useRecordAdClick();
  const cardRef = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);

  useEffect(() => {
    if (seen) return;
    const node = cardRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !seen) {
          setSeen(true);
          recordImpression.mutate({
            id: ad.adId,
            data: { placement: ad.placement as never },
          });
          observer.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ad.adId, seen]);

  const destination = isSafeUrl(ad.destinationUrl)
    ? ad.destinationUrl
    : isSafeUrl(ad.creative?.linkUrl)
      ? ad.creative!.linkUrl!
      : null;

  const handleClick = () => {
    recordClick.mutate({ id: ad.adId, data: { placement: ad.placement as never } });
    if (destination) window.open(destination, "_blank", "noopener,noreferrer");
  };

  const creative = ad.creative;
  const headline = creative?.headline || ad.boostedPage?.name || ad.name;
  const body = creative?.primaryText || creative?.description || ad.boostedPost?.content || "";
  const image =
    creative?.mediaUrls?.[0] ||
    ad.boostedPost?.media?.[0]?.url ||
    ad.boostedPage?.avatarUrl ||
    null;
  const ctaLabel = creative?.callToAction
    ? ctaLabels[creative.callToAction] ?? "Learn more"
    : "Learn more";

  return (
    <div
      ref={cardRef}
      className="bg-card border border-card-border rounded-2xl p-4 card-depth animate-in fade-in slide-in-from-bottom-2 duration-300"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
          {(ad.boostedPage?.name || ad.name).charAt(0).toUpperCase()}
        </div>
        <div>
          <div className="font-semibold">{ad.boostedPage?.name || ad.name}</div>
          <div className="text-xs text-muted-foreground">Sponsored</div>
        </div>
      </div>

      {body && <p className="text-[15px] whitespace-pre-wrap mb-3">{body}</p>}

      {image && (
        <button
          type="button"
          onClick={handleClick}
          className="block w-full rounded-lg overflow-hidden border border-border mb-3 text-left"
        >
          <img src={image} className="w-full object-cover max-h-[500px]" alt="" />
        </button>
      )}

      <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
        <span className="font-medium text-sm truncate">{headline}</span>
        <Button size="sm" className="rounded-lg shrink-0" onClick={handleClick}>
          {ctaLabel}
          {destination && <ExternalLink className="w-3.5 h-3.5 ml-1" />}
        </Button>
      </div>
    </div>
  );
}
