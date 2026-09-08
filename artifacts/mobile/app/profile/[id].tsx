import { useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import {
  useGetUser,
  useGetUserPosts,
  useGetUserFriends,
  useSendFriendRequest,
  useRemoveFriend,
  useFollowUser,
  useUnfollowUser,
  useCreateConversation,
  getGetUserQueryKey,
  getGetUserPostsQueryKey,
  getGetUserFriendsQueryKey,
  ConversationType,
  customFetch,
  type Post,
  type Reel,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { CommentsSheet } from "@/components/CommentsSheet";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { formatCount, timeAgo } from "@/lib/format";

function MobileReelTimelineCard({ reel, c }: { reel: Reel; c: any }) {
  const cleanCaption = (reel.caption ?? "").replace(/#\w+/g, "").trim();
  return (
    <Pressable
      onPress={() => router.push("/reels")}
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
            </View>
          </View>
        </View>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 12,
            backgroundColor: "rgba(168,85,247,0.12)",
          }}
        >
          <Ionicons name="film" size={12} color="#a855f7" />
          <Text style={{ fontSize: 11, fontWeight: "700", color: "#a855f7" }}>Reel</Text>
        </View>
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
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <Ionicons name="heart" size={18} color="#ef4444" />
            <Text style={{ fontSize: 12, fontWeight: "600", color: c.mutedForeground }}>
              {formatCount(reel.likeCount)}
            </Text>
          </View>
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
  return <ProfileBody userId={id ?? ""} />;
}

export function ProfileBody({
  userId,
  hideBackButton = false,
}: {
  userId: string;
  hideBackButton?: boolean;
}) {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
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
  const showLocked =
    !!profile?.isLocked && !isOwn && !profile?.viewerIsFriend;
  const { data: friendsData, refetch: refetchFriends } = useGetUserFriends(
    userId,
    undefined,
    {
      query: {
        enabled: !!userId && !showLocked,
        queryKey: getGetUserFriendsQueryKey(userId),
      },
    },
  );
  const targetId = profile?.id || userId;
  const { data: userReels, refetch: refetchReels } = useQuery<Reel[]>({
    queryKey: ["user-reels", targetId],
    queryFn: async () => {
      return customFetch<Reel[]>(
        `/api/reels?authorId=${encodeURIComponent(targetId)}&limit=50`,
      ).catch(() => []);
    },
    enabled: !!targetId && !showLocked,
  });

  const posts = (postsData ?? []) as Post[];
  const friends = friendsData ?? [];

  type MobileTimelineItem =
    | { type: "post"; id: string; date: number; post: Post }
    | { type: "reel"; id: string; date: number; reel: Reel };

  const timelineItems: MobileTimelineItem[] = useMemo(() => {
    const pList: MobileTimelineItem[] = (posts ?? []).map((p) => ({
      type: "post",
      id: `post-${p.id}`,
      date: new Date(p.createdAt).getTime(),
      post: p,
    }));
    const rList: MobileTimelineItem[] = (userReels ?? []).map((r) => ({
      type: "reel",
      id: `reel-${r.id}`,
      date: new Date(r.createdAt).getTime(),
      reel: r,
    }));
    return [...pList, ...rList].sort((a, b) => b.date - a.date);
  }, [posts, userReels]);

  const photoUrls = posts
    .flatMap((p) => p.media ?? [])
    .filter((m) => m.type === "image")
    .map((m) => m.url)
    .slice(0, 9);

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
    qc.invalidateQueries({ queryKey: getGetUserFriendsQueryKey(userId) });
    qc.invalidateQueries({ queryKey: ["user-reels", targetId] });
    refetch();
    refetchPosts();
    refetchFriends();
    refetchReels?.();
  }, [qc, userId, targetId, refetch, refetchPosts, refetchFriends, refetchReels]);

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

  // Hide the friend button when the only remaining action would be "Add
  // Friend" but the server won't accept the request (friendRequestPrivacy).
  const showFriendButton =
    !!profile &&
    (profile.viewerIsFriend ||
      profile.viewerHasPendingRequest ||
      profile.viewerCanSendRequest);
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

  type IntroRow = { icon: keyof typeof Ionicons.glyphMap; label: string };
  const introRows: IntroRow[] = [];
  if (profile) {
    if (profile.work) introRows.push({ icon: "briefcase-outline", label: `Works at ${profile.work}` });
    if (profile.education) introRows.push({ icon: "school-outline", label: `Studied at ${profile.education}` });
    if (profile.location) introRows.push({ icon: "location-outline", label: `Lives in ${profile.location}` });
    if (profile.hometown) introRows.push({ icon: "home-outline", label: `From ${profile.hometown}` });
    if (profile.hobbies) introRows.push({ icon: "heart-outline", label: `Hobbies: ${profile.hobbies}` });
    if (profile.interests) introRows.push({ icon: "sparkles-outline", label: `Interests: ${profile.interests}` });
    if (profile.website) introRows.push({ icon: "globe-outline", label: profile.website });
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
                      )}
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
              {/* Intro card */}
              <View style={[styles.section, { backgroundColor: c.card, borderColor: c.border }]}>
                <Text style={[styles.cardTitle, { color: c.foreground }]}>Intro</Text>
                {!!profile.bio && (
                  <Text style={[styles.bio, { color: c.foreground }]}>{profile.bio}</Text>
                )}
                {introRows.length > 0 ? (
                  <View style={{ gap: 10, marginTop: profile.bio ? 12 : 0 }}>
                    {introRows.map((row, i) => (
                      <View key={i} style={styles.introRow}>
                        <Ionicons name={row.icon} size={18} color={c.mutedForeground} />
                        <Text style={[styles.introText, { color: c.foreground }]}>{row.label}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  !profile.bio && (
                    <Text style={{ color: c.mutedForeground, fontSize: 14 }}>
                      {isOwn ? "Add details about yourself." : "No details yet."}
                    </Text>
                  )
                )}
              </View>

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
              {userReels && userReels.length > 0 && (
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
                      {userReels.length}
                    </Text>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10 }}
                  >
                    {userReels.map((reel) => (
                      <Pressable
                        key={reel.id}
                        onPress={() => router.push("/reels")}
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

              <View style={[styles.sectionHeader, { borderTopColor: c.border }]}>
                <Text style={[styles.sectionTitle, { color: c.foreground }]}>Timeline</Text>
              </View>
              </>
              )}
            </View>
          }
          renderItem={({ item }) =>
            item.type === "post" ? (
              <PostCard post={item.post} onComment={() => setActivePost(item.post.id)} />
            ) : (
              <MobileReelTimelineCard reel={item.reel} c={c} />
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
    marginHorizontal: 12,
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardTitle: { fontFamily: "Inter_700Bold", fontSize: 18, marginBottom: 10 },
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
    paddingVertical: 14,
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
});
