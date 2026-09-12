import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export default function MemoriesScreen() {
  const c = useColors();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="arrow-back" size={24} color={c.foreground} />
          </Pressable>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={[styles.badgeIcon, { backgroundColor: "#8b5cf620" }]}>
              <Ionicons name="time" size={18} color="#8b5cf6" />
            </View>
            <Text style={[styles.title, { color: c.foreground }]}>Memories</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <View style={[styles.banner, { backgroundColor: c.card, borderColor: c.border }]}>
          <Text style={[styles.bannerTitle, { color: c.foreground }]}>
            On This Day
          </Text>
          <Text style={[styles.bannerSub, { color: c.mutedForeground }]}>
            Look back on your posts, photos, and milestones from days gone by, right here.
          </Text>
        </View>

        <View style={[styles.emptyCard, { backgroundColor: c.card, borderColor: c.border }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: "#8b5cf620" }]}>
            <Ionicons name="hourglass-outline" size={48} color="#8b5cf6" />
          </View>
          <Text style={[styles.emptyTitle, { color: c.foreground }]}>
            No memories today
          </Text>
          <Text style={[styles.emptySub, { color: c.mutedForeground }]}>
            We don't have any throwback memories for you today. Keep posting and sharing life updates, and they'll appear here on their anniversary!
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
  },
  banner: {
    padding: 16,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
    gap: 4,
  },
  bannerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  bannerSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  emptyCard: {
    padding: 36,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  emptyIconWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    maxWidth: 280,
  },
});
