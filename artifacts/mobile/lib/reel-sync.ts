import type { QueryClient } from "@tanstack/react-query";
import type { Reel } from "@workspace/api-client-react";

/**
 * Optimistically updates all cached queries containing `reelId` to reflect the
 * new reaction/like state on Mobile.
 */
export function syncReelLikeState(
  queryClient: QueryClient,
  reelId: number,
  liked: boolean,
  likeCount: number,
  reaction?: string | null,
) {
  if (!reelId) return;

  const updateReel = (r: Reel): Reel => {
    if (r.id === reelId) {
      return {
        ...r,
        viewerHasLiked: liked,
        viewerReaction: (reaction ?? (liked ? "like" : null)) as any,
        likeCount: Math.max(0, likeCount),
      };
    }
    return r;
  };

  // 1. Update general reels feed
  queryClient.setQueriesData<Reel[]>(
    { queryKey: ["/api/reels"] },
    (old) => (old && Array.isArray(old) ? old.map(updateReel) : old),
  );

  // 2. Update all user-reels queries (profile reels)
  queryClient.setQueriesData<Reel[]>(
    {
      predicate: (query) => {
        const key = query.queryKey;
        return Array.isArray(key) && (key[0] === "user-reels" || key[0] === "user-profile-reels");
      },
    },
    (old) => (old && Array.isArray(old) ? old.map(updateReel) : old),
  );

  // 3. Update single reel query if present
  queryClient.setQueriesData<Reel>(
    {
      predicate: (query) => {
        const key = query.queryKey;
        return (
          Array.isArray(key) &&
          key.some((part) => part === `/api/reels/${reelId}` || part === reelId)
        );
      },
    },
    (old) => (old ? updateReel(old) : old),
  );

  // Invalidate queries to sync with backend
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/reels"] });
    queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey;
        return Array.isArray(key) && (key[0] === "user-reels" || key[0] === "user-profile-reels");
      },
    });
  }, 100);
}
