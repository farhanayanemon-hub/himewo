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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useGetSellingDashboard } from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";
import { formatPrice } from "@/constants/marketplace";
import { shadow, glow } from "@/constants/shadows";

export default function MarketplaceSellingScreen() {
  const c = useColors();
  const { data, isLoading } = useGetSellingDashboard();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["bottom"]}>
      <FlatList
        data={data?.listings ?? []}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 96 }}
        ListHeaderComponent={
          <View style={{ gap: 16, marginBottom: 6 }}>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Stat value={data?.activeListings ?? 0} label="Active" highlight c={c} />
              <Stat value={data?.soldListings ?? 0} label="Sold" c={c} />
              <Stat value={data?.totalListings ?? 0} label="Total" c={c} />
            </View>
            <Pressable
              style={[styles.createBtn, { backgroundColor: c.primary }, glow(c.primary)]}
              onPress={() => router.push("/marketplace/create")}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.createText}>Create listing</Text>
            </Pressable>
          </View>
        }
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color={c.primary} size="large" style={{ marginTop: 48 }} />
          ) : (
            <View style={styles.empty}>
              <Ionicons name="pricetags-outline" size={40} color={c.mutedForeground} />
              <Text style={[styles.emptyText, { color: c.mutedForeground }]}>
                Tumi ekhono kichu listing koroni.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <Pressable
            style={[styles.row, { backgroundColor: c.card, borderColor: c.border }, shadow("sm")]}
            onPress={() => router.push(`/marketplace/${item.id}`)}
          >
            <View style={[styles.rowImage, { backgroundColor: c.secondary }]}>
              {item.photos[0] ? (
                <Image source={{ uri: item.photos[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <Ionicons name="image-outline" size={22} color={c.mutedForeground} />
              )}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.rowTitle, { color: c.foreground }]} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={[styles.rowPrice, { color: c.primary }]}>
                {formatPrice(item.price, item.currency)}
              </Text>
            </View>
            <View
              style={[
                styles.statusPill,
                {
                  backgroundColor: item.status === "sold" ? c.secondary : c.primary + "22",
                },
              ]}
            >
              <Text
                style={{
                  color: item.status === "sold" ? c.mutedForeground : c.primary,
                  fontFamily: "Inter_600SemiBold",
                  fontSize: 12,
                }}
              >
                {item.status === "sold" ? "Sold" : "Active"}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

function Stat({
  value,
  label,
  highlight,
  c,
}: {
  value: number;
  label: string;
  highlight?: boolean;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[styles.stat, { backgroundColor: c.card, borderColor: c.border }, shadow("sm")]}>
      <Text style={[styles.statValue, { color: highlight ? c.primary : c.foreground }]}>
        {value}
      </Text>
      <Text style={[styles.statLabel, { color: c.mutedForeground }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 16,
    alignItems: "center",
  },
  statValue: { fontFamily: "Inter_700Bold", fontSize: 24 },
  statLabel: { fontFamily: "Inter_500Medium", fontSize: 12, marginTop: 2 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 46,
    borderRadius: 12,
  },
  createText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 15 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  rowImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { fontFamily: "Inter_700Bold", fontSize: 15 },
  rowPrice: { fontFamily: "Inter_700Bold", fontSize: 14, marginTop: 2 },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  empty: { alignItems: "center", gap: 10, marginTop: 48, paddingHorizontal: 32 },
  emptyText: { fontFamily: "Inter_500Medium", fontSize: 15, textAlign: "center" },
});
