import { useState } from "react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { ThumbsUp, MessageCircle, Share2, MoreHorizontal } from "lucide-react";
import { Post, useSetPostReaction, useRemovePostReaction, ReactionType } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import { getGetFeedQueryKey, getGetPostQueryKey, getGetUserPostsQueryKey } from "@workspace/api-client-react";

const reactionConfig: Record<ReactionType, { emoji: string; color: string; label: string }> = {
  [ReactionType.like]: { emoji: "👍", color: "text-blue-500", label: "Like" },
  [ReactionType.love]: { emoji: "❤️", color: "text-red-500", label: "Love" },
  [ReactionType.care]: { emoji: "🥰", color: "text-yellow-500", label: "Care" },
  [ReactionType.haha]: { emoji: "😆", color: "text-yellow-500", label: "Haha" },
  [ReactionType.wow]: { emoji: "😮", color: "text-yellow-500", label: "Wow" },
  [ReactionType.sad]: { emoji: "😢", color: "text-yellow-500", label: "Sad" },
  [ReactionType.angry]: { emoji: "😡", color: "text-orange-600", label: "Angry" },
};

export function PostCard({ post }: { post: Post }) {
  const queryClient = useQueryClient();
  const setReaction = useSetPostReaction();
  const removeReaction = useRemovePostReaction();
  const [showPicker, setShowPicker] = useState(false);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(post.id) });
    queryClient.invalidateQueries({ queryKey: getGetUserPostsQueryKey(post.author.id) });
  };

  const handleReaction = (type: ReactionType) => {
    setShowPicker(false);
    if (post.reactions.viewerReaction === type) {
      removeReaction.mutate({ id: post.id }, { onSuccess: invalidate });
    } else {
      setReaction.mutate({ id: post.id, data: { type } }, { onSuccess: invalidate });
    }
  };

  const viewerReaction = post.reactions.viewerReaction as ReactionType | null | undefined;
  const active = viewerReaction ? reactionConfig[viewerReaction] : null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm animate-in fade-in zoom-in-95 duration-300">
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
        {showPicker && (
          <div className="absolute -top-12 left-0 bg-card border border-border rounded-full shadow-lg flex gap-1 p-1 animate-in slide-in-from-bottom-2 z-10"
               onMouseLeave={() => setShowPicker(false)}>
            {Object.entries(reactionConfig).map(([type, config]) => (
              <button
                key={type}
                onClick={() => handleReaction(type as ReactionType)}
                className="w-10 h-10 rounded-full hover:bg-muted flex items-center justify-center hover:scale-125 transition-transform text-2xl leading-none"
                title={config.label}
              >
                {config.emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex-1 relative"
             onMouseEnter={() => setShowPicker(true)}
             onMouseLeave={() => setShowPicker(false)}>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:bg-muted/50 rounded-lg flex items-center gap-2"
            onClick={() => handleReaction(viewerReaction || ReactionType.like)}
          >
            {active ? (
              <span className="text-lg leading-none">{active.emoji}</span>
            ) : (
              <ThumbsUp className="w-5 h-5 text-muted-foreground" />
            )}
            <span className={`font-medium ${active ? active.color : ""}`}>{active ? active.label : "Like"}</span>
          </Button>
        </div>

        <Link href={`/post/${post.id}`} className="flex-1">
          <Button variant="ghost" className="w-full text-muted-foreground hover:bg-muted/50 rounded-lg flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <span className="font-medium">Comment</span>
          </Button>
        </Link>
        <Button variant="ghost" className="flex-1 text-muted-foreground hover:bg-muted/50 rounded-lg flex items-center gap-2">
          <Share2 className="w-5 h-5" />
          <span className="font-medium">Share</span>
        </Button>
      </div>
    </div>
  );
}
