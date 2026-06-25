import { MainLayout } from "@/components/layout/main-layout";
import { useGetPost, useListComments, useCreateComment, getGetPostQueryKey, getListCommentsQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { PostCard } from "@/components/post-card";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const { data: post, isLoading: postLoading } = useGetPost(postId, { query: { enabled: !!postId, queryKey: getGetPostQueryKey(postId) } });
  const { data: comments, isLoading: commentsLoading } = useListComments(postId, {}, { query: { enabled: !!postId, queryKey: getListCommentsQueryKey(postId) } });
  
  const createComment = useCreateComment();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    createComment.mutate(
      { id: postId, data: { content } },
      {
        onSuccess: () => {
          setContent("");
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
          
          <form onSubmit={handleSubmit} className="flex gap-2 mb-6">
            <input 
              type="text" 
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Write a comment..." 
              className="flex-1 bg-muted/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <Button type="submit" disabled={!content.trim() || createComment.isPending} className="rounded-full">Post</Button>
          </form>

          <div className="space-y-4">
            {commentsLoading ? (
              <div className="py-4 text-center"><Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" /></div>
            ) : comments?.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-4">No comments yet.</div>
            ) : (
              comments?.map(comment => (
                <div key={comment.id} className="flex gap-3">
                  <img src={comment.author.avatarUrl || ""} className="w-8 h-8 rounded-full object-cover shrink-0" alt="" />
                  <div>
                    <div className="bg-muted/50 rounded-2xl px-4 py-2">
                      <div className="font-semibold text-sm">{comment.author.displayName}</div>
                      <div className="text-[15px]">{comment.content}</div>
                    </div>
                    <div className="flex gap-3 mt-1 ml-2 text-xs text-muted-foreground font-medium">
                      <button className="hover:underline">Like</button>
                      <button className="hover:underline">Reply</button>
                      <span>{new Date(comment.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}