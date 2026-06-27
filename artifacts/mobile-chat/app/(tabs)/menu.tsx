import {
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useListFriendRequests, type FriendRequest } from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useAuth } from "@/lib/auth";
import { useColors } from "@/hooks/useColors";

export default function MenuScreen() {
  const c = useColors();
  const { user } = useAuth();
  const { data } = useListFriendRequests();
  const requestCount = ((data ?? []) as FriendRequest[]).length;

  const items: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    badge?: number;
    onPress: () => void;
  }[] = [
    { icon: "settings-outline", label: "Settings", onPress: () => router.push("/settings") },
    {
      icon: "chatbox-ellipses-outline",
      label: "Message requests",
      badge: requestCount,
      onPress: () => router.push("/message-requests"),
    },
    { icon: "archive-outline", label: "Archive", onPress: () => router.push("/archive") },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}>
        <Text style={[styles.title, { color: c.foreground }]}>Menu</Text>
      </View>

      <ScrollView>
        <Pressable
          style={[styles.profile, { borderBottomColor: c.border }]}
          onPress={() => router.push("/settings")}
        >
          <Avatar uri={user?.avatarUrl} name={user?.displayName} size={56} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: 17 }}>
              {user?.displayName ?? "You"}
            </Text>
            <Text style={{ color: c.mutedForeground, fontSize: 13 }}>
              @{user?.username}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
        </Pressable>

        <View style={styles.list}>
          {items.map((item) => (
            <Pressable
              key={item.label}
              style={[styles.row, { borderBottomColor: c.border }]}
              onPress={item.onPress}
            >
              <View style={[styles.iconWrap, { backgroundColor: c.secondary }]}>
                <Ionicons name={item.icon} size={22} color={c.foreground} />
              </View>
              <Text style={{ flex: 1, color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: 16 }}>
                {item.label}
              </Text>
              {item.badge ? (
                <View style={[styles.badge, { backgroundColor: c.primary }]}>
                  <Text style={styles.badgeText}>{item.badge > 99 ? "99+" : item.badge}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={20} color={c.mutedForeground} />
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 22 },
  profile: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  list: { marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontFamily: "Inter_700Bold", fontSize: 11 },
});
