import { DeviceEventEmitter } from "react-native";
import type { QueryClient } from "@tanstack/react-query";
import type { Post, Reel, Profile } from "@workspace/api-client-react";

/**
 * Optimistically updates all cached queries containing content by `userId` to
 * reflect the new follow state (`isFollowing`) on Mobile, and emits an event
 * so all PostCards, Reels and Profiles update instantaneously.
 */
export function syncUserFollowState(
  queryClient: QueryClient,
  userId: string,
  isFollowing: boolean,
) {
  if (!userId) return;

  // 0. Emit DeviceEventEmitter event for instant UI response across all mounted cards
  DeviceEventEmitter.emit("himewo:follow-sync", {
    targetId: userId,
    isFollowing,
    isPage: false,
  });

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

  // 3. Update profile detail queries (e.g. ['/api/users', userId])
  queryClient.setQueriesData<Profile>(
    {
      predicate: (query) => {
        const data = query.state.data;
        if (!data || typeof data !== "object" || Array.isArray(data)) return false;
        const prof = data as any;
        if (!prof.displayName && !prof.username) return false;
        return (
          prof.id === userId ||
          (prof.username && prof.username.toLowerCase() === userId.toLowerCase())
        );
      },
    },
    (old) => {
      if (!old || typeof old !== "object" || Array.isArray(old)) return old;
      const currentFollowers = (old as any).followerCount ?? 0;
      const newFollowers = isFollowing
        ? currentFollowers + ((old as any).viewerFollows ? 0 : 1)
        : Math.max(0, currentFollowers - ((old as any).viewerFollows ? 1 : 0));
      return {
        ...old,
        viewerFollows: isFollowing,
        followerCount: newFollowers,
      };
    },
  );

  // 4. Update ANY query in cache whose data is an array of Reels containing reels by this user
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
 * Optimistically updates all cached queries containing content by `pageId` on Mobile.
 */
export function syncPageFollowState(
  queryClient: QueryClient,
  pageId: number,
  isFollowing: boolean,
) {
  if (!pageId) return;

  DeviceEventEmitter.emit("himewo:follow-sync", {
    targetId: pageId,
    isFollowing,
    isPage: true,
  });

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
