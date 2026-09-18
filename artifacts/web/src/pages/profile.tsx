import { useEffect, useMemo } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import {
  useGetUser,
  useGetUserByUsername,
  useGetUserPosts,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
  useFollowUser,
  useUnfollowUser,
  getGetUserQueryKey,
  getGetUserByUsernameQueryKey,
  getGetUserPostsQueryKey,
  getListFriendRequestsQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link } from "wouter";
import { ProfileView } from "@/components/profile-view";
import { Loader2, Check, X, UserPlus, UserCheck, UserMinus, ChevronDown, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import { useQueryClient } from "@tanstack/react-query";
import { syncUserFollowState } from "@/lib/follow-sync";
import { syncUserFriendState } from "@/lib/friend-sync";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ProfilePage() {
  const { id: rawId, username: rawUsername } = useParams<{ id?: string; username?: string }>();
  const { user } = useAuth();
  const { actingPage } = useActingPage();
  const queryClient = useQueryClient();
  const sendRequest = useSendFriendRequest();
  const acceptRequest = useAcceptFriendRequest();
  const declineRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();

  const rawKey = (rawUsername || rawId || "").trim();
  let cleanedKey = rawKey;
  try {
    cleanedKey = decodeURIComponent(cleanedKey).trim();
  } catch {}
  let lookupKey = cleanedKey.replace(/^[/@]+/, "").replace(/[/@]+$/, "").trim();

  // If navigating to /profile or /me without specific target, or key is literally "profile" or "me", use current user
  if (!lookupKey || lookupKey.toLowerCase() === "profile" || lookupKey.toLowerCase() === "me") {
    if (user?.username) {
      lookupKey = user.username;
    } else if (user?.id) {
      lookupKey = user.id;
    }
  }

  const isSelf = Boolean(
    user && lookupKey && (
      user.id === lookupKey ||
      (user.username && user.username.toLowerCase() === lookupKey.toLowerCase())
    )
  );

  const isUuid = UUID_RE.test(lookupKey);

  // If it's a UUID, query by ID primary; if username, query by username primary
  const { data: profileById, isLoading: idLoading } = useGetUser(
    isUuid ? lookupKey : "",
    { query: { enabled: Boolean(lookupKey && isUuid), queryKey: getGetUserQueryKey(lookupKey) } }
  );

  const { data: profileByUsername, isLoading: unameLoading } = useGetUserByUsername(
    !isUuid ? lookupKey : "",
    { query: { enabled: Boolean(lookupKey && !isUuid), queryKey: getGetUserByUsernameQueryKey(lookupKey) } }
  );

  // Fallback queries in case lookupKey format was ambiguous
  const { data: fallbackById } = useGetUser(
    !isUuid && lookupKey ? lookupKey : "",
    { query: { enabled: Boolean(!isUuid && lookupKey && !profileByUsername && !unameLoading), queryKey: getGetUserQueryKey(lookupKey) } }
  );

  const { data: fallbackByUsername } = useGetUserByUsername(
    isUuid && lookupKey ? lookupKey : "",
    { query: { enabled: Boolean(isUuid && lookupKey && !profileById && !idLoading), queryKey: getGetUserByUsernameQueryKey(lookupKey) } }
  );

  const profile = profileByUsername || profileById || fallbackByUsername || fallbackById || (isSelf && user ? user : undefined);
  const profileLoading = (isUuid ? idLoading : unameLoading) && !profile;

  const effectiveUserId = profile?.id || (isUuid ? lookupKey : (isSelf ? user?.id : undefined));

  const isValidUuid = Boolean(effectiveUserId && UUID_RE.test(effectiveUserId));
  const { data: posts, isLoading: postsLoading } = useGetUserPosts(
    effectiveUserId || "",
    {},
    {
      query: {
        enabled: isValidUuid,
        queryKey: effectiveUserId ? getGetUserPostsQueryKey(effectiveUserId) : ["disabled-posts"],
      },
    },
  );

  const isOwnProfile = Boolean(
    !actingPage &&
      user &&
      profile &&
      (user.id === profile.id ||
        (user.username &&
          profile.username &&
          user.username.toLowerCase() === profile.username.toLowerCase()) ||
        user.id === lookupKey ||
        (user.username && user.username.toLowerCase() === lookupKey.toLowerCase()))
  );

  // Address bar normalization: ensure Facebook-style himewo.com/username
  useEffect(() => {
    if (profile?.username && typeof window !== "undefined") {
      const cleanUname = profile.username.replace(/^[/@]+/, "").replace(/[/@]+$/, "").trim();
      const currentPath = window.location.pathname;
      const cleanPath = `/${cleanUname}`;
      if (
        currentPath.startsWith("/profile/") ||
        (currentPath.toLowerCase() === cleanPath.toLowerCase() && currentPath !== cleanPath) ||
        currentPath.startsWith("/@") ||
        currentPath.includes("%40")
      ) {
        window.history.replaceState(null, "", cleanPath);
      }
    }
  }, [profile?.username]);

  const invalidateProfile = () => {
    if (lookupKey) {
      queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(lookupKey) });
      queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(lookupKey) });
    }
    if (profile?.id) {
      queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(profile.id) });
    }
    if (profile?.username) {
      queryClient.invalidateQueries({ queryKey: getGetUserByUsernameQueryKey(profile.username) });
      queryClient.invalidateQueries({ queryKey: getGetUserQueryKey(profile.username) });
    }
    queryClient.invalidateQueries({ queryKey: getListFriendRequestsQueryKey() });
  };

  useEffect(() => {
    const onFriendSync = (ev: Event) => {
      const detail = (ev as CustomEvent).detail;
      if (!detail) return;
      if (
        detail.targetId === effectiveUserId ||
        detail.targetId === lookupKey ||
        detail.targetId === profile?.id ||
        (detail.username && profile?.username && detail.username.toLowerCase() === profile.username.toLowerCase())
      ) {
        invalidateProfile();
      }
    };
    window.addEventListener("himewo:friend-sync", onFriendSync);
    return () => window.removeEventListener("himewo:friend-sync", onFriendSync);
  }, [effectiveUserId, lookupKey, profile?.id, profile?.username]);

  const handleAddFriend = () => {
    if (!effectiveUserId) return;
    syncUserFriendState(queryClient, {
      targetId: effectiveUserId,
      username: profile?.username,
      action: "send_request",
    });
    sendRequest.mutate(
      { data: { addresseeId: effectiveUserId } },
      {
        onError: invalidateProfile,
        onSettled: invalidateProfile,
      },
    );
  };

  const handleRemoveFriend = () => {
    if (!effectiveUserId) return;
    syncUserFriendState(queryClient, {
      targetId: effectiveUserId,
      username: profile?.username,
      action: "unfriend",
    });
    removeFriend.mutate(
      { userId: effectiveUserId },
      {
        onError: invalidateProfile,
        onSettled: invalidateProfile,
      },
    );
  };

  const handleAcceptRequest = () => {
    if (!profile?.viewerIncomingRequestId) return;
    const reqId = profile.viewerIncomingRequestId;
    syncUserFriendState(queryClient, {
      targetId: effectiveUserId,
      username: profile?.username,
      action: "accept_request",
      requestId: reqId,
    });
    acceptRequest.mutate(
      { id: reqId },
      {
        onError: invalidateProfile,
        onSettled: invalidateProfile,
      },
    );
  };

  const handleDeclineRequest = () => {
    if (!profile?.viewerIncomingRequestId) return;
    const reqId = profile.viewerIncomingRequestId;
    syncUserFriendState(queryClient, {
      targetId: effectiveUserId,
      username: profile?.username,
      action: "decline_request",
      requestId: reqId,
    });
    declineRequest.mutate(
      { id: reqId },
      {
        onError: invalidateProfile,
        onSettled: invalidateProfile,
      },
    );
  };

  const handleToggleFollow = () => {
    if (!effectiveUserId) return;
    const targetId = effectiveUserId;
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
  const hasIncomingRequest = !!profile?.viewerHasIncomingRequest && !!profile?.viewerIncomingRequestId;
  const isFriend = !!profile?.viewerIsFriend;
  const canSendRequest = !!profile?.viewerCanSendRequest;
  const isFollowing = !!profile?.viewerFollows;
  const followBusy = followUser.isPending || unfollowUser.isPending;

  if (profileLoading) {
    return (
      <MainLayout>
        <div className="py-10 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!profile) {
    return (
      <MainLayout>
        <div className="py-16 flex flex-col items-center justify-center text-center px-4">
          <div className="w-16 h-16 rounded-full bg-muted/60 flex items-center justify-center mb-4 text-muted-foreground">
            <UserX className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-1">Profile not found</h2>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">
            This profile doesn't exist or may have been removed. Check the username and try again.
          </p>
          <div className="flex gap-3">
            <Link href="/">
              <Button variant="default" className="gap-2 cursor-pointer">
                Back to Feed
              </Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  const headerActions = !isOwnProfile ? (
    <>
      {isFriend ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={removeFriend.isPending}
              className="bg-muted text-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-muted/80 flex items-center gap-1.5 cursor-pointer shadow-xs transition-colors"
            >
              {removeFriend.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4 text-emerald-500" />
              )}
              <span>Friends</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 p-1.5 rounded-xl">
            <DropdownMenuItem
              onClick={handleRemoveFriend}
              disabled={removeFriend.isPending}
              className="flex items-center gap-2 cursor-pointer font-medium text-sm py-2 px-3 rounded-lg text-destructive focus:text-destructive focus:bg-destructive/10"
            >
              <UserMinus className="w-4 h-4" />
              <span>Unfriend</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : hasIncomingRequest ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              disabled={acceptRequest.isPending || declineRequest.isPending}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-60 cursor-pointer shadow-xs"
            >
              {acceptRequest.isPending || declineRequest.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserCheck className="w-4 h-4" />
              )}
              <span>Respond</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-80" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 p-1.5 rounded-xl">
            <DropdownMenuItem
              onClick={handleAcceptRequest}
              disabled={acceptRequest.isPending || declineRequest.isPending}
              className="flex items-center gap-2 cursor-pointer font-medium text-sm py-2 px-3 rounded-lg"
            >
              <Check className="w-4 h-4 text-emerald-500" />
              <span>Accept</span>
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleDeclineRequest}
              disabled={acceptRequest.isPending || declineRequest.isPending}
              className="flex items-center gap-2 cursor-pointer font-medium text-sm py-2 px-3 rounded-lg text-destructive focus:text-destructive"
            >
              <X className="w-4 h-4" />
              <span>Cancel / Delete</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : friendPending ? (
        <button disabled className="bg-muted text-muted-foreground px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1.5">
          <Check className="w-4 h-4" /> Request Sent
        </button>
      ) : canSendRequest ? (
        <button
          onClick={handleAddFriend}
          disabled={sendRequest.isPending}
          className="bg-primary text-primary-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-primary/90 flex items-center gap-1.5 disabled:opacity-60 cursor-pointer"
        >
          {sendRequest.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
          Add Friend
        </button>
      ) : null}
      <button
        onClick={handleToggleFollow}
        disabled={followBusy}
        className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-1.5 transition-colors disabled:opacity-60 cursor-pointer ${
          isFollowing
            ? "bg-muted text-foreground hover:bg-destructive/10 hover:text-destructive"
            : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
        }`}
      >
        {followBusy ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : isFollowing ? (
          <UserMinus className="w-4 h-4" />
        ) : (
          <UserPlus className="w-4 h-4" />
        )}
        {isFollowing ? "Unfollow" : "Follow"}
      </button>
    </>
  ) : (
    <Link href="/edit-profile">
      <button className="bg-muted text-foreground px-4 py-2 rounded-lg font-medium text-sm hover:bg-muted/70 cursor-pointer">
        Edit profile
      </button>
    </Link>
  );

  return (
    <MainLayout>
      <ProfileView
        profile={profile}
        userId={effectiveUserId || profile.id}
        isOwnProfile={isOwnProfile}
        posts={posts}
        postsLoading={postsLoading}
        headerActions={headerActions}
      />
    </MainLayout>
  );
}
