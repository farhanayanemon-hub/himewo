import type { QueryClient } from "@tanstack/react-query";
import type { Post, Reel, Profile } from "@workspace/api-client-react";

/**
 * Optimistically updates all cached queries containing content by `userId` to
 * reflect the new follow state (`isFollowing`), and triggers an immediate
 * DOM event `himewo:follow-sync` so all mounted PostCards and ReelCards instantly update.
 */
export function syncUserFollowState(
  queryClient: QueryClient,
  userId: string,
  isFollowing: boolean,
) {
  if (!userId) return;

  // 0. Dispatch custom window event so all mounted components update instantly
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("himewo:follow-sync", {
        detail: { targetId: userId, isFollowing, isPage: false },
      }),
    );
  }

  // 1. Update ANY query in cache whose data is an array containing posts by this user
  queryClient.setQueriesData<Post[]>(
    {
      predicate: (query) => {
        const data = query.state.data;
        return (
          Array.isArray(data) &&
          data.some(
            (item) =>
              item?.author?.id === userId ||
              (item?.author?.username && item.author.username === userId),
          )
        );
      },
    },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((post) => {
        if (
          post?.author?.id === userId ||
          (post?.author?.username && post.author.username === userId)
        ) {
          return {
            ...post,
            author: {
              ...post.author,
              viewerFollows: isFollowing,
            },
          };
        }
        return post;
      });
    },
  );

  // 2. Also explicitly update feed queries
  queryClient.setQueriesData<Post[]>(
    { queryKey: ["/api/feed"] },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((post) => {
        if (post?.author?.id === userId) {
          return {
            ...post,
            author: {
              ...post.author,
              viewerFollows: isFollowing,
            },
          };
        }
        return post;
      });
    },
  );

  // 3. Update single post queries (e.g. ['/api/posts', id])
  queryClient.setQueriesData<Post>(
    {
      predicate: (query) => {
        const data = query.state.data as Post | undefined;
        return (
          !!data &&
          typeof data === "object" &&
          !Array.isArray(data) &&
          (data.author?.id === userId || data.author?.username === userId)
        );
      },
    },
    (old) => {
      if (!old || typeof old !== "object" || Array.isArray(old)) return old;
      if (old.author?.id === userId || old.author?.username === userId) {
        return {
          ...old,
          author: {
            ...old.author,
            viewerFollows: isFollowing,
          },
        };
      }
      return old;
    },
  );

  // 4. Update profile detail queries (e.g. ['/api/users', userId])
  queryClient.setQueriesData<Profile>(
    {
      predicate: (query) => {
        const key = query.queryKey;
        const data = query.state.data as Profile | undefined;
        return (
          (data && typeof data === "object" && (data.id === userId || data.username === userId)) ||
          (Array.isArray(key) &&
            key.some(
              (part) =>
                part === `/api/users/${userId}` ||
                part === userId ||
                part === `/api/users/by-username/${userId}`,
            ))
        );
      },
    },
    (old) => {
      if (!old || typeof old !== "object") return old;
      const currentFollowers = (old as any).followerCount ?? 0;
      const newFollowers = isFollowing
        ? currentFollowers + (old.viewerFollows ? 0 : 1)
        : Math.max(0, currentFollowers - (old.viewerFollows ? 1 : 0));
      return {
        ...old,
        viewerFollows: isFollowing,
        followerCount: newFollowers,
      };
    },
  );

  // 5. Update ANY query in cache whose data is an array of Reels containing reels by this user
  queryClient.setQueriesData<Reel[]>(
    {
      predicate: (query) => {
        const data = query.state.data;
        return (
          Array.isArray(data) &&
          data.some(
            (item) =>
              item?.author?.id === userId ||
              (item?.author?.username && item.author.username === userId),
          )
        );
      },
    },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((reel) => {
        if (
          reel?.author?.id === userId ||
          (reel?.author?.username && reel.author.username === userId)
        ) {
          return {
            ...reel,
            author: {
              ...reel.author,
              viewerFollows: isFollowing,
            },
          };
        }
        return reel;
      });
    },
  );

  // Background invalidation
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reels"] });
    queryClient.invalidateQueries({ queryKey: ["user-reels"] });
    queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey;
        return (
          Array.isArray(key) &&
          key.some(
            (part) =>
              typeof part === "string" && (part.includes(`/api/users/${userId}`) || part === userId),
          )
        );
      },
    });
  }, 200);
}

/**
 * Optimistically updates all cached queries containing content by `pageId` to
 * reflect the new follow state (`isFollowing`).
 */
export function syncPageFollowState(
  queryClient: QueryClient,
  pageId: number,
  isFollowing: boolean,
) {
  if (!pageId) return;

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("himewo:follow-sync", {
        detail: { targetId: pageId, isFollowing, isPage: true },
      }),
    );
  }

  queryClient.setQueriesData<Post[]>(
    {
      predicate: (query) => {
        const data = query.state.data;
        return Array.isArray(data) && data.some((item) => item?.authorPage?.id === pageId);
      },
    },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((post) => {
        if (post?.authorPage?.id === pageId) {
          return {
            ...post,
            authorPage: {
              ...post.authorPage,
              viewerFollows: isFollowing,
            },
          };
        }
        return post;
      });
    },
  );

  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    queryClient.invalidateQueries({ queryKey: [`/api/pages/${pageId}`] });
  }, 200);
}
