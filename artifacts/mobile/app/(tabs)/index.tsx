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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getFeed,
  getGetFeedQueryKey,
  useSharePost,
  type Post,
} from "@workspace/api-client-react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { StoryBar } from "@/components/StoryBar";
import { CommentsSheet } from "@/components/CommentsSheet";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

const FEED_LIMIT = 10;

export default function HomeScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const [activePost, setActivePost] = useState<number | null>(null);

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [...getGetFeedQueryKey(), "infinite"],
    queryFn: ({ pageParam }) =>
      getFeed({ cursor: pageParam as number | undefined, limit: FEED_LIMIT }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage: Post[]) =>
      lastPage.length === FEED_LIMIT ? lastPage[lastPage.length - 1].id : undefined,
  });
  const posts = (data?.pages.flat() ?? []) as Post[];

  const sharePost = useSharePost();

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    refetch();
  }, [qc, refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onShare = useCallback(
    (postId: number) => {
      sharePost.mutate(
        { id: postId, data: {} },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
            Alert.alert("Shared", "This post has been shared to your timeline.");
          },
          onError: () => Alert.alert("Error", "Could not share this post."),
        },
      );
    },
    [sharePost, qc],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Text style={[styles.brand, { color: c.primary }]}>HiMewo</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: c.secondary }]}
            onPress={() => router.push("/search")}
          >
            <Ionicons name="search" size={20} color={c.foreground} />
          </Pressable>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: c.secondary }]}
            onPress={() => router.push("/messages")}
          >
            <Ionicons name="chatbubbles" size={20} color={c.foreground} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: 20 }} />
            ) : null
          }
          ListHeaderComponent={
            <>
              <StoryBar />
              <View style={[styles.composerWrap, { backgroundColor: c.card }]}>
                <Pressable
                  style={styles.composer}
                  onPress={() => router.push("/create-post")}
                >
                  <Avatar uri={user?.avatarUrl} name={user?.displayName} size={40} />
                  <View style={[styles.composerInput, { backgroundColor: c.secondary }]}>
                    <Text style={{ color: c.mutedForeground }}>What's on your mind?</Text>
                  </View>
                </Pressable>
                <View style={[styles.composerDivider, { backgroundColor: c.border }]} />
                <View style={styles.composerActions}>
                  <Pressable
                    style={styles.composerAction}
                    onPress={() => router.push("/create-reel")}
                  >
                    <Ionicons name="videocam" size={20} color="#f3425f" />
                    <Text style={[styles.composerActionLabel, { color: c.mutedForeground }]}>
                      Live
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.composerAction}
                    onPress={() => router.push("/create-post")}
                  >
                    <Ionicons name="images" size={20} color="#31a24c" />
                    <Text style={[styles.composerActionLabel, { color: c.mutedForeground }]}>
                      Photo
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.composerAction}
                    onPress={() => router.push("/create-story")}
                  >
                    <Ionicons name="happy-outline" size={20} color="#f7b125" />
                    <Text style={[styles.composerActionLabel, { color: c.mutedForeground }]}>
                      Story
                    </Text>
                  </Pressable>
                </View>
              </View>
            </>
          }
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onComment={() => setActivePost(item.id)}
              onShare={() => onShare(item.id)}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
              <Ionicons name="newspaper-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}>
                No posts yet. Be the first to share something!
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
    zIndex: 10,
  },
  brand: { fontFamily: "Inter_700Bold", fontSize: 26, letterSpacing: -0.5 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  composerWrap: {
    marginBottom: 8,
    paddingTop: 4,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
  },
  composerInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  composerDivider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 12,
  },
  composerActions: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  composerAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
  },
  composerActionLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
