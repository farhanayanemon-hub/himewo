import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useBrowseProducts,
  useListShopCategories,
  getListShopCategoriesQueryKey,
  type ShopCategory,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { formatTaka } from "@/constants/shop";
import { shadow, glow } from "@/constants/shadows";

export default function ShopHomeScreen() {
  const c = useColors();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<ShopCategory | null>(null);

  const { data: categories } = useListShopCategories({
    query: { queryKey: getListShopCategoriesQueryKey() },
  });

  const { data, isLoading } = useBrowseProducts(
    {
      ...(search.trim() ? { search: search.trim() } : {}),
      ...(activeCategory ? { categoryId: activeCategory.id } : {}),
    },
  );
  const products = data ?? [];
  const showCategories =
    !activeCategory && !!categories && categories.length > 0;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <FlatList
        data={products}
        numColumns={2}
        keyExtractor={(item) => String(item.id)}
        columnWrapperStyle={{ gap: 12, paddingHorizontal: 16 }}
        contentContainerStyle={{ paddingBottom: 96, gap: 12 }}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 12 }}>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: c.card, borderColor: c.border },
                shadow("sm"),
              ]}
            >
              <Ionicons name="search" size={18} color={c.mutedForeground} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search Shop"
                placeholderTextColor={c.mutedForeground}
                underlineColorAndroid="transparent"
                style={[styles.searchInput, { color: c.foreground }]}
              />
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: c.secondary }]}
                onPress={() => router.push("/shop/orders")}
              >
                <Ionicons name="receipt-outline" size={16} color={c.foreground} />
                <Text style={[styles.actionText, { color: c.foreground }]}>My orders</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: c.primary }, glow(c.primary)]}
                onPress={() => router.push("/shop/my-stall")}
              >
                <Ionicons name="storefront" size={16} color="#fff" />
                <Text style={[styles.actionText, { color: "#fff" }]}>My stall</Text>
              </Pressable>
            </View>

            {showCategories ? (
              <View style={{ gap: 10 }}>
                <Text style={[styles.sectionTitle, { color: c.foreground }]}>
                  Categories
                </Text>
                <View style={styles.categoryGrid}>
                  {categories!.map((cat) => (
                    <Pressable
                      key={cat.id}
                      onPress={() => setActiveCategory(cat)}
                      style={[
                        styles.categoryCard,
                        { backgroundColor: c.card, borderColor: c.border },
                        shadow("sm"),
                      ]}
                    >
                      <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      <Text
                        style={[styles.categoryName, { color: c.foreground }]}
                        numberOfLines={1}
                      >
                        {cat.name}
                      </Text>
                      {cat.productCount != null ? (
                        <Text
                          style={[styles.categoryCount, { color: c.mutedForeground }]}
                          numberOfLines={1}
                        >
                          {cat.productCount} item{cat.productCount === 1 ? "" : "s"}
                        </Text>
                      ) : null}
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null}

            {activeCategory ? (
              <View style={styles.filterRow}>
                <View
                  style={[
                    styles.categoryChip,
                    { backgroundColor: c.primary + "22", borderColor: c.primary },
                  ]}
                >
                  <Text style={styles.categoryChipIcon}>{activeCategory.icon}</Text>
                  <Text
                    style={[styles.categoryChipText, { color: c.primary }]}
                    numberOfLines={1}
                  >
                    {activeCategory.name}
                  </Text>
                  <Pressable
                    onPress={() => setActiveCategory(null)}
                    hitSlop={8}
                    accessibilityLabel="Clear category filter"
                  >
                    <Ionicons name="close" size={16} color={c.primary} />
                  </Pressable>
                </View>
              </View>
            ) : null}

            <Text style={[styles.sectionTitle, { color: c.foreground }]}>
              {search.trim() || activeCategory ? "Results" : "Discover"}
            </Text>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={c.primary} size="large" style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="storefront-outline" size={40} color={c.mutedForeground} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                No products yet. Open a stall and add the first one!
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
              {item.categoryName ? (
                <View
                  style={[
                    styles.cardBadge,
                    { backgroundColor: c.secondary, borderColor: c.border },
                  ]}
                >
                  <Text
                    style={[styles.cardBadgeText, { color: c.mutedForeground }]}
                    numberOfLines={1}
                  >
                    {item.categoryName}
                  </Text>
                </View>
              ) : null}
              {item.stallName ? (
                <Text
                  style={[styles.cardMeta, { color: c.mutedForeground }]}
                  numberOfLines={1}
                >
                  {item.stallName}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    height: 44,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
  },
  searchInput: { flex: 1, fontFamily: "Inter_400Regular", fontSize: 16 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 42,
    borderRadius: 12,
  },
  actionText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  sectionTitle: { fontFamily: "Inter_700Bold", fontSize: 17 },
  categoryGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  categoryCard: {
    width: "31%",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  categoryIcon: { fontSize: 26 },
  categoryName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    textAlign: "center",
  },
  categoryCount: { fontFamily: "Inter_400Regular", fontSize: 11 },
  filterRow: { flexDirection: "row" },
  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
  },
  categoryChipIcon: { fontSize: 15 },
  categoryChipText: { fontFamily: "Inter_600SemiBold", fontSize: 13, maxWidth: 160 },
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
  cardMeta: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  cardBadge: {
    alignSelf: "flex-start",
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  cardBadgeText: { fontFamily: "Inter_600SemiBold", fontSize: 11 },
  empty: { alignItems: "center", gap: 10, marginTop: 48, paddingHorizontal: 32 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15, textAlign: "center" },
});
