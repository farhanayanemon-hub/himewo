import { useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetHashtagPosts,
  getGetHashtagPostsQueryKey,
  type Post,
} from "@workspace/api-client-react";
import { PostCard } from "@/components/PostCard";
import { CommentsSheet } from "@/components/CommentsSheet";
import { useColors } from "@/hooks/useColors";

const PAGE_SIZE = 10;

export default function HashtagScreen() {
  const c = useColors();
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const safeTag = tag ?? "";

  const [pages, setPages] = useState<Post[][]>([]);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const [activePost, setActivePost] = useState<number | null>(null);

  useEffect(() => {
    setPages([]);
    setCursor(undefined);
    setHasMore(true);
  }, [safeTag]);

  const { data: page, isLoading, isFetching, refetch } = useGetHashtagPosts(
    safeTag,
    { cursor, limit: PAGE_SIZE },
    {
      query: {
        enabled: !!safeTag,
        queryKey: getGetHashtagPostsQueryKey(safeTag, {
          cursor,
          limit: PAGE_SIZE,
        }),
      },
    },
  );

  useEffect(() => {
    if (!page) return;
    setPages((prev) => {
      if (cursor === undefined) return [page];
      return [...prev, page];
    });
    if (page.length < PAGE_SIZE) setHasMore(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const posts = pages.flat();
  const lastId = posts.length ? posts[posts.length - 1].id : undefined;

  const loadMore = useCallback(() => {
    if (!hasMore || isFetching || lastId === undefined) return;
    setCursor(lastId);
  }, [hasMore, isFetching, lastId]);

  const onRefresh = useCallback(() => {
    setPages([]);
    setCursor(undefined);
    setHasMore(true);
    refetch();
  }, [refetch]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="arrow-back" size={22} color={c.foreground} />
        </Pressable>
        <Text style={[styles.title, { color: c.foreground }]}>#{safeTag}</Text>
        <View style={{ width: 22 }} />
      </View>

      {isLoading && posts.length === 0 ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PostCard post={item} onComment={() => setActivePost(item.id)} />
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && cursor === undefined && posts.length > 0}
              onRefresh={onRefresh}
              tintColor={c.primary}
            />
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 40, paddingHorizontal: 20 }}>
              <Ionicons name="pricetag-outline" size={40} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, marginTop: 10, textAlign: "center" }}>
                No posts with #{safeTag} yet.
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetching && posts.length > 0 ? (
              <ActivityIndicator color={c.primary} style={{ marginVertical: 16 }} />
            ) : null
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
  title: { fontFamily: "Inter_700Bold", fontSize: 17 },
});
