import {
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, type Href } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";
import { useGetEarningsSummary } from "@workspace/api-client-react";

interface Shortcut {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  href: Href;
}

const SHORTCUTS: Shortcut[] = [
  { label: "Friends", icon: "people", color: "#1877f2", href: "/friends" },
  { label: "Saved", icon: "bookmark", color: "#a855f7", href: "/saved" },
  { label: "Marketplace", icon: "storefront", color: "#ff751a", href: "/marketplace" },
  { label: "Groups", icon: "people-circle", color: "#0a7ea4", href: "/groups" },
  { label: "Pages", icon: "document-text", color: "#d946ef", href: "/pages" },
  { label: "Reels", icon: "film", color: "#e9710f", href: "/reels" },
  { label: "Messages", icon: "chatbubbles", color: "#31a24c", href: "/messages" },
  { label: "Search", icon: "search", color: "#9333ea", href: "/search" },
  { label: "Settings", icon: "settings", color: "#64748b", href: "/settings" },
];

const EARNINGS_SHORTCUT: Shortcut = {
  label: "Earnings",
  icon: "wallet",
  color: "#16a34a",
  href: "/earnings",
};

export default function MenuScreen() {
  const c = useColors();
  const { user, signOut } = useAuth();
  const { data: earnings } = useGetEarningsSummary();

  const shortcuts = earnings?.enabled
    ? [...SHORTCUTS, EARNINGS_SHORTCUT]
    : SHORTCUTS;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View
        style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}
      >
        <Text style={[styles.title, { color: c.foreground }]}>Menu</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
        <Pressable
          style={[styles.userCard, { backgroundColor: c.card, borderColor: c.border }]}
          onPress={() => user && router.push(`/profile/${user.id}`)}
        >
          <Avatar uri={user?.avatarUrl} name={user?.displayName} size={56} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: c.foreground }]} numberOfLines={1}>
              {user?.displayName ?? "Guest"}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
              View your profile
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
        </Pressable>

        <View style={styles.grid}>
          {shortcuts.map((item) => (
            <Pressable
              key={item.label}
              style={[styles.gridCard, { backgroundColor: c.card, borderColor: c.border }]}
              onPress={() => router.push(item.href)}
            >
              <View style={[styles.iconWrap, { backgroundColor: item.color + "22" }]}>
                <Ionicons name={item.icon} size={24} color={item.color} />
              </View>
              <Text style={[styles.gridLabel, { color: c.foreground }]}>
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          style={[styles.logout, { backgroundColor: c.secondary }]}
          onPress={() => signOut()}
        >
          <Ionicons name="log-out-outline" size={20} color={c.destructive} />
          <Text style={[styles.logoutText, { color: c.destructive }]}>Log out</Text>
        </Pressable>
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
  title: { fontFamily: "Inter_700Bold", fontSize: 22 },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  userName: { fontFamily: "Inter_700Bold", fontSize: 17 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  gridCard: {
    width: "47.5%",
    flexGrow: 1,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  gridLabel: { fontFamily: "Inter_600SemiBold", fontSize: 15 },
  logout: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 20,
  },
  logoutText: { fontFamily: "Inter_700Bold", fontSize: 15 },
});
