import { useState, useCallback, useRef, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
  StyleSheet,
  DeviceEventEmitter,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  getFeed,
  getGetFeedQueryKey,
  useGetTodaysBirthdays,
  useGetFollowedShopShowcase,
  useServeAds,
  useRecordAdImpression,
  useListConversations,
  type Post,
  type ServedAd,
} from "@workspace/api-client-react";
import type { ViewToken } from "react-native";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import { PostCard } from "@/components/PostCard";
import { SponsoredCard } from "@/components/SponsoredCard";
import { StoryBar } from "@/components/StoryBar";
import { ReelsShelf } from "@/components/ReelsShelf";
import { CommentsSheet } from "@/components/CommentsSheet";
import { ShareSheet } from "@/components/ShareSheet";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import { useColors } from "@/hooks/useColors";
import { formatTaka } from "@/constants/shop";
import { shadow } from "@/constants/shadows";

const FEED_LIMIT = 10;

type FeedItem =
  | { kind: "post"; post: Post }
  | { kind: "ad"; ad: ServedAd }
  | { kind: "reels" };

export default function HomeScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { actingPage } = useActingPage();
  const [activePost, setActivePost] = useState<number | null>(null);
  const [sharePostId, setSharePostId] = useState<number | null>(null);

  const { data: convsData } = useListConversations();
  const unreadMsgCount = (convsData ?? []).reduce(
    (acc: number, conv: any) => acc + (conv.unreadCount || 0),
    0,
  );

  const {
    data,
    isLoading,
    isRefetching,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: [...getGetFeedQueryKey(), "infinite", actingPage?.id ?? null],
    queryFn: ({ pageParam }) =>
      getFeed({
        cursor: pageParam as number | undefined,
        limit: FEED_LIMIT,
        ...(actingPage ? { pageId: actingPage.id } : {}),
      }),
    initialPageParam: undefined as number | undefined,
    getNextPageParam: (lastPage: Post[]) =>
      lastPage.length === FEED_LIMIT ? lastPage[lastPage.length - 1].id : undefined,
  });
  // The first page can contain boosted (hoisted) posts for new users; an old
  // boosted post may reappear at its natural chronological spot on a later
  // page, so dedupe by id to keep FlatList keys unique.
  const seenPostIds = new Set<number>();
  const posts = ((data?.pages.flat() ?? []) as Post[]).filter((p) => {
    if (seenPostIds.has(p.id)) return false;
    seenPostIds.add(p.id);
    return true;
  });

  const { data: ads } = useServeAds({ placement: "feed", limit: 3 });
  const AD_EVERY = 5;
  const REELS_AFTER = 4; // Show reels shelf after 4 posts
  const feedItems: FeedItem[] = [];
  let reelsInserted = false;
  posts.forEach((post, i) => {
    if (i > 0 && i % AD_EVERY === 0 && ads && ads[i / AD_EVERY - 1]) {
      feedItems.push({ kind: "ad", ad: ads[i / AD_EVERY - 1] });
    }
    feedItems.push({ kind: "post", post });
    if (i === REELS_AFTER - 1 && !reelsInserted) {
      feedItems.push({ kind: "reels" });
      reelsInserted = true;
    }
  });
  if (!reelsInserted && posts.length > 0 && posts.length < REELS_AFTER) {
    feedItems.push({ kind: "reels" });
  }

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

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener("himewo:reel-created", () => {
      onRefresh();
    });
    return () => sub.remove();
  }, [onRefresh]);

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
            style={[styles.iconBtn, { backgroundColor: c.secondary, position: "relative" }]}
            onPress={() => router.push("/messages")}
          >
            <Ionicons name="chatbubbles" size={20} color={c.foreground} />
            {unreadMsgCount > 0 ? (
              <View
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  minWidth: 16,
                  height: 16,
                  borderRadius: 8,
                  backgroundColor: c.destructive || "#ef4444",
                  alignItems: "center",
                  justifyContent: "center",
                  paddingHorizontal: 3,
                }}
              >
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "bold" }}>
                  {unreadMsgCount > 99 ? "99+" : unreadMsgCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={feedItems}
          keyExtractor={(item) =>
            item.kind === "ad"
              ? `ad-${item.ad.adId}`
              : item.kind === "reels"
                ? "feed-reels-shelf"
                : `post-${item.post.id}`
          }
          removeClippedSubviews={Platform.OS !== "web"}
          maxToRenderPerBatch={6}
          windowSize={7}
          initialNumToRender={5}
          updateCellsBatchingPeriod={50}
          showsVerticalScrollIndicator={false}
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
            <View style={{ borderBottomWidth: StyleSheet.hairlineWidth, borderColor: c.border, marginBottom: 8 }}>
              {/* StoryBar without bottom gap */}
              <StoryBar />

              {/* Clean Facebook-style divider line */}
              <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: c.border }} />

              {/* Post Composer directly attached */}
              <Pressable
                style={[styles.composer, { backgroundColor: c.card }]}
                onPress={() => router.push("/create-post")}
              >
                <Avatar
                  uri={actingPage ? actingPage.avatarUrl : user?.avatarUrl}
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

              <BirthdayBanner />
              <FollowedShopsShowcase />
            </View>
          }
          renderItem={({ item }) => {
            if (item.kind === "reels") {
              return <ReelsShelf />;
            }
            if (item.kind === "ad") {
              return <SponsoredCard ad={item.ad} />;
            }
            return (
              <PostCard
                post={item.post}
                onComment={() => setActivePost(item.post.id)}
                onShare={() => onShare(item.post.id)}
              />
            );
          }}
          ListEmptyComponent={
            <View>
              <View style={{ alignItems: "center", marginTop: 40, paddingHorizontal: 20, marginBottom: 20 }}>
                <Ionicons name="newspaper-outline" size={48} color={c.mutedForeground} />
                <Text style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}>
                  No posts yet. Be the first to share something!
                </Text>
              </View>
              <ReelsShelf />
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

function FollowedShopsShowcase() {
  const c = useColors();
  const { data: showcases } = useGetFollowedShopShowcase();

  if (!showcases || showcases.length === 0) return null;

  return (
    <View style={{ marginBottom: 8 }}>
      {showcases.map(({ stall, products }) => {
        if (!products || products.length === 0) return null;
        return (
          <View
            key={stall.id}
            style={[
              styles.showcaseCard,
              { backgroundColor: c.card, borderColor: c.border },
              shadow("sm"),
            ]}
          >
            {/* Header: Shop Info */}
            <View style={styles.showcaseHeader}>
              <Pressable
                style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}
                onPress={() => router.push(`/shop/stall/${stall.id}`)}
              >
                <Avatar uri={stall.avatarUrl} name={stall.name} size={38} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text
                      style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 14 }}
                      numberOfLines={1}
                    >
                      {stall.name}
                    </Text>
                    <View style={styles.shopBadge}>
                      <Text style={styles.shopBadgeText}>Shop</Text>
                    </View>
                  </View>
                  <Text style={{ color: c.mutedForeground, fontSize: 11 }} numberOfLines={1}>
                    {stall.followerCount ?? 0} {stall.followerCount === 1 ? "follower" : "followers"}
                    {stall.address ? ` • ${stall.address}` : ""}
                  </Text>
                </View>
              </Pressable>

              <Pressable
                style={[styles.visitBtn, { backgroundColor: c.secondary }]}
                onPress={() => router.push(`/shop/stall/${stall.id}`)}
              >
                <Text style={{ color: c.primary, fontFamily: "Inter_600SemiBold", fontSize: 11 }}>
                  Visit Shop
                </Text>
                <Ionicons name="chevron-forward" size={13} color={c.primary} />
              </Pressable>
            </View>

            {/* Horizontal Swipeable Products */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 10, paddingHorizontal: 12, paddingBottom: 2 }}
            >
              {products.map((prod) => {
                const thumb = prod.photos?.[0];
                return (
                  <Pressable
                    key={prod.id}
                    style={[
                      styles.productCard,
                      { backgroundColor: c.background, borderColor: c.border },
                    ]}
                    onPress={() => router.push(`/shop/product/${prod.id}`)}
                  >
                    <View style={[styles.productThumbBox, { backgroundColor: c.secondary }]}>
                      {thumb ? (
                        <Image
                          source={{ uri: thumb }}
                          style={{ width: "100%", height: "100%" }}
                          contentFit="cover"
                        />
                      ) : (
                        <Ionicons name="cube-outline" size={24} color={c.mutedForeground} />
                      )}
                    </View>
                    <View style={{ padding: 8, gap: 3 }}>
                      <Text
                        style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 12 }}
                        numberOfLines={1}
                      >
                        {prod.name}
                      </Text>
                      <Text
                        style={{ color: c.primary, fontFamily: "Inter_700Bold", fontSize: 13 }}
                      >
                        {formatTaka(prod.priceCents)}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        );
      })}
    </View>
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
    marginBottom: 0,
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
  showcaseCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    marginBottom: 8,
  },
  showcaseHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    marginBottom: 10,
    gap: 8,
  },
  shopBadge: {
    backgroundColor: "rgba(147, 51, 234, 0.12)",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  shopBadgeText: {
    color: "#9333ea",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
  visitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  productCard: {
    width: 135,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  productThumbBox: {
    width: 135,
    height: 100,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
});
