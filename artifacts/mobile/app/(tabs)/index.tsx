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
import * as Haptics from "expo-haptics";
import {
  getFeed,
  getGetFeedQueryKey,
  useGetTodaysBirthdays,
  useGetFollowedShopShowcase,
  useServeAds,
  useRecordAdImpression,
  useGetUnreadNotificationCount,
  getGetUnreadNotificationCountQueryKey,
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
import { CreateActionSheet } from "@/components/CreateActionSheet";
import { CreateMediaLauncherSheet } from "@/components/CreateMediaLauncherSheet";
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
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [launcherMode, setLauncherMode] = useState<"story" | "reel" | null>(null);

  const { data: unreadNotifData } = useGetUnreadNotificationCount({
    query: {
      refetchInterval: 15_000,
      queryKey: getGetUnreadNotificationCountQueryKey(),
    },
  });
  const unreadNotificationCount = (unreadNotifData as { count?: number } | undefined)?.count ?? 0;

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

  const flatListRef = useRef<FlatList>(null);

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  useEffect(() => {
    const subCreate = DeviceEventEmitter.addListener("himewo:open-create-sheet", () => {
      setCreateSheetOpen(true);
    });
    const subScroll = DeviceEventEmitter.addListener("himewo:scroll-feed-to-top", () => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    });
    return () => {
      subCreate.remove();
      subScroll.remove();
    };
  }, []);

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
      {/* 🌟 120Hz GLOSSY TOP HEADER: [ ☰ ]   🐱 HiMewo   [ 🔔 count ] [ 🔍 ] */}
      <View style={[styles.header, { backgroundColor: c.background }]}>
        {/* Left: Plump Glossy Hamburger Button [ ☰ ] */}
        <Pressable
          style={({ pressed }) => [
            styles.glossyCircleBtn,
            {
              backgroundColor: c.card,
              borderColor: c.border,
              transform: [{ scale: pressed ? 0.92 : 1 }],
            },
          ]}
          onPress={() => {
            triggerHaptic();
            router.push("/menu" as never);
          }}
          accessibilityLabel="Open Menu"
          hitSlop={8}
        >
          <Ionicons name="menu" size={24} color={c.foreground} />
        </Pressable>

        {/* Center: HiMewo Pixel Cat Logo + Brand Typography */}
        <Pressable
          style={({ pressed }) => [
            styles.logoCenterCluster,
            { transform: [{ scale: pressed ? 0.94 : 1 }] },
          ]}
          onPress={() => {
            triggerHaptic();
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
            onRefresh();
          }}
          accessibilityLabel="HiMewo Feed, Tap to scroll to top"
        >
          <Image
            source={require("@/assets/images/icon.png")}
            style={styles.headerLogo}
            contentFit="cover"
          />
          <Text style={[styles.headerBrandText, { color: c.foreground }]}>
            HiMewo
          </Text>
        </Pressable>

        {/* Right Action Cluster: Glossy [ 🔔 count ] pill & [ 🔍 ] circle */}
        <View style={styles.rightHeaderCluster}>
          {/* Notification Pill */}
          <Pressable
            style={({ pressed }) => [
              styles.glossyNotifPill,
              {
                backgroundColor: c.card,
                borderColor: c.border,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
            ]}
            onPress={() => {
              triggerHaptic();
              router.push("/notifications" as never);
            }}
            accessibilityLabel="Notifications"
            hitSlop={8}
          >
            <Ionicons name="notifications-outline" size={20} color={c.foreground} />
            <Text style={[styles.notifCountText, { color: c.foreground }]}>
              {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
            </Text>
          </Pressable>

          {/* Search Button */}
          <Pressable
            style={({ pressed }) => [
              styles.glossyCircleBtn,
              {
                backgroundColor: c.card,
                borderColor: c.border,
                transform: [{ scale: pressed ? 0.92 : 1 }],
              },
            ]}
            onPress={() => {
              triggerHaptic();
              router.push("/search");
            }}
            accessibilityLabel="Search"
            hitSlop={8}
          >
            <Ionicons name="search" size={20} color={c.foreground} />
          </Pressable>
        </View>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          ref={flatListRef}
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
          contentContainerStyle={{ paddingBottom: 115 }}
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
            <View style={{ marginBottom: 8 }}>
              {/* StoryBar without bottom gap */}
              <StoryBar onCreatePress={() => setCreateSheetOpen(true)} />

              {/* Sleek Retained Post Composer */}
              <Pressable
                style={({ pressed }) => [
                  styles.sleekComposer,
                  {
                    backgroundColor: c.card,
                    borderColor: c.border,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
                onPress={() => {
                  triggerHaptic();
                  router.push("/create-post");
                }}
              >
                <Avatar
                  uri={actingPage ? actingPage.avatarUrl : user?.avatarUrl}
                  name={actingPage?.name ?? user?.displayName}
                  size={40}
                />
                <View style={[styles.composerInputPill, { backgroundColor: c.secondary }]}>
                  <Text style={{ color: c.mutedForeground, fontSize: 13, fontWeight: "500" }}>
                    {actingPage ? `What's on your mind, ${actingPage.name}?` : "What's on your mind?"}
                  </Text>
                </View>
                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    triggerHaptic();
                    router.push("/create-post?media=1");
                  }}
                  style={styles.composerMediaBtn}
                >
                  <Ionicons name="images" size={22} color="#10B981" />
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

      <CreateActionSheet
        visible={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        onSelectStory={() => setLauncherMode("story")}
        onSelectReel={() => setLauncherMode("reel")}
      />

      <CreateMediaLauncherSheet
        visible={!!launcherMode}
        mode={launcherMode ?? "story"}
        onClose={() => setLauncherMode(null)}
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
  },
  glossyCircleBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        boxShadow: "0 4px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  logoCenterCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 18,
  },
  headerLogo: {
    width: 34,
    height: 34,
    borderRadius: 12,
  },
  headerBrandText: {
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: -0.3,
  },
  rightHeaderCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  glossyNotifPill: {
    height: 46,
    paddingHorizontal: 14,
    borderRadius: 23,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    ...Platform.select({
      web: {
        boxShadow: "0 4px 12px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.03)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  notifCountText: {
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  sleekComposer: {
    marginHorizontal: 14,
    marginTop: 4,
    marginBottom: 8,
    padding: 10,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...Platform.select({
      web: {
        boxShadow: "0 3px 10px rgba(0,0,0,0.03)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
      },
    }),
  },
  composerInputPill: {
    flex: 1,
    height: 38,
    borderRadius: 19,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  composerMediaBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
