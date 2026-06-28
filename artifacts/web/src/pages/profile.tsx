import { MainLayout } from "@/components/layout/main-layout";
import { useGetUser, useGetUserPosts, useSendFriendRequest, useFollowUser, useUnfollowUser, getGetUserQueryKey, getGetUserPostsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ProfileView } from "@/components/profile-view";
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

  const headerActions = !isOwnProfile ? (
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
  ) : (
    <Link href="/edit-profile">
      <button className="bg-muted text-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-muted/70">
        Edit profile
      </button>
    </Link>
  );

  return (
    <MainLayout>
      <ProfileView
        profile={profile}
        userId={id!}
        isOwnProfile={isOwnProfile}
        posts={posts}
        postsLoading={postsLoading}
        headerActions={headerActions}
      />
    </MainLayout>
  );
}
