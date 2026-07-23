import { useEffect, useRef, useState } from "react";
import { Loader2, MonitorPlay } from "lucide-react";
import { useGetWatchFeed, getGetWatchFeedQueryKey } from "@workspace/api-client-react";
import type { Post } from "@workspace/api-client-react";
import { MainLayout } from "@/components/layout/main-layout";
import { PostCard } from "@/components/post-card";

const PAGE_SIZE = 10;

export default function WatchPage() {
  const [pages, setPages] = useState<Post[][]>([]);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: page, isLoading, isFetching } = useGetWatchFeed(
    { cursor, limit: PAGE_SIZE },
    { query: { queryKey: getGetWatchFeedQueryKey({ cursor, limit: PAGE_SIZE }) } },
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
            <MonitorPlay className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold">Watch</h1>
            <p className="text-sm text-muted-foreground">Videos from people and hubs</p>
          </div>
        </div>

        {isLoading && posts.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">
            No videos yet. Post a video and it will show up here!
          </div>
        ) : (
          posts.map((post) => <PostCard key={post.id} post={post} />)
        )}

        {hasMore && posts.length > 0 && (
          <div ref={sentinelRef} className="py-6 flex justify-center">
            {isFetching ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : null}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
