import { useEffect, useState } from "react";
import { Globe, ThumbsUp, MessageCircle, Share2, ImageOff } from "lucide-react";

const CTA_LABELS: Record<string, string> = {
  learn_more: "Learn more",
  shop_now: "Shop now",
  sign_up: "Sign up",
  book_now: "Book now",
  contact_us: "Contact us",
  download: "Download",
  none: "",
};

function domainOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "").toUpperCase();
  } catch {
    return url ? url.toUpperCase() : "";
  }
}

function isVideoUrl(url: string): boolean {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
}

function isSafeUrl(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

// A Facebook-style feed-ad preview card. Shows how the ad will roughly look
// in the HiMewo feed while the advertiser fills in the form.
export function AdPreview({
  pageName,
  primaryText,
  headline,
  mediaUrl,
  callToAction,
  destinationUrl,
}: {
  pageName?: string;
  primaryText?: string;
  headline?: string;
  mediaUrl?: string;
  callToAction?: string;
  destinationUrl?: string;
}) {
  const [mediaError, setMediaError] = useState(false);

  useEffect(() => {
    setMediaError(false);
  }, [mediaUrl]);

  const cta = CTA_LABELS[callToAction ?? "none"] ?? "";
  const domain = domainOf(destinationUrl ?? "");
  const name = pageName?.trim() || "Your Hub";
  const safeMedia = mediaUrl && isSafeUrl(mediaUrl) ? mediaUrl : undefined;

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-2.5 p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-violet-500 text-sm font-bold text-white">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{name}</p>
          <p className="flex items-center gap-1 text-xs text-muted-foreground">
            Sponsored <span aria-hidden>·</span>
            <Globe className="h-3 w-3" />
          </p>
        </div>
      </div>

      {/* Primary text */}
      {primaryText?.trim() && (
        <p className="whitespace-pre-wrap px-3 pb-2 text-sm">{primaryText}</p>
      )}

      {/* Media */}
      <div className="bg-muted">
        {safeMedia && !mediaError ? (
          isVideoUrl(safeMedia) ? (
            <video
              src={safeMedia}
              className="max-h-64 w-full object-cover"
              muted
              controls
              onError={() => setMediaError(true)}
            />
          ) : (
            <img
              src={safeMedia}
              alt="Ad media"
              className="max-h-64 w-full object-cover"
              onError={() => setMediaError(true)}
            />
          )
        ) : mediaError || (mediaUrl && !safeMedia) ? (
          <div className="flex h-40 flex-col items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ImageOff className="h-5 w-5" />
            Media could not be loaded — check the URL
          </div>
        ) : (
          <div className="flex h-40 items-center justify-center text-xs text-muted-foreground">
            Your photo / video will show here
          </div>
        )}
      </div>

      {/* Link card footer */}
      <div className="flex items-center justify-between gap-3 border-t bg-muted/40 px-3 py-2.5">
        <div className="min-w-0">
          {domain && (
            <p className="truncate text-[11px] uppercase tracking-wide text-muted-foreground">
              {domain}
            </p>
          )}
          <p className="truncate text-sm font-semibold">
            {headline?.trim() || "Your headline here"}
          </p>
        </div>
        {cta && (
          <span className="shrink-0 rounded-md bg-secondary px-3 py-1.5 text-sm font-medium">
            {cta}
          </span>
        )}
      </div>

      {/* Reaction bar (decorative) */}
      <div className="flex items-center justify-around border-t px-3 py-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <ThumbsUp className="h-3.5 w-3.5" /> Like
        </span>
        <span className="flex items-center gap-1.5">
          <MessageCircle className="h-3.5 w-3.5" /> Comment
        </span>
        <span className="flex items-center gap-1.5">
          <Share2 className="h-3.5 w-3.5" /> Share
        </span>
      </div>
    </div>
  );
}
