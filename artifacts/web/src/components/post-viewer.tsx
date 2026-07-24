import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X, Globe, Users, Lock } from "lucide-react";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { avatarSrc } from "@/lib/avatar";
import { VerifiedBadge } from "@/components/verified-badge";
import { RenderWithMentions } from "@/components/mention";
import { PostComments } from "@/components/post-comments";
import { ReactionControl, reactionConfig } from "@/components/reaction-picker";
import {
  Post,
  ReactionType,
  useSetPostReaction,
  useRemovePostReaction,
  getGetFeedQueryKey,
  getGetPostQueryKey,
  getGetUserPostsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useActingPage } from "@/lib/acting-page";
import type { MediaItem } from "@/components/media-grid";

const privacyIcons: Record<string, typeof Globe> = {
  public: Globe,
  friends: Users,
  private: Lock,
};

/**
 * Facebook-style post viewer: media on the left (dark stage with prev/next),
 * and a right-side panel showing the author, caption, reactions, and the
 * full comments section. Opens when a post's photo/video is clicked.
 */
export function PostViewer({
  post,
  items,
  index,
  onClose,
  onIndexChange,
}: {
  post: Post;
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const queryClient = useQueryClient();
  const { actingPage } = useActingPage();
  const setReaction = useSetPostReaction();
  const removeReaction = useRemovePostReaction();

  // Optimistic reaction state — same pattern as PostCard.
  const [summary, setSummary] = useState(post.reactions);
  useEffect(() => {
    setSummary(post.reactions);
  }, [post.reactions]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(post.id) });
    queryClient.invalidateQueries({ queryKey: getGetUserPostsQueryKey(post.author.id) });
  };

  const handleReaction = (type: ReactionType) => {
    const prev = summary.viewerReaction as ReactionType | null | undefined;
    if (prev === type) {
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
      setReaction.mutate(
        { id: post.id, data: { type, pageId: actingPage?.id } },
        { onSettled: invalidate },
      );
    }
  };

  const prevItem = useCallback(
    () => onIndexChange((index - 1 + items.length) % items.length),
    [index, items.length, onIndexChange],
  );
  const nextItem = useCallback(
    () => onIndexChange((index + 1) % items.length),
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Don't hijack arrow keys while typing a comment.
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing) {
        // Esc while typing just blurs the field — don't drop the draft.
        if (e.key === "Escape") t.blur();
        return;
      }
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prevItem();
      if (e.key === "ArrowRight") nextItem();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prevItem, nextItem]);

  // Lock body scroll while the viewer is open.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const item = items[index];
  if (!item) return null;

  const authorHref = post.authorPage ? `/pages/${post.authorPage.id}` : `/profile/${post.author.id}`;
  const authorName = post.authorPage ? post.authorPage.name : post.author.displayName;
  const authorAvatar = avatarSrc(post.authorPage ? post.authorPage.avatarUrl : post.author.avatarUrl);
  const PrivacyIcon = privacyIcons[post.privacy] ?? Globe;
  const viewerReaction = summary.viewerReaction as ReactionType | null | undefined;

  return (
    <div className="fixed inset-0 z-[100] bg-background flex flex-col md:flex-row">
      {/* Media stage */}
      <div
        className="relative flex-1 min-h-0 bg-black flex items-center justify-center h-[45vh] md:h-auto"
        onClick={onClose}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>
        {items.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevItem();
              }}
              aria-label="Previous"
              className="absolute left-3 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextItem();
              }}
              aria-label="Next"
              className="absolute right-3 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
              {index + 1} / {items.length}
            </span>
          </>
        )}
        <div className="max-w-full max-h-full" onClick={(e) => e.stopPropagation()}>
          {item.type === "video" ? (
            <video src={item.url} controls autoPlay className="max-w-full max-h-[45vh] md:max-h-screen" />
          ) : (
            <img src={item.url} alt="" className="max-w-full max-h-[45vh] md:max-h-screen object-contain" />
          )}
        </div>
      </div>

      {/* Right panel: author, caption, reactions, comments */}
      <div className="w-full md:w-[400px] lg:w-[440px] shrink-0 flex flex-col min-h-0 flex-1 md:flex-none border-l border-border bg-card">
        <div className="flex-1 min-h-0 overflow-y-auto p-4">
          <div className="flex items-center justify-between mb-3">
            <Link href={authorHref} className="flex items-center gap-3 group">
              <img src={authorAvatar} className="w-10 h-10 rounded-full object-cover group-hover:ring-2 ring-primary transition-all" alt="" />
              <div>
                <div className="font-semibold leading-tight">
                  <span className="group-hover:underline">{authorName}</span>
                  {!post.authorPage && post.author.isVerified && <VerifiedBadge className="w-4 h-4 ml-1 align-text-bottom" />}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}</span>
                  <span>·</span>
                  <PrivacyIcon className="w-3 h-3" />
                </div>
              </div>
            </Link>
          </div>

          {post.content && (
            <p className="text-[15px] whitespace-pre-wrap mb-3">
              <RenderWithMentions content={post.content} />
            </p>
          )}

          <div className="flex justify-between items-center text-sm text-muted-foreground py-2 border-y border-border mb-2">
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
              {post.commentsEnabled && post.commentCount > 0 && <span>{post.commentCount} comments</span>}
              {post.shareCount > 0 && <span>{post.shareCount} shares</span>}
            </div>
          </div>

          {post.reactionsEnabled && (
            <div className="flex mb-4">
              <div className="flex-1 flex justify-center items-center hover:bg-muted/60 rounded-lg py-2 press transition-colors">
                <ReactionControl viewerReaction={viewerReaction} onReact={handleReaction} />
              </div>
            </div>
          )}

          <PostComments postId={post.id} commentsEnabled={post.commentsEnabled} onChanged={invalidate} />
        </div>
      </div>
    </div>
  );
}
