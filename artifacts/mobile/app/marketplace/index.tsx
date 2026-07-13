import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { useListMarketplaceListings } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { CATEGORIES, formatPrice } from "@/constants/marketplace";
import { shadow, glow } from "@/constants/shadows";
import { LocationAutocomplete } from "@/components/LocationAutocomplete";

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200];

export default function MarketplaceBrowseScreen() {
  const c = useColors();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [locText, setLocText] = useState("");
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [locating, setLocating] = useState(false);

  const clearLocation = () => {
    setCenter(null);
    setLocText("");
  };

  const useMyLocation = async () => {
    try {
      setLocating(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocating(false);
        return;
      }
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setLocText("My current location");
    } catch {
      // ignore — user can search manually
    } finally {
      setLocating(false);
    }
  };

  const { data: listings, isLoading } = useListMarketplaceListings({
    ...(category ? { category } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(center ? { lat: center.lat, lng: center.lng, radiusKm } : {}),
  });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <FlatList
        data={listings ?? []}
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
                placeholder="Search Marketplace"
                placeholderTextColor={c.mutedForeground}
                underlineColorAndroid="transparent"
                style={[styles.searchInput, { color: c.foreground }]}
              />
            </View>

            <LocationAutocomplete
              value={locText}
              onChangeText={(v) => {
                setLocText(v);
                setCenter(null);
              }}
              onPick={(r) => setCenter({ lat: r.lat, lng: r.lng })}
              placeholder="Filter by location (e.g. Dhaka)"
            />

            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <Pressable
                style={[styles.nearBtn, { backgroundColor: c.secondary }]}
                onPress={useMyLocation}
                disabled={locating}
              >
                {locating ? (
                  <ActivityIndicator size="small" color={c.foreground} />
                ) : (
                  <Ionicons name="locate" size={16} color={c.foreground} />
                )}
                <Text style={[styles.actionText, { color: c.foreground }]}>Near me</Text>
              </Pressable>
              {center ? (
                <>
                  {RADIUS_OPTIONS.map((r) => (
                    <Pressable
                      key={r}
                      onPress={() => setRadiusKm(r)}
                      style={[
                        styles.radiusChip,
                        {
                          backgroundColor: radiusKm === r ? c.primary : c.secondary,
                        },
                      ]}
                    >
                      <Text
                        style={{
                          color: radiusKm === r ? "#fff" : c.foreground,
                          fontFamily: "Inter_600SemiBold",
                          fontSize: 12,
                        }}
                      >
                        {r} km
                      </Text>
                    </Pressable>
                  ))}
                  <Pressable onPress={clearLocation} style={styles.clearBtn}>
                    <Ionicons name="close-circle" size={18} color={c.mutedForeground} />
                  </Pressable>
                </>
              ) : null}
            </View>

            <View style={styles.actionsRow}>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: c.secondary }]}
                onPress={() => router.push("/marketplace/selling")}
              >
                <Ionicons name="pricetags" size={16} color={c.foreground} />
                <Text style={[styles.actionText, { color: c.foreground }]}>Selling</Text>
              </Pressable>
              <Pressable
                style={[styles.actionBtn, { backgroundColor: c.primary }, glow(c.primary)]}
                onPress={() => router.push("/marketplace/create")}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={[styles.actionText, { color: "#fff" }]}>Create listing</Text>
              </Pressable>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8 }}
            >
              <Chip
                label="All"
                active={!category}
                onPress={() => setCategory(undefined)}
                c={c}
              />
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat.value}
                  label={cat.label}
                  active={category === cat.value}
                  onPress={() => setCategory(cat.value)}
                  c={c}
                />
              ))}
            </ScrollView>

            <Text style={[styles.sectionTitle, { color: c.foreground }]}>
              {search.trim() || category ? "Results" : "Today's picks"}
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
                No listings yet. Be the first to create one!
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
            onPress={() => router.push(`/marketplace/${item.id}`)}
          >
            <View style={[styles.cardImage, { backgroundColor: c.secondary }]}>
              {item.photos[0] ? (
                <Image source={{ uri: item.photos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Ionicons name="image-outline" size={28} color={c.mutedForeground} />
              )}
            </View>
            <View style={{ padding: 10 }}>
              <Text style={[styles.price, { color: c.foreground }]}>
                {formatPrice(item.price, item.currency)}
              </Text>
              <Text style={[styles.cardTitle, { color: c.foreground }]} numberOfLines={1}>
                {item.title}
              </Text>
              {item.location ? (
                <Text style={[styles.cardMeta, { color: c.mutedForeground }]} numberOfLines={1}>
                  {item.location}
                </Text>
              ) : null}
              {item.distanceKm != null ? (
                <Text style={[styles.cardDistance, { color: c.primary }]} numberOfLines={1}>
                  {item.distanceKm < 1
                    ? "Less than 1 km away"
                    : `${Math.round(item.distanceKm)} km away`}
                </Text>
              ) : null}
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
  c,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        { backgroundColor: active ? c.primary : c.secondary },
      ]}
    >
      <Text
        style={{
          color: active ? "#fff" : c.foreground,
          fontFamily: "Inter_600SemiBold",
          fontSize: 13,
        }}
      >
        {label}
      </Text>
    </Pressable>
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
  nearBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 38,
    borderRadius: 12,
  },
  radiusChip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  clearBtn: { padding: 4 },
  chip: {
    paddingHorizontal: 14,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
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
  cardMeta: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 2 },
  cardDistance: { fontFamily: "Inter_600SemiBold", fontSize: 12, marginTop: 2 },
  empty: { alignItems: "center", gap: 10, marginTop: 48, paddingHorizontal: 32 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15, textAlign: "center" },
});
