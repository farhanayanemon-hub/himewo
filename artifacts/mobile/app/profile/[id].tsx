import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetUser,
  useGetUserPosts,
  useSendFriendRequest,
  useRemoveFriend,
  useFollowUser,
  useUnfollowUser,
  useCreateConversation,
  getGetUserQueryKey,
  getGetUserPostsQueryKey,
  ConversationType,
  type Post,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { CommentsSheet } from "@/components/CommentsSheet";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { formatCount } from "@/lib/format";

export default function ProfileScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = id ?? "";
  const isOwn = user?.id === userId;

  const [activePost, setActivePost] = useState<number | null>(null);

  const {
    data: profile,
    isLoading,
    isRefetching,
    refetch,
  } = useGetUser(userId, {
    query: { enabled: !!userId, queryKey: getGetUserQueryKey(userId) },
  });
  const { data: postsData, refetch: refetchPosts } = useGetUserPosts(
    userId,
    undefined,
    { query: { enabled: !!userId, queryKey: getGetUserPostsQueryKey(userId) } },
  );
  const posts = (postsData ?? []) as Post[];

  const sendFriendRequest = useSendFriendRequest();
  const removeFriend = useRemoveFriend();
  const followUser = useFollowUser();
  const unfollowUser = useUnfollowUser();
  const createConversation = useCreateConversation();

  const invalidateProfile = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
  }, [qc, userId]);

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetUserQueryKey(userId) });
    qc.invalidateQueries({ queryKey: getGetUserPostsQueryKey(userId) });
    refetch();
    refetchPosts();
  }, [qc, userId, refetch, refetchPosts]);

  const onToggleFriend = () => {
    if (!profile) return;
    if (profile.viewerIsFriend) {
      removeFriend.mutate({ userId }, { onSuccess: invalidateProfile });
    } else if (!profile.viewerHasPendingRequest) {
      sendFriendRequest.mutate(
        { data: { addresseeId: userId } },
        { onSuccess: invalidateProfile },
      );
    }
  };

  const onToggleFollow = () => {
    if (!profile) return;
    if (profile.viewerFollows) {
      unfollowUser.mutate({ userId }, { onSuccess: invalidateProfile });
    } else {
      followUser.mutate({ userId }, { onSuccess: invalidateProfile });
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

  const friendLabel = profile?.viewerIsFriend
    ? "Friends"
    : profile?.viewerHasPendingRequest
      ? "Requested"
      : "Add Friend";
  const friendIcon: keyof typeof Ionicons.glyphMap = profile?.viewerIsFriend
    ? "people"
    : profile?.viewerHasPendingRequest
      ? "time"
      : "person-add";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
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
          data={posts}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />
          }
          ListHeaderComponent={
            <View>
              <View style={styles.coverWrap}>
                {profile.coverUrl ? (
                  <Image source={{ uri: profile.coverUrl }} style={styles.cover} contentFit="cover" />
                ) : (
                  <View style={[styles.cover, { backgroundColor: c.primary }]} />
                )}
              </View>

              <View style={styles.avatarWrap}>
                <View style={[styles.avatarRing, { borderColor: c.card }]}>
                  <Avatar uri={profile.avatarUrl} name={profile.displayName} size={96} />
                </View>
              </View>

              <View style={styles.info}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={[styles.name, { color: c.foreground }]}>{profile.displayName}</Text>
                  {profile.isVerified && (
                    <Ionicons name="checkmark-circle" size={18} color={c.primary} />
                  )}
                </View>
                <Text style={[styles.username, { color: c.mutedForeground }]}>
                  @{profile.username}
                </Text>
                {!!profile.bio && (
                  <Text style={[styles.bio, { color: c.foreground }]}>{profile.bio}</Text>
                )}

                <View style={styles.metaRow}>
                  {!!profile.location && (
                    <View style={styles.metaItem}>
                      <Ionicons name="location-outline" size={14} color={c.mutedForeground} />
                      <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                        {profile.location}
                      </Text>
                    </View>
                  )}
                  {!!profile.work && (
                    <View style={styles.metaItem}>
                      <Ionicons name="briefcase-outline" size={14} color={c.mutedForeground} />
                      <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                        {profile.work}
                      </Text>
                    </View>
                  )}
                </View>

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

                <View style={styles.actions}>
                  {isOwn ? (
                    <Pressable
                      style={[styles.actionBtn, styles.primaryBtn, { backgroundColor: c.primary }]}
                      onPress={() => router.push("/settings")}
                    >
                      <Ionicons name="create-outline" size={18} color={c.primaryForeground} />
                      <Text style={[styles.primaryLabel, { color: c.primaryForeground }]}>
                        Edit Profile
                      </Text>
                    </Pressable>
                  ) : (
                    <>
                      <Pressable
                        style={[
                          styles.actionBtn,
                          profile.viewerIsFriend
                            ? { backgroundColor: c.secondary }
                            : { backgroundColor: c.primary },
                        ]}
                        onPress={onToggleFriend}
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
                      <Pressable
                        style={[styles.actionBtn, { backgroundColor: c.secondary }]}
                        onPress={onToggleFollow}
                      >
                        <Ionicons
                          name={profile.viewerFollows ? "checkmark" : "add"}
                          size={18}
                          color={c.foreground}
                        />
                        <Text style={[styles.actionLabel, { color: c.foreground }]}>
                          {profile.viewerFollows ? "Following" : "Follow"}
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

              <View style={[styles.sectionHeader, { borderTopColor: c.border }]}>
                <Text style={[styles.sectionTitle, { color: c.foreground }]}>Posts</Text>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <PostCard post={item} onComment={() => setActivePost(item.id)} />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 30, paddingHorizontal: 20 }}>
              <Ionicons name="newspaper-outline" size={40} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, marginTop: 10, textAlign: "center" }}>
                No posts yet.
              </Text>
            </View>
          }
        />
      )}

      <CommentsSheet
        postId={activePost}
        visible={activePost != null}
        onClose={() => setActivePost(null)}
      />
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
  info: { paddingHorizontal: 16, paddingTop: 8 },
  name: { fontFamily: "Inter_700Bold", fontSize: 22 },
  username: { fontSize: 14, marginTop: 2 },
  bio: { fontSize: 15, lineHeight: 21, marginTop: 10 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginTop: 10 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
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
  sectionHeader: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
});
