import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
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
  useGetMarketplaceListing,
  useUpdateMarketplaceListing,
  useDeleteMarketplaceListing,
  useCreateConversation,
  ConversationType,
  getListMarketplaceListingsQueryKey,
  getGetMarketplaceListingQueryKey,
  getGetSellingDashboardQueryKey,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";
import { categoryLabel, conditionLabel, formatPrice } from "@/constants/marketplace";
import { shadow, glow } from "@/constants/shadows";

export default function MarketplaceDetailScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { id: idParam } = useLocalSearchParams<{ id: string }>();
  const id = Number(idParam);

  const { data: listing, isLoading } = useGetMarketplaceListing(id);
  const updateListing = useUpdateMarketplaceListing();
  const deleteListing = useDeleteMarketplaceListing();
  const createConversation = useCreateConversation();
  const [activePhoto, setActivePhoto] = useState(0);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetMarketplaceListingQueryKey(id) });
    qc.invalidateQueries({ queryKey: getGetSellingDashboardQueryKey() });
  };

  if (isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator color={c.primary} size="large" />
      </View>
    );
  }

  if (!listing) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <Text style={{ color: c.mutedForeground, fontFamily: "Inter_500Medium" }}>
          Listing not found
        </Text>
      </View>
    );
  }

  const isOwner = listing.viewerIsSeller;
  const photos = listing.photos ?? [];

  const toggleSold = () =>
    updateListing.mutate(
      { id, data: { status: listing.status === "sold" ? "available" : "sold" } },
      { onSuccess: invalidate },
    );

  const onMessageSeller = async () => {
    if (!listing) return;
    try {
      const conv = await createConversation.mutateAsync({
        data: { type: ConversationType.direct, memberIds: [listing.seller.id] },
      });
      router.push(`/messages/${conv.id}`);
    } catch {
      router.push("/messages");
    }
  };

  const confirmDelete = () =>
    Alert.alert("Delete listing", "Eta delete korbe?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteListing.mutate(
            { id },
            {
              onSuccess: () => {
                invalidate();
                router.back();
              },
            },
          ),
      },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        <View style={[styles.hero, { backgroundColor: c.secondary }]}>
          {photos[activePhoto] ? (
            <Image source={{ uri: photos[activePhoto] }} style={StyleSheet.absoluteFill} contentFit="cover" />
          ) : (
            <Ionicons name="image-outline" size={48} color={c.mutedForeground} />
          )}
          {listing.status === "sold" ? (
            <View style={[styles.soldBadge, { backgroundColor: c.destructive }]}>
              <Text style={styles.soldText}>SOLD</Text>
            </View>
          ) : null}
        </View>

        {photos.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, padding: 12 }}
          >
            {photos.map((p, i) => (
              <Pressable
                key={i}
                onPress={() => setActivePhoto(i)}
                style={[
                  styles.thumb,
                  { borderColor: i === activePhoto ? c.primary : "transparent" },
                ]}
              >
                <Image source={{ uri: p }} style={{ width: "100%", height: "100%" }} contentFit="cover" />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}

        <View style={{ padding: 16, gap: 12 }}>
          <View>
            <Text style={[styles.title, { color: c.foreground }]}>{listing.title}</Text>
            <Text style={[styles.price, { color: c.primary }]}>
              {formatPrice(listing.price, listing.currency)}
            </Text>
          </View>

          <View style={styles.tagsRow}>
            <Tag icon="pricetag" label={categoryLabel(listing.category)} c={c} />
            <Tag label={conditionLabel(listing.condition)} c={c} />
            {listing.location ? <Tag icon="location" label={listing.location} c={c} /> : null}
          </View>

          {listing.description ? (
            <View style={[styles.block, { backgroundColor: c.card, borderColor: c.border }, shadow("sm")]}>
              <Text style={[styles.blockTitle, { color: c.foreground }]}>Description</Text>
              <Text style={[styles.desc, { color: c.foreground }]}>{listing.description}</Text>
            </View>
          ) : null}

          <Pressable
            style={[styles.sellerRow, { backgroundColor: c.card, borderColor: c.border }, shadow("sm")]}
            onPress={() => router.push(`/profile/${listing.seller.id}`)}
          >
            <Avatar uri={listing.seller.avatarUrl} name={listing.seller.displayName} size={44} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.sellerName, { color: c.foreground }]}>
                {listing.seller.displayName}
              </Text>
              <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                @{listing.seller.username}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
          </Pressable>

          {isOwner ? (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Pressable
                style={[
                  styles.primaryBtn,
                  { backgroundColor: listing.status === "sold" ? c.secondary : c.primary, flex: 1 },
                ]}
                onPress={toggleSold}
                disabled={updateListing.isPending}
              >
                {updateListing.isPending ? (
                  <ActivityIndicator color={listing.status === "sold" ? c.foreground : "#fff"} size="small" />
                ) : (
                  <Text
                    style={[
                      styles.primaryBtnText,
                      { color: listing.status === "sold" ? c.foreground : "#fff" },
                    ]}
                  >
                    {listing.status === "sold" ? "Mark available" : "Mark as sold"}
                  </Text>
                )}
              </Pressable>
              <Pressable
                style={[styles.iconBtn, { backgroundColor: c.secondary }]}
                onPress={confirmDelete}
                disabled={deleteListing.isPending}
              >
                <Ionicons name="trash-outline" size={20} color={c.destructive} />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: c.primary }, glow(c.primary)]}
              onPress={onMessageSeller}
              disabled={createConversation.isPending}
            >
              {createConversation.isPending ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="chatbubble-ellipses" size={18} color="#fff" />
                  <Text style={[styles.primaryBtnText, { color: "#fff" }]}>Message seller</Text>
                </>
              )}
            </Pressable>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function Tag({
  icon,
  label,
  c,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.tag, { backgroundColor: c.secondary }]}>
      {icon ? <Ionicons name={icon} size={13} color={c.mutedForeground} /> : null}
      <Text style={{ color: c.foreground, fontFamily: "Inter_500Medium", fontSize: 13 }}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  hero: { width: "100%", aspectRatio: 1, alignItems: "center", justifyContent: "center" },
  soldBadge: {
    position: "absolute",
    top: 14,
    left: 14,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  soldText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 12 },
  thumb: { width: 64, height: 64, borderRadius: 10, overflow: "hidden", borderWidth: 2 },
  title: { fontFamily: "Inter_700Bold", fontSize: 22 },
  price: { fontFamily: "Inter_700Bold", fontSize: 22, marginTop: 4 },
  tagsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  block: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 14, gap: 6 },
  blockTitle: { fontFamily: "Inter_700Bold", fontSize: 16 },
  desc: { fontFamily: "Inter_400Regular", fontSize: 15, lineHeight: 21 },
  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  sellerName: { fontFamily: "Inter_700Bold", fontSize: 16 },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  primaryBtnText: { fontFamily: "Inter_700Bold", fontSize: 15 },
  iconBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
