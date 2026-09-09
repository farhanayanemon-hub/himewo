import { MainLayout } from "@/components/layout/main-layout";
import { useGetUser, useGetUserPosts, useSendFriendRequest, useFollowUser, useUnfollowUser, getGetUserQueryKey, getGetUserPostsQueryKey } from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ProfileView } from "@/components/profile-view";
import { Loader2, Check, UserPlus, UserCheck } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useQueryClient } from "@tanstack/react-query";
import { syncUserFollowState } from "@/lib/follow-sync";

export default function ProfilePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const sendRequest = useSendFriendRequest();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const { data: profile, isLoading: profileLoading } = useGetUser(id!, { query: { enabled: !!id, queryKey: getGetUserQueryKey(id!) } });
  const effectiveUserId = profile?.id || id!;
  const { data: posts, isLoading: postsLoading } = useGetUserPosts(
    effectiveUserId,
    {},
    { query: { enabled: !!effectiveUserId, queryKey: getGetUserPostsQueryKey(effectiveUserId) } },
  );

  const isOwnProfile = Boolean(user && profile && (user.id === profile.id || user.id === id));

  const invalidateProfile = () => {
    if (id) queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(id) });
    if (profile?.id) queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(profile.id) });
  };

  const handleAddFriend = () => {
    if (!profile?.id && !id) return;
    const addresseeId = profile?.id || id!;
    sendRequest.mutate(
      { data: { addresseeId } },
      {
        onSuccess: invalidateProfile,
      },
    );
  };

  const handleToggleFollow = () => {
    if (!profile?.id && !id) return;
    const targetId = profile?.id || id!;
    if (profile?.viewerFollows) {
      syncUserFollowState(queryClient, targetId, false);
      unfollowUser.mutate(
        { userId: targetId },
        {
          onError: () => syncUserFollowState(queryClient, targetId, true),
          onSettled: invalidateProfile,
        },
      );
    } else {
      syncUserFollowState(queryClient, targetId, true);
      followUser.mutate(
        { userId: targetId },
        {
          onError: () => syncUserFollowState(queryClient, targetId, false),
          onSettled: invalidateProfile,
        },
      );
    }
  };

  const friendPending = !!profile?.viewerHasPendingRequest;
  const isFriend = !!profile?.viewerIsFriend;
  const canSendRequest = !!profile?.viewerCanSendRequest;
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
      ) : canSendRequest ? (
        <button
          onClick={handleAddFriend}
          disabled={sendRequest.isPending}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-60"
        >
          {sendRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Add Friend
        </button>
      ) : null}
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
