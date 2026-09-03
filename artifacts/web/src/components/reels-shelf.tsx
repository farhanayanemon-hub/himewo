import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { useListReels, type Reel } from "@workspace/api-client-react";
import { avatarSrc } from "@/lib/avatar";
import { Clapperboard, ChevronLeft, ChevronRight, Play } from "lucide-react";

function ReelCard({ reel }: { reel: Reel }) {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Auto-play muted preview
    video.muted = true;
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay was prevented by browser policy
      });
    }

    // Loop continuously between 0 and 2 seconds
    const handleTimeUpdate = () => {
      if (video.currentTime >= 2.0) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [reel.videoUrl]);

  const handleClick = async () => {
    // Track reel watch for daily task (20 points)
    try {
      await fetch("/api/earnings/reels/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
    } catch {
      // ignore track error
    }
    setLocation("/reels");
  };

  return (
    <div
      onClick={handleClick}
      className="relative shrink-0 w-36 sm:w-44 h-64 sm:h-72 rounded-2xl overflow-hidden cursor-pointer group bg-black/90 border border-card-border shadow-sm hover:shadow-md transition-all duration-200 select-none"
    >
      {/* 2-second looping preview video */}
      <video
        ref={videoRef}
        src={reel.videoUrl}
        poster={reel.thumbnailUrl ?? undefined}
        muted
        playsInline
        autoPlay
        loop
        preload="metadata"
        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
      />

      {/* Top Left Badge: Clapper icon */}
      <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
        <Play className="w-3.5 h-3.5 fill-white" />
      </div>

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />

      {/* Creator info & caption */}
      <div className="absolute bottom-3 inset-x-2.5 z-10 text-white">
        <div className="flex items-center gap-1.5 mb-1">
          <img
            src={avatarSrc(reel.author.avatarUrl)}
            alt=""
            className="w-6 h-6 rounded-full object-cover border border-white/40 shrink-0"
          />
          <span className="text-xs font-semibold truncate leading-none">
            {reel.author.displayName}
          </span>
        </div>
        {reel.caption && (
          <p className="text-[11px] text-white/90 line-clamp-2 leading-tight">
            {reel.caption}
          </p>
        )}
      </div>
    </div>
  );
}

export function ReelsShelf() {
  const { data: reels, isLoading } = useListReels({ limit: 12 });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
  }, [reels]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    const offset = direction === "left" ? -320 : 320;
    el.scrollBy({ left: offset, behavior: "smooth" });
    setTimeout(checkScroll, 300);
  };

  if (isLoading || !reels || reels.length === 0) {
    return null;
  }

  return (
    <div className="relative bg-card border border-card-border rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
            <Clapperboard className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-base text-foreground leading-none">
              Reels and short videos
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Watch reels to earn 20 points
            </p>
          </div>
        </div>
        <Link
          href="/reels"
          className="text-xs font-semibold text-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:underline"
        >
          See more
        </Link>
      </div>

      {/* Left Navigation Arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          aria-label="Previous reels"
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-background/90 hover:bg-background border border-border shadow-lg items-center justify-center text-foreground transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Right Navigation Arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          aria-label="Next reels"
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-background/90 hover:bg-background border border-border shadow-lg items-center justify-center text-foreground transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}

      {/* Horizontal Swipe / Scroll Container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-3 overflow-x-auto scrollbar-none py-1 px-1 scroll-smooth"
      >
        {reels.map((reel) => (
          <ReelCard key={reel.id} reel={reel} />
        ))}
      </div>
    </div>
  );
}
