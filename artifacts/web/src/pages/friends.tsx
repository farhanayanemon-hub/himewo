import { MainLayout } from "@/components/layout/main-layout";
import { useListFriends, useListFriendRequests, useGetFriendSuggestions } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { Link } from "wouter";

export default function FriendsPage() {
  const { data: requests } = useListFriendRequests();
  const { data: friends } = useListFriends();
  const { data: suggestions } = useGetFriendSuggestions();

  return (
    <MainLayout>
      <div className="space-y-8 animate-in fade-in">
        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <h2 className="text-xl font-bold mb-4">Friend Requests</h2>
          {requests?.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending requests</p>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              {requests?.map(req => (
                <div key={req.id} className="border border-border rounded-xl p-4 flex flex-col items-center text-center gap-3">
                  <img src={req.requester.avatarUrl || ""} className="w-20 h-20 rounded-full object-cover" alt="" />
                  <div>
                    <Link href={`/profile/${req.requester.id}`} className="font-semibold hover:underline">
                      {req.requester.displayName}
                    </Link>
                  </div>
                  <div className="flex gap-2 w-full">
                    <button className="flex-1 bg-primary text-primary-foreground py-1.5 rounded-lg text-sm font-medium">Accept</button>
                    <button className="flex-1 bg-muted text-foreground py-1.5 rounded-lg text-sm font-medium">Decline</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
          <h2 className="text-xl font-bold mb-4">People You May Know</h2>
          <div className="grid grid-cols-2 gap-4">
            {suggestions?.map(user => (
              <div key={user.id} className="border border-border rounded-xl p-4 flex flex-col items-center text-center gap-3">
                <img src={user.avatarUrl || ""} className="w-20 h-20 rounded-full object-cover" alt="" />
                <div>
                  <Link href={`/profile/${user.id}`} className="font-semibold hover:underline">
                    {user.displayName}
                  </Link>
                </div>
                <button className="w-full bg-primary/10 text-primary hover:bg-primary/20 py-1.5 rounded-lg text-sm font-medium">
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