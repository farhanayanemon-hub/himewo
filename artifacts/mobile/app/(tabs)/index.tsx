import { useState, useCallback, useRef } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getFeed,
  getGetFeedQueryKey,
  useGetTodaysBirthdays,
  useServeAds,
  useRecordAdImpression,
  type Post,
  type ServedAd,
} from "@workspace/api-client-react";
import type { ViewToken } from "react-native";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { SponsoredCard } from "@/components/SponsoredCard";
import { StoryBar } from "@/components/StoryBar";
import { CommentsSheet } from "@/components/CommentsSheet";
import { ShareSheet } from "@/components/ShareSheet";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import { useColors } from "@/hooks/useColors";

const FEED_LIMIT = 10;

type FeedItem = { kind: "post"; post: Post } | { kind: "ad"; ad: ServedAd };

export default function HomeScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { actingPage } = useActingPage();
  const [activePost, setActivePost] = useState<number | null>(null);
  const [sharePostId, setSharePostId] = useState<number | null>(null);

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

  const { data: ads } = useServeAds({ placement: "feed", limit: 3 });
  const AD_EVERY = 5;
  const feedItems: FeedItem[] = [];
  posts.forEach((post, i) => {
    if (i > 0 && i % AD_EVERY === 0 && ads && ads[i / AD_EVERY - 1]) {
      feedItems.push({ kind: "ad", ad: ads[i / AD_EVERY - 1] });
    }
    feedItems.push({ kind: "post", post });
  });

  const recordImpression = useRecordAdImpression();
  const impressionFnRef = useRef(recordImpression);
  impressionFnRef.current = recordImpression;
  const seenAds = useRef<Set<number>>(new Set());
  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      for (const vi of viewableItems) {
        const item = vi.item as FeedItem;
        if (item.kind === "ad" && !seenAds.current.has(item.ad.adId)) {
          seenAds.current.add(item.ad.adId);
          impressionFnRef.current.mutate({
            id: item.ad.adId,
            data: { placement: item.ad.placement as never },
          });
        }
      }
    },
  ).current;

  const onRefresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    refetch();
  }, [qc, refetch]);

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const onShare = useCallback((postId: number) => {
    setSharePostId(postId);
  }, []);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Pressable
            style={[styles.iconBtn, { backgroundColor: c.secondary }]}
            onPress={() => router.push("/menu" as never)}
          >
            <Ionicons name="menu" size={20} color={c.foreground} />
          </Pressable>
          <Text style={[styles.brand, { color: c.primary }]}>HiMewo</Text>
        </View>
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
          data={feedItems}
          keyExtractor={(item) =>
            item.kind === "ad" ? `ad-${item.ad.adId}` : `post-${item.post.id}`
          }
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={onRefresh} tintColor={c.primary} />
          }
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
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
              <BirthdayBanner />
              <Pressable
                style={[styles.composer, { backgroundColor: c.card }]}
                onPress={() => router.push("/create-post")}
              >
                <Avatar
                  uri={actingPage?.avatarUrl ?? user?.avatarUrl}
                  name={actingPage?.name ?? user?.displayName}
                  size={40}
                />
                <View style={[styles.composerInput, { backgroundColor: c.secondary }]}>
                  <Text style={{ color: c.mutedForeground }}>
                    {actingPage ? `What's on your mind, ${actingPage.name}?` : "What's on your mind?"}
                  </Text>
                </View>
                <Pressable
                  hitSlop={10}
                  onPress={() => router.push("/create-post?media=1")}
                >
                  <Ionicons name="images" size={24} color="#31a24c" />
                </Pressable>
              </Pressable>
            </>
          }
          renderItem={({ item }) =>
            item.kind === "ad" ? (
              <SponsoredCard ad={item.ad} />
            ) : (
              <PostCard
                post={item.post}
                onComment={() => setActivePost(item.post.id)}
                onShare={() => onShare(item.post.id)}
              />
            )
          }
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

      <ShareSheet
        postId={sharePostId}
        visible={sharePostId != null}
        onClose={() => setSharePostId(null)}
      />
    </SafeAreaView>
  );
}

function BirthdayBanner() {
  const c = useColors();
  const { data: birthdays } = useGetTodaysBirthdays();
  if (!birthdays?.length) return null;
  const names = birthdays.map((b) => b.displayName).join(", ");
  return (
    <Pressable
      style={[styles.birthday, { backgroundColor: c.card }]}
      onPress={() => router.push(`/profile/${birthdays[0].id}`)}
    >
      <View style={[styles.birthdayIcon, { backgroundColor: c.primary }]}>
        <Ionicons name="gift" size={20} color="#fff" />
      </View>
      <Text style={{ color: c.foreground, flex: 1, fontFamily: "Inter_500Medium" }}>
        <Text style={{ fontFamily: "Inter_700Bold" }}>{names}</Text>
        {birthdays.length > 1 ? " have birthdays today! 🎂" : " has a birthday today! 🎂"}
      </Text>
    </Pressable>
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
  },
  brand: { fontFamily: "Inter_700Bold", fontSize: 26 },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  composer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    marginBottom: 8,
  },
  composerInput: {
    flex: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  birthday: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    marginBottom: 8,
  },
  birthdayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
});
