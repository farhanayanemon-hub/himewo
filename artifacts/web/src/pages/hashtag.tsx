import { useEffect, useRef, useState } from "react";
import { useRoute } from "wouter";
import { Loader2, Hash } from "lucide-react";
import {
  useGetHashtagPosts,
  getGetHashtagPostsQueryKey,
} from "@workspace/api-client-react";
import type { Post } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { PostCard } from "@/components/post-card";

const PAGE_SIZE = 10;

export default function HashtagPage() {
  const [, params] = useRoute("/hashtag/:tag");
  const tag = params?.tag ?? "";
  const [pages, setPages] = useState<Post[][]>([]);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // Reset pagination when navigating between hashtags.
  useEffect(() => {
    setPages([]);
    setCursor(undefined);
    setHasMore(true);
  }, [tag]);

  const { data: page, isLoading, isFetching } = useGetHashtagPosts(
    tag,
    { cursor, limit: PAGE_SIZE },
    {
      query: {
        enabled: !!tag,
        queryKey: getGetHashtagPostsQueryKey(tag, { cursor, limit: PAGE_SIZE }),
      },
    },
  );

  useEffect(() => {
    if (!page) return;
    setPages((prev) => {
      const next = [...prev];
      const idx = cursor === undefined ? 0 : next.length;
      next[idx] = page;
      return cursor === undefined ? [page] : next;
    });
    if (page.length < PAGE_SIZE) setHasMore(false);
  }, [page, cursor]);

  const posts = pages.flat();
  const lastId = posts.length ? posts[posts.length - 1].id : undefined;

  const loadMore = () => {
    if (!hasMore || isFetching || lastId === undefined) return;
    setCursor(lastId);
  };

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, isFetching, lastId]);

  return (
    <MainLayout>
      <div className="space-y-4">
        <div className="flex items-center gap-3 bg-card border border-border rounded-xl p-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-purple-500 flex items-center justify-center">
            <Hash className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg">#{tag}</h1>
            <p className="text-sm text-muted-foreground">
              Posts tagged with #{tag}
            </p>
          </div>
        </div>

        {isLoading && posts.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-card border border-border rounded-xl p-8 text-center text-muted-foreground">
            No posts with #{tag} yet.
          </div>
        ) : (
          <>
            {posts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
            <div ref={sentinelRef} />
            {isFetching && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  );
}
