import {
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

const SECTIONS: {
  href: Href;
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  desc: string;
}[] = [
  {
    href: "/settings/account",
    icon: "person-circle-outline",
    title: "Account Center",
    desc: "Personal details, profile",
  },
  {
    href: "/settings/privacy",
    icon: "shield-checkmark-outline",
    title: "Privacy",
    desc: "Who can see what, friend requests",
  },
  {
    href: "/settings/security",
    icon: "lock-closed-outline",
    title: "Password & security",
    desc: "Password change, login info",
  },
  {
    href: "/settings/notifications",
    icon: "notifications-outline",
    title: "Notifications",
    desc: "Like, comment, message notification",
  },
  {
    href: "/settings/language",
    icon: "globe-outline",
    title: "Language",
    desc: "App language",
  },
  {
    href: "/settings/help",
    icon: "help-circle-outline",
    title: "Help & support",
    desc: "Common questions and contact",
  },
];

export default function SettingsScreen() {
  const c = useColors();
  const { user, signOut } = useAuth();

  const confirmLogout = () => {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: () => {
          void signOut();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <Text
          style={{
            color: c.foreground,
            fontFamily: "Inter_700Bold",
            fontSize: 18,
          }}
        >
          Settings & privacy
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 12 }}>
        <Pressable
          onPress={() => user && router.push(`/profile/${user.id}`)}
          style={[styles.profileCard, { backgroundColor: c.card, borderColor: c.border }]}
        >
          <View>
            <Text
              style={{
                color: c.foreground,
                fontFamily: "Inter_700Bold",
                fontSize: 16,
              }}
            >
              {user?.displayName ?? "HiMewo user"}
            </Text>
            <Text
              style={{
                color: c.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                marginTop: 2,
              }}
            >
              @{user?.username ?? ""}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
        </Pressable>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
          {SECTIONS.map((s, i) => (
            <Pressable
              key={s.title}
              onPress={() => router.push(s.href)}
              style={[
                styles.row,
                i < SECTIONS.length - 1 && {
                  borderBottomColor: c.border,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                },
              ]}
            >
              <View
                style={[styles.iconWrap, { backgroundColor: c.primary + "1A" }]}
              >
                <Ionicons name={s.icon} size={20} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    color: c.foreground,
                    fontFamily: "Inter_600SemiBold",
                    fontSize: 15,
                  }}
                >
                  {s.title}
                </Text>
                <Text
                  style={{
                    color: c.mutedForeground,
                    fontFamily: "Inter_400Regular",
                    fontSize: 13,
                    marginTop: 2,
                  }}
                >
                  {s.desc}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
            </Pressable>
          ))}
        </View>

        <View style={{ paddingHorizontal: 16, marginTop: 24 }}>
          <Pressable
            style={[styles.logout, { borderColor: c.destructive }]}
            onPress={confirmLogout}
          >
            <Ionicons name="log-out-outline" size={20} color={c.destructive} />
            <Text
              style={{
                color: c.destructive,
                fontFamily: "Inter_700Bold",
                fontSize: 15,
              }}
            >
              Log out
            </Text>
          </Pressable>
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
  profileCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
  },
});
