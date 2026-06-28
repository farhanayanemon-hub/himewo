import { useState, useCallback } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useListSavedItems,
  useUnsaveItem,
  useSharePost,
  getListSavedItemsQueryKey,
  getGetFeedQueryKey,
  getListReelsQueryKey,
  getListMarketplaceListingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PostCard } from "@/components/PostCard";
import { CommentsSheet } from "@/components/CommentsSheet";
import { useColors } from "@/hooks/useColors";
import { formatPrice } from "@/constants/marketplace";
import { shadow } from "@/constants/shadows";

export default function SavedScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { data: items, isLoading, isRefetching, refetch } = useListSavedItems();
  const unsaveItem = useUnsaveItem();
  const sharePost = useSharePost();
  const [activePost, setActivePost] = useState<number | null>(null);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
    qc.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey() });
  }, [qc]);

  const onShare = useCallback(
    (postId: number) => {
      sharePost.mutate(
        { id: postId, data: {} },
        {
          onSuccess: () => {
            qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
            Alert.alert("Shared", "Post tomar timeline-e share kora hoyeche.");
          },
          onError: () => Alert.alert("Error", "Share kora gelo na."),
        },
      );
    },
    [sharePost, qc],
  );

  const unsaveListing = (entityId: number) =>
    unsaveItem.mutate(
      { entityType: "listing", entityId },
      { onSettled: invalidate },
    );

  const unsaveReel = (entityId: number) =>
    unsaveItem.mutate(
      { entityType: "reel", entityId },
      {
        onSettled: () => {
          qc.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
          qc.invalidateQueries({ queryKey: getListReelsQueryKey() });
        },
      },
    );

  const savedListings = (items ?? []).filter(
    (i) => i.entityType === "listing" && i.listing,
  );
  const savedReels = (items ?? []).filter((i) => i.entityType === "reel" && i.reel);
  const savedPosts = (items ?? []).filter((i) => i.entityType === "post" && i.post);
  const isEmpty = !isLoading && (items?.length ?? 0) === 0;

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  if (isEmpty) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
        <View style={styles.center}>
          <View style={[styles.emptyIcon, { backgroundColor: c.secondary }]}>
            <Ionicons name="bookmark-outline" size={32} color={c.mutedForeground} />
          </View>
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>
            Akhono kichu save kora nei
          </Text>
          <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
            Feed ba Marketplace theke kichu pochondo hole save kore rakhun, pore
            ekhane khuje paben.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <FlatList
        data={savedPosts}
        keyExtractor={(item) => `post-${item.id}`}
        refreshing={isRefetching}
        onRefresh={refetch}
        contentContainerStyle={{ paddingBottom: 32 }}
        ListHeaderComponent={
          savedListings.length > 0 || savedReels.length > 0 ? (
            <View style={{ paddingTop: 12 }}>
              {savedListings.length > 0 ? (
                <>
                  <Text style={[styles.sectionTitle, { color: c.foreground }]}>
                    Saved items
                  </Text>
                  <View style={styles.listingGrid}>
                    {savedListings.map((i) => {
                      const item = i.listing!;
                      return (
                        <Pressable
                          key={`listing-${i.id}`}
                          style={[
                            styles.card,
                            { backgroundColor: c.card, borderColor: c.border },
                            shadow("sm"),
                          ]}
                          onPress={() => router.push(`/marketplace/${item.id}`)}
                        >
                          <View style={[styles.cardImage, { backgroundColor: c.secondary }]}>
                            {item.photos[0] ? (
                              <Image
                                source={{ uri: item.photos[0] }}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                              />
                            ) : (
                              <Ionicons name="image-outline" size={28} color={c.mutedForeground} />
                            )}
                            <Pressable
                              style={styles.unsaveBtn}
                              hitSlop={8}
                              onPress={() => unsaveListing(item.id)}
                            >
                              <Ionicons name="close" size={16} color="#fff" />
                            </Pressable>
                          </View>
                          <View style={{ padding: 10 }}>
                            <Text style={[styles.price, { color: c.foreground }]}>
                              {formatPrice(item.price, item.currency)}
                            </Text>
                            <Text
                              style={[styles.cardTitle, { color: c.foreground }]}
                              numberOfLines={1}
                            >
                              {item.title}
                            </Text>
                            {item.location ? (
                              <Text
                                style={[styles.cardMeta, { color: c.mutedForeground }]}
                                numberOfLines={1}
                              >
                                {item.location}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {savedReels.length > 0 ? (
                <>
                  <Text style={[styles.sectionTitle, { color: c.foreground }]}>
                    Saved reels
                  </Text>
                  <View style={styles.listingGrid}>
                    {savedReels.map((i) => {
                      const reel = i.reel!;
                      return (
                        <Pressable
                          key={`reel-${i.id}`}
                          style={[
                            styles.card,
                            { backgroundColor: c.card, borderColor: c.border },
                            shadow("sm"),
                          ]}
                          onPress={() => router.push("/(tabs)/reels")}
                        >
                          <View style={[styles.reelImage, { backgroundColor: "#000" }]}>
                            {reel.thumbnailUrl ? (
                              <Image
                                source={{ uri: reel.thumbnailUrl }}
                                style={StyleSheet.absoluteFill}
                                contentFit="cover"
                              />
                            ) : (
                              <Ionicons name="film-outline" size={28} color="#fff" />
                            )}
                            <View style={styles.playOverlay}>
                              <Ionicons name="play" size={26} color="#fff" />
                            </View>
                            <Pressable
                              style={styles.unsaveBtn}
                              hitSlop={8}
                              onPress={() => unsaveReel(reel.id)}
                            >
                              <Ionicons name="close" size={16} color="#fff" />
                            </Pressable>
                          </View>
                          <View style={{ padding: 10 }}>
                            <Text
                              style={[styles.cardTitle, { color: c.foreground }]}
                              numberOfLines={1}
                            >
                              {reel.author.displayName}
                            </Text>
                            {reel.caption ? (
                              <Text
                                style={[styles.cardMeta, { color: c.mutedForeground }]}
                                numberOfLines={1}
                              >
                                {reel.caption}
                              </Text>
                            ) : null}
                          </View>
                        </Pressable>
                      );
                    })}
                  </View>
                </>
              ) : null}

              {savedPosts.length > 0 ? (
                <Text style={[styles.sectionTitle, { color: c.foreground }]}>
                  Saved posts
                </Text>
              ) : null}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <PostCard
            post={item.post!}
            onComment={() => setActivePost(item.post!.id)}
            onShare={() => onShare(item.post!.id)}
          />
        )}
      />

      <CommentsSheet
        postId={activePost}
        visible={activePost != null}
        onClose={() => setActivePost(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  emptyText: { fontFamily: "Inter_400Regular", fontSize: 14, textAlign: "center", lineHeight: 20 },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    paddingHorizontal: 16,
    marginBottom: 12,
    marginTop: 8,
  },
  listingGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  card: {
    width: "47%",
    flexGrow: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardImage: { aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  reelImage: { aspectRatio: 3 / 4, alignItems: "center", justifyContent: "center" },
  playOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  unsaveBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },
  price: { fontFamily: "Inter_700Bold", fontSize: 16 },
  cardTitle: { fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 2 },
  cardMeta: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
});
