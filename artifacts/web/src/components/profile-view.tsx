import { useState, useMemo, useRef, useEffect } from "react";
import { avatarSrc } from "@/lib/avatar";
import { Link } from "wouter";
import { getUserProfileUrl } from "@/lib/user-link";
import { formatDistanceToNow } from "date-fns";
import {
  useGetUserFriends,
  getGetUserFriendsQueryKey,
  getGetUserPostsQueryKey,
  useGetUserAlbums,
  getGetUserAlbumsQueryKey,
  useUpdateMyProfile,
  getGetUserQueryKey,
  useLikeReel,
  useUnlikeReel,
  useSaveItem,
  useUnsaveItem,
  useFollowUser,
  useUnfollowUser,
  getListSavedItemsQueryKey,
  getListReelsQueryKey,
  customFetch,
  type Profile,
  type Post,
  type Reel,
} from "@workspace/api-client-react";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { PhotoActionMenu, usePhotoEditor } from "@/components/photo-editor";
import { PostCard } from "@/components/post-card";
import { VerifiedBadge } from "@/components/verified-badge";
import { PostComposer } from "@/components/post-composer";
import { CreateAlbumDialog } from "@/components/create-album-dialog";
import { MediaLightbox } from "@/components/media-grid";
import { Button } from "@/components/ui/button";
import { syncUserFollowState } from "@/lib/follow-sync";
import { syncReelLikeState } from "@/lib/reel-sync";
import { parseReelOverlays } from "@/pages/reels";
import {
  Loader2,
  Briefcase,
  GraduationCap,
  MapPin,
  Home,
  Heart,
  Sparkles,
  Globe,
  Mail,
  Phone,
  Lock,
  Images,
  Play,
  MessageCircle,
  Plus,
  Volume2,
  VolumeX,
  Bookmark,
  Send,
  ExternalLink,
  Music,
  Film,
  Check,
  MoreHorizontal,
  Copy,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function IntroRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 text-[15px]">
      <span className="text-muted-foreground mt-0.5 shrink-0">{icon}</span>
      <span className="text-foreground">{children}</span>
    </div>
  );
}

function ProfileReelTimelineCard({
  reel,
  hideFollowButton = false,
}: {
  reel: Reel;
  hideFollowButton?: boolean;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const likeReel = useLikeReel();
  const unlikeReel = useUnlikeReel();
  const saveItem = useSaveItem();
  const unsaveItem = useUnsaveItem();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const isAuthor = user?.id === reel.author.id;
  const [following, setFollowing] = useState(Boolean(reel.author.viewerFollows));
  const [liked, setLiked] = useState(Boolean(reel.viewerHasLiked ?? (reel as any).viewerLiked));
  const [likeCount, setLikeCount] = useState(reel.likeCount ?? 0);
  const [saved, setSaved] = useState(Boolean(reel.viewerHasSaved ?? (reel as any).viewerSaved));

  useEffect(() => {
    setFollowing(Boolean(reel.author.viewerFollows));
  }, [reel.author.viewerFollows]);

  useEffect(() => {
    const handleFollowSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (detail.targetId === reel.author.id || (reel.author.username && detail.targetId === reel.author.username)) {
        setFollowing(detail.isFollowing);
      }
    };
    window.addEventListener("himewo:follow-sync", handleFollowSync);
    return () => window.removeEventListener("himewo:follow-sync", handleFollowSync);
  }, [reel.author.id, reel.author.username]);

  useEffect(() => {
    setLiked(Boolean(reel.viewerHasLiked ?? (reel as any).viewerLiked));
    setLikeCount(reel.likeCount ?? 0);
    setSaved(Boolean(reel.viewerHasSaved ?? (reel as any).viewerSaved));
  }, [reel.viewerHasLiked, (reel as any).viewerLiked, reel.likeCount, reel.viewerHasSaved, (reel as any).viewerSaved]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleDeleteReel = async () => {
    setDeleting(true);
    try {
      await customFetch(`/api/reels/${reel.id}`, { method: "DELETE" });
      queryClient.setQueryData<Reel[]>(["user-reels", reel.author.id], (old) => {
        if (!old) return old;
        return old.filter((r) => r.id !== reel.id);
      });
      queryClient.invalidateQueries({ queryKey: ["user-reels"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile-reels"] });
      queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
      toast.success("Reel moved to trash");
      setDeleteConfirmOpen(false);
    } catch (err: any) {
      toast.error(err?.message || "Failed to delete reel");
    } finally {
      setDeleting(false);
    }
  };

  const handleCopyLink = () => {
    const shareUrl = `${window.location.origin}/reels?id=${reel.id}`;
    navigator.clipboard.writeText(shareUrl);
    toast.success("Reel link copied to clipboard");
  };

  useEffect(() => {
    setFollowing(Boolean(reel.author.viewerFollows));
  }, [reel.author.viewerFollows]);

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || isAuthor) return;
    const authorId = reel.author.id;
    if (following) {
      setFollowing(false);
      syncUserFollowState(queryClient, authorId, false);
      unfollowUser.mutate(
        { userId: authorId },
        {
          onError: () => {
            setFollowing(true);
            syncUserFollowState(queryClient, authorId, true);
          },
        },
      );
    } else {
      setFollowing(true);
      syncUserFollowState(queryClient, authorId, true);
      followUser.mutate(
        { userId: authorId },
        {
          onError: () => {
            setFollowing(false);
            syncUserFollowState(queryClient, authorId, false);
          },
        },
      );
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
          setIsPlaying(true);
        } else {
          video.pause();
          setIsPlaying(false);
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(video);
    return () => {
      observer.disconnect();
    };
  }, []);

  const cleanCaption = parseReelOverlays(reel.caption).cleanCaption;

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const handleToggleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    if (liked) {
      setLiked(false);
      const nextCount = Math.max(0, likeCount - 1);
      setLikeCount(nextCount);
      syncReelLikeState(queryClient, reel.id, false, nextCount, null);
      unlikeReel.mutate(
        { id: reel.id },
        {
          onError: () => {
            setLiked(true);
            setLikeCount(likeCount);
            syncReelLikeState(queryClient, reel.id, true, likeCount, "like");
          },
        },
      );
    } else {
      setLiked(true);
      const nextCount = likeCount + 1;
      setLikeCount(nextCount);
      syncReelLikeState(queryClient, reel.id, true, nextCount, "like");
      likeReel.mutate(
        { id: reel.id },
        {
          onError: () => {
            setLiked(false);
            setLikeCount(likeCount);
            syncReelLikeState(queryClient, reel.id, false, likeCount, null);
          },
        },
      );
    }
  };

  const handleToggleSave = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
    };
    if (saved) {
      setSaved(false);
      unsaveItem.mutate(
        { entityType: "reel", entityId: reel.id },
        { onSuccess: invalidate, onError: () => setSaved(true) },
      );
    } else {
      setSaved(true);
      saveItem.mutate(
        { data: { entityType: "reel", entityId: reel.id } },
        { onSuccess: invalidate, onError: () => setSaved(false) },
      );
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/reels?id=${reel.id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "HiMewo Reel",
          text: cleanCaption || "Watch this reel on HiMewo",
          url,
        });
      } catch {}
    } else {
      await navigator.clipboard.writeText(url);
      alert("Reel link copied to clipboard!");
    }
  };

  return (
    <div className="aurora-glass-card rounded-none sm:rounded-2xl border-x-0 sm:border-x border-y sm:border border-border/70 p-3 sm:p-5 space-y-3.5 shadow-sm hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href={getUserProfileUrl(reel.author)}>
            <img
              src={avatarSrc(reel.author.avatarUrl)}
              className="w-10 h-10 rounded-full object-cover bg-muted border border-border cursor-pointer"
              alt=""
            />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={getUserProfileUrl(reel.author)}>
                <span className="font-bold text-sm hover:underline text-foreground cursor-pointer">
                  {reel.author.displayName}
                </span>
              </Link>
              {reel.author.isVerified && <VerifiedBadge className="w-4 h-4" />}
              {!isAuthor && user && !hideFollowButton && (
                <button
                  type="button"
                  onClick={handleToggleFollow}
                  className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-md transition-all shadow-sm active:scale-95 ${
                    following
                      ? "bg-muted hover:bg-muted/80 text-foreground border border-border"
                      : "bg-purple-600 hover:bg-purple-700 text-white"
                  }`}
                >
                  {following ? (
                    <>
                      <Check className="w-3 h-3 text-purple-500" />
                      <span>Following</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3 h-3" />
                      <span>Follow</span>
                    </>
                  )}
                </button>
              )}
            </div>
            <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap">
              <span>@{reel.author.username}</span>
              <span>•</span>
              <span title={new Date(reel.createdAt).toLocaleString()}>
                {formatDistanceToNow(new Date(reel.createdAt), { addSuffix: true })}
              </span>
              <span>•</span>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 font-semibold text-[10px]">
                <Play className="w-2.5 h-2.5 fill-current" /> Reel
              </span>
            </div>
          </div>
        </div>

        {/* 3-dots Menu Button */}
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="w-8 h-8 rounded-full hover:bg-muted/80 text-muted-foreground"
                aria-label="Reel options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 shadow-lg rounded-xl">
              <DropdownMenuItem onClick={handleCopyLink} className="gap-2 cursor-pointer text-xs">
                <Copy className="w-3.5 h-3.5" />
                <span>Copy link</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleToggleSave} className="gap-2 cursor-pointer text-xs">
                <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-primary text-primary" : ""}`} />
                <span>{saved ? "Remove from saved" : "Save reel"}</span>
              </DropdownMenuItem>
              <Link href={`/reels?id=${reel.id}`}>
                <DropdownMenuItem className="gap-2 cursor-pointer text-xs">
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Reels</span>
                </DropdownMenuItem>
              </Link>
              {isAuthor && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => setDeleteConfirmOpen(true)}
                    className="gap-2 text-destructive focus:text-destructive cursor-pointer font-medium text-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Move to trash</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteConfirmOpen && (
        <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Move Reel to Trash?</DialogTitle>
              <DialogDescription>
                This reel will be moved to your trash. Items in trash are automatically purged after 30 days.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 mt-3">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={deleting}
                className="rounded-xl"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteReel}
                disabled={deleting}
                className="rounded-xl"
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Move to Trash
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Caption */}
      {cleanCaption && (
        <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
          {cleanCaption}
        </p>
      )}

      {/* Music Tag */}
      {reel.musicTitle && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-muted/30 px-3 py-1.5 rounded-lg w-fit">
          <Music className="w-3.5 h-3.5 text-primary shrink-0" />
          <span className="font-medium truncate max-w-xs">
            {reel.musicTitle} {reel.musicArtist ? `• ${reel.musicArtist}` : ""}
          </span>
        </div>
      )}

      {/* Video Box */}
      <div
        onClick={togglePlay}
        className="relative aspect-[9/16] max-h-[520px] mx-auto rounded-2xl overflow-hidden bg-black cursor-pointer shadow-inner flex items-center justify-center group"
      >
        <video
          ref={videoRef}
          src={reel.videoUrl}
          poster={reel.thumbnailUrl ?? undefined}
          loop
          playsInline
          muted={isMuted}
          className="w-full h-full object-contain"
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />

        {/* Center Play Icon when Paused */}
        {!isPlaying && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 backdrop-blur-[1px] transition-all">
            <div className="w-14 h-14 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
              <Play className="w-7 h-7 fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Top Right "Open in Reels" button */}
        <Link
          href={`/reels?id=${reel.id}`}
          onClick={(e) => e.stopPropagation()}
          className="absolute top-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all z-10"
          title="Watch in Reels fullscreen"
        >
          <ExternalLink className="w-4 h-4" />
        </Link>

        {/* Bottom Sound Toggle */}
        <button
          onClick={toggleMute}
          className="absolute bottom-3 right-3 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white backdrop-blur-md transition-all z-10"
          title={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Bottom Actions Bar */}
      <div className="pt-2 border-t border-border flex items-center justify-between text-muted-foreground">
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Like */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleLike}
            className={`rounded-xl gap-1.5 px-3 ${
              liked
                ? "text-red-500 hover:text-red-600 bg-red-500/10"
                : "hover:text-foreground"
            }`}
          >
            <Heart className={`w-4 h-4 ${liked ? "fill-red-500 text-red-500" : ""}`} />
            <span className="text-xs font-semibold">{likeCount}</span>
          </Button>

          {/* Comment */}
          <Link href={`/reels?id=${reel.id}`}>
            <Button
              variant="ghost"
              size="sm"
              className="rounded-xl gap-1.5 px-3 hover:text-foreground"
            >
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs font-semibold">{reel.commentCount ?? 0}</span>
            </Button>
          </Link>

          {/* Share (Instagram style paper airplane) */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
            className="rounded-xl gap-1.5 px-3 hover:text-foreground"
          >
            <Send className="w-4 h-4 -translate-y-0.5" />
            <span className="text-xs font-semibold">Share</span>
          </Button>
        </div>

        {/* Save (Amber bookmark) */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleToggleSave}
          className={`rounded-full ${
            saved
              ? "text-amber-500 hover:text-amber-600 bg-amber-500/10"
              : "hover:text-foreground"
          }`}
          title={saved ? "Saved" : "Save"}
        >
          <Bookmark className={`w-4 h-4 ${saved ? "fill-amber-500 text-amber-500" : ""}`} />
        </Button>
      </div>
    </div>
  );
}

function limitWords(str: string, maxWords: number): string {
  if (!str) return "";
  const words = str.trim().split(/\s+/);
  if (words.length <= maxWords) return str;
  return words.slice(0, maxWords).join(" ") + "...";
}

export function ProfileView({
  profile,
  userId,
  isOwnProfile,
  posts,
  postsLoading,
  headerActions,
}: {
  profile: Profile;
  userId: string;
  isOwnProfile: boolean;
  posts: Post[] | undefined;
  postsLoading: boolean;
  headerActions: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();
  const updateProfile = useUpdateMyProfile();
  const [createAlbumOpen, setCreateAlbumOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "reels" | "photos">("posts");

  const afterPhotoSave = async (data: { avatarUrl?: string; coverUrl?: string }, shareToFeed?: boolean) => {
    await updateProfile.mutateAsync({ data });
    await refreshUser();
    queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
    if (shareToFeed) {
      try {
        const photoUrl = data.avatarUrl || data.coverUrl;
        const label = data.avatarUrl ? "Updated profile picture" : "Updated cover photo";
        await customFetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: label,
            privacy: "public",
            media: [{ url: photoUrl, type: "image", position: 0 }],
          }),
        });
        queryClient.invalidateQueries({ queryKey: getGetUserPostsQueryKey(userId) });
        queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      } catch (err) {
        console.warn("Failed to share photo update to feed:", err);
      }
    }
  };

  const handleDeletePhoto = async (kind: "avatar" | "cover") => {
    try {
      if (kind === "avatar") {
        await updateProfile.mutateAsync({ data: { avatarUrl: "" } });
        toast.success("Profile picture removed");
      } else {
        await updateProfile.mutateAsync({ data: { coverUrl: "" } });
        toast.success("Cover photo removed");
      }
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
      if (profile.id) queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(profile.id) });
    } catch {
      toast.error("Failed to remove photo. Please try again.");
    }
  };

  const avatarEditor = usePhotoEditor({
    kind: "avatar",
    photoUrl: profile.avatarUrl,
    onSaved: (url, share) => afterPhotoSave({ avatarUrl: url }, share),
  });
  const coverEditor = usePhotoEditor({
    kind: "cover",
    photoUrl: profile.coverUrl,
    onSaved: (url, share) => afterPhotoSave({ coverUrl: url }, share),
  });
  const isLocked = Boolean(profile.isLocked);
  const showLocked = isLocked && !isOwnProfile && !profile.viewerIsFriend;

  const { data: friends } = useGetUserFriends(
    userId,
    undefined,
    {
      query: {
        enabled: !!userId && !showLocked,
        queryKey: getGetUserFriendsQueryKey(userId),
      },
    },
  );

  const { data: albums } = useGetUserAlbums(userId, {
    query: {
      enabled: !!userId && !showLocked,
      queryKey: getGetUserAlbumsQueryKey(userId),
    },
  });

  // Fetch reels uploaded by this user via customFetch
  const targetUserId = profile.id || userId;
  const { data: userReels, isLoading: reelsLoading } = useQuery<Reel[]>({
    queryKey: ["user-reels", targetUserId],
    queryFn: async () => {
      return customFetch<Reel[]>(
        `/api/users/${encodeURIComponent(targetUserId)}/reels?limit=50`,
      ).catch(() => []);
    },
    enabled: !!targetUserId && !showLocked,
  });

  // Fetch all photos uploaded by this user (posts + albums)
  const { data: userPhotosData } = useQuery<{ photos: { url: string; createdAt: string }[] }>({
    queryKey: ["user-uploaded-photos", targetUserId],
    queryFn: async () => {
      return customFetch<{ photos: { url: string; createdAt: string }[] }>(
        `/api/users/${encodeURIComponent(targetUserId)}/photos`,
      ).catch(() => ({ photos: [] }));
    },
    enabled: !!targetUserId && !showLocked,
  });

  // Ensure posts strictly belong to target user and exclude page/group posts
  const strictlyUserPosts = useMemo(() => {
    if (!profile?.id) return [];
    return (posts ?? []).filter((p) => {
      const matchAuthor =
        p.author?.id === profile.id ||
        (userId && p.author?.id === userId) ||
        (profile.username && p.author?.username?.toLowerCase() === profile.username.toLowerCase());
      return matchAuthor && !p.pageId && !p.groupId;
    });
  }, [posts, profile.id, profile.username, userId]);

  // Ensure reels strictly belong to target user
  const filteredReels = useMemo(() => {
    if (!profile?.id && !userId) return [];
    return (userReels ?? []).filter(
      (r) =>
        r.author?.id === profile.id ||
        (userId && r.author?.id === userId) ||
        (profile.username && r.author?.username?.toLowerCase() === profile.username.toLowerCase()),
    );
  }, [userReels, profile.id, profile.username, userId]);

  // Merge posts and reels into a unified timeline sorted by createdAt date descending
  type TimelineItem =
    | { type: "post"; id: string; date: number; post: Post }
    | { type: "reel"; id: string; date: number; reel: Reel };

  const timelineItems: TimelineItem[] = useMemo(() => {
    const pList: TimelineItem[] = strictlyUserPosts.map((p) => ({
      type: "post",
      id: `post-${p.id}`,
      date: new Date(p.createdAt).getTime(),
      post: p,
    }));
    const rList: TimelineItem[] = filteredReels.map((r) => ({
      type: "reel",
      id: `reel-${r.id}`,
      date: new Date(r.createdAt).getTime(),
      reel: r,
    }));
    return [...pList, ...rList].sort((a, b) => b.date - a.date);
  }, [strictlyUserPosts, filteredReels]);

  const photoUrls = useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();

    if (userPhotosData?.photos) {
      for (const p of userPhotosData.photos) {
        if (p.url && !seen.has(p.url)) {
          seen.add(p.url);
          urls.push(p.url);
        }
      }
    }

    for (const p of posts ?? []) {
      for (const m of p.media ?? []) {
        if (m.type === "image" && m.url && !seen.has(m.url)) {
          seen.add(m.url);
          urls.push(m.url);
        }
      }
    }

    if (profile.avatarUrl && !seen.has(profile.avatarUrl)) {
      seen.add(profile.avatarUrl);
      urls.push(profile.avatarUrl);
    }
    if (profile.coverUrl && !seen.has(profile.coverUrl)) {
      seen.add(profile.coverUrl);
      urls.push(profile.coverUrl);
    }

    return urls;
  }, [userPhotosData, posts, profile.avatarUrl, profile.coverUrl]);

  const hasIntro =
    profile.bio ||
    profile.work ||
    profile.education ||
    profile.location ||
    profile.hometown ||
    profile.hobbies ||
    profile.interests ||
    profile.email ||
    profile.phone;

  return (
    <>
      {/* Cover + header */}
      <div className="aurora-glass-card rounded-none sm:rounded-2xl border-x-0 sm:border-x border-y sm:border border-border/70 overflow-hidden mb-3 sm:mb-4">
        <PhotoActionMenu
          photoUrl={profile.coverUrl}
          kind="cover"
          canChange={isOwnProfile}
          onView={coverEditor.onView}
          onPickFile={coverEditor.onPickFile}
          onDelete={() => handleDeletePhoto("cover")}
        >
          <div className="h-48 md:h-64 lg:h-72 bg-muted relative">
            {profile.coverUrl ? (
              <img src={profile.coverUrl} className="w-full h-full object-cover" alt="Cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-600/30 via-indigo-500/30 to-pink-500/30" />
            )}
          </div>
        </PhotoActionMenu>
        <div className="px-6 pb-6 pt-2 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              <div className="-mt-16 sm:-mt-20 relative z-10 w-32 sm:w-36 shrink-0 mx-auto sm:mx-0">
                <PhotoActionMenu
                  photoUrl={profile.avatarUrl}
                  kind="avatar"
                  canChange={isOwnProfile}
                  onView={avatarEditor.onView}
                  onPickFile={avatarEditor.onPickFile}
                  onDelete={() => handleDeletePhoto("avatar")}
                >
                  <img
                    src={avatarSrc(profile.avatarUrl)}
                    className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-card object-cover bg-muted shadow-md"
                    alt="Avatar"
                  />
                </PhotoActionMenu>
              </div>
              <div className="text-center sm:text-left pt-1 sm:pt-0 sm:pb-1">
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-foreground tracking-tight">{profile.displayName}</span>
                  {profile.isVerified && <VerifiedBadge className="w-6 h-6" />}
                  {isLocked && (
                    <Lock className="w-5 h-5 text-muted-foreground" aria-label="Locked profile" />
                  )}
                </h1>
                <p className="text-muted-foreground text-sm font-medium">@{profile.username}</p>
                <div className="flex items-center justify-center sm:justify-start gap-3 text-sm text-muted-foreground font-medium mt-1.5">
                  <span><b className="text-foreground">{profile.friendCount || 0}</b> Friends</span>
                  <span>•</span>
                  <span><b className="text-foreground">{profile.followerCount || 0}</b> Followers</span>
                </div>
                {/* Intro / Bio directly under name and counts (max 150 words) */}
                {profile.bio && (
                  <p className="text-[14px] text-foreground font-normal max-w-xl whitespace-pre-wrap leading-relaxed mt-2 text-center sm:text-left">
                    {limitWords(profile.bio, 150)}
                  </p>
                )}
                {hasIntro && (
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 mt-2 text-xs text-muted-foreground">
                    {profile.work && (
                      <span className="flex items-center gap-1.5">
                        <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Works at <b className="font-semibold text-foreground">{profile.work}</b></span>
                      </span>
                    )}
                    {profile.education && (
                      <span className="flex items-center gap-1.5">
                        <GraduationCap className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Studied at <b className="font-semibold text-foreground">{profile.education}</b></span>
                      </span>
                    )}
                    {profile.location && (
                      <span className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Lives in <b className="font-semibold text-foreground">{profile.location}</b></span>
                      </span>
                    )}
                    {profile.hometown && (
                      <span className="flex items-center gap-1.5">
                        <Home className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>From <b className="font-semibold text-foreground">{profile.hometown}</b></span>
                      </span>
                    )}
                    {profile.hobbies && (
                      <span className="flex items-center gap-1.5">
                        <Heart className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>Hobbies: <span className="text-foreground">{profile.hobbies}</span></span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-center sm:justify-end gap-2 pb-1 flex-wrap">{headerActions}</div>
          </div>
        </div>

        {/* Profile Tabs Navigation */}
        <div className="flex items-center gap-2 border-t border-border/60 px-6 pt-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab("posts")}
            className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "posts"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Posts</span>
          </button>
          <button
            onClick={() => setActiveTab("reels")}
            className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "reels"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Reels</span>
            {userReels && userReels.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">
                {userReels.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("photos")}
            className={`px-4 py-3 font-semibold text-sm transition-all border-b-2 flex items-center gap-1.5 ${
              activeTab === "photos"
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <Images className="w-3.5 h-3.5" />
            <span>Photos</span>
          </button>
        </div>
      </div>

      {showLocked ? (
        <div className="aurora-glass-card rounded-2xl p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Lock className="w-7 h-7 text-muted-foreground" />
          </div>
          <h2 className="font-bold text-lg mb-1">This profile is locked</h2>
          <p className="text-muted-foreground text-sm max-w-sm mx-auto">
            Only {profile.displayName}'s friends can see their posts, photos and details.
          </p>
        </div>
      ) : (
      /* Two-column: Main Timeline/Tabs Content (Left/Center) | Intro + Friends + Photos + Reels Sidebar (Right) */
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 items-start">
        {/* Main Content Column (Left/Center) */}
        <div className="lg:col-span-3 space-y-4">
          {/* TAB 1: POSTS & REELS (Unified Profile Timeline) */}
          {activeTab === "posts" && (
            <>
              {isOwnProfile && (
                <PostComposer
                  onPosted={() => {
                    queryClient.invalidateQueries({ queryKey: getGetUserPostsQueryKey(userId) });
                    queryClient.invalidateQueries({ queryKey: ["user-reels", targetUserId] });
                  }}
                />
              )}
              <div className="flex items-center justify-between px-2">
                <h2 className="font-bold text-lg">Timeline</h2>
                {timelineItems.length > 0 && (
                  <span className="text-xs text-muted-foreground font-medium">
                    {timelineItems.length} {timelineItems.length === 1 ? "item" : "items"}
                  </span>
                )}
              </div>
              {postsLoading || reelsLoading ? (
                <div className="py-8 text-center">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                </div>
              ) : timelineItems.length === 0 ? (
                <div className="text-center py-10 aurora-glass-card rounded-none sm:rounded-2xl border-x-0 sm:border-x border-y sm:border border-border/70 text-muted-foreground">
                  {isOwnProfile ? "You haven't posted anything yet." : "No posts yet"}
                </div>
              ) : (
                timelineItems.map((item) =>
                  item.type === "post" ? (
                    <PostCard key={item.id} post={item.post} />
                  ) : (
                    <ProfileReelTimelineCard key={item.id} reel={item.reel} />
                  ),
                )
              )}
            </>
          )}

          {/* TAB 2: REELS */}
          {activeTab === "reels" && (
            <div className="aurora-glass-card rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-xl flex items-center gap-2">
                  <Play className="w-5 h-5 text-primary fill-primary" />
                  <span>Reels</span>
                  {filteredReels && (
                    <span className="text-sm font-normal text-muted-foreground">({filteredReels.length})</span>
                  )}
                </h2>
                {isOwnProfile && (
                  <Link href="/reels">
                    <Button size="sm" className="rounded-xl gap-1.5">
                      <Plus className="w-4 h-4" />
                      <span>Create Reel</span>
                    </Button>
                  </Link>
                )}
              </div>

              {reelsLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
                  <p className="text-sm text-muted-foreground mt-2">Loading reels...</p>
                </div>
              ) : !filteredReels || filteredReels.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Play className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                  <p className="font-medium text-foreground">No reels uploaded yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                    {isOwnProfile
                      ? "Share short, fun videos with your friends and followers."
                      : `${profile.displayName} hasn't uploaded any reels yet.`}
                  </p>
                  {isOwnProfile && (
                    <Link href="/reels">
                      <Button className="rounded-xl mt-4 gap-2">
                        <Plus className="w-4 h-4" /> Create First Reel
                      </Button>
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                  {filteredReels.map((reel) => {
                    const cleanCaption = parseReelOverlays(reel.caption).cleanCaption;
                    return (
                      <Link key={reel.id} href={`/reels?id=${reel.id}`}>
                        <div className="group relative aspect-[9/16] rounded-2xl overflow-hidden bg-black cursor-pointer shadow-md hover:shadow-xl transition-all duration-300">
                          <video
                            src={reel.videoUrl}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            muted
                            preload="metadata"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/20" />

                          {/* Bottom Caption & Stats */}
                          <div className="absolute bottom-3 left-3 right-3 text-white space-y-1">
                            {cleanCaption && (
                              <p className="text-xs line-clamp-2 drop-shadow font-medium">
                                {cleanCaption}
                              </p>
                            )}
                            <div className="flex items-center justify-between text-[11px] text-white/90 pt-1 font-semibold">
                              <span className="flex items-center gap-1">
                                <Heart className="w-3.5 h-3.5 fill-white" />
                                {reel.likeCount ?? 0}
                              </span>
                              <span className="flex items-center gap-1">
                                <MessageCircle className="w-3.5 h-3.5" />
                                {reel.commentCount ?? 0}
                              </span>
                            </div>
                          </div>

                          {/* Center Play Icon on Hover */}
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                            <div className="w-12 h-12 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center text-white shadow-xl">
                              <Play className="w-6 h-6 fill-white ml-0.5" />
                            </div>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PHOTOS */}
          {activeTab === "photos" && (
            <div className="aurora-glass-card rounded-2xl p-5 space-y-6">
              <h2 className="font-bold text-xl flex items-center gap-2">
                <Images className="w-5 h-5 text-primary" />
                <span>Photos & Albums</span>
              </h2>

              {photoUrls.length > 0 ? (
                <div>
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">All Photos</h3>
                  <div className="grid grid-cols-3 gap-2.5">
                    {photoUrls.map((url, i) => (
                      <button
                        key={i}
                        onClick={() => setPhotoOpen(i)}
                        className="aspect-square rounded-xl overflow-hidden bg-muted group cursor-pointer"
                      >
                        <img
                          src={url}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          alt="Photo"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No photos uploaded yet.</p>
              )}

              {albums && albums.length > 0 && (
                <div className="pt-4 border-t border-border">
                  <h3 className="font-semibold text-sm text-muted-foreground mb-3">Albums</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {albums.map((a) => (
                      <Link key={a.id} href={`/albums/${a.id}`}>
                        <div className="cursor-pointer group">
                          {a.coverUrl ? (
                            <img
                              src={a.coverUrl}
                              className="w-full aspect-square rounded-xl object-cover bg-muted group-hover:opacity-90 transition-opacity"
                              alt={a.name}
                            />
                          ) : (
                            <div className="w-full aspect-square rounded-xl bg-muted flex items-center justify-center">
                              <Images className="w-8 h-8 text-muted-foreground" />
                            </div>
                          )}
                          <p className="text-sm font-medium mt-1 truncate group-hover:underline">
                            {a.name}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {a.photoCount} photo{a.photoCount === 1 ? "" : "s"}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Secondary Sidebar Column (Right) */}
        <div className="lg:col-span-2 space-y-4">

          {/* Friends */}
          <div className="aurora-glass-card rounded-none sm:rounded-2xl border-x-0 sm:border-x border-y sm:border border-border/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Friends</h2>
              <Link href="/friends">
                <span className="text-primary text-sm hover:underline cursor-pointer">See all friends</span>
              </Link>
            </div>
            {profile.friendCount != null && (
              <p className="text-muted-foreground text-sm mb-3">{profile.friendCount} friends</p>
            )}
            {friends && friends.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {friends.slice(0, 9).map((f) => (
                  <Link key={f.id} href={`/${f.username || f.id}`}>
                    <div className="cursor-pointer">
                      <img
                        src={avatarSrc(f.avatarUrl)}
                        className="w-full aspect-square rounded-lg object-cover bg-muted"
                        alt={f.displayName}
                      />
                      <p className="text-xs font-medium mt-1 truncate">{f.displayName}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No friends to show yet.</p>
            )}
          </div>

          {/* Circles / Groups */}
          {isOwnProfile && (
            <div className="aurora-glass-card rounded-none sm:rounded-2xl border-x-0 sm:border-x border-y sm:border border-border/70 p-4">
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-lg">Circles</h2>
                <Link href="/groups?create=1">
                  <span className="text-primary text-sm hover:underline cursor-pointer">Create circle</span>
                </Link>
              </div>
              <p className="text-muted-foreground text-sm mt-2">
                Start a circle to connect with people who share your interests.
              </p>
            </div>
          )}

          {/* Reels Sidebar Widget */}
          <div className="aurora-glass-card rounded-none sm:rounded-2xl border-x-0 sm:border-x border-y sm:border border-border/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Play className="w-4 h-4 text-primary fill-primary" />
                <h2 className="font-bold text-lg">Reels</h2>
              </div>
              {filteredReels && filteredReels.length > 0 && (
                <button
                  onClick={() => setActiveTab("reels")}
                  className="text-primary text-sm hover:underline font-medium"
                >
                  See all ({filteredReels.length})
                </button>
              )}
            </div>
            {reelsLoading ? (
              <div className="py-4 text-center">
                <Loader2 className="w-5 h-5 animate-spin mx-auto text-primary" />
              </div>
            ) : filteredReels && filteredReels.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {filteredReels.slice(0, 6).map((r) => (
                  <Link key={r.id} href={`/reels?id=${r.id}`}>
                    <div className="aspect-[9/16] rounded-xl overflow-hidden relative bg-black group cursor-pointer shadow-sm hover:shadow-md transition-all">
                      <video
                        src={r.videoUrl}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        muted
                        preload="metadata"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                      <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1 text-[11px] font-bold text-white drop-shadow">
                        <Play className="w-3 h-3 fill-white" />
                        <span>{r.likeCount ?? 0}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {isOwnProfile ? "No reels yet. Share short videos with your followers!" : "No reels yet."}
              </p>
            )}
          </div>

          {/* Photos Sidebar */}
          <div className="aurora-glass-card rounded-none sm:rounded-2xl border-x-0 sm:border-x border-y sm:border border-border/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Photos</h2>
              {photoUrls.length > 0 && (
                <button
                  onClick={() => setActiveTab("photos")}
                  className="text-primary text-sm hover:underline font-medium"
                >
                  See all
                </button>
              )}
            </div>
            {photoUrls.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {photoUrls.slice(0, 9).map((url, i) => (
                  <button key={i} onClick={() => setPhotoOpen(i)}>
                    <img
                      src={url}
                      className="w-full aspect-square rounded-lg object-cover bg-muted hover:opacity-90 transition-opacity"
                      alt="Photo"
                    />
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No photos yet.</p>
            )}
            {photoOpen != null && (
              <MediaLightbox
                items={photoUrls.map((url) => ({ url, type: "image" }))}
                index={photoOpen}
                onClose={() => setPhotoOpen(null)}
                onIndexChange={setPhotoOpen}
              />
            )}
          </div>

          {/* Albums Sidebar */}
          <div className="aurora-glass-card rounded-none sm:rounded-2xl border-x-0 sm:border-x border-y sm:border border-border/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-bold text-lg">Albums</h2>
              {isOwnProfile && (
                <button
                  onClick={() => setCreateAlbumOpen(true)}
                  className="text-primary text-sm hover:underline font-medium"
                >
                  Create album
                </button>
              )}
            </div>
            {albums && albums.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {albums.map((a) => (
                  <Link key={a.id} href={`/albums/${a.id}`}>
                    <div className="cursor-pointer group">
                      {a.coverUrl ? (
                        <img
                          src={a.coverUrl}
                          className="w-full aspect-square rounded-lg object-cover bg-muted group-hover:opacity-90 transition-opacity"
                          alt={a.name}
                        />
                      ) : (
                        <div className="w-full aspect-square rounded-lg bg-muted flex items-center justify-center">
                          <Images className="w-8 h-8 text-muted-foreground" />
                        </div>
                      )}
                      <p className="text-sm font-medium mt-1 truncate group-hover:underline">
                        {a.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {a.photoCount} photo{a.photoCount === 1 ? "" : "s"}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                {isOwnProfile
                  ? "Create your first album to organize photos."
                  : "No albums yet."}
              </p>
            )}
          </div>
          {isOwnProfile && (
            <CreateAlbumDialog
              open={createAlbumOpen}
              onOpenChange={setCreateAlbumOpen}
              userId={userId}
            />
          )}
        </div>
      </div>
      )}
      {avatarEditor.dialogs}
      {coverEditor.dialogs}
    </>
  );
}
