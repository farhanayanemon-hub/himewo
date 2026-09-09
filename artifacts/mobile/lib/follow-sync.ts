import type { QueryClient } from "@tanstack/react-query";
import type { Post, Reel, Profile } from "@workspace/api-client-react";

/**
 * Optimistically updates all cached queries containing content by `userId` to
 * reflect the new follow state (`isFollowing`) on Mobile.
 */
export function syncUserFollowState(
  queryClient: QueryClient,
  userId: string,
  isFollowing: boolean,
) {
  if (!userId) return;

  // 1. Update Feed queries
  queryClient.setQueriesData<Post[]>(
    { queryKey: ["/api/feed"] },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((post) => {
        if (post.author?.id === userId) {
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

  // 2. Update user posts queries
  queryClient.setQueriesData<Post[]>(
    {
      predicate: (query) => {
        const key = query.queryKey;
        return (
          Array.isArray(key) &&
          key.some(
            (part) =>
              typeof part === "string" && part.includes(`/api/users/${userId}/posts`),
          )
        );
      },
    },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((post) => {
        if (post.author?.id === userId) {
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

  // 3. Update profile detail queries
  queryClient.setQueriesData<Profile>(
    {
      predicate: (query) => {
        const key = query.queryKey;
        return (
          Array.isArray(key) &&
          key.some(
            (part) =>
              part === `/api/users/${userId}` ||
              part === userId ||
              part === `/api/users/by-username/${userId}`,
          )
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

  // 4. Update Reels feed queries
  queryClient.setQueriesData<Reel[]>(
    { queryKey: ["/api/reels"] },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((reel) => {
        if (reel.author?.id === userId) {
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

  // 5. Update Profile Reels queries
  queryClient.setQueriesData<Reel[]>(
    {
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && (key[0] === "user-reels" || key[0] === "user-profile-reels");
      },
    },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((reel) => {
        if (reel.author?.id === userId) {
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

  // Invalidate in background to guarantee final consistency
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
    queryClient.invalidateQueries({ queryKey: ["/api/reels"] });
    queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey;
        return Array.isArray(key) && (key[0] === "user-reels" || key[0] === "user-profile-reels");
      },
    });
    queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey;
        return (
          Array.isArray(key) &&
          key.some(
            (part) =>
              typeof part === "string" && part.includes(`/api/users/${userId}`),
          )
        );
      },
    });
  }, 100);
}

/**
 * Optimistically updates all cached queries containing content by `pageId` to
 * reflect the new follow state (`isFollowing`) on Mobile.
 */
export function syncPageFollowState(
  queryClient: QueryClient,
  pageId: number,
  isFollowing: boolean,
) {
  if (!pageId) return;

  queryClient.setQueriesData<Post[]>(
    { queryKey: ["/api/feed"] },
    (old) => {
      if (!old || !Array.isArray(old)) return old;
      return old.map((post) => {
        if (post.authorPage?.id === pageId) {
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
  }, 100);
}
