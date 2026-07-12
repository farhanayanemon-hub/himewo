import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow, glow } from "@/constants/shadows";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { openMainApp } from "@/lib/mainApp";

export default function AccountsCenterScreen() {
  const c = useColors();
  const { user } = useAuth();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
        <Touchable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Touchable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: fs(18) }}>
          Accounts Center
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <View style={[styles.card, { backgroundColor: c.card }, shadow("md")]}>
          <View style={{ alignItems: "center", paddingVertical: 24, paddingHorizontal: 20 }}>
            <Avatar uri={user?.avatarUrl} name={user?.displayName} size={64} />
            <Text
              style={{
                color: c.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: fs(17),
                marginTop: 14,
                textAlign: "center",
              }}
            >
              Manage your account in the HiMewo app
            </Text>
            <Text
              style={{
                color: c.mutedForeground,
                fontSize: fs(14),
                marginTop: 8,
                textAlign: "center",
                lineHeight: 20,
              }}
            >
              Your profile details, password, security and personal info are
              all managed in one place — the main HiMewo app. Changes there
              apply to HiMewo Chat too.
            </Text>
            <Touchable
              style={[styles.button, { backgroundColor: c.primary }, glow("primary")]}
              onPress={() => openMainApp()}
            >
              <Ionicons name="open-outline" size={18} color="#fff" />
              <Text style={{ color: "#fff", fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
                Open HiMewo app
              </Text>
            </Touchable>
          </View>
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
    zIndex: 2,
  },
  card: { marginHorizontal: 16, marginTop: 20, borderRadius: 16 },
  button: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 24,
  },
});
