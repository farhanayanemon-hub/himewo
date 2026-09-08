import { useState, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
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
  useGetStall,
  useGetStallProducts,
  useFollowStall,
  useUnfollowStall,
  getGetStallQueryKey,
  getGetStallProductsQueryKey,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";
import { formatTaka } from "@/constants/shop";
import { shadow } from "@/constants/shadows";

export default function StallScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const params = useLocalSearchParams<{ id: string }>();
  const stallId = Number(params.id);
  const valid = Number.isFinite(stallId);

  const { data: stall, isLoading: loadingStall } = useGetStall(stallId, {
    query: { enabled: valid, queryKey: getGetStallQueryKey(stallId) },
  });
  const { data: products, isLoading: loadingProducts } = useGetStallProducts(
    stallId,
    undefined,
    {
      query: { enabled: valid, queryKey: getGetStallProductsQueryKey(stallId) },
    },
  );

  const followStall = useFollowStall();
  const unfollowStall = useUnfollowStall();
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (stall) {
      setIsFollowing(Boolean((stall as any).isFollowing));
      setFollowersCount(Number((stall as any).followerCount ?? 0));
    }
  }, [stall]);

  const handleToggleFollow = () => {
    if (!stall) return;
    if (isFollowing) {
      setIsFollowing(false);
      setFollowersCount((cnt) => Math.max(0, cnt - 1));
      unfollowStall.mutate(
        { id: stall.id },
        {
          onSuccess: (data: any) => {
            setFollowersCount(data.count ?? 0);
            setIsFollowing(Boolean(data.isFollowing));
            qc.invalidateQueries({ queryKey: getGetStallQueryKey(stall.id) });
          },
          onError: () => {
            setIsFollowing(true);
            setFollowersCount((cnt) => cnt + 1);
          },
        },
      );
    } else {
      setIsFollowing(true);
      setFollowersCount((cnt) => cnt + 1);
      followStall.mutate(
        { id: stall.id },
        {
          onSuccess: (data: any) => {
            setFollowersCount(data.count ?? 0);
            setIsFollowing(Boolean(data.isFollowing));
            qc.invalidateQueries({ queryKey: getGetStallQueryKey(stall.id) });
          },
          onError: () => {
            setIsFollowing(false);
            setFollowersCount((cnt) => Math.max(0, cnt - 1));
          },
        },
      );
    }
  };

  const openUrl = async (url: string) => {
    try {
      const full = url.startsWith("http") ? url : `https://${url}`;
      await Linking.openURL(full);
    } catch {}
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <FlatList
        data={products ?? []}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 96, gap: 12 }}
        ListHeaderComponent={
          <View style={{ gap: 14, paddingBottom: 6 }}>
            {/* Cover Banner */}
            <View style={[styles.coverWrap, { backgroundColor: c.secondary }]}>
              {(stall as any)?.coverUrl ? (
                <Image
                  source={{ uri: (stall as any).coverUrl }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.coverPlaceholder}>
                  <Ionicons name="storefront-outline" size={48} color="#a855f744" />
                </View>
              )}
            </View>

            {/* Profile Info Card */}
            <View style={{ paddingHorizontal: 16 }}>
              <View
                style={[
                  styles.stallCard,
                  { backgroundColor: c.card, borderColor: c.border },
                  shadow("sm"),
                ]}
              >
                {/* Header Row with Avatar & Follow Button */}
                <View style={styles.headerRow}>
                  <View style={[styles.avatarWrap, { borderColor: c.card }]}>
                    <Avatar uri={stall?.avatarUrl} name={stall?.name} size={64} />
                  </View>

                  <Pressable
                    onPress={handleToggleFollow}
                    disabled={followStall.isPending || unfollowStall.isPending}
                    style={[
                      styles.followBtn,
                      isFollowing
                        ? { backgroundColor: c.secondary, borderColor: c.border, borderWidth: 1 }
                        : { backgroundColor: "#a855f7" },
                    ]}
                  >
                    <Ionicons
                      name={isFollowing ? "checkmark" : "add"}
                      size={15}
                      color={isFollowing ? c.foreground : "#fff"}
                    />
                    <Text
                      style={[
                        styles.followBtnText,
                        { color: isFollowing ? c.foreground : "#fff" },
                      ]}
                    >
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                </View>

                {/* Stall Name & Follower Count */}
                <View style={{ marginTop: 6, gap: 3 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={[styles.stallName, { color: c.foreground }]} numberOfLines={1}>
                      {stall?.name ?? (loadingStall ? "Loading…" : "Stall")}
                    </Text>
                    <View style={styles.shopBadge}>
                      <Text style={styles.shopBadgeText}>Shop</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Text style={{ color: c.foreground, fontSize: 13, fontFamily: "Inter_600SemiBold" }}>
                      {followersCount} {followersCount === 1 ? "follower" : "followers"}
                    </Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 13 }}>·</Text>
                    <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                      {stall?.productCount ?? products?.length ?? 0} products
                    </Text>
                  </View>

                  {(stall?.ratingCount ?? 0) > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Ionicons name="star" size={13} color="#f59e0b" />
                      <Text style={{ color: c.mutedForeground, fontSize: 12 }}>
                        {(stall?.ratingAvg ?? 0).toFixed(1)} ({stall?.ratingCount} reviews)
                      </Text>
                    </View>
                  )}
                </View>

                {/* Description / Bio */}
                {Boolean((stall as any)?.description) && (
                  <Text style={[styles.description, { color: c.foreground }]}>
                    {(stall as any).description}
                  </Text>
                )}

                {/* Badges / Chips: Website, Address, Phone */}
                <View style={styles.metaRow}>
                  {Boolean(stall?.address) && (
                    <View style={[styles.chip, { backgroundColor: c.secondary }]}>
                      <Ionicons name="location-outline" size={13} color="#a855f7" />
                      <Text style={[styles.chipText, { color: c.foreground }]} numberOfLines={1}>
                        {stall?.address}
                      </Text>
                    </View>
                  )}

                  {Boolean((stall as any)?.website) && (
                    <Pressable
                      onPress={() => openUrl((stall as any).website)}
                      style={[styles.chip, { backgroundColor: "#a855f715" }]}
                    >
                      <Ionicons name="globe-outline" size={13} color="#a855f7" />
                      <Text
                        style={[styles.chipText, { color: "#a855f7", fontFamily: "Inter_600SemiBold" }]}
                        numberOfLines={1}
                      >
                        {(stall as any).website.replace(/^https?:\/\//, "")}
                      </Text>
                    </Pressable>
                  )}

                  {Boolean(stall?.contactPhone) && (
                    <View style={[styles.chip, { backgroundColor: c.secondary }]}>
                      <Ionicons name="call-outline" size={13} color="#a855f7" />
                      <Text style={[styles.chipText, { color: c.foreground }]} numberOfLines={1}>
                        {stall?.contactPhone}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>

            <View style={{ paddingHorizontal: 16, marginTop: 4 }}>
              <Text style={[styles.sectionTitle, { color: c.foreground }]}>
                Products ({stall?.productCount ?? products?.length ?? 0})
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          loadingProducts ? (
            <ActivityIndicator color={c.primary} size="large" style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="cube-outline" size={40} color={c.mutedForeground} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                No products in this stall yet.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={[
              styles.card,
              { backgroundColor: c.card, borderColor: c.border },
              shadow("sm"),
            ]}
            onPress={() => router.push(`/shop/product/${item.id}`)}
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
            </View>
            <View style={{ padding: 10 }}>
              <Text style={[styles.price, { color: c.foreground }]}>
                {formatTaka(item.priceCents)}
              </Text>
              <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  coverWrap: {
    width: "100%",
    height: 140,
    overflow: "hidden",
  },
  coverPlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stallCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: -36,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  avatarWrap: {
    borderWidth: 3,
    borderRadius: 36,
    overflow: "hidden",
  },
  followBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
  },
  followBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  stallName: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    flexShrink: 1,
  },
  shopBadge: {
    backgroundColor: "#a855f720",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  shopBadgeText: {
    color: "#a855f7",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    textTransform: "uppercase",
  },
  description: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
    maxWidth: 220,
  },
  chipText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  card: {
    flex: 1,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  cardImage: {
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  price: { fontFamily: "Inter_700Bold", fontSize: 16 },
  cardTitle: { fontFamily: "Inter_500Medium", fontSize: 14, marginTop: 2 },
  empty: { alignItems: "center", gap: 10, marginTop: 48, paddingHorizontal: 32 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15, textAlign: "center" },
});

