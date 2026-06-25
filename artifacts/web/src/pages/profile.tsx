import { MainLayout } from "@/components/layout/main-layout";
import { useGetUser, useGetUserPosts, useSendFriendRequest, useFollowUser, useUnfollowUser, getGetUserQueryKey, getGetUserPostsQueryKey } from "@workspace/api-client-react";
import { useParams } from "wouter";
import { PostCard } from "@/components/post-card";
import { Loader2, Check, UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sendRequest = useSendFriendRequest();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const { data: profile, isLoading: profileLoading } = useGetUser(id!, { query: { enabled: !!id, queryKey: getGetUserQueryKey(id!) } });
  const { data: posts, isLoading: postsLoading } = useGetUserPosts(id!, {}, { query: { enabled: !!id, queryKey: getGetUserPostsQueryKey(id!) } });

  const isOwnProfile = user?.id === id;

  const invalidateProfile = () => {
    if (id) queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(id) });
  };

  const handleAddFriend = () => {
    if (!id) return;
    sendRequest.mutate(
      { data: { addresseeId: id } },
      {
        onSuccess: invalidateProfile,
      },
    );
  };

  const handleToggleFollow = () => {
    if (!id) return;
    if (profile?.viewerFollows) {
      unfollowUser.mutate({ userId: id }, { onSuccess: invalidateProfile });
    } else {
      followUser.mutate({ userId: id }, { onSuccess: invalidateProfile });
    }
  };

  const friendPending = !!profile?.viewerHasPendingRequest;
  const isFriend = !!profile?.viewerIsFriend;
  const isFollowing = !!profile?.viewerFollows;
  const followBusy = followUser.isPending || unfollowUser.isPending;

  if (profileLoading) {
    return <MainLayout><div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
  }

  if (!profile) {
    return <MainLayout><div className="py-10 text-center text-muted-foreground">Profile not found</div></MainLayout>;
  }

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-6">
        <div className="h-48 bg-muted relative">
          {profile.coverUrl ? (
            <img src={profile.coverUrl} className="w-full h-full object-cover" alt="Cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/40" />
          )}
        </div>
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end mb-4">
            <img 
              src={profile.avatarUrl || ""} 
              className="w-32 h-32 rounded-full border-4 border-card object-cover -mt-16 bg-muted relative z-10" 
              alt="Avatar" 
            />
            <div className="flex gap-2">
              {!isOwnProfile && (
                <>
                  {isFriend ? (
                    <span className="bg-muted text-muted-foreground px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4" /> Friends
                    </span>
                  ) : friendPending ? (
                    <button disabled className="bg-muted text-muted-foreground px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1.5">
                      <Check className="w-4 h-4" /> Request Sent
                    </button>
                  ) : (
                    <button
                      onClick={handleAddFriend}
                      disabled={sendRequest.isPending}
                      className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-60"
                    >
                      {sendRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                      Add Friend
                    </button>
                  )}
                  <button
                    onClick={handleToggleFollow}
                    disabled={followBusy}
                    className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1.5 disabled:opacity-60 ${
                      isFollowing
                        ? "bg-muted text-foreground hover:bg-muted/70"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {followBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {isFollowing ? "Following" : "Follow"}
                  </button>
                </>
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile.displayName}</h1>
            <p className="text-muted-foreground text-sm mb-2">@{profile.username}</p>
            {profile.bio && <p className="text-[15px] mb-4">{profile.bio}</p>}
            <div className="flex gap-4 text-sm text-muted-foreground font-medium">
              <span>{profile.friendCount || 0} Friends</span>
              <span>{profile.followerCount || 0} Followers</span>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-bold text-lg px-2">Posts</h2>
        {postsLoading ? (
          <div className="py-4 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" /></div>
        ) : posts?.length === 0 ? (
          <div className="text-center py-10 bg-card border border-border rounded-xl text-muted-foreground">No posts yet</div>
        ) : (
          posts?.map(post => <PostCard key={post.id} post={post} />)
        )}
      </div>
    </MainLayout>
  );
}