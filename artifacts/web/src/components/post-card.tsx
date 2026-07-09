import { useEffect, useState } from "react";
import { avatarSrc } from "@/lib/avatar";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { VerifiedBadge } from "@/components/verified-badge";
import { MediaGrid } from "@/components/media-grid";
import { RenderWithMentions } from "@/components/mention";
import {
  MessageCircle,
  Share2,
  Loader2,
  Bookmark,
  MoreHorizontal,
  Pencil,
  Trash2,
  Globe,
  Users,
  Lock,
  MapPin,
  Rocket,
} from "lucide-react";
import { BoostDialog } from "@/components/boost-dialog";
import {
  Post,
  useSetPostReaction,
  useRemovePostReaction,
  useSharePost,
  useSaveItem,
  useUnsaveItem,
  useUpdatePost,
  useDeletePost,
  useVotePoll,
  useRemovePollVote,
  ReactionType,
  PostUpdatePrivacy,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { useQueryClient } from "@tanstack/react-query";
import { getGetFeedQueryKey, getGetPostQueryKey, getGetUserPostsQueryKey, getListSavedItemsQueryKey } from "@workspace/api-client-react";
import { ReactionControl, reactionConfig } from "@/components/reaction-picker";
import { useAuth } from "@/lib/auth";

const privacyMeta: Record<string, { icon: typeof Globe; label: string }> = {
  public: { icon: Globe, label: "Public" },
  friends: { icon: Users, label: "Friends" },
  private: { icon: Lock, label: "Only me" },
};

export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const setReaction = useSetPostReaction();
  const removeReaction = useRemovePostReaction();
  const sharePost = useSharePost();
  const saveItem = useSaveItem();
  const unsaveItem = useUnsaveItem();
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();
  const votePoll = useVotePoll();
  const removePollVote = useRemovePollVote();
  const [showShare, setShowShare] = useState(false);
  const [shareCaption, setShareCaption] = useState("");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [showBoost, setShowBoost] = useState(false);
  // Optimistic reaction state — updates instantly on tap, server sync follows.
  const [summary, setSummary] = useState(post.reactions);
  useEffect(() => {
    setSummary(post.reactions);
  }, [post.reactions]);

  const isOwner = !!user && user.id === post.author.id;
  const canBoost = isOwner && post.privacy === "public";

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(post.id) });
    queryClient.invalidateQueries({ queryKey: getGetUserPostsQueryKey(post.author.id) });
  };

  const invalidateSaved = () => {
    invalidate();
    queryClient.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
  };

  const toggleSave = () => {
    if (post.viewerHasSaved) {
      unsaveItem.mutate(
        { entityType: "post", entityId: post.id },
        { onSuccess: invalidateSaved },
      );
    } else {
      saveItem.mutate(
        { data: { entityType: "post", entityId: post.id } },
        { onSuccess: invalidateSaved },
      );
    }
  };

  const savePending = saveItem.isPending || unsaveItem.isPending;

  const handleReaction = (type: ReactionType) => {
    const prev = summary.viewerReaction as ReactionType | null | undefined;
    if (prev === type) {
      // Optimistically remove the reaction right away.
      setSummary((s) => {
        const byType = { ...s.byType };
        if (byType[type] !== undefined) {
          byType[type] = Math.max(0, (byType[type] ?? 1) - 1);
          if (byType[type] === 0) delete byType[type];
        }
        return { ...s, total: Math.max(0, s.total - 1), byType, viewerReaction: null };
      });
      removeReaction.mutate({ id: post.id }, { onSettled: invalidate });
    } else {
      // Optimistically set/switch the reaction right away.
      setSummary((s) => {
        const byType = { ...s.byType };
        if (prev && byType[prev] !== undefined) {
          byType[prev] = Math.max(0, (byType[prev] ?? 1) - 1);
          if (byType[prev] === 0) delete byType[prev];
        }
        byType[type] = (byType[type] ?? 0) + 1;
        return {
          ...s,
          total: prev ? s.total : s.total + 1,
          byType,
          viewerReaction: type,
        };
      });
      setReaction.mutate({ id: post.id, data: { type } }, { onSettled: invalidate });
    }
  };

  const handleShare = () => {
    sharePost.mutate(
      { id: post.id, data: { caption: shareCaption.trim() || undefined } },
      {
        onSuccess: () => {
          setShowShare(false);
          setShareCaption("");
          invalidate();
        },
      },
    );
  };

  const saveCaption = () => {
    updatePost.mutate(
      { id: post.id, data: { content: draft } },
      {
        onSuccess: () => {
          setEditing(false);
          invalidate();
        },
      },
    );
  };

  const setPrivacy = (value: string) => {
    updatePost.mutate(
      { id: post.id, data: { privacy: value as PostUpdatePrivacy } },
      { onSuccess: invalidate },
    );
  };

  const toggleComments = () => {
    updatePost.mutate(
      { id: post.id, data: { commentsEnabled: !post.commentsEnabled } },
      { onSuccess: invalidate },
    );
  };

  const toggleReactions = () => {
    updatePost.mutate(
      { id: post.id, data: { reactionsEnabled: !post.reactionsEnabled } },
      { onSuccess: invalidate },
    );
  };

  const handleDelete = () => {
    deletePost.mutate({ id: post.id }, { onSuccess: invalidate });
  };

  const handleVote = (optionId: number) => {
    if (votePoll.isPending || removePollVote.isPending) return;
    if (post.poll?.viewerVotedOptionId === optionId) {
      removePollVote.mutate({ id: post.id }, { onSuccess: invalidate });
    } else {
      votePoll.mutate(
        { id: post.id, data: { optionId } },
        { onSuccess: invalidate },
      );
    }
  };

  const viewerReaction = summary.viewerReaction as ReactionType | null | undefined;
  const meta = privacyMeta[post.privacy] ?? privacyMeta.public;
  const PrivacyIcon = meta.icon;

  return (
    <div className="aurora-glass-card rounded-2xl p-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <Link href={`/profile/${post.author.id}`} className="flex items-center gap-3 group">
          <img src={avatarSrc(post.author.avatarUrl)} className="w-10 h-10 rounded-full object-cover group-hover:ring-2 ring-primary transition-all" alt="" />
          <div>
            <div className="font-semibold">
              <span className="group-hover:underline">{post.author.displayName}</span>
              {post.author.isVerified && <VerifiedBadge className="w-4 h-4 ml-1 align-text-bottom" />}
              {(post.feelingVerb || post.feeling || post.location) && (
                <span className="font-normal text-muted-foreground">
                  {(post.feelingVerb || post.feeling) && (
                    <>
                      {" is "}
                      {post.feelingEmoji ? `${post.feelingEmoji} ` : ""}
                      {[post.feelingVerb, post.feeling].filter(Boolean).join(" ")}
                    </>
                  )}
                  {post.location && (
                    <>
                      {" "}
                      <MapPin className="inline w-3.5 h-3.5 -mt-0.5 text-red-500" />
                      {" at "}
                      <span className="text-foreground/80">{post.location}</span>
                    </>
                  )}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
              <span>·</span>
              <span
                className="flex items-center gap-1"
                title={isOwner ? `Audience: ${meta.label}` : meta.label}
                aria-label={isOwner ? `Audience: ${meta.label}` : meta.label}
              >
                <PrivacyIcon className="w-3 h-3" />
                {isOwner && <span>{meta.label}</span>}
              </span>
            </div>
          </div>
        </Link>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSave}
            disabled={savePending}
            aria-label={post.viewerHasSaved ? "Unsave post" : "Save post"}
            title={post.viewerHasSaved ? "Saved — click to unsave" : "Save post"}
            className={`rounded-full hover:text-foreground ${post.viewerHasSaved ? "text-primary" : "text-muted-foreground"}`}
          >
            {savePending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Bookmark className="w-5 h-5" fill={post.viewerHasSaved ? "currentColor" : "none"} />
            )}
          </Button>

          {isOwner && (
            <AlertDialog>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Post options"
                    title="Manage post"
                    className="rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <MoreHorizontal className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem
                    onSelect={() => {
                      setDraft(post.content);
                      setEditing(true);
                    }}
                  >
                    <Pencil className="w-4 h-4" />
                    Edit caption
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={toggleComments}>
                    <MessageCircle className="w-4 h-4" />
                    {post.commentsEnabled ? "Turn off comments" : "Turn on comments"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={toggleReactions}>
                    <Bookmark className="w-4 h-4" />
                    {post.reactionsEnabled ? "Turn off likes" : "Turn on likes"}
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <PrivacyIcon className="w-4 h-4" />
                      Who can see this
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                      <DropdownMenuLabel>Visibility</DropdownMenuLabel>
                      <DropdownMenuRadioGroup value={post.privacy} onValueChange={setPrivacy}>
                        <DropdownMenuRadioItem value="public">
                          <Globe className="w-4 h-4" /> Public
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="friends">
                          <Users className="w-4 h-4" /> Friends
                        </DropdownMenuRadioItem>
                        <DropdownMenuRadioItem value="private">
                          <Lock className="w-4 h-4" /> Only me
                        </DropdownMenuRadioItem>
                      </DropdownMenuRadioGroup>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>
                  {canBoost && (
                    <DropdownMenuItem onSelect={() => setShowBoost(true)}>
                      <Rocket className="w-4 h-4" />
                      Boost post
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={(e) => e.preventDefault()}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete post
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                </DropdownMenuContent>
              </DropdownMenu>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This can't be undone. The post will be removed from your feed and profile.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDelete}
                    className="bg-destructive text-white hover:bg-destructive/90"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {editing ? (
        <div className="mb-3 space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full bg-muted/50 rounded-lg px-3 py-2 text-[15px] resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancel</Button>
            <Button size="sm" disabled={updatePost.isPending} onClick={saveCaption} className="rounded-lg">
              {updatePost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        post.content && (
          <p className="text-[15px] whitespace-pre-wrap mb-3">
            <RenderWithMentions content={post.content} />
          </p>
        )
      )}

      {post.poll && (
        <div className="mb-3 rounded-xl border border-border bg-muted/20 p-3">
          {post.poll.question && (
            <p className="font-semibold text-[15px] mb-2">{post.poll.question}</p>
          )}
          <div className="space-y-2">
            {post.poll.options.map((opt) => {
              const total = post.poll!.totalVotes;
              const pct = total > 0 ? Math.round((opt.voteCount / total) * 100) : 0;
              const voted = post.poll!.viewerVotedOptionId === opt.id;
              const hasVoted = post.poll!.viewerVotedOptionId != null;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleVote(opt.id)}
                  disabled={votePoll.isPending || removePollVote.isPending}
                  className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-colors ${
                    voted
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/50"
                  }`}
                  title={voted ? "Click to remove your vote" : "Vote"}
                >
                  {hasVoted && (
                    <span
                      className={`absolute inset-y-0 left-0 ${voted ? "bg-primary/20" : "bg-muted"}`}
                      style={{ width: `${pct}%` }}
                      aria-hidden
                    />
                  )}
                  <span className="relative flex items-center justify-between gap-2">
                    <span className={`flex items-center gap-1.5 ${voted ? "font-semibold" : ""}`}>
                      {voted && <span className="text-primary">✓</span>}
                      {opt.text}
                    </span>
                    {hasVoted && (
                      <span className="text-muted-foreground tabular-nums">
                        {pct}%
                      </span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {post.poll.totalVotes}{" "}
            {post.poll.totalVotes === 1 ? "vote" : "votes"}
            {post.poll.viewerVotedOptionId != null && " · tap your choice to remove"}
          </p>
        </div>
      )}

      {post.media && post.media.length > 0 && <MediaGrid media={post.media} />}

      <div className="flex justify-between items-center text-sm text-muted-foreground py-2 border-b border-border mb-1">
        <div className="flex items-center gap-1">
          {post.reactionsEnabled && summary.total > 0 && (
            <>
              <div className="flex -space-x-1">
                {Object.keys(summary.byType).slice(0, 3).map((type) => {
                  const rType = type as ReactionType;
                  return (
                    <div key={type} className="w-5 h-5 rounded-full flex items-center justify-center bg-background border border-border text-[11px] leading-none">
                      {reactionConfig[rType]?.emoji}
                    </div>
                  );
                })}
              </div>
              <span className="ml-1">{summary.total}</span>
            </>
          )}
        </div>
        <div className="flex gap-3">
          {post.commentsEnabled && post.commentCount > 0 && <Link href={`/post/${post.id}`} className="hover:underline">{post.commentCount} comments</Link>}
          {post.shareCount > 0 && <span>{post.shareCount} shares</span>}
        </div>
      </div>

      <div className="flex gap-1 relative">
        {post.reactionsEnabled && (
          <div className="flex-1 flex justify-center items-center hover:bg-muted/60 rounded-lg py-2 press transition-colors">
            <ReactionControl viewerReaction={viewerReaction} onReact={handleReaction} />
          </div>
        )}

        {post.commentsEnabled && (
          <Link href={`/post/${post.id}`} className="flex-1">
            <Button variant="ghost" className="w-full text-muted-foreground hover:bg-muted/60 rounded-lg flex items-center gap-2 press">
              <MessageCircle className="w-5 h-5" />
              <span className="font-semibold">Comment</span>
            </Button>
          </Link>
        )}
        <Button
          variant="ghost"
          className="flex-1 text-muted-foreground hover:bg-muted/60 rounded-lg flex items-center gap-2 press"
          onClick={() => setShowShare((s) => !s)}
        >
          <Share2 className="w-5 h-5" />
          <span className="font-semibold">Share</span>
        </Button>
      </div>

      {canBoost && (
        <BoostDialog type="post" id={post.id} open={showBoost} onOpenChange={setShowBoost} />
      )}

      {showShare && (
        <div className="mt-3 pt-3 border-t border-border space-y-2 animate-in fade-in slide-in-from-top-1">
          <textarea
            value={shareCaption}
            onChange={(e) => setShareCaption(e.target.value)}
            placeholder="Say something about this..."
            rows={2}
            className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setShowShare(false)}>Cancel</Button>
            <Button size="sm" disabled={sharePost.isPending} onClick={handleShare} className="rounded-lg">
              {sharePost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share now"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
