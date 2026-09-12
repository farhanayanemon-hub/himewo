import { useState, useCallback, useMemo } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetWatchFeed,
  getGetWatchFeedQueryKey,
  type Post,
} from "@workspace/api-client-react";
import { PostCard } from "@/components/PostCard";
import { CommentsSheet } from "@/components/CommentsSheet";
import { ShareSheet } from "@/components/ShareSheet";
import { useColors } from "@/hooks/useColors";

const PAGE_SIZE = 10;

export default function WatchScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(null);
  const [sharePostId, setSharePostId] = useState<number | null>(null);
  const [feedItems, setFeedItems] = useState<Post[]>([]);

  const { data: page, isLoading, isFetching, refetch } = useGetWatchFeed(
    { cursor, limit: PAGE_SIZE },
    { query: { queryKey: getGetWatchFeedQueryKey({ cursor, limit: PAGE_SIZE }) } }
  );

  const onRefresh = useCallback(() => {
    setCursor(undefined);
    qc.invalidateQueries({ queryKey: ["/api/watch"] });
    refetch().then((res) => {
      if (res.data) {
        setFeedItems(res.data);
      }
    });
  }, [qc, refetch]);

  // Append new items when page arrives
  useMemo(() => {
    if (!page) return;
    if (cursor === undefined) {
      setFeedItems(page);
    } else {
      setFeedItems((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const newOnes = page.filter((p) => !existingIds.has(p.id));
        return [...prev, ...newOnes];
      });
    }
  }, [page, cursor]);

  const onEndReached = useCallback(() => {
    if (isFetching || !feedItems.length) return;
    const last = feedItems[feedItems.length - 1];
    if (last) {
      setCursor(last.id);
    }
  }, [isFetching, feedItems]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={c.foreground} />
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={[styles.badgeIcon, { backgroundColor: "#06b6d420" }]}>
              <Ionicons name="tv" size={18} color="#06b6d4" />
            </View>
            <Text style={[styles.title, { color: c.foreground }]}>Watch</Text>
          </View>
        </View>

        <Pressable
          onPress={() => router.push("/search")}
          hitSlop={8}
          style={[styles.iconBtn, { backgroundColor: c.secondary }]}
        >
          <Ionicons name="search" size={20} color={c.foreground} />
        </Pressable>
      </View>

      {isLoading && !feedItems.length ? (
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color={c.primary} />
          <Text style={{ color: c.mutedForeground, marginTop: 12, fontSize: 14 }}>
            Loading videos...
          </Text>
        </View>
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onComment={() => setActiveCommentPostId(item.id)}
              onShare={() => setSharePostId(item.id)}
            />
          )}
          contentContainerStyle={{ paddingBottom: 32 }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && cursor === undefined}
              onRefresh={onRefresh}
              tintColor={c.primary}
            />
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.5}
          ListEmptyComponent={
            <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
              <View style={[styles.emptyIconWrap, { backgroundColor: c.secondary }]}>
                <Ionicons name="film-outline" size={42} color={c.mutedForeground} />
              </View>
              <Text style={[styles.emptyTitle, { color: c.foreground }]}>
                No videos yet
              </Text>
              <Text style={[styles.emptySub, { color: c.mutedForeground }]}>
                Videos shared by people and hubs will show up here.
              </Text>
            </View>
          }
          ListFooterComponent={
            isFetching && cursor !== undefined ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator size="small" color={c.primary} />
              </View>
            ) : null
          }
        />
      )}

      <CommentsSheet
        postId={activeCommentPostId}
        visible={activeCommentPostId !== null}
        onClose={() => setActiveCommentPostId(null)}
      />

      <ShareSheet
        postId={sharePostId}
        visible={sharePostId !== null}
        onClose={() => setSharePostId(null)}
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
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCard: {
    margin: 16,
    padding: 32,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    marginBottom: 6,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
});
