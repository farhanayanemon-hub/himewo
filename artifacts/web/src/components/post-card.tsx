import { useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Share2, Loader2, Bookmark, Link2, Send, Check, X } from "lucide-react";
import { Post, useSetPostReaction, useRemovePostReaction, useSharePost, useSaveItem, useUnsaveItem, useListPostReactions, ReactionType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { getGetFeedQueryKey, getGetPostQueryKey, getGetUserPostsQueryKey, getListSavedItemsQueryKey } from "@workspace/api-client-react";
import { ReactionControl, reactionConfig } from "@/components/reaction-picker";

type SharedPost = NonNullable<Post["sharedPost"]>;

function SharedPostEmbed({ shared }: { shared: SharedPost }) {
  return (
    <Link href={`/post/${shared.id}`} className="block mb-3 rounded-xl border border-border overflow-hidden hover:bg-muted/30 transition-colors">
      <div className="p-3">
        <div className="flex items-center gap-2 mb-1.5">
          <img src={shared.author.avatarUrl || ""} className="w-7 h-7 rounded-full object-cover" alt="" />
          <div>
            <div className="text-sm font-semibold leading-tight">{shared.author.displayName}</div>
            <div className="text-[11px] text-muted-foreground leading-tight">{formatDistanceToNow(new Date(shared.createdAt), { addSuffix: true })}</div>
          </div>
        </div>
        {shared.content && <p className="text-sm text-foreground/90 line-clamp-4 whitespace-pre-wrap">{shared.content}</p>}
      </div>
      {shared.media && shared.media.length > 0 && (
        <div className="overflow-hidden border-t border-border">
          {shared.media[0].type === "video" ? (
            <video src={shared.media[0].url} className="w-full object-cover max-h-[360px]" />
          ) : (
            <img src={shared.media[0].url} className="w-full object-cover max-h-[360px]" alt="" />
          )}
        </div>
      )}
    </Link>
  );
}

export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const setReaction = useSetPostReaction();
  const removeReaction = useRemovePostReaction();
  const sharePost = useSharePost();
  const saveItem = useSaveItem();
  const unsaveItem = useUnsaveItem();
  const [showShare, setShowShare] = useState(false);
  const [shareCaption, setShareCaption] = useState("");
  const [copied, setCopied] = useState(false);
  const [showReactors, setShowReactors] = useState(false);
  const reactors = useListPostReactions(post.id, { query: { enabled: showReactors } });

  // when sharing a repost, point friends/links at the original post
  const targetId = post.sharedPost?.id ?? post.id;
  const postUrl = typeof window !== "undefined" ? `${window.location.origin}/post/${targetId}` : `/post/${targetId}`;

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
    if (post.reactions.viewerReaction === type) {
      removeReaction.mutate({ id: post.id }, { onSuccess: invalidate });
    } else {
      setReaction.mutate({ id: post.id, data: { type } }, { onSuccess: invalidate });
    }
  };

  const handleShareToFeed = () => {
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

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };

  const handleNativeShare = async () => {
    const data = { title: `${post.author.displayName} on HiMewo`, text: post.content || "Check this out on HiMewo", url: postUrl };
    if (navigator.share) {
      try {
        await navigator.share(data);
      } catch {
        /* user cancelled */
      }
    } else {
      handleCopyLink();
    }
  };

  const viewerReaction = post.reactions.viewerReaction as ReactionType | null | undefined;

  return (
    <div className="bg-card border border-card-border rounded-2xl p-4 card-depth animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <Link href={`/profile/${post.author.id}`} className="flex items-center gap-3 group">
          <img src={post.author.avatarUrl || ""} className="w-10 h-10 rounded-full object-cover group-hover:ring-2 ring-primary transition-all" alt="" />
          <div>
            <div className="font-semibold group-hover:underline">
              {post.author.displayName}
              {post.sharedPost && <span className="font-normal text-muted-foreground"> shared a post</span>}
            </div>
            <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</div>
          </div>
        </Link>
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
      </div>

      {post.content && <p className="text-[15px] whitespace-pre-wrap mb-3">{post.content}</p>}

      {post.sharedPost ? (
        <SharedPostEmbed shared={post.sharedPost} />
      ) : (
        post.media && post.media.length > 0 && (
          <div className="rounded-lg overflow-hidden border border-border mb-3">
            {post.media[0].type === "video" ? (
              <video src={post.media[0].url} controls className="w-full object-cover max-h-[500px]" />
            ) : (
              <img src={post.media[0].url} className="w-full object-cover max-h-[500px]" alt="" />
            )}
          </div>
        )
      )}

      <div className="flex justify-between items-center text-sm text-muted-foreground py-2 border-b border-border mb-1">
        {post.reactions.total > 0 ? (
          <button type="button" onClick={() => setShowReactors(true)} className="flex items-center gap-1 hover:underline">
            <div className="flex -space-x-1">
              {Object.keys(post.reactions.byType).slice(0, 3).map((type) => {
                const rType = type as ReactionType;
                return (
                  <div key={type} className="w-5 h-5 rounded-full flex items-center justify-center bg-background border border-border text-[11px] leading-none">
                    {reactionConfig[rType]?.emoji}
                  </div>
                );
              })}
            </div>
            <span className="ml-1">{post.reactions.total}</span>
          </button>
        ) : (
          <div />
        )}
        <div className="flex gap-3">
          {post.commentCount > 0 && <Link href={`/post/${post.id}`} className="hover:underline">{post.commentCount} comments</Link>}
          {post.shareCount > 0 && <span>{post.shareCount} shares</span>}
        </div>
      </div>

      <div className="flex gap-1 relative">
        <div className="flex-1 flex justify-center items-center hover:bg-muted/60 rounded-lg py-2 press transition-colors">
          <ReactionControl viewerReaction={viewerReaction} onReact={handleReaction} />
        </div>

        <Link href={`/post/${post.id}`} className="flex-1">
          <Button variant="ghost" className="w-full text-muted-foreground hover:bg-muted/60 rounded-lg flex items-center gap-2 press">
            <MessageCircle className="w-5 h-5" />
            <span className="font-semibold">Comment</span>
          </Button>
        </Link>
        <Button
          variant="ghost"
          className="flex-1 text-muted-foreground hover:bg-muted/60 rounded-lg flex items-center gap-2 press"
          onClick={() => setShowShare((s) => !s)}
        >
          <Share2 className="w-5 h-5" />
          <span className="font-semibold">Share</span>
        </Button>
      </div>

      {showShare && (
        <div className="mt-3 pt-3 border-t border-border space-y-3 animate-in fade-in slide-in-from-top-1">
          <textarea
            value={shareCaption}
            onChange={(e) => setShareCaption(e.target.value)}
            placeholder="Say something about this..."
            rows={2}
            className="w-full bg-muted/50 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button size="sm" disabled={sharePost.isPending} onClick={handleShareToFeed} className="w-full rounded-lg flex items-center gap-2">
            {sharePost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Share2 className="w-4 h-4" />}
            Share to your feed
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopyLink} className="flex-1 rounded-lg flex items-center gap-2">
              {copied ? <Check className="w-4 h-4 text-green-500" /> : <Link2 className="w-4 h-4" />}
              {copied ? "Copied!" : "Copy link"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleNativeShare} className="flex-1 rounded-lg flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send to...
            </Button>
          </div>
          <div className="flex justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowShare(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {showReactors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowReactors(false)}>
          <div className="bg-card border border-card-border rounded-2xl w-full max-w-sm max-h-[70vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="font-semibold">Reactions</h3>
              <button type="button" onClick={() => setShowReactors(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <div className="overflow-y-auto p-2">
              {reactors.isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
              ) : reactors.data && reactors.data.length > 0 ? (
                reactors.data.map((r) => (
                  <Link key={r.user.id} href={`/profile/${r.user.id}`} onClick={() => setShowReactors(false)} className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60">
                    <div className="relative">
                      <img src={r.user.avatarUrl || ""} className="w-10 h-10 rounded-full object-cover" alt="" />
                      <span className="absolute -bottom-1 -right-1 text-base leading-none">{reactionConfig[r.type]?.emoji}</span>
                    </div>
                    <span className="font-medium">{r.user.displayName}</span>
                  </Link>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">No reactions yet</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
