import { useState, useCallback, useMemo, useEffect } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  Share,
  Text,
  View,
  StyleSheet,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { uploadMedia } from "@/lib/upload";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  useGetUser,
  useGetUserByUsername,
  useGetUserPosts,
  useGetUserFriends,
  useSendFriendRequest,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useRemoveFriend,
  useFollowUser,
  useUnfollowUser,
  useCreateConversation,
  useUpdateMyProfile,
  getGetUserQueryKey,
  getGetUserByUsernameQueryKey,
  getGetUserPostsQueryKey,
  getGetUserFriendsQueryKey,
  ConversationType,
  ReactionType,
  useSetReelReaction,
  useRemoveReelReaction,
  customFetch,
  type Post,
  type Reel,
} from "@workspace/api-client-react";
import { syncUserFollowState } from "@/lib/follow-sync";
import { syncUserFriendState } from "@/lib/friend-sync";
import { syncReelLikeState } from "@/lib/reel-sync";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { CommentsSheet } from "@/components/CommentsSheet";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { formatCount, timeAgo } from "@/lib/format";

function limitWords(text?: string | null, maxWords: number = 150): string {
  if (!text) return "";
  const trimmed = text.trim();
  const words = trimmed.split(/\s+/);
  if (words.length <= maxWords) return trimmed;
  return words.slice(0, maxWords).join(" ") + "...";
}

function MobileReelTimelineCard({
  reel,
  c,
  currentUserId,
  onReelDeleted,
}: {
  reel: Reel;
  c: any;
  currentUserId?: string;
  onReelDeleted?: () => void;
}) {
  const qc = useQueryClient();
  const cleanCaption = (reel.caption ?? "").replace(/#\w+/g, "").trim();
  const isAuthor = currentUserId === reel.author.id;

  const [liked, setLiked] = useState(Boolean(reel.viewerHasLiked ?? (reel as any).viewerLiked));
  const [likeCount, setLikeCount] = useState(reel.likeCount ?? 0);

  useEffect(() => {
    setLiked(Boolean(reel.viewerHasLiked ?? (reel as any).viewerLiked));
    setLikeCount(reel.likeCount ?? 0);
  }, [reel.viewerHasLiked, (reel as any).viewerLiked, reel.likeCount]);

  const setReaction = useSetReelReaction();
  const removeReaction = useRemoveReelReaction();

  const handleToggleLike = () => {
    if (!currentUserId) return;
    if (liked) {
      setLiked(false);
      const next = Math.max(0, likeCount - 1);
      setLikeCount(next);
      syncReelLikeState(qc, reel.id, false, next, null);
      removeReaction.mutate(
        { id: reel.id },
        {
          onError: () => {
            setLiked(true);
            setLikeCount(likeCount);
            syncReelLikeState(qc, reel.id, true, likeCount, "like");
          },
        },
      );
    } else {
      setLiked(true);
      const next = likeCount + 1;
      setLikeCount(next);
      syncReelLikeState(qc, reel.id, true, next, "like");
      setReaction.mutate(
        { id: reel.id, data: { type: ReactionType.like } },
        {
          onError: () => {
            setLiked(false);
            setLikeCount(likeCount);
            syncReelLikeState(qc, reel.id, false, likeCount, null);
          },
        },
      );
    }
  };

  const handleMenu = () => {
    const options = [
      {
        text: "Open in Reels",
        onPress: () => router.push({ pathname: "/reels", params: { id: String(reel.id) } } as any),
      },
      {
        text: "Share Reel",
        onPress: async () => {
          try {
            await Share.share({
              message: `Check out this reel by @${reel.author.username}: ${reel.caption || ""}`,
            });
          } catch {}
        },
      },
      ...(isAuthor
        ? [
            {
              text: "Move to Trash",
              style: "destructive" as const,
              onPress: () => {
                Alert.alert(
                  "Move to Trash?",
                  "This reel will be moved to trash and permanently deleted after 30 days.",
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: async () => {
                        try {
                          await customFetch(`/api/reels/${reel.id}`, { method: "DELETE" });
                          onReelDeleted?.();
                        } catch {
                          Alert.alert("Error", "Failed to delete reel");
                        }
                      },
                    },
                  ],
                );
              },
            },
          ]
        : []),
      { text: "Cancel", style: "cancel" as const },
    ];

    Alert.alert("Reel Options", undefined, options);
  };

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/reels", params: { id: String(reel.id) } } as any)}
      style={{
        backgroundColor: c.card,
        borderWidth: 1,
        borderColor: c.border,
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 12,
        padding: 14,
        gap: 10,
      }}
    >
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Avatar uri={reel.author.avatarUrl} name={reel.author.displayName} size={40} />
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: c.foreground }}>
                {reel.author.displayName}
              </Text>
              {reel.author.isVerified && (
                <Ionicons name="checkmark-circle" size={14} color="#a855f7" />
              )}
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 12, color: c.mutedForeground }}>@{reel.author.username}</Text>
              <Text style={{ fontSize: 12, color: c.mutedForeground }}>•</Text>
              <Text style={{ fontSize: 12, color: c.mutedForeground }}>{timeAgo(reel.createdAt)}</Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                  backgroundColor: "rgba(168, 85, 247, 0.15)",
                  paddingHorizontal: 6,
                  paddingVertical: 1.5,
                  borderRadius: 6,
                  marginLeft: 2,
                }}
              >
                <Ionicons name="film-outline" size={10} color="#a855f7" />
                <Text style={{ fontSize: 10, fontWeight: "700", color: "#a855f7" }}>Reel</Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            handleMenu();
          }}
          hitSlop={12}
          style={{ padding: 6, borderRadius: 20 }}
        >
          <Ionicons name="ellipsis-horizontal" size={18} color={c.mutedForeground} />
        </Pressable>
      </View>

      {/* Caption */}
      {cleanCaption.length > 0 && (
        <Text style={{ fontSize: 14, color: c.foreground, lineHeight: 20 }}>{cleanCaption}</Text>
      )}

      {/* Video Preview Box */}
      <View
        style={{
          height: 240,
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "#000",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {reel.thumbnailUrl ? (
          <Image source={{ uri: reel.thumbnailUrl }} style={StyleSheet.absoluteFill} contentFit="cover" />
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              { backgroundColor: "#151518", alignItems: "center", justifyContent: "center" },
            ]}
          >
            <Ionicons name="film-outline" size={48} color="rgba(255,255,255,0.4)" />
          </View>
        )}
        <View
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Ionicons name="play" size={24} color="#fff" style={{ marginLeft: 2 }} />
        </View>
        <View
          style={{
            position: "absolute",
            bottom: 8,
            right: 8,
            paddingHorizontal: 8,
            paddingVertical: 4,
            borderRadius: 8,
            backgroundColor: "rgba(0,0,0,0.6)",
          }}
        >
          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>Watch Reel ↗</Text>
        </View>
      </View>

      {/* Actions */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 4,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
          <Pressable
            onPress={(e) => {
              e.stopPropagation();
              handleToggleLike();
            }}
            hitSlop={8}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}
          >
            <Ionicons
              name={liked ? "heart" : "heart-outline"}
              size={18}
              color={liked ? "#ef4444" : c.mutedForeground}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "600",
                color: liked ? "#ef4444" : c.mutedForeground,
              }}
            >
              {formatCount(likeCount)}
            </Text>
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="chatbubble-outline" size={16} color={c.mutedForeground} />
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.mutedForeground }}>
              {formatCount(reel.commentCount)}
            </Text>
          </View>
        </View>
        <Ionicons name="paper-plane-outline" size={16} color={c.mutedForeground} />
      </View>
    </Pressable>
  );
}

export default function ProfileScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  let cleanId = (id ?? "").trim();
  try {
    cleanId = decodeURIComponent(cleanId).trim();
  } catch {}
  cleanId = cleanId.replace(/^[/@]+/, "").replace(/[/@]+$/, "").trim();
  return <ProfileBody userId={cleanId} />;
}

export function ProfileBody({
  userId: rawUserId,
  hideBackButton = false,
}: {
  userId: string;
  hideBackButton?: boolean;
}) {
  const c = useColors();
  const qc = useQueryClient();
  const { user, refreshUser } = useAuth();
  let userId = (rawUserId ?? "").trim();
  try {
    userId = decodeURIComponent(userId).trim();
  } catch {}
  userId = userId.replace(/^[/@]+/, "").replace(/[/@]+$/, "").trim();

  if (!userId || userId.toLowerCase() === "me" || userId.toLowerCase() === "profile") {
    if (user?.username) userId = user.username;
    else if (user?.id) userId = user.id;
  }

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const isOwn = Boolean(
    user && userId && (
      user.id === userId ||
      (user.username && user.username.toLowerCase() === userId.toLowerCase())
    )
  );
  const isUuid = UUID_RE.test(userId);

  const [activePost, setActivePost] = useState<number | null>(null);
  const [fullScreenPhoto, setFullScreenPhoto] = useState<{ url: string; title: string } | null>(null);

  const {
    data: profileById,
    isLoading: idLoading,
    isRefetching: idRefetching,
    refetch: refetchId,
  } = useGetUser(isUuid ? userId : "", {
    query: { enabled: Boolean(userId && isUuid), queryKey: getGetUserQueryKey(userId) },
  });

  const {
    data: profileByUsername,
    isLoading: unameLoading,
    isRefetching: unameRefetching,
    refetch: refetchUsername,
  } = useGetUserByUsername(!isUuid ? userId : "", {
    query: { enabled: Boolean(userId && !isUuid), queryKey: getGetUserByUsernameQueryKey(userId) },
  });

  const { data: fallbackById } = useGetUser(
    !isUuid && userId ? userId : "",
    { query: { enabled: Boolean(!isUuid && userId && !profileByUsername && !unameLoading), queryKey: getGetUserQueryKey(userId) } }
  );

  const { data: fallbackByUsername } = useGetUserByUsername(
    isUuid && userId ? userId : "",
    { query: { enabled: Boolean(isUuid && userId && !profileById && !idLoading), queryKey: getGetUserByUsernameQueryKey(userId) } }
  );

  const profile = profileByUsername || profileById || fallbackByUsername || fallbackById || (isOwn && user ? user : undefined);
  const isLoading = (isUuid ? idLoading : unameLoading) && !profile;
  const isRefetching = isUuid ? idRefetching : unameRefetching;
  const refetch = isUuid ? refetchId : refetchUsername;

  const targetId: string = String(profile?.id || (isUuid ? userId : (isOwn && user?.id ? user.id : "")) || "");
  const isValidUuid = Boolean(targetId && UUID_RE.test(targetId));

  const { data: postsData, refetch: refetchPosts } = useGetUserPosts(
    targetId,
    undefined,
    { query: { enabled: isValidUuid, queryKey: getGetUserPostsQueryKey(targetId) } },
  );
  const showLocked =
    !!profile?.isLocked && !isOwn && !profile?.viewerIsFriend;
  const { data: friendsData, refetch: refetchFriends } = useGetUserFriends(
    targetId,
    undefined,
    {
      query: {
        enabled: isValidUuid && !showLocked,
        queryKey: getGetUserFriendsQueryKey(targetId),
      },
    },
  );
  const { data: userReels, refetch: refetchReels } = useQuery<Reel[]>({
    queryKey: ["user-reels", targetId],
    queryFn: async () => {
      return customFetch<Reel[]>(
        `/api/users/${encodeURIComponent(targetId)}/reels?limit=50`,
      ).catch(() => []);
    },
    enabled: isValidUuid && !showLocked,
  });

  const posts = (postsData ?? []) as Post[];
  const friends = friendsData ?? [];

  // Strictly filter posts to profile owner and exclude page/group posts
  const strictlyUserPosts = useMemo(() => {
    if (!profile?.id && !userId) return [];
    return posts.filter((p) => {
      const matchAuthor =
        p.author?.id === profile?.id ||
        (userId && p.author?.id === userId) ||
        (profile?.username && p.author?.username?.toLowerCase() === profile.username.toLowerCase());
      return matchAuthor && !p.pageId && !p.groupId;
    });
  }, [posts, profile?.id, profile?.username, userId]);

  // Strictly filter reels to profile owner
  const filteredReels = useMemo(() => {
    if (!profile?.id && !userId) return [];
    return (userReels ?? []).filter(
      (r) =>
        r.author?.id === profile?.id ||
        (userId && r.author?.id === userId) ||
        (profile?.username && r.author?.username?.toLowerCase() === profile.username.toLowerCase()),
    );
  }, [userReels, profile?.id, profile?.username, userId]);

  type MobileTimelineItem =
    | { type: "post"; id: string; date: number; post: Post }
    | { type: "reel"; id: string; date: number; reel: Reel };

  const timelineItems: MobileTimelineItem[] = useMemo(() => {
    const pList: MobileTimelineItem[] = strictlyUserPosts.map((p) => ({
      type: "post",
      id: `post-${p.id}`,
      date: new Date(p.createdAt).getTime(),
      post: p,
    }));
    const rList: MobileTimelineItem[] = filteredReels.map((r) => ({
      type: "reel",
      id: `reel-${r.id}`,
      date: new Date(r.createdAt).getTime(),
      reel: r,
    }));
    return [...pList, ...rList].sort((a, b) => b.date - a.date);
  }, [strictlyUserPosts, filteredReels]);

  const { data: userPhotosData } = useQuery<{ photos: { url: string; createdAt: string }[] }>({
    queryKey: ["user-uploaded-photos", targetId],
    queryFn: async () => {
      return customFetch<{ photos: { url: string; createdAt: string }[] }>(
        `/api/users/${encodeURIComponent(targetId)}/photos`,
      ).catch(() => ({ photos: [] }));
    },
    enabled: !!targetId && !showLocked,
  });

  const photoUrls = useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();

    if (userPhotosData?.photos) {
      for (const p of userPhotosData.photos) {
        if (p.url && !seen.has(p.url)) {
          seen.add(p.url);
          urls.push(p.url);
        }
      }
    }

    for (const p of posts) {
      for (const m of p.media ?? []) {
        if (m.type === "image" && m.url && !seen.has(m.url)) {
          seen.add(m.url);
          urls.push(m.url);
        }
      }
    }

    if (profile?.avatarUrl && !seen.has(profile.avatarUrl)) {
      seen.add(profile.avatarUrl);
      urls.push(profile.avatarUrl);
    }
    if (profile?.coverUrl && !seen.has(profile.coverUrl)) {
      seen.add(profile.coverUrl);
      urls.push(profile.coverUrl);
    }

    return urls;
  }, [userPhotosData, posts, profile?.avatarUrl, profile?.coverUrl]);

  const sendFriendRequest = useSendFriendRequest();
  const acceptFriendRequest = useAcceptFriendRequest();
  const declineFriendRequest = useDeclineFriendRequest();
  const removeFriend = useRemoveFriend();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const createConversation = useCreateConversation();
  const updateMyProfile = useUpdateMyProfile();

  const handlePickAndUpload = async (kind: "avatar" | "cover") => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: kind === "avatar" ? [1, 1] : [16, 9],
        quality: 0.85,
      });
      if (!res.canceled && res.assets[0]) {
        const asset = res.assets[0];
        const uploaded = await uploadMedia({
          uri: asset.uri,
          mimeType: asset.mimeType ?? "image/jpeg",
          fileName: asset.fileName ?? (kind === "avatar" ? "avatar.jpg" : "cover.jpg"),
        });
        if (kind === "avatar") {
          await updateMyProfile.mutateAsync({ data: { avatarUrl: uploaded.url } });
        } else {
          await updateMyProfile.mutateAsync({ data: { coverUrl: uploaded.url } });
        }
        await refreshUser();
        invalidateProfile();
        Alert.alert("Success", `${kind === "avatar" ? "Profile picture" : "Cover photo"} updated successfully.`);
      }
    } catch (err) {
      console.warn("Photo upload error:", err);
      Alert.alert("Error", "Could not update photo. Please try again.");
    }
  };

  const handleDeletePhoto = (kind: "avatar" | "cover") => {
    Alert.alert(
      `Delete ${kind === "avatar" ? "Profile Picture" : "Cover Photo"}`,
      `Are you sure you want to remove your ${kind === "avatar" ? "profile picture" : "cover photo"}?`,
      [
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              if (kind === "avatar") {
                await updateMyProfile.mutateAsync({ data: { avatarUrl: "" } });
              } else {
                await updateMyProfile.mutateAsync({ data: { coverUrl: "" } });
              }
              await refreshUser();
              invalidateProfile();
            } catch {
              Alert.alert("Error", "Could not remove photo. Please try again.");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const handlePhotoPress = (kind: "avatar" | "cover") => {
    const photoUrl = kind === "avatar" ? profile?.avatarUrl : profile?.coverUrl;
    const title = kind === "avatar" ? "Profile Picture" : "Cover Photo";

    if (!isOwn) {
      if (photoUrl) {
        setFullScreenPhoto({ url: photoUrl, title });
      }
      return;
    }

    // Own profile: 3 options (View, Change, Delete)
    const options: { text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void }[] = [];

    if (photoUrl) {
      options.push({
        text: `View ${title}`,
        onPress: () => setFullScreenPhoto({ url: photoUrl, title }),
      });
    }

    options.push({
      text: `Change ${title}`,
      onPress: () => void handlePickAndUpload(kind),
    });

    if (photoUrl) {
      options.push({
        text: `Delete ${title}`,
        style: "destructive",
        onPress: () => handleDeletePhoto(kind),
      });
    }

    options.push({ text: "Cancel", style: "cancel" });

    Alert.alert(title, "Choose an option", options);
  };

  const invalidateProfile = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
    if (targetId) qc.invalidateQueries({ queryKey: getGetUserQueryKey(targetId) });
    qc.invalidateQueries({ queryKey: getGetUserFriendsQueryKey(userId) });
    if (targetId) qc.invalidateQueries({ queryKey: getGetUserFriendsQueryKey(targetId) });
    qc.invalidateQueries({ queryKey: ["/api/feed"] });
    qc.invalidateQueries({ queryKey: ["/api/posts"] });
    qc.invalidateQueries({ queryKey: ["/api/stories"] });
    qc.invalidateQueries({ queryKey: ["/api/users", "me"] });
    qc.invalidateQueries({ queryKey: ["/api/profiles"] });
  }, [qc, userId, targetId]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("himewo:follow-sync", (detail) => {
      if (!detail) return;
      if (detail.targetId === userId || detail.targetId === targetId || detail.targetId === profile?.id) {
        invalidateProfile();
      }
    });
    const subFriend = DeviceEventEmitter.addListener("himewo:friend-sync", (detail) => {
      if (!detail) return;
      if (
        detail.targetId === userId ||
        detail.targetId === targetId ||
        detail.targetId === profile?.id ||
        (detail.username && profile?.username && detail.username.toLowerCase() === profile.username.toLowerCase())
      ) {
        invalidateProfile();
      }
    });
    const subReel = DeviceEventEmitter.addListener("himewo:reel-created", () => {
      qc.invalidateQueries({ queryKey: ["user-reels", targetId] });
      qc.invalidateQueries({ queryKey: getGetUserPostsQueryKey(userId) });
      refetchReels?.();
      refetchPosts();
    });
    return () => {
      sub.remove();
      subFriend.remove();
      subReel.remove();
    };
  }, [userId, targetId, profile?.id, profile?.username, invalidateProfile, qc, refetchReels, refetchPosts]);

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
    qc.invalidateQueries({ queryKey: getGetUserPostsQueryKey(userId) });
    qc.invalidateQueries({ queryKey: getGetUserFriendsQueryKey(userId) });
    qc.invalidateQueries({ queryKey: ["user-reels", targetId] });
    refetch();
    refetchPosts();
    refetchFriends();
    refetchReels?.();
  }, [qc, userId, targetId, refetch, refetchPosts, refetchFriends, refetchReels]);

  const onToggleFriend = () => {
    if (!profile) return;
    const destId = profile.id || targetId;
    if (profile.viewerIsFriend) {
      Alert.alert(
        "Unfriend",
        `Are you sure you want to unfriend ${profile.displayName}?`,
        [
          {
            text: "Unfriend",
            style: "destructive",
            onPress: () => {
              syncUserFriendState(qc, {
                targetId: destId,
                username: profile.username,
                action: "unfriend",
              });
              removeFriend.mutate(
                { userId: targetId },
                { onError: invalidateProfile, onSettled: invalidateProfile },
              );
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    } else if (!profile.viewerHasPendingRequest) {
      syncUserFriendState(qc, {
        targetId: destId,
        username: profile.username,
        action: "send_request",
      });
      sendFriendRequest.mutate(
        { data: { addresseeId: targetId } },
        { onError: invalidateProfile, onSettled: invalidateProfile },
      );
    }
  };

  const hasIncoming = Boolean(profile?.viewerHasIncomingRequest && profile?.viewerIncomingRequestId);

  const onRespond = () => {
    if (!profile?.viewerIncomingRequestId) return;
    const reqId = profile.viewerIncomingRequestId;
    const destId = profile.id || targetId;
    Alert.alert(
      "Respond to Friend Request",
      `Do you want to accept or delete the friend request from ${profile.displayName}?`,
      [
        {
          text: "Accept",
          onPress: () => {
            syncUserFriendState(qc, {
              targetId: destId,
              username: profile.username,
              action: "accept_request",
              requestId: reqId,
            });
            acceptFriendRequest.mutate(
              { id: reqId },
              { onError: invalidateProfile, onSettled: invalidateProfile },
            );
          },
        },
        {
          text: "Delete Request",
          style: "destructive",
          onPress: () => {
            syncUserFriendState(qc, {
              targetId: destId,
              username: profile.username,
              action: "decline_request",
              requestId: reqId,
            });
            declineFriendRequest.mutate(
              { id: reqId },
              { onError: invalidateProfile, onSettled: invalidateProfile },
            );
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  };

  const onToggleFollow = () => {
    if (!profile) return;
    const followTarget = profile.id || userId;
    if (profile.viewerFollows) {
      syncUserFollowState(qc, followTarget, false);
      unfollowUser.mutate(
        { userId: followTarget },
        {
          onError: () => syncUserFollowState(qc, followTarget, true),
          onSettled: invalidateProfile,
        },
      );
    } else {
      syncUserFollowState(qc, followTarget, true);
      followUser.mutate(
        { userId: followTarget },
        {
          onError: () => syncUserFollowState(qc, followTarget, false),
          onSettled: invalidateProfile,
        },
      );
    }
  };

  const onMessage = async () => {
    try {
      const conv = await createConversation.mutateAsync({
        data: { type: ConversationType.direct, memberIds: [userId] },
      });
      router.push(`/messages/${conv.id}`);
    } catch {
      router.push("/messages");
    }
  };

  // Hide the friend button when the only remaining action would be "Add
  // Friend" but the server won't accept the request (friendRequestPrivacy).
  const showFriendButton =
    !!profile &&
    (profile.viewerIsFriend ||
      hasIncoming ||
      profile.viewerHasPendingRequest ||
      profile.viewerCanSendRequest);
  const friendLabel = profile?.viewerIsFriend
    ? "Friends"
    : hasIncoming
      ? "Respond"
      : profile?.viewerHasPendingRequest
        ? "Requested"
        : "Add Friend";
  const friendIcon: keyof typeof Ionicons.glyphMap = profile?.viewerIsFriend
    ? "people"
    : hasIncoming
      ? "checkmark-circle-outline"
      : profile?.viewerHasPendingRequest
        ? "time"
        : "person-add";

  type IntroRow = { icon: keyof typeof Ionicons.glyphMap; label: string };
  const introRows: IntroRow[] = [];
  if (profile) {
    if (profile.work) introRows.push({ icon: "briefcase-outline", label: `Works at ${profile.work}` });
    if (profile.education) introRows.push({ icon: "school-outline", label: `Studied at ${profile.education}` });
    if (profile.location) introRows.push({ icon: "location-outline", label: `Lives in ${profile.location}` });
    if (profile.hometown) introRows.push({ icon: "home-outline", label: `From ${profile.hometown}` });
    if (profile.hobbies) introRows.push({ icon: "heart-outline", label: `Hobbies: ${profile.hobbies}` });
    if (profile.interests) introRows.push({ icon: "sparkles-outline", label: `Interests: ${profile.interests}` });
    if (profile.email) introRows.push({ icon: "mail-outline", label: profile.email });
    if (profile.phone) introRows.push({ icon: "call-outline", label: profile.phone });
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        {hideBackButton ? (
          <View style={styles.backBtn} />
        ) : (
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={c.foreground} />
          </Pressable>
        )}
        <Text style={[styles.headerTitle, { color: c.foreground }]} numberOfLines={1}>
          {profile?.displayName ?? "Profile"}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : !profile ? (
        <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
          <Ionicons name="person-circle-outline" size={48} color={c.mutedForeground} />
          <Text style={{ color: c.mutedForeground, marginTop: 12 }}>
            This profile could not be found.
          </Text>
        </View>
      ) : (
        <FlatList
          data={showLocked ? [] : timelineItems}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />
          }
          ListHeaderComponent={
            <View>
              <Pressable style={styles.coverWrap} onPress={() => handlePhotoPress("cover")}>
                {profile.coverUrl ? (
                  <Image source={{ uri: profile.coverUrl }} style={styles.cover} contentFit="cover" />
                ) : (
                  <View style={[styles.cover, { backgroundColor: c.primary }]} />
                )}
              </Pressable>

              <Pressable style={styles.avatarWrap} onPress={() => handlePhotoPress("avatar")}>
                <View style={[styles.avatarRing, { borderColor: c.card }]}>
                  <Avatar uri={profile.avatarUrl} name={profile.displayName} size={96} />
                </View>
              </Pressable>

              <View style={styles.info}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.name, { color: c.foreground }]}>{profile.displayName}</Text>
                  {profile.isVerified && (
                    <Ionicons name="checkmark-circle" size={18} color={c.primary} />
                  )}
                  {profile.isLocked && (
                    <Ionicons name="lock-closed" size={16} color={c.mutedForeground} />
                  )}
                </View>
                <Text style={[styles.username, { color: c.mutedForeground }]}>
                  @{profile.username}
                </Text>

                <View style={styles.counts}>
                  {profile.friendCount != null && (
                    <View style={styles.countItem}>
                      <Text style={[styles.countValue, { color: c.foreground }]}>
                        {formatCount(profile.friendCount)}
                      </Text>
                      <Text style={{ color: c.mutedForeground, fontSize: 13 }}>Friends</Text>
                    </View>
                  )}
                  {profile.followerCount != null && (
                    <View style={styles.countItem}>
                      <Text style={[styles.countValue, { color: c.foreground }]}>
                        {formatCount(profile.followerCount)}
                      </Text>
                      <Text style={{ color: c.mutedForeground, fontSize: 13 }}>Followers</Text>
                    </View>
                  )}
                  {profile.followingCount != null && (
                    <View style={styles.countItem}>
                      <Text style={[styles.countValue, { color: c.foreground }]}>
                        {formatCount(profile.followingCount)}
                      </Text>
                      <Text style={{ color: c.mutedForeground, fontSize: 13 }}>Following</Text>
                    </View>
                  )}
                </View>

                {/* Intro / Bio directly under name and counts */}
                {!!profile.bio && (
                  <Text style={[styles.bio, { color: c.foreground, marginTop: 8, textAlign: "center" }]}>
                    {limitWords(profile.bio, 150)}
                  </Text>
                )}
                {introRows.length > 0 && (
                  <View style={{ gap: 6, marginTop: 8, width: "100%", alignItems: "center" }}>
                    {introRows.slice(0, 4).map((row, i) => (
                      <View key={i} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name={row.icon} size={14} color={c.mutedForeground} />
                        <Text style={{ color: c.mutedForeground, fontSize: 13 }} numberOfLines={1}>
                          {row.label}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.actions}>
                  {isOwn ? (
                    <>
                      <Pressable
                        style={[styles.actionBtn, styles.primaryBtn, { backgroundColor: c.primary }]}
                        onPress={() => router.push("/edit-profile")}
                      >
                        <Ionicons name="create-outline" size={18} color={c.primaryForeground} />
                        <Text style={[styles.primaryLabel, { color: c.primaryForeground }]}>
                          Edit Profile
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: c.secondary }]}
                        onPress={() => router.push("/groups?create=1")}
                      >
                        <Ionicons name="people-outline" size={18} color={c.foreground} />
                        <Text style={[styles.actionLabel, { color: c.foreground }]}>
                          Create Circle
                        </Text>
                      </Pressable>
                    </>
                  ) : (
                    <>
                      {showFriendButton && (
                        <Pressable
                          style={[
                            styles.actionBtn,
                            profile.viewerIsFriend
                              ? { backgroundColor: c.secondary }
                              : { backgroundColor: c.primary },
                          ]}
                          onPress={hasIncoming ? onRespond : onToggleFriend}
                        >
                          <Ionicons
                            name={friendIcon}
                            size={18}
                            color={profile.viewerIsFriend ? c.foreground : c.primaryForeground}
                          />
                          <Text
                            style={[
                              styles.actionLabel,
                              { color: profile.viewerIsFriend ? c.foreground : c.primaryForeground },
                            ]}
                          >
                            {friendLabel}
                          </Text>
                        </Pressable>
                      )}
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: c.secondary }]}
                        onPress={onToggleFollow}
                      >
                        <Ionicons
                          name={profile.viewerFollows ? "person-remove-outline" : "add"}
                          size={18}
                          color={profile.viewerFollows ? c.destructive : c.foreground}
                        />
                        <Text
                          style={[
                            styles.actionLabel,
                            { color: profile.viewerFollows ? c.destructive : c.foreground },
                          ]}
                        >
                          {profile.viewerFollows ? "Unfollow" : "Follow"}
                        </Text>
                      </Pressable>
                      <Pressable
                        style={[styles.actionBtn, styles.iconOnly, { backgroundColor: c.secondary }]}
                        onPress={onMessage}
                      >
                        <Ionicons name="chatbubble-ellipses" size={18} color={c.foreground} />
                      </Pressable>
                    </>
                  )}
                </View>
              </View>

              {showLocked ? (
                <View
                  style={[
                    styles.section,
                    { backgroundColor: c.card, borderColor: c.border, alignItems: "center", paddingVertical: 32 },
                  ]}
                >
                  <Ionicons name="lock-closed" size={28} color={c.mutedForeground} />
                  <Text style={[styles.cardTitle, { color: c.foreground, marginTop: 12, marginBottom: 4 }]}>
                    This profile is locked
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: 14, textAlign: "center" }}>
                    Only {profile.displayName}'s friends can see their posts, photos and details.
                  </Text>
                </View>
              ) : (
              <>
              {/* Friends */}
              <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={styles.cardHeaderRow}>
                  <Text style={[styles.cardTitle, { color: c.foreground, marginBottom: 0 }]}>Friends</Text>
                  {profile.friendCount != null && (
                    <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                      {formatCount(profile.friendCount)}
                    </Text>
                  )}
                </View>
                {friends.length > 0 ? (
                  <View style={styles.grid}>
                    {friends.slice(0, 9).map((f) => (
                      <Pressable
                        key={f.id}
                        style={styles.gridItem}
                        onPress={() => router.push(`/profile/${f.id}`)}
                      >
                        <Image
                          source={{ uri: f.avatarUrl ?? undefined }}
                          style={styles.gridImage}
                          contentFit="cover"
                        />
                        <Text style={[styles.gridLabel, { color: c.foreground }]} numberOfLines={1}>
                          {f.displayName}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: c.mutedForeground, fontSize: 14 }}>No friends to show yet.</Text>
                )}
              </View>

              {/* Photos */}
              <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.cardTitle, { color: c.foreground }]}>Photos</Text>
                {photoUrls.length > 0 ? (
                  <View style={styles.photoGrid}>
                    {photoUrls.map((url, i) => (
                      <Image key={i} source={{ uri: url }} style={styles.photo} contentFit="cover" />
                    ))}
                  </View>
                ) : (
                  <Text style={{ color: c.mutedForeground, fontSize: 14 }}>No photos yet.</Text>
                )}
              </View>

              {/* Reels Section */}
              {filteredReels && filteredReels.length > 0 && (
                <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 12,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="film-outline" size={18} color="#a855f7" />
                      <Text style={[styles.cardTitle, { color: c.foreground, marginBottom: 0 }]}>
                        Reels
                      </Text>
                    </View>
                    <Text style={{ color: c.mutedForeground, fontSize: 13, fontWeight: "600" }}>
                      {filteredReels.length}
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {filteredReels.map((reel) => (
                      <Pressable
                        key={reel.id}
                        onPress={() => router.push({ pathname: "/reels", params: { id: String(reel.id) } } as any)}
                        style={{
                          width: 110,
                          height: 180,
                          borderRadius: 12,
                          overflow: "hidden",
                          backgroundColor: "#000",
                        }}
                      >
                        {reel.thumbnailUrl ? (
                          <Image
                            source={{ uri: reel.thumbnailUrl }}
                            style={StyleSheet.absoluteFill}
                            contentFit="cover"
                          />
                        ) : (
                          <View
                            style={[
                              StyleSheet.absoluteFill,
                              { backgroundColor: "#1e1e24", alignItems: "center", justifyContent: "center" },
                            ]}
                          >
                            <Ionicons name="play" size={28} color="#fff" />
                          </View>
                        )}
                        <View
                          style={{
                            position: "absolute",
                            bottom: 6,
                            left: 6,
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Ionicons name="heart" size={12} color="#fff" />
                          <Text style={{ color: "#fff", fontSize: 11, fontWeight: "600" }}>
                            {formatCount(reel.likeCount)}
                          </Text>
                        </View>
                      </Pressable>
                    ))}
                  </ScrollView>
                </View>
              )}

              {isOwn && (
                <Pressable
                  onPress={() => router.push("/create-post")}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    backgroundColor: c.card,
                    borderTopWidth: StyleSheet.hairlineWidth,
                    borderTopColor: c.border,
                  }}
                >
                  <Avatar uri={user?.avatarUrl} name={user?.displayName} size={40} />
                  <View
                    style={{
                      flex: 1,
                      borderRadius: 20,
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      backgroundColor: c.secondary,
                    }}
                  >
                    <Text style={{ color: c.mutedForeground }}>What's on your mind?</Text>
                  </View>
                  <Ionicons name="images" size={24} color="#31a24c" />
                </Pressable>
              )}

              <View
                style={[
                  styles.sectionHeader,
                  {
                    backgroundColor: c.card,
                    borderTopColor: c.border,
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: c.border,
                  },
                ]}
              >
                <Text style={[styles.sectionTitle, { color: c.foreground }]}>Timeline</Text>
              </View>
              </>
              )}
            </View>
          }
          renderItem={({ item }) =>
            item.type === "post" ? (
              <PostCard
                post={item.post}
                onComment={() => setActivePost(item.post.id)}
              />
            ) : (
              <MobileReelTimelineCard
                reel={item.reel}
                c={c}
                currentUserId={user?.id}
                onReelDeleted={() => {
                  qc.invalidateQueries({ queryKey: ["user-reels", targetId] });
                  refetchReels();
                }}
              />
            )
          }
          ListEmptyComponent={
            showLocked ? null : (
              <View style={{ alignItems: "center", marginTop: 30, paddingHorizontal: 20 }}>
                <Ionicons name="newspaper-outline" size={40} color={c.mutedForeground} />
                <Text style={{ color: c.mutedForeground, marginTop: 10, textAlign: "center" }}>
                  No posts or reels yet.
                </Text>
              </View>
            )
          }
        />
      )}

      <CommentsSheet
        postId={activePost}
        visible={activePost != null}
        onClose={() => setActivePost(null)}
      />

      <Modal
        visible={!!fullScreenPhoto}
        transparent
        animationType="fade"
        onRequestClose={() => setFullScreenPhoto(null)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: "#000" }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              paddingHorizontal: 16,
              paddingVertical: 12,
            }}
          >
            <Text style={{ color: "#fff", fontSize: 16, fontWeight: "600" }}>
              {fullScreenPhoto?.title}
            </Text>
            <Pressable
              onPress={() => setFullScreenPhoto(null)}
              hitSlop={12}
              style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: "rgba(255,255,255,0.2)",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          </View>
          {fullScreenPhoto?.url ? (
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
              <Image
                source={{ uri: fullScreenPhoto.url }}
                style={{ width: "100%", height: "100%" }}
                contentFit="contain"
              />
            </View>
          ) : null}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { width: 24 },
  headerTitle: { flex: 1, textAlign: "center", fontFamily: "Inter_700Bold", fontSize: 18 },
  coverWrap: { width: "100%", height: 160 },
  cover: { width: "100%", height: "100%" },
  avatarWrap: { marginTop: -52, paddingHorizontal: 16 },
  avatarRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  info: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 16 },
  name: { fontFamily: "Inter_700Bold", fontSize: 22 },
  username: { fontSize: 14, marginTop: 2 },
  bio: { fontSize: 15, lineHeight: 21 },
  counts: { flexDirection: "row", gap: 24, marginTop: 14 },
  countItem: { flexDirection: "row", alignItems: "center", gap: 5 },
  countValue: { fontFamily: "Inter_700Bold", fontSize: 15 },
  actions: { flexDirection: "row", gap: 8, marginTop: 16 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  iconOnly: { flex: 0, width: 44, paddingHorizontal: 0 },
  primaryBtn: {},
  actionLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  primaryLabel: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 17, marginBottom: 10 },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  introRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  introText: { fontSize: 15, flex: 1 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  gridItem: { width: "31.5%" },
  gridImage: { width: "100%", aspectRatio: 1, borderRadius: 8, backgroundColor: "#88888822" },
  gridLabel: { fontSize: 12, fontFamily: "Inter_500Medium", marginTop: 4 },
  photoGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  photo: { width: "31.5%", aspectRatio: 1, borderRadius: 8, backgroundColor: "#88888822" },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
});
