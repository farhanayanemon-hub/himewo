import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import {
  useListReels,
  useLikeReel,
  useUnlikeReel,
  useSaveItem,
  useUnsaveItem,
  getListReelsQueryKey,
  getListSavedItemsQueryKey,
  type Reel,
} from "@workspace/api-client-react";
import { Heart, MessageCircle, Share2, Loader2, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

function ReelCard({
  reel,
  onToggleLike,
  onToggleSave,
  saveDisabled,
}: {
  reel: Reel;
  onToggleLike: (id: number, liked: boolean) => void;
  onToggleSave: (id: number, saved: boolean) => void;
  saveDisabled: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    const video = videoRef.current;
    if (!el || !video) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      },
      { threshold: [0, 0.6, 1] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      className="snap-start snap-always shrink-0 h-full w-full flex items-center justify-center"
    >
      <div className="relative w-full max-w-md h-full bg-black rounded-2xl overflow-hidden shadow-xl flex">
        <video
          ref={videoRef}
          src={reel.videoUrl}
          className="w-full h-full object-cover"
          loop
          muted
          playsInline
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

        <div className="absolute bottom-4 left-4 right-16 text-white z-10">
          <div className="flex items-center gap-2 mb-2">
            <img
              src={avatarSrc(reel.author.avatarUrl)}
              className="w-10 h-10 rounded-full object-cover border border-white/20"
              alt=""
            />
            <span className="font-bold text-sm drop-shadow-md">
              {reel.author.displayName}
            </span>
            <Button
              variant="secondary"
              size="sm"
              className="h-6 text-xs bg-white/20 hover:bg-white/30 text-white border-none ml-2"
            >
              Follow
            </Button>
          </div>
          <p className="text-sm drop-shadow-md line-clamp-2">{reel.caption}</p>
        </div>

        <div className="absolute bottom-4 right-4 flex flex-col items-center gap-4 z-10">
          <div className="flex flex-col items-center">
            <button
              onClick={() => onToggleLike(reel.id, reel.viewerHasLiked)}
              className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors"
            >
              <Heart
                className={`w-6 h-6 ${reel.viewerHasLiked ? "fill-red-500 text-red-500" : "text-white"}`}
              />
            </button>
            <span className="text-white text-xs font-semibold mt-1 drop-shadow-md">
              {reel.likeCount}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <button className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors">
              <MessageCircle className="w-6 h-6 text-white" />
            </button>
            <span className="text-white text-xs font-semibold mt-1 drop-shadow-md">
              {reel.commentCount}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <button
              onClick={() => onToggleSave(reel.id, reel.viewerHasSaved)}
              disabled={saveDisabled}
              aria-label={reel.viewerHasSaved ? "Unsave reel" : "Save reel"}
              title={reel.viewerHasSaved ? "Unsave" : "Save"}
              className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors"
            >
              <Bookmark
                className={`w-6 h-6 ${reel.viewerHasSaved ? "fill-white text-white" : "text-white"}`}
              />
            </button>
            <span className="text-white text-xs font-semibold mt-1 drop-shadow-md">
              {reel.viewerHasSaved ? "Saved" : "Save"}
            </span>
          </div>

          <div className="flex flex-col items-center">
            <button className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors">
              <Share2 className="w-6 h-6 text-white" />
            </button>
            <span className="text-white text-xs font-semibold mt-1 drop-shadow-md">
              Share
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReelsPage() {
  const { data: reels, isLoading } = useListReels();
  const likeReel = useLikeReel();
  const unlikeReel = useUnlikeReel();
  const saveItem = useSaveItem();
  const unsaveItem = useUnsaveItem();
  const queryClient = useQueryClient();

  const toggleLike = (id: number, liked: boolean) => {
    const onSettled = () =>
      queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
    if (liked) {
      unlikeReel.mutate({ id }, { onSuccess: onSettled });
    } else {
      likeReel.mutate({ id }, { onSuccess: onSettled });
    }
  };

  const toggleSave = (id: number, saved: boolean) => {
    const onSuccess = () => {
      queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
    };
    if (saved) {
      unsaveItem.mutate({ entityType: "reel", entityId: id }, { onSuccess });
    } else {
      saveItem.mutate(
        { data: { entityType: "reel", entityId: id } },
        { onSuccess },
      );
    }
  };

  return (
    <MainLayout>
      {isLoading ? (
        <div className="h-[calc(100vh-88px)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : reels?.length === 0 ? (
        <div className="h-[calc(100vh-88px)] flex items-center justify-center text-muted-foreground">
          No reels available.
        </div>
      ) : (
        <div className="h-[calc(100vh-88px)] overflow-y-scroll snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {reels?.map((reel) => (
            <ReelCard
              key={reel.id}
              reel={reel}
              onToggleLike={toggleLike}
              onToggleSave={toggleSave}
              saveDisabled={saveItem.isPending || unsaveItem.isPending}
            />
          ))}
        </div>
      )}
    </MainLayout>
  );
}
