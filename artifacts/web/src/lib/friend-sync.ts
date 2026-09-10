import type { QueryClient } from "@tanstack/react-query";
import type { Profile } from "@workspace/api-client-react";

export type FriendAction =
  | "send_request"
  | "cancel_request"
  | "accept_request"
  | "decline_request"
  | "unfriend";

export interface SyncFriendOptions {
  targetId?: string;
  username?: string;
  action: FriendAction;
  requestId?: number | null;
}

/**
 * Synchronously and optimistically updates user profile queries, friends list,
 * and requests list across the TanStack Query cache without waiting for network roundtrips.
 */
export function syncUserFriendState(
  queryClient: QueryClient,
  opts: SyncFriendOptions,
) {
  const { targetId, username, action, requestId } = opts;
  if (!targetId && !username) return;

  const matchesUser = (prof: any): boolean => {
    if (!prof) return false;
    if (targetId && prof.id === targetId) return true;
    if (username && prof.username && prof.username.toLowerCase() === username.toLowerCase()) return true;
    return false;
  };

  // 1. Dispatch custom window event so mounted components can respond
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("himewo:friend-sync", {
        detail: { targetId, username, action, requestId },
      }),
    );
  }

  // 2. Update Profile Detail queries in cache
  queryClient.setQueriesData<Profile>(
    {
      predicate: (query) => {
        const data = query.state.data;
        if (!data || typeof data !== "object" || Array.isArray(data)) return false;
        return matchesUser(data);
      },
    },
    (old) => {
      if (!old || typeof old !== "object" || Array.isArray(old)) return old;
      const currentFriends = (old as any).friendCount ?? 0;

      switch (action) {
        case "send_request":
          return {
            ...old,
            viewerHasPendingRequest: true,
            viewerCanSendRequest: false,
            viewerIsFriend: false,
            viewerHasIncomingRequest: false,
            viewerIncomingRequestId: null,
          };
        case "accept_request":
          return {
            ...old,
            viewerIsFriend: true,
            viewerHasIncomingRequest: false,
            viewerIncomingRequestId: null,
            viewerCanSendRequest: false,
            viewerHasPendingRequest: false,
            friendCount: currentFriends + 1,
          };
        case "unfriend":
          return {
            ...old,
            viewerIsFriend: false,
            viewerCanSendRequest: true,
            viewerHasPendingRequest: false,
            viewerHasIncomingRequest: false,
            viewerIncomingRequestId: null,
            friendCount: Math.max(0, currentFriends - 1),
          };
        case "cancel_request":
        case "decline_request":
          return {
            ...old,
            viewerHasIncomingRequest: false,
            viewerIncomingRequestId: null,
            viewerHasPendingRequest: false,
            viewerCanSendRequest: true,
            viewerIsFriend: false,
          };
        default:
          return old;
      }
    },
  );

  // 3. Update /api/friends query list if unfriend
  if (action === "unfriend") {
    queryClient.setQueriesData<any[]>(
      { queryKey: ["/api/friends"] },
      (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.filter((item) => !matchesUser(item));
      },
    );
  }

  // 4. Update /api/friends/requests list if accept or decline
  if (action === "accept_request" || action === "decline_request") {
    queryClient.setQueriesData<any[]>(
      { queryKey: ["/api/friends/requests"] },
      (old) => {
        if (!old || !Array.isArray(old)) return old;
        return old.filter((item) => {
          if (requestId && item.id === requestId) return false;
          if (matchesUser(item.requester) || matchesUser(item.addressee)) return false;
          return true;
        });
      },
    );
  }

  // 5. Invalidate in background to guarantee final consistency
  setTimeout(() => {
    queryClient.invalidateQueries({ queryKey: ["/api/friends"] });
    queryClient.invalidateQueries({ queryKey: ["/api/friends/requests"] });
    queryClient.invalidateQueries({
      predicate: (q) => {
        const key = q.queryKey;
        return (
          Array.isArray(key) &&
          key.some((part) => {
            if (typeof part !== "string") return false;
            if (targetId && part.includes(targetId)) return true;
            if (username && part.includes(username)) return true;
            return false;
          })
        );
      },
    });
  }, 400);
}
