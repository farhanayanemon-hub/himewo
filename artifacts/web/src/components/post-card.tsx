import { useEffect, useMemo, useState } from "react";
import { avatarSrc } from "@/lib/avatar";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { getAuthorProfileUrl } from "@/lib/user-link";
import { VerifiedBadge } from "@/components/verified-badge";
import { MediaGrid } from "@/components/media-grid";
import { RenderWithMentions } from "@/components/mention";
import { EmojiPickerButton } from "@/components/emoji-picker";
import {
  MessageCircle,
  Share2,
  Send,
  Loader2,
  Bookmark,
  MoreHorizontal,
  MoreVertical,
  Heart,
  Pencil,
  Trash2,
  Globe,
  Users,
  Lock,
  MapPin,
  Rocket,
  Plus,
  Check,
  X,
  Link2,
  ExternalLink,
} from "lucide-react";
import { BoostDialog } from "@/components/boost-dialog";
import { PostComments } from "@/components/post-comments";
import {
  Post,
  useSetPostReaction,
  useRemovePostReaction,
  useCreateComment,
  useSharePost,
  useListConversations,
  useListFriends,
  useSendMessage,
  useCreateConversation,
  useSaveItem,
  useUnsaveItem,
  useUpdatePost,
  useDeletePost,
  useVotePoll,
  useRemovePollVote,
  useFollowUser,
  useUnfollowUser,
  useFollowPage,
  useUnfollowPage,
  ReactionType,
  PostUpdatePrivacy,
  ConversationInputType,
  MessageInputType,
  getListCommentsQueryKey,
  getListConversationsQueryKey,
  type Conversation,
  type Profile,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { syncUserFollowState, syncPageFollowState } from "@/lib/follow-sync";
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
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";

const privacyMeta: Record<string, { icon: typeof Globe; label: string }> = {
  public: { icon: Globe, label: "Public" },
  friends: { icon: Users, label: "Friends" },
  private: { icon: Lock, label: "Only me" },
};

function formatCount(n: number = 0): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "m";
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

export function PostCard({
  post,
  hideFollowButton = false,
}: {
  post: Post;
  hideFollowButton?: boolean;
}) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { actingPage } = useActingPage();
  const actingPageId = actingPage?.id;
  const setReaction = useSetPostReaction();
  const removeReaction = useRemovePostReaction();
  const createQuickComment = useCreateComment();
  const sharePost = useSharePost();
  const sendMessage = useSendMessage();
  const createConversation = useCreateConversation();
  const saveItem = useSaveItem();
  const unsaveItem = useUnsaveItem();
  const updatePost = useUpdatePost();
  const deletePost = useDeletePost();
  const votePoll = useVotePoll();
  const removePollVote = useRemovePollVote();
  const [showShare, setShowShare] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showQuickCommentInput, setShowQuickCommentInput] = useState(false);
  const [quickCommentText, setQuickCommentText] = useState("");
  const [localAddedComments, setLocalAddedComments] = useState(0);
  const [shareCaption, setShareCaption] = useState("");
  const [sentTargetKeys, setSentTargetKeys] = useState<Record<string, boolean>>({});
  const [sendingTargetKey, setSendingTargetKey] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(post.content);
  const [showBoost, setShowBoost] = useState(false);

  const { data: convData } = useListConversations({
    query: { enabled: showShare, queryKey: getListConversationsQueryKey() },
  });
  const { data: friendsData } = useListFriends({
    query: { enabled: showShare, queryKey: ["/api/friends"] },
  });

  const shareTargets = useMemo(() => {
    const list: {
      key: string;
      name: string;
      avatarUrl?: string | null;
      conversationId?: number;
      userId?: string;
    }[] = [];
    const seen = new Set<string>();
    const convs = ((convData ?? []) as Conversation[]).slice(0, 12);
    for (const conv of convs) {
      if (conv.type === "group") {
        list.push({
          key: `conv-${conv.id}`,
          name: conv.title || "Group",
          avatarUrl: conv.avatarUrl,
          conversationId: conv.id,
        });
      } else {
        const peer = conv.members.find((m) => m.user.id !== user?.id)?.user;
        if (peer && !seen.has(peer.id)) {
          seen.add(peer.id);
          list.push({
            key: `user-${peer.id}`,
            name: peer.displayName,
            avatarUrl: peer.avatarUrl,
            conversationId: conv.id,
            userId: peer.id,
          });
        }
      }
    }
    const friends = (friendsData ?? []) as Profile[];
    for (const f of friends) {
      if (!seen.has(f.id) && list.length < 15) {
        seen.add(f.id);
        list.push({
          key: `user-${f.id}`,
          name: f.displayName,
          avatarUrl: f.avatarUrl,
          userId: f.id,
        });
      }
    }
    return list;
  }, [convData, friendsData, user?.id]);

  // Optimistic reaction state — updates instantly on tap, server sync follows.
  const [summary, setSummary] = useState(post.reactions);
  useEffect(() => {
    setSummary(post.reactions);
  }, [post.reactions]);

  const isPage = Boolean(post.authorPage);
  const isOwner = actingPageId != null
    ? (isPage && post.authorPage?.id === actingPageId)
    : (!isPage && !!user && user.id === post.author.id);
  const initialFollowing = isPage
    ? Boolean((post.authorPage as any)?.viewerFollows)
    : Boolean(post.author.viewerFollows);
  const [following, setFollowing] = useState(initialFollowing);

  useEffect(() => {
    setFollowing(
      isPage
        ? Boolean((post.authorPage as any)?.viewerFollows)
        : Boolean(post.author.viewerFollows)
    );
  }, [post.authorPage, post.author.viewerFollows, isPage]);

  // Instantly reflect follow/unfollow events triggered by any other post or header on the page
  useEffect(() => {
    const handleFollowSync = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      if (!isPage && (detail.targetId === post.author.id || (post.author.username && detail.targetId === post.author.username))) {
        setFollowing(detail.isFollowing);
      } else if (isPage && post.authorPage && detail.targetId === post.authorPage.id) {
        setFollowing(detail.isFollowing);
      }
    };
    window.addEventListener("himewo:follow-sync", handleFollowSync);
    return () => window.removeEventListener("himewo:follow-sync", handleFollowSync);
  }, [post.author.id, post.author.username, post.authorPage, isPage]);

  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const followPage = useFollowPage();
  const unfollowPage = useUnfollowPage();

  const handleToggleFollow = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || isOwner) return;

    if (isPage && post.authorPage) {
      const pageId = post.authorPage.id;
      if (following) {
        setFollowing(false);
        syncPageFollowState(queryClient, pageId, false);
        unfollowPage.mutate(
          { id: pageId },
          {
            onError: () => {
              setFollowing(true);
              syncPageFollowState(queryClient, pageId, true);
            },
          },
        );
      } else {
        setFollowing(true);
        syncPageFollowState(queryClient, pageId, true);
        followPage.mutate(
          { id: pageId },
          {
            onError: () => {
              setFollowing(false);
              syncPageFollowState(queryClient, pageId, false);
            },
          },
        );
      }
    } else {
      const authorId = post.author.id;
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
    }
  };

  const canBoost = isOwner && post.privacy === "public" && post.pageId != null;

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

  const handleLoveToggle = () => {
    if (viewerReaction) {
      setSummary((s) => ({
        ...s,
        total: Math.max(0, s.total - 1),
        viewerReaction: null,
      }));
      removeReaction.mutate({ id: post.id }, { onSettled: invalidate });
    } else {
      setSummary((s) => ({
        ...s,
        total: s.total + 1,
        viewerReaction: ReactionType.love,
      }));
      setReaction.mutate(
        { id: post.id, data: { type: ReactionType.love, pageId: actingPageId } },
        { onSettled: invalidate },
      );
    }
  };

  const postUrl = `${typeof window !== "undefined" ? window.location.origin : "https://app.himewo.com"}/post/${post.id}`;

  const submitQuickComment = (e: React.FormEvent) => {
    e.preventDefault();
    const content = quickCommentText.trim();
    if (!content || createQuickComment.isPending) return;
    createQuickComment.mutate(
      {
        id: post.id,
        data: {
          content,
          ...(actingPage ? { pageId: actingPage.id } : {}),
        },
      },
      {
        onSuccess: () => {
          setQuickCommentText("");
          setShowQuickCommentInput(false);
          setLocalAddedComments((n) => n + 1);
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(post.id) });
          invalidate();
        },
      },
    );
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

  const handleSendShareToTarget = async (target: {
    key: string;
    name: string;
    conversationId?: number;
    userId?: string;
  }) => {
    if (sentTargetKeys[target.key] || sendingTargetKey === target.key) return;
    setSendingTargetKey(target.key);
    try {
      let convId = target.conversationId;
      if (!convId && target.userId) {
        const created = await createConversation.mutateAsync({
          data: { type: ConversationInputType.direct, memberIds: [target.userId] },
        });
        convId = created.id;
      }
      if (!convId) return;
      const msgContent = shareCaption.trim()
        ? `${shareCaption.trim()}\n${postUrl}`
        : `Check out this post on Himewo: ${postUrl}`;
      await sendMessage.mutateAsync({
        id: convId,
        data: { content: msgContent, type: MessageInputType.text },
      });
      setSentTargetKeys((prev) => ({ ...prev, [target.key]: true }));
      queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
    } finally {
      setSendingTargetKey(null);
    }
  };

  const handleExternalShare = async (platform: "copy" | "whatsapp" | "messenger" | "facebook" | "instagram") => {
    const shareText = shareCaption.trim() ? `${shareCaption.trim()} ${postUrl}` : postUrl;
    const encodedUrl = encodeURIComponent(postUrl);
    const encodedText = encodeURIComponent(shareText);

    if (platform === "copy") {
      await navigator.clipboard?.writeText(postUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
      return;
    }
    if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodedText}`, "_blank", "noopener,noreferrer");
      return;
    }
    if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, "_blank", "noopener,noreferrer");
      return;
    }
    if (platform === "messenger") {
      window.open(`https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=291494419107518&redirect_uri=${encodedUrl}`, "_blank", "noopener,noreferrer");
      return;
    }
    if (platform === "instagram") {
      await navigator.clipboard?.writeText(postUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
      window.open("https://www.instagram.com/", "_blank", "noopener,noreferrer");
    }
  };

  const handleDesktopProfileClick = (e: React.MouseEvent) => {
    if (typeof window !== "undefined" && window.innerWidth >= 768) {
      e.preventDefault();
      setShowProfileModal(true);
    }
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
    <div className="aurora-glass-card rounded-2xl sm:rounded-[28px] border border-border/70 p-3.5 sm:p-4 mb-4 shadow-[0_4px_20px_rgba(0,0,0,0.03)] animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <Link
            href={getAuthorProfileUrl(post.author, post.authorPage)}
            onClick={handleDesktopProfileClick}
            className="shrink-0 group relative"
          >
            <img
              src={avatarSrc(post.authorPage ? post.authorPage.avatarUrl : post.author.avatarUrl)}
              className="w-10 h-10 rounded-full object-cover group-hover:ring-2 ring-primary group-hover:scale-105 transition-all duration-200"
              alt=""
            />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <Link
                href={getAuthorProfileUrl(post.author, post.authorPage)}
                onClick={handleDesktopProfileClick}
                className="font-semibold hover:text-primary hover:underline transition-colors"
              >
                {post.authorPage ? post.authorPage.name : post.author.displayName}
              </Link>
              {!post.authorPage && post.author.isVerified && <VerifiedBadge className="w-4 h-4 ml-0.5 align-text-bottom" />}
              {!isOwner && user && !hideFollowButton && (
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
              {(post.feelingVerb || post.feeling || post.location) && (
                <span className="font-normal text-muted-foreground text-sm">
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
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSave}
            disabled={savePending}
            aria-label={post.viewerHasSaved ? "Unsave post" : "Save post"}
            title={post.viewerHasSaved ? "Saved — click to unsave" : "Save post"}
            className={`rounded-full transition-colors ${
              post.viewerHasSaved
                ? "text-primary hover:text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {savePending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Bookmark
                className={`w-5 h-5 transition-transform duration-200 ${
                  post.viewerHasSaved ? "fill-primary text-primary scale-105" : ""
                }`}
                fill={post.viewerHasSaved ? "currentColor" : "none"}
              />
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

      {post.media && post.media.length > 0 && <MediaGrid media={post.media} post={post} />}

      {/* Clean Dribbble Action Bar (matching Mobile App) */}
      <div className="flex items-center justify-between pt-3 mt-1 border-t border-border/60">
        {/* Left Metrics: ♡ 2.1k   💬 2.1k   ↗ Share */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleLoveToggle}
            className={`flex items-center gap-1.5 transition-transform active:scale-90 cursor-pointer ${
              viewerReaction ? "text-red-500" : "text-muted-foreground hover:text-foreground"
            }`}
            title={viewerReaction ? "Unlike" : "Love"}
          >
            <Heart
              className={`w-5 h-5 transition-colors ${
                viewerReaction ? "fill-red-500 text-red-500" : ""
              }`}
            />
            <span className="font-bold text-xs">{formatCount(summary.total || 0)}</span>
          </button>

          {post.commentsEnabled && (
            <button
              type="button"
              onClick={() => {
                setShowQuickCommentInput(false);
                setShowComments((v) => !v);
              }}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-transform active:scale-90 cursor-pointer"
              title="View all comments"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="font-bold text-xs">
                {formatCount((post.commentCount || 0) + localAddedComments)}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowShare(true)}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-transform active:scale-90 cursor-pointer"
            title="Share"
          >
            <Share2 className="w-4 h-4" />
            {post.shareCount > 0 && (
              <span className="font-bold text-xs">{formatCount(post.shareCount)}</span>
            )}
          </button>
        </div>

        {/* Right Actions: Comments here... pill input & 3-dots */}
        <div className="flex items-center gap-2">
          {post.commentsEnabled && (
            <button
              type="button"
              onClick={() => {
                setShowComments(false);
                setShowQuickCommentInput((v) => !v);
              }}
              className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all flex items-center gap-1.5 cursor-pointer active:scale-95 shadow-xs ${
                showQuickCommentInput
                  ? "bg-primary/15 text-primary border-primary/40"
                  : "bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground border-border/60"
              }`}
            >
              <span>Comments here...</span>
            </button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Post options"
                title="Post options"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
              >
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={toggleSave}>
                <Bookmark className="w-4 h-4 mr-2" />
                <span>{post.viewerHasSaved ? "Unsave post" : "Save post"}</span>
              </DropdownMenuItem>

              {isOwner && (
                <>
                  <DropdownMenuItem onClick={() => setEditing(true)}>
                    <Pencil className="w-4 h-4 mr-2" />
                    <span>Edit caption</span>
                  </DropdownMenuItem>
                  {canBoost && (
                    <DropdownMenuItem onClick={() => setShowBoost(true)}>
                      <Rocket className="w-4 h-4 mr-2" />
                      <span>Boost post</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      if (window.confirm("Delete this post? This cannot be undone.")) {
                        deletePost.mutate({ id: post.id }, { onSuccess: invalidate });
                      }
                    }}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    <span>Delete post</span>
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Inline Quick Comment Typing Box ONLY (when "Comments here..." is clicked — hides full comment list) */}
      {showQuickCommentInput && post.commentsEnabled && (
        <form
          onSubmit={submitQuickComment}
          className="mt-3 pt-3 border-t border-border/60 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <img
            src={avatarSrc(actingPage ? actingPage.avatarUrl : user?.avatarUrl)}
            className="w-8 h-8 rounded-full object-cover bg-muted shrink-0"
            alt=""
          />
          <div className="flex-1 flex items-center bg-muted/60 rounded-full border border-primary/30 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 px-3.5 py-1 transition-all">
            <input
              type="text"
              autoFocus
              value={quickCommentText}
              onChange={(e) => setQuickCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 bg-transparent border-none focus:outline-none text-sm py-1.5"
            />
            <EmojiPickerButton onSelect={(emoji) => setQuickCommentText((prev) => prev + emoji)} />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!quickCommentText.trim() || createQuickComment.isPending}
            className="rounded-full h-9 w-9 shrink-0 shadow-xs"
          >
            {createQuickComment.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      )}

      {/* Full Sorted Comments Drawer (when comment icon/count is clicked) */}
      {showComments && post.commentsEnabled && (
        <div className="mt-3 pt-3 border-t border-border/60 animate-in fade-in slide-in-from-top-1 duration-200">
          <PostComments
            postId={post.id}
            commentsEnabled={post.commentsEnabled}
            onChanged={invalidate}
          />
        </div>
      )}

      {canBoost && (
        <BoostDialog type="post" id={post.id} open={showBoost} onOpenChange={setShowBoost} />
      )}

      {/* Animated 3-Tier Share Modal */}
      {showShare && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowShare(false)}
        >
          <div
            className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-md p-5 space-y-5 animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                  <Share2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-lg text-foreground">Share Post</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full h-8 w-8 text-muted-foreground"
                onClick={() => setShowShare(false)}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Tier 1: Write Caption & Post Now */}
            <div className="bg-muted/40 border border-border/80 rounded-2xl p-3.5 space-y-2.5">
              <textarea
                value={shareCaption}
                onChange={(e) => setShareCaption(e.target.value)}
                placeholder="Write a caption for your post..."
                rows={2}
                autoFocus
                className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-muted-foreground"
              />
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <span className="text-[11px] text-muted-foreground">
                  Shares directly to your profile feed
                </span>
                <Button
                  size="sm"
                  disabled={sharePost.isPending}
                  onClick={handleShare}
                  className="rounded-full px-4 gap-1.5 font-semibold shadow-sm"
                >
                  {sharePost.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Send className="w-3.5 h-3.5" />
                  )}
                  <span>{sharePost.isPending ? "Posting..." : "Post Now"}</span>
                </Button>
              </div>
            </div>

            {/* Tier 2: Top Friends in Chat List */}
            {shareTargets.length > 0 && (
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 px-1">
                  Send in Chat
                </div>
                <div className="flex items-center gap-3 overflow-x-auto pb-2 no-scrollbar">
                  {shareTargets.map((t) => {
                    const isSent = Boolean(sentTargetKeys[t.key]);
                    const isSending = sendingTargetKey === t.key;
                    return (
                      <button
                        key={t.key}
                        type="button"
                        onClick={() => handleSendShareToTarget(t)}
                        className="flex flex-col items-center gap-1 w-16 shrink-0 group cursor-pointer active:scale-95 transition-transform"
                      >
                        <div className="relative">
                          <img
                            src={avatarSrc(t.avatarUrl)}
                            className="w-13 h-13 rounded-full object-cover bg-muted ring-2 ring-transparent group-hover:ring-primary/40 transition-all"
                            alt=""
                          />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-2 border-card flex items-center justify-center text-white transition-colors ${
                              isSent ? "bg-green-500" : "bg-primary"
                            }`}
                          >
                            {isSending ? (
                              <Loader2 className="w-2.5 h-2.5 animate-spin" />
                            ) : isSent ? (
                              <Check className="w-3 h-3" />
                            ) : (
                              <Send className="w-2.5 h-2.5" />
                            )}
                          </span>
                        </div>
                        <span className="text-xs font-semibold truncate w-full text-center text-foreground">
                          {t.name.split(" ")[0]}
                        </span>
                        <span
                          className={`text-[10px] font-bold ${
                            isSent ? "text-green-500" : "text-primary"
                          }`}
                        >
                          {isSent ? "Sent" : "Send"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tier 3: Social Apps & Copy Link */}
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground mb-2.5 px-1">
                Share via Apps
              </div>
              <div className="grid grid-cols-5 gap-2">
                <button
                  type="button"
                  onClick={() => handleExternalShare("copy")}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted/60 active:scale-95 transition-all cursor-pointer"
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                      copiedLink ? "bg-green-500 text-white" : "bg-muted text-foreground"
                    }`}
                  >
                    {copiedLink ? <Check className="w-5 h-5" /> : <Link2 className="w-5 h-5" />}
                  </div>
                  <span className="text-[11px] font-medium text-foreground">
                    {copiedLink ? "Copied!" : "Copy Link"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExternalShare("whatsapp")}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted/60 active:scale-95 transition-all cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full bg-[#25D366] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    WA
                  </div>
                  <span className="text-[11px] font-medium text-foreground">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExternalShare("messenger")}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted/60 active:scale-95 transition-all cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full bg-[#0084FF] text-white flex items-center justify-center shadow-sm">
                    <MessageCircle className="w-5 h-5 fill-white" />
                  </div>
                  <span className="text-[11px] font-medium text-foreground">Messenger</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExternalShare("facebook")}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted/60 active:scale-95 transition-all cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full bg-[#1877F2] text-white flex items-center justify-center font-bold text-base shadow-sm">
                    f
                  </div>
                  <span className="text-[11px] font-medium text-foreground">Facebook</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExternalShare("instagram")}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl hover:bg-muted/60 active:scale-95 transition-all cursor-pointer"
                >
                  <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                    IG
                  </div>
                  <span className="text-[11px] font-medium text-foreground">Instagram</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animated Desktop Profile Showcase Modal (R4) */}
      {showProfileModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowProfileModal(false)}
        >
          <div
            className="bg-card border border-border rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Animated Cover Banner */}
            <div className="h-32 bg-gradient-to-r from-primary via-purple-500 to-cyan-400 relative overflow-hidden">
              {(post.authorPage ? (post.authorPage as any)?.coverUrl : post.author.coverUrl) && (
                <img
                  src={post.authorPage ? (post.authorPage as any)?.coverUrl : post.author.coverUrl}
                  className="w-full h-full object-cover animate-in zoom-in-105 duration-500"
                  alt=""
                />
              )}
              <button
                type="button"
                onClick={() => setShowProfileModal(false)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar & Info */}
            <div className="px-6 pb-6 -mt-12 relative">
              <div className="flex items-end justify-between mb-3">
                <img
                  src={avatarSrc(post.authorPage ? post.authorPage.avatarUrl : post.author.avatarUrl)}
                  className="w-24 h-24 rounded-full object-cover border-4 border-card bg-muted shadow-lg animate-in zoom-in-75 duration-300"
                  alt=""
                />
                <div className="flex items-center gap-2">
                  {!isOwner && user && (
                    <Button
                      size="sm"
                      variant={following ? "outline" : "default"}
                      onClick={handleToggleFollow}
                      className="rounded-full font-semibold px-4"
                    >
                      {following ? "Following" : "Follow"}
                    </Button>
                  )}
                  <Link
                    href={getAuthorProfileUrl(post.author, post.authorPage)}
                    onClick={() => setShowProfileModal(false)}
                  >
                    <Button size="sm" variant="secondary" className="rounded-full gap-1.5 font-semibold">
                      <span>Full Profile</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </Link>
                </div>
              </div>

              <div className="space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-xl text-foreground">
                    {post.authorPage ? post.authorPage.name : post.author.displayName}
                  </h3>
                  {!post.authorPage && post.author.isVerified && (
                    <VerifiedBadge className="w-5 h-5" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  @{post.authorPage ? (post.authorPage as any).slug || post.authorPage.id : post.author.username || post.author.id}
                </p>
                {post.author.bio && !post.authorPage && (
                  <p className="text-sm text-foreground/90 pt-2 line-clamp-3">{post.author.bio}</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
