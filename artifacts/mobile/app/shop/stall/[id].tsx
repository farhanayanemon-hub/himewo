import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useGetStall,
  useGetStallProducts,
  getGetStallQueryKey,
  getGetStallProductsQueryKey,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";
import { formatTaka } from "@/constants/shop";
import { shadow } from "@/constants/shadows";

export default function StallScreen() {
  const c = useColors();
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <FlatList
        data={products ?? []}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 96, gap: 12 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 16, gap: 14 }}>
            <View
              style={[
                styles.stallCard,
                { backgroundColor: c.card, borderColor: c.border },
                shadow("sm"),
              ]}
            >
              <Avatar uri={stall?.avatarUrl} name={stall?.name} size={56} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.stallName, { color: c.foreground }]} numberOfLines={1}>
                  {stall?.name ?? (loadingStall ? "Loading…" : "Stall")}
                </Text>
                <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
                  {stall?.productCount ?? products?.length ?? 0} products
                </Text>
              </View>
            </View>
            <Text style={[styles.sectionTitle, { color: c.foreground }]}>Products</Text>
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
  stallCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  stallName: { fontFamily: "Inter_700Bold", fontSize: 18 },
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
