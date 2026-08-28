import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import {
  useListReels,
  useLikeReel,
  useUnlikeReel,
  useSaveItem,
  useUnsaveItem,
  useCreateReel,
  useListReelComments,
  useCreateReelComment,
  getListReelsQueryKey,
  getListSavedItemsQueryKey,
  getListReelCommentsQueryKey,
  type Reel,
} from "@workspace/api-client-react";
import {
  Heart,
  MessageCircle,
  Share2,
  Loader2,
  Bookmark,
  Music,
  Plus,
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Send,
  Copy,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import { uploadMedia, UploadUnavailableError, type UploadedMedia } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";
import { MusicPickerButton, type SelectedMusic } from "@/components/music-picker";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

/* -------------------------------------------------------------------------- */
/*                            CREATE REEL DIALOG                              */
/* -------------------------------------------------------------------------- */

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
      <Button onClick={() => setOpen(true)} className="rounded-full gap-2 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
        <Plus className="w-4 h-4" /> Create Reel
      </Button>
      <DialogContent className="sm:max-w-md">
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
              className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
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
                <span className="font-medium">Upload a video</span>
              </>
            )}
          </button>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          maxLength={700}
          placeholder="Add a caption..."
          className="w-full bg-muted/50 border border-border/50 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground resize-none"
        />

        <div className="flex items-center justify-between gap-2">
          <MusicPickerButton selected={music} onSelect={setMusic} />
          {music && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground truncate max-w-[200px]">
              <Music className="w-3.5 h-3.5 shrink-0" /> {music.title}
            </span>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={!video || createReel.isPending}
            className="rounded-lg w-full sm:w-auto"
          >
            {createReel.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share Reel"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                            COMMENTS SHEET                                  */
/* -------------------------------------------------------------------------- */

function ReelCommentsSheet({
  reelId,
  open,
  onOpenChange,
  onCommentCountChange,
}: {
  reelId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommentCountChange: (delta: number) => void;
}) {
  const { user } = useAuth();
  const { data: comments, isLoading } = useListReelComments(reelId, {
    query: { enabled: open },
  });
  const createComment = useCreateReelComment();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || createComment.isPending) return;

    setContent("");
    onCommentCountChange(1);

    createComment.mutate(
      {
        id: reelId,
        data: { content: text },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListReelCommentsQueryKey(reelId),
          });
          queryClient.invalidateQueries({
            queryKey: getListReelsQueryKey(),
          });
        },
        onError: () => {
          onCommentCountChange(-1);
          toast({ title: "Failed to post comment", variant: "destructive" });
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col z-50">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-base font-bold flex items-center justify-between">
            <span>Comments ({comments?.length ?? "..."})</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !comments || comments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 items-start group">
                <Link href={`/profile/${c.author.username}`}>
                  <img
                    src={avatarSrc(c.author.avatarUrl)}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover shrink-0 hover:opacity-90"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={`/profile/${c.author.username}`}
                      className="font-semibold text-xs text-foreground hover:underline"
                    >
                      {c.author.displayName}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
                    {c.content}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-border bg-background flex items-center gap-2"
        >
          {user && (
            <img
              src={avatarSrc(user.avatarUrl)}
              alt=""
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
          )}
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-muted/60 border border-border/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || createComment.isPending}
            className="rounded-full w-9 h-9 p-0 shrink-0"
          >
            {createComment.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/*                              SHARE DIALOG                                  */
/* -------------------------------------------------------------------------- */

function ReelShareDialog({
  reel,
  open,
  onOpenChange,
}: {
  reel: Reel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/reels?id=${reel.id}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reel by ${reel.author.displayName}`,
          text: reel.caption || "Check out this reel on HiMewo!",
          url: shareUrl,
        });
        onOpenChange(false);
      } catch {
        // User dismissed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Reel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
            <img
              src={avatarSrc(reel.author.avatarUrl)}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{reel.author.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {reel.caption || "No caption"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-muted/60 rounded-xl p-2 border border-border/50">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent border-none text-xs text-muted-foreground flex-1 focus:outline-none px-2 truncate"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopy}
              className="rounded-lg gap-1.5 h-8 text-xs font-semibold shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <Button onClick={handleNativeShare} className="w-full rounded-xl gap-2 font-semibold">
              <Share2 className="w-4 h-4" /> Share via App
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                                REEL CARD                                   */
/* -------------------------------------------------------------------------- */

function ReelCard({
  reel,
  isActive,
  isGlobalMuted,
  onToggleGlobalMute,
}: {
  reel: Reel;
  isActive: boolean;
  isGlobalMuted: boolean;
  onToggleGlobalMute: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Optimistic UI states
  const [liked, setLiked] = useState(reel.viewerHasLiked ?? false);
  const [likeCount, setLikeCount] = useState(reel.likeCount ?? 0);
  const [saved, setSaved] = useState(reel.viewerHasSaved ?? false);
  const [commentCount, setCommentCount] = useState(reel.commentCount ?? 0);

  // Video playback states
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [showPlayIcon, setShowPlayIcon] = useState(false);
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  // Modal states
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const queryClient = useQueryClient();
  const likeMutation = useLikeReel();
  const unlikeMutation = useUnlikeReel();
  const saveMutation = useSaveItem();
  const unsaveMutation = useUnsaveItem();

  // Sync props when reel changes
  useEffect(() => {
    setLiked(reel.viewerHasLiked ?? false);
    setLikeCount(reel.likeCount ?? 0);
    setSaved(reel.viewerHasSaved ?? false);
    setCommentCount(reel.commentCount ?? 0);
  }, [reel]);

  // Handle Play/Pause when active state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = isGlobalMuted;
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          video.muted = true;
          video.play().catch(() => {});
          setIsPlaying(true);
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, isGlobalMuted]);

  // Track playback progress
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress((video.currentTime / video.duration) * 100);
  };

  // Toggle Play/Pause on single click
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }

    setShowPlayIcon(true);
    setTimeout(() => setShowPlayIcon(false), 600);
  };

  // Optimistic Like Toggle
  const handleToggleLike = useCallback(() => {
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);

    // Instant UI update
    setLiked(newLiked);
    setLikeCount(newCount);

    if (newLiked) {
      likeMutation.mutate(
        { id: reel.id },
        {
          onError: () => {
            setLiked(false);
            setLikeCount(likeCount);
            toast({ title: "Failed to like reel", variant: "destructive" });
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
          },
        },
      );
    } else {
      unlikeMutation.mutate(
        { id: reel.id },
        {
          onError: () => {
            setLiked(true);
            setLikeCount(likeCount);
            toast({ title: "Failed to unlike reel", variant: "destructive" });
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
          },
        },
      );
    }
  }, [liked, likeCount, reel.id, likeMutation, unlikeMutation, queryClient]);

  // Double click on video to like
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!liked) {
      handleToggleLike();
    }
    setShowHeartBurst(true);
    setTimeout(() => setShowHeartBurst(false), 900);
  };

  // Optimistic Save Toggle
  const handleToggleSave = useCallback(() => {
    const newSaved = !saved;
    setSaved(newSaved);

    toast({
      title: newSaved ? "Saved to your collection" : "Removed from saved",
    });

    if (newSaved) {
      saveMutation.mutate(
        { data: { entityType: "reel", entityId: reel.id } },
        {
          onError: () => {
            setSaved(false);
            toast({ title: "Failed to save reel", variant: "destructive" });
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
          },
        },
      );
    } else {
      unsaveMutation.mutate(
        { entityType: "reel", entityId: reel.id },
        {
          onError: () => {
            setSaved(true);
            toast({ title: "Failed to unsave reel", variant: "destructive" });
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
          },
        },
      );
    }
  }, [saved, reel.id, saveMutation, unsaveMutation, queryClient]);

  return (
    <div
      ref={containerRef}
      className="snap-start snap-always shrink-0 h-full w-full flex items-center justify-center p-2 sm:p-4"
    >
      {/* 9:16 Responsive Full-Height Video Container */}
      <div className="relative h-full max-h-[820px] aspect-[9/16] w-auto max-w-full bg-neutral-950 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center select-none group border border-border/20">
        <video
          ref={videoRef}
          src={reel.videoUrl}
          className="w-full h-full object-cover cursor-pointer"
          loop
          muted={isGlobalMuted}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onClick={togglePlay}
          onDoubleClick={handleDoubleClick}
        />

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

        {/* Center Animated Play/Pause Indicator */}
        {showPlayIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-out fade-out zoom-out duration-500">
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-xl">
              {isPlaying ? <Play className="w-8 h-8 ml-1 fill-white" /> : <Pause className="w-8 h-8 fill-white" />}
            </div>
          </div>
        )}

        {/* Center Floating Heart Burst on Double Click */}
        {showHeartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 duration-300">
            <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse" />
          </div>
        )}

        {/* Top Floating Controls (Mute / Sound) */}
        <button
          type="button"
          onClick={onToggleGlobalMute}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-transform active:scale-95 shadow-md"
          title={isGlobalMuted ? "Unmute (M)" : "Mute (M)"}
        >
          {isGlobalMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Bottom Left Info Area */}
        <div className="absolute bottom-4 left-4 right-20 text-white z-10 space-y-2 pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <Link href={`/profile/${reel.author.username}`} className="shrink-0 group/author">
              <img
                src={avatarSrc(reel.author.avatarUrl)}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/40 group-hover/author:border-white transition-all shadow-md"
                alt=""
              />
            </Link>
            <div className="min-w-0">
              <Link
                href={`/profile/${reel.author.username}`}
                className="font-bold text-sm drop-shadow-md hover:underline truncate block"
              >
                {reel.author.displayName}
              </Link>
              <span className="text-[11px] text-white/80 drop-shadow">@{reel.author.username}</span>
            </div>
          </div>

          {reel.caption && (
            <p className="text-sm font-medium drop-shadow-md line-clamp-3 leading-snug text-white/95">
              {reel.caption}
            </p>
          )}

          {reel.musicUrl && (
            <div className="flex items-center gap-1.5 text-white/90 text-xs drop-shadow-md bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full w-fit max-w-full">
              <Music className="w-3.5 h-3.5 shrink-0 animate-spin text-primary" style={{ animationDuration: "4s" }} />
              <span className="truncate">
                {reel.musicTitle ?? "Original Audio"}
                {reel.musicArtist ? ` · ${reel.musicArtist}` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Right Floating Actions Bar */}
        <div className="absolute bottom-4 right-3 flex flex-col items-center gap-3.5 z-20">
          {/* Like Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleToggleLike}
              className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-75 shadow-lg group/btn"
              title="Like (L)"
            >
              <Heart
                className={`w-6 h-6 transition-all duration-200 ${
                  liked
                    ? "fill-red-500 text-red-500 scale-110"
                    : "text-white group-hover/btn:scale-110"
                }`}
              />
            </button>
            <span className="text-white text-xs font-bold mt-1 drop-shadow-md">
              {likeCount}
            </span>
          </div>

          {/* Comment Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setCommentsOpen(true)}
              className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-75 shadow-lg group/btn"
              title="Comments"
            >
              <MessageCircle className="w-6 h-6 text-white group-hover/btn:scale-110 transition-transform" />
            </button>
            <span className="text-white text-xs font-bold mt-1 drop-shadow-md">
              {commentCount}
            </span>
          </div>

          {/* Save Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleToggleSave}
              className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-75 shadow-lg group/btn"
              title={saved ? "Unsave" : "Save"}
            >
              <Bookmark
                className={`w-6 h-6 transition-all duration-200 ${
                  saved
                    ? "fill-primary text-primary scale-110"
                    : "text-white group-hover/btn:scale-110"
                }`}
              />
            </button>
            <span className="text-white text-xs font-bold mt-1 drop-shadow-md">
              {saved ? "Saved" : "Save"}
            </span>
          </div>

          {/* Share Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShareOpen(true)}
              className="w-11 h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-75 shadow-lg group/btn"
              title="Share"
            >
              <Share2 className="w-6 h-6 text-white group-hover/btn:scale-110 transition-transform" />
            </button>
            <span className="text-white text-xs font-bold mt-1 drop-shadow-md">
              Share
            </span>
          </div>
        </div>

        {/* Video Bottom Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div
            className="h-full bg-primary transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Modals & Drawers */}
      <ReelCommentsSheet
        reelId={reel.id}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        onCommentCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
      />

      <ReelShareDialog
        reel={reel}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                MAIN PAGE                                   */
/* -------------------------------------------------------------------------- */

export default function ReelsPage() {
  const { data: reels, isLoading } = useListReels();
  const [activeIndex, setActiveIndex] = useState(0);
  const [globalMuted, setGlobalMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver to determine active reel on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cards = container.querySelectorAll(".snap-start");
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = Array.from(cards).indexOf(entry.target);
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        });
      },
      { root: container, threshold: [0.5] },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [reels]);

  // Scroll to index
  const scrollToIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container || !reels || index < 0 || index >= reels.length) return;
      const cards = container.querySelectorAll(".snap-start");
      if (cards[index]) {
        cards[index].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [reels],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        scrollToIndex(activeIndex - 1);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setGlobalMuted((m) => !m);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, scrollToIndex]);

  return (
    <MainLayout>
      <div className="relative h-[calc(100vh-70px)] w-full flex items-center justify-center overflow-hidden bg-background">
        {/* Top Right Create Button */}
        <div className="absolute top-4 right-4 z-30">
          <CreateReelDialog />
        </div>

        {/* Desktop Side Navigation Chevrons */}
        {reels && reels.length > 1 && (
          <div className="hidden lg:flex flex-col gap-3 absolute right-8 top-1/2 -translate-y-1/2 z-20">
            <Button
              variant="secondary"
              size="icon"
              disabled={activeIndex === 0}
              onClick={() => scrollToIndex(activeIndex - 1)}
              className="w-10 h-10 rounded-full shadow-lg bg-background/80 hover:bg-background backdrop-blur-md disabled:opacity-30 border border-border"
              title="Previous Reel (Up Arrow)"
            >
              <ChevronUp className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              disabled={activeIndex === reels.length - 1}
              onClick={() => scrollToIndex(activeIndex + 1)}
              className="w-10 h-10 rounded-full shadow-lg bg-background/80 hover:bg-background backdrop-blur-md disabled:opacity-30 border border-border"
              title="Next Reel (Down Arrow)"
            >
              <ChevronDown className="w-5 h-5" />
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading reels...</p>
          </div>
        ) : !reels || reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-4 max-w-sm text-center p-6 bg-card border border-border rounded-2xl shadow-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Play className="w-8 h-8 fill-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">No Reels Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to share an engaging short video with the community!
              </p>
            </div>
            <CreateReelDialog />
          </div>
        ) : (
          <div
            ref={containerRef}
            className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {reels.map((reel, idx) => (
              <ReelCard
                key={reel.id}
                reel={reel}
                isActive={idx === activeIndex}
                isGlobalMuted={globalMuted}
                onToggleGlobalMute={() => setGlobalMuted((m) => !m)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
