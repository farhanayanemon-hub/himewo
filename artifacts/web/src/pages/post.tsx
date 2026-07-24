import { MainLayout } from "@/components/layout/main-layout";
import {
  useGetPost,
  getGetPostQueryKey,
} from "@workspace/api-client-react";
import { useParams } from "wouter";
import { PostCard } from "@/components/post-card";
import { PostComments } from "@/components/post-comments";
import { Loader2 } from "lucide-react";

export default function PostPage() {
  const { id } = useParams<{ id: string }>();
  const postId = Number(id);
  const { data: post, isLoading: postLoading } = useGetPost(postId, { query: { enabled: !!postId, queryKey: getGetPostQueryKey(postId) } });

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
          <PostComments postId={postId} commentsEnabled={post.commentsEnabled} />
        </div>
      </div>
    </MainLayout>
  );
}
