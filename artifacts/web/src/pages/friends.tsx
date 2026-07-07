import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import {
  useListFriends,
  useListFriendRequests,
  useGetFriendSuggestions,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  getListFriendsQueryKey,
  getListFriendRequestsQueryKey,
  getGetFriendSuggestionsQueryKey,
} from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";

export default function FriendsPage() {
  const queryClient = useQueryClient();
  const { data: requests } = useListFriendRequests();
  const { data: friends } = useListFriends();
  const { data: suggestions } = useGetFriendSuggestions();

  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListFriendsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListFriendRequestsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetFriendSuggestionsQueryKey() });
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-in fade-in">
        <div className="aurora-glass-card rounded-2xl p-4">
          <h2 className="text-xl font-bold mb-4">
            Your Friends{friends && friends.length > 0 ? ` (${friends.length})` : ""}
          </h2>
          {!friends || friends.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No friends yet — send some requests below!
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {friends.map(friend => (
                <Link
                  key={friend.id}
                  href={`/profile/${friend.id}`}
                  className="border border-border rounded-xl p-4 flex flex-col items-center text-center gap-2 hover:bg-muted/40 transition-colors"
                >
                  <img src={avatarSrc(friend.avatarUrl)} className="w-16 h-16 rounded-full object-cover bg-muted" alt="" />
                  <span className="font-semibold text-sm truncate w-full">{friend.displayName}</span>
                  {friend.username && (
                    <span className="text-xs text-muted-foreground truncate w-full">@{friend.username}</span>
                  )}
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="aurora-glass-card rounded-2xl p-4">
          <h2 className="text-xl font-bold mb-4">Friend Requests</h2>
          {requests?.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending requests</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {requests?.map(req => (
                <div key={req.id} className="border border-border rounded-xl p-4 flex flex-col items-center text-center gap-3">
                  <img src={avatarSrc(req.requester.avatarUrl)} className="w-20 h-20 rounded-full object-cover" alt="" />
                  <div>
                    <Link href={`/profile/${req.requester.id}`} className="font-semibold hover:underline">
                      {req.requester.displayName}
                    </Link>
                  </div>
                  <div className="flex gap-2 w-full">
                    <button
                      onClick={() => acceptRequest.mutate({ id: req.id }, { onSuccess: invalidate })}
                      disabled={acceptRequest.isPending || declineRequest.isPending}
                      className="flex-1 bg-primary text-primary-foreground py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {acceptRequest.isPending && acceptRequest.variables?.id === req.id && <Loader2 className="w-4 h-4 animate-spin" />}
                      Accept
                    </button>
                    <button
                      onClick={() => declineRequest.mutate({ id: req.id }, { onSuccess: invalidate })}
                      disabled={acceptRequest.isPending || declineRequest.isPending}
                      className="flex-1 bg-muted text-foreground py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                    >
                      {declineRequest.isPending && declineRequest.variables?.id === req.id && <Loader2 className="w-4 h-4 animate-spin" />}
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="aurora-glass-card rounded-2xl p-4">
          <h2 className="text-xl font-bold mb-4">People You May Know</h2>
          <div className="grid grid-cols-2 gap-4">
            {suggestions?.map(user => (
              <div key={user.id} className="border border-border rounded-xl p-4 flex flex-col items-center text-center gap-3">
                <img src={avatarSrc(user.avatarUrl)} className="w-20 h-20 rounded-full object-cover" alt="" />
                <div>
                  <Link href={`/profile/${user.id}`} className="font-semibold hover:underline">
                    {user.displayName}
                  </Link>
                  {user.mutualFriendsCount > 0 && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {user.mutualFriendsCount} mutual friend{user.mutualFriendsCount > 1 ? "s" : ""}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => sendRequest.mutate({ data: { addresseeId: user.id } }, { onSuccess: invalidate })}
                  disabled={sendRequest.isPending}
                  className="w-full bg-primary/10 text-primary hover:bg-primary/20 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {sendRequest.isPending && sendRequest.variables?.data.addresseeId === user.id && <Loader2 className="w-4 h-4 animate-spin" />}
                  Add Friend
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
