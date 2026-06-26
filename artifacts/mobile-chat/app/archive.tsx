import { Pressable, Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export default function ArchiveScreen() {
  const c = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 18 }}>
          Archive
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.empty}>
        <Ionicons name="archive-outline" size={48} color={c.mutedForeground} />
        <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16, marginTop: 12 }}>
          No archived chats
        </Text>
        <Text style={{ color: c.mutedForeground, textAlign: "center", marginTop: 6, paddingHorizontal: 32 }}>
          Chats you archive will show up here. Your archived conversations stay private.
        </Text>
      </View>
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
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
});
