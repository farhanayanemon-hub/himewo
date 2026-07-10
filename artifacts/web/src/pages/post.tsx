import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import {
  useGetPost,
  useListComments,
  useCreateComment,
  useUpdateComment,
  useDeleteComment,
  useSetCommentReaction,
  useRemoveCommentReaction,
  getGetPostQueryKey,
  getListCommentsQueryKey,
  ReactionType,
  type Comment,
  type Profile,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { PostCard } from "@/components/post-card";
import { VerifiedBadge } from "@/components/verified-badge";
import { Loader2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { EmojiPickerButton } from "@/components/emoji-picker";
import { GifPickerButton } from "@/components/gif-picker";
import { ReactionControl } from "@/components/reaction-picker";
import {
  RenderWithMentions,
  MentionSuggestions,
  activeMentionQuery,
  pickMention,
  applyMentionTokens,
  type MentionTarget,
} from "@/components/mention";
import { X, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MENTION_TOKEN_RE = /@\[([^\]]+)\]\(user:([^)]+)\)/g;

interface ReplyTarget {
  parentId: number;
  author: Profile;
}

function CommentItem({
  comment,
  postId,
  replies,
  onReply,
}: {
  comment: Comment;
  postId: number;
  replies?: Comment[];
  onReply: (target: ReplyTarget) => void;
}) {
  const queryClient = useQueryClient();
  const setReaction = useSetCommentReaction();
  const removeReaction = useRemoveCommentReaction();
  const updateComment = useUpdateComment();
  const deleteComment = useDeleteComment();
  const { user } = useAuth();
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [showReplies, setShowReplies] = useState(false);

  const isOwn = !!user && user.id === comment.author.id;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
    queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
  };

  const copyComment = () => {
    void navigator.clipboard?.writeText(
      comment.content.replace(MENTION_TOKEN_RE, "@$1"),
    );
  };

  const startEdit = () => {
    setEditText(comment.content);
    setEditing(true);
  };

  const saveEdit = () => {
    const content = editText.trim();
    if (!content) return;
    updateComment.mutate(
      { id: comment.id, data: { content } },
      {
        onSuccess: () => {
          setEditing(false);
          invalidate();
        },
      },
    );
  };

  const handleDelete = () => {
    if (!window.confirm("Delete this comment?")) return;
    deleteComment.mutate({ id: comment.id }, { onSuccess: invalidate });
  };

  const viewerReaction = comment.viewerReaction as ReactionType | null | undefined;

  const handleReact = (type: ReactionType) => {
    if (viewerReaction === type) {
      removeReaction.mutate({ id: comment.id }, { onSuccess: invalidate });
    } else {
      setReaction.mutate(
        { id: comment.id, data: { type } },
        { onSuccess: invalidate },
      );
    }
  };

  const isReply = comment.parentId != null;
  // Replies always attach to the top-level comment on the server.
  const replyParentId = comment.parentId ?? comment.id;

  return (
    <div className="flex gap-3 group/comment">
      <Link href={`/profile/${comment.author.id}`} className="shrink-0">
        <img
          src={avatarSrc(comment.author.avatarUrl)}
          className={`${isReply ? "w-7 h-7" : "w-8 h-8"} rounded-full object-cover shrink-0`}
          alt=""
        />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-1">
          <div className="bg-muted/50 rounded-2xl px-4 py-2 inline-block max-w-full min-w-0">
            <Link
              href={`/profile/${comment.author.id}`}
              className="font-semibold text-sm hover:underline"
            >
              {comment.author.displayName}
              {comment.author.isVerified && <VerifiedBadge className="w-3.5 h-3.5 ml-1 align-text-bottom" />}
            </Link>
            {editing ? (
              <div className="mt-1">
                <textarea
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  rows={2}
                  className="w-full min-w-[220px] bg-background border border-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="flex gap-2 mt-1">
                  <button
                    className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                    onClick={saveEdit}
                    disabled={!editText.trim() || updateComment.isPending}
                  >
                    Save
                  </button>
                  <button
                    className="text-xs text-muted-foreground hover:underline"
                    onClick={() => setEditing(false)}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              comment.content && (
                <div className="text-[15px] break-words">
                  <RenderWithMentions content={comment.content} />
                </div>
              )
            )}
            {comment.mediaUrl && (
              <img
                src={comment.mediaUrl}
                alt=""
                className="mt-1 rounded-lg max-h-52 max-w-full object-contain"
                loading="lazy"
              />
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="p-1.5 rounded-full text-muted-foreground hover:bg-muted opacity-0 max-md:opacity-100 group-hover/comment:opacity-100 focus:opacity-100 transition-opacity shrink-0"
                aria-label="Comment options"
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => onReply({ parentId: replyParentId, author: comment.author })}
              >
                Reply
              </DropdownMenuItem>
              <DropdownMenuItem onClick={copyComment}>Copy text</DropdownMenuItem>
              {isOwn &&
                Date.now() - new Date(comment.createdAt).getTime() <=
                  15 * 60 * 1000 && (
                  <DropdownMenuItem onClick={startEdit}>Edit</DropdownMenuItem>
                )}
              {isOwn && (
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-destructive focus:text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="flex gap-3 mt-1 ml-2 text-xs text-muted-foreground font-medium items-center">
          <ReactionControl
            viewerReaction={viewerReaction}
            onReact={handleReact}
            count={comment.reactionCount}
            size="sm"
          />
          <button
            className="hover:underline"
            onClick={() => onReply({ parentId: replyParentId, author: comment.author })}
          >
            Reply
          </button>
          <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
        </div>
        {replies && replies.length > 0 && !showReplies && (
          <button
            className="mt-2 ml-2 text-xs font-semibold text-muted-foreground hover:underline"
            onClick={() => setShowReplies(true)}
          >
            View {replies.length} {replies.length === 1 ? "reply" : "replies"}
          </button>
        )}
        {replies && replies.length > 0 && showReplies && (
          <div className="mt-3 space-y-3 border-l-2 border-border/60 pl-3">
            {replies.map((r) => (
              <CommentItem key={r.id} comment={r} postId={postId} onReply={onReply} />
            ))}
            <button
              className="text-xs font-semibold text-muted-foreground hover:underline"
              onClick={() => setShowReplies(false)}
            >
              Hide replies
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const { data: post, isLoading: postLoading } = useGetPost(postId, { query: { enabled: !!postId, queryKey: getGetPostQueryKey(postId) } });
  const { data: comments, isLoading: commentsLoading } = useListComments(postId, {}, { query: { enabled: !!postId, queryKey: getListCommentsQueryKey(postId) } });
  
  const createComment = useCreateComment();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [mentionTargets, setMentionTargets] = useState<MentionTarget[]>([]);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const mentionQuery = activeMentionQuery(content);

  const { topLevel, repliesByParent } = useMemo(() => {
    const topLevel: Comment[] = [];
    const repliesByParent = new Map<number, Comment[]>();
    for (const c of comments ?? []) {
      if (c.parentId == null) {
        topLevel.push(c);
      } else {
        const list = repliesByParent.get(c.parentId) ?? [];
        list.push(c);
        repliesByParent.set(c.parentId, list);
      }
    }
    return { topLevel, repliesByParent };
  }, [comments]);

  const startReply = (target: ReplyTarget) => {
    setReplyTo(target);
    // Only prefill (and track the mention target) when the box is empty —
    // otherwise no "@Name" text is inserted, so no target should be added.
    if (content.trim().length === 0) {
      setContent(`@${target.author.displayName} `);
      setMentionTargets((prev) =>
        prev.some((t) => t.id === target.author.id)
          ? prev
          : [...prev, target.author],
      );
    }
    inputRef.current?.focus();
  };

  const cancelReply = () => setReplyTo(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && !gifUrl) return;
    createComment.mutate(
      {
        id: postId,
        data: {
          content: applyMentionTokens(content, mentionTargets),
          ...(gifUrl ? { mediaUrl: gifUrl } : {}),
          ...(replyTo ? { parentId: replyTo.parentId } : {}),
        },
      },
      {
        onSuccess: () => {
          setContent("");
          setMentionTargets([]);
          setGifUrl(null);
          setReplyTo(null);
          queryClient.invalidateQueries({ queryKey: getListCommentsQueryKey(postId) });
          queryClient.invalidateQueries({ queryKey: getGetPostQueryKey(postId) });
        }
      }
    );
  };

  if (postLoading) {
    return <MainLayout><div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
  }

  if (!post) {
    return <MainLayout><div className="py-10 text-center text-muted-foreground">Post not found</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <PostCard post={post} />
        
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <h3 className="font-semibold mb-4">Comments</h3>

          {post.commentsEnabled ? (
            <>
              <form onSubmit={handleSubmit} className="mb-6">
                {replyTo && (
                  <div className="flex items-center gap-2 mb-2 ml-2 text-xs text-muted-foreground">
                    <span>
                      Replying to <span className="font-semibold text-foreground">{replyTo.author.displayName}</span>
                    </span>
                    <button
                      type="button"
                      onClick={cancelReply}
                      className="hover:text-foreground"
                      aria-label="Cancel reply"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2 items-center w-full">
                  <div className="relative flex-1 min-w-0 flex items-center gap-1 bg-muted/50 rounded-full pr-2 focus-within:ring-1 focus-within:ring-primary">
                    {mentionQuery !== null && (
                      <MentionSuggestions
                        query={mentionQuery}
                        onSelect={(p) => {
                          const picked = pickMention(content, mentionTargets, p);
                          setContent(picked.text);
                          setMentionTargets(picked.targets);
                          inputRef.current?.focus();
                        }}
                      />
                    )}
                    <input
                      ref={inputRef}
                      type="text"
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder={replyTo ? "Write a reply..." : "Write a comment... (@ to mention)"}
                      className="flex-1 min-w-0 bg-transparent rounded-full px-4 py-2 text-sm focus:outline-none"
                    />
                    <GifPickerButton onSelect={(url) => setGifUrl(url)} />
                    <EmojiPickerButton onSelect={(emoji) => setContent((prev) => prev + emoji)} />
                  </div>
                  <Button type="submit" disabled={(!content.trim() && !gifUrl) || createComment.isPending} className="rounded-full shrink-0">
                    {replyTo ? "Reply" : "Post"}
                  </Button>
                </div>
                {gifUrl && (
                  <div className="relative inline-block mt-2 ml-2">
                    <img src={gifUrl} alt="Selected GIF" className="rounded-lg max-h-32" />
                    <button
                      type="button"
                      onClick={() => setGifUrl(null)}
                      className="absolute -top-2 -right-2 bg-foreground text-background rounded-full p-0.5 shadow"
                      aria-label="Remove GIF"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </form>

              <div className="space-y-4">
                {commentsLoading ? (
                  <div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
                ) : topLevel.length === 0 ? (
                  <div className="text-center text-sm text-muted-foreground py-4">No comments yet.</div>
                ) : (
                  topLevel.map(comment => (
                    <CommentItem
                      key={comment.id}
                      comment={comment}
                      postId={postId}
                      replies={repliesByParent.get(comment.id)}
                      onReply={startReply}
                    />
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-4">Comments are turned off for this post.</div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
