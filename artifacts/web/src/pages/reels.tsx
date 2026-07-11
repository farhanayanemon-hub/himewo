import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import {
  useListReels,
  useLikeReel,
  useUnlikeReel,
  useSaveItem,
  useUnsaveItem,
  useCreateReel,
  getListReelsQueryKey,
  getListSavedItemsQueryKey,
  type Reel,
} from "@workspace/api-client-react";
import { Heart, MessageCircle, Share2, Loader2, Bookmark, Music, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { uploadMedia, UploadUnavailableError, type UploadedMedia } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";
import { MusicPickerButton, type SelectedMusic } from "@/components/music-picker";

function CreateReelDialog() {
  const queryClient = useQueryClient();
  const createReel = useCreateReel();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [video, setVideo] = useState<UploadedMedia | null>(null);
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState<SelectedMusic | null>(null);
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setVideo(null);
    setCaption("");
    setMusic(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadMedia(file);
      setVideo({ url: uploaded.url, type: "video" });
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        const url = window.prompt(
          "Direct upload isn't available in this environment. Paste a video URL instead:",
        );
        if (url) setVideo({ url, type: "video" });
      } else {
        toast({ title: "Upload failed", description: "Please try again." });
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = () => {
    if (!video) return;
    createReel.mutate(
      {
        data: {
          videoUrl: video.url,
          caption: caption.trim() || undefined,
          ...(music
            ? {
                musicUrl: music.url,
                musicTitle: music.title,
                musicArtist: music.artist ?? undefined,
              }
            : {}),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
          reset();
          setOpen(false);
          toast({ title: "Reel shared!" });
        },
        onError: () => toast({ title: "Could not create reel", description: "Please try again." }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <Button onClick={() => setOpen(true)} className="rounded-full gap-2 shadow-lg">
        <Plus className="w-4 h-4" /> Create Reel
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Reel</DialogTitle>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files)}
        />

        {video ? (
          <div className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-[9/16] max-h-[45vh] mx-auto">
            <video src={video.url} className="w-full h-full object-cover" autoPlay loop muted />
            <button
              onClick={() => setVideo(null)}
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-10 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:bg-muted/50 transition-colors flex flex-col items-center gap-2"
          >
            {uploading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <>
                <Plus className="w-6 h-6" />
                <span>Add a video</span>
              </>
            )}
          </button>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          maxLength={700}
          placeholder="Add a caption"
          className="w-full bg-muted/50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground resize-none"
        />

        <div className="flex items-center justify-between gap-2">
          <MusicPickerButton selected={music} onSelect={setMusic} />
          {music && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Music className="w-3.5 h-3.5" /> Music attached
            </span>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={!video || createReel.isPending}
            className="rounded-lg"
          >
            {createReel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share Reel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

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
          {reel.musicUrl && (
            <div className="flex items-center gap-1 text-white/90 text-xs mt-1.5 drop-shadow-md">
              <Music className="w-3 h-3 shrink-0" />
              <span className="truncate">
                {reel.musicTitle ?? "Original audio"}
                {reel.musicArtist ? ` · ${reel.musicArtist}` : ""}
              </span>
            </div>
          )}
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
      <div className="relative">
        <div className="absolute top-3 right-3 z-20">
          <CreateReelDialog />
        </div>
        {isLoading ? (
          <div className="h-[calc(100vh-88px)] flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : reels?.length === 0 ? (
          <div className="h-[calc(100vh-88px)] flex flex-col items-center justify-center text-muted-foreground gap-4">
            <p>No reels available.</p>
            <CreateReelDialog />
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
      </div>
    </MainLayout>
  );
}
