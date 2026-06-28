import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow } from "@/constants/shadows";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

export default function AccountsCenterScreen() {
  const c = useColors();
  const { user } = useAuth();

  const items: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle: string;
    href: Href;
  }[] = [
    {
      icon: "person-circle-outline",
      title: "Profiles and personal details",
      subtitle: "Name, photo, bio and info",
      href: "/edit-profile",
    },
    {
      icon: "lock-closed-outline",
      title: "Password and security",
      subtitle: "Password and login",
      href: "/password-security",
    },
    {
      icon: "shield-checkmark-outline",
      title: "Privacy and safety",
      subtitle: "Who can see and reach you",
      href: "/privacy-settings",
    },
    {
      icon: "notifications-outline",
      title: "Notifications",
      subtitle: "What you get notified about",
      href: "/notification-settings",
    },
  ];

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
        <View style={styles.profile}>
          <Avatar uri={user?.avatarUrl} name={user?.displayName} size={72} />
          <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: fs(18), marginTop: 10 }}>
            {user?.displayName ?? "You"}
          </Text>
          <Text style={{ color: c.mutedForeground, fontSize: fs(13) }}>@{user?.username}</Text>
        </View>

        <Text style={{ color: c.mutedForeground, fontSize: fs(13), paddingHorizontal: 20, marginBottom: 8 }}>
          Manage your account settings and preferences for HiMewo.
        </Text>

        <View style={[styles.card, { backgroundColor: c.card }, shadow("md")]}>
          {items.map((item, i) => (
            <Touchable
              key={item.title}
              style={[styles.row, i < items.length - 1 && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
              onPress={() => router.push(item.href)}
            >
              <View style={[styles.iconWrap, { backgroundColor: c.secondary }]}>
                <Ionicons name={item.icon} size={22} color={c.foreground} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
                  {item.title}
                </Text>
                <Text style={{ color: c.mutedForeground, fontSize: fs(12), marginTop: 2 }}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
            </Touchable>
          ))}
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
  profile: { alignItems: "center", paddingVertical: 24 },
  card: { marginHorizontal: 16, borderRadius: 16 },
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
});
