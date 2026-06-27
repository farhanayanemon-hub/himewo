import { useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { MessageCircle, Share2, MoreHorizontal, Loader2 } from "lucide-react";
import { Post, useSetPostReaction, useRemovePostReaction, useSharePost, ReactionType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { getGetFeedQueryKey, getGetPostQueryKey, getGetUserPostsQueryKey } from "@workspace/api-client-react";
import { ReactionControl, reactionConfig } from "@/components/reaction-picker";

export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const setReaction = useSetPostReaction();
  const removeReaction = useRemovePostReaction();
  const sharePost = useSharePost();
  const [showShare, setShowShare] = useState(false);
  const [shareCaption, setShareCaption] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(post.id) });
    queryClient.invalidateQueries({ queryKey: getGetUserPostsQueryKey(post.author.id) });
  };

  const handleReaction = (type: ReactionType) => {
    if (post.reactions.viewerReaction === type) {
      removeReaction.mutate({ id: post.id }, { onSuccess: invalidate });
    } else {
      setReaction.mutate({ id: post.id, data: { type } }, { onSuccess: invalidate });
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

  const viewerReaction = post.reactions.viewerReaction as ReactionType | null | undefined;

  return (
    <div className="bg-card border border-card-border rounded-2xl p-4 card-depth animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-3">
        <Link href={`/profile/${post.author.id}`} className="flex items-center gap-3 group">
          <img src={post.author.avatarUrl || ""} className="w-10 h-10 rounded-full object-cover group-hover:ring-2 ring-primary transition-all" alt="" />
          <div>
            <div className="font-semibold group-hover:underline">{post.author.displayName}</div>
            <div className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</div>
          </div>
        </Link>
        <Button variant="ghost" size="icon" className="rounded-full text-muted-foreground hover:text-foreground">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      <p className="text-[15px] whitespace-pre-wrap mb-3">{post.content}</p>

      {post.media && post.media.length > 0 && (
        <div className="rounded-lg overflow-hidden border border-border mb-3">
          {post.media[0].type === "video" ? (
            <video src={post.media[0].url} controls className="w-full object-cover max-h-[500px]" />
          ) : (
            <img src={post.media[0].url} className="w-full object-cover max-h-[500px]" alt="" />
          )}
        </div>
      )}

      <div className="flex justify-between items-center text-sm text-muted-foreground py-2 border-b border-border mb-1">
        <div className="flex items-center gap-1">
          {post.reactions.total > 0 && (
            <>
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
            </>
          )}
        </div>
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
