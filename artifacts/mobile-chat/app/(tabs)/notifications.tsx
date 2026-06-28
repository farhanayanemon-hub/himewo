import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow } from "@/constants/shadows";
import { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  FlatList,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
  getListNotificationsQueryKey,
  getGetUnreadNotificationCountQueryKey,
  type Notification,
} from "@workspace/api-client-react";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";
import { useRealtime } from "@/lib/realtime";
import { timeAgo } from "@/lib/format";

type IconName = keyof typeof Ionicons.glyphMap;

function iconFor(type: Notification["type"]): { name: IconName; color: string } {
  switch (type) {
    case "reaction":
      return { name: "heart", color: "#f3425f" };
    case "comment":
      return { name: "chatbubble", color: "#0084ff" };
    case "friend_request":
      return { name: "person-add", color: "#0084ff" };
    case "friend_accept":
      return { name: "people", color: "#31a24c" };
    case "follow":
    case "page_follow":
      return { name: "person", color: "#0084ff" };
    case "message":
      return { name: "chatbubble-ellipses", color: "#0084ff" };
    case "group_invite":
      return { name: "people-circle", color: "#a033ff" };
    case "mention":
      return { name: "at", color: "#0084ff" };
    case "share":
      return { name: "arrow-redo", color: "#31a24c" };
    case "story_view":
      return { name: "eye", color: "#a033ff" };
    default:
      return { name: "notifications", color: "#0084ff" };
  }
}

function messageFor(n: Notification): string {
  const who = n.actor?.displayName ?? "Someone";
  switch (n.type) {
    case "reaction":
      return `${who} reacted to your post`;
    case "comment":
      return `${who} commented on your post`;
    case "friend_request":
      return `${who} sent you a friend request`;
    case "friend_accept":
      return `${who} accepted your friend request`;
    case "follow":
      return `${who} started following you`;
    case "page_follow":
      return `${who} followed your page`;
    case "message":
      return `${who} sent you a message`;
    case "group_invite":
      return `${who} invited you to a group`;
    case "mention":
      return `${who} mentioned you`;
    case "share":
      return `${who} shared your post`;
    case "story_view":
      return `${who} viewed your story`;
    default:
      return `${who} sent you a notification`;
  }
}

export default function NotificationsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { subscribe } = useRealtime();
  const { data, isLoading, isRefetching, refetch } = useListNotifications();
  const notifications = (data ?? []) as Notification[];
  const markRead = useMarkNotificationRead();
  const markAll = useMarkAllNotificationsRead();

  const hasUnread = notifications.some((n) => !n.isRead);

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
  }, [qc]);

  useEffect(() => {
    const unsub = subscribe((event) => {
      if (event.type === "notification") invalidate();
    });
    return unsub;
  }, [subscribe, invalidate]);

  const onMarkAll = async () => {
    await markAll.mutateAsync();
    invalidate();
  };

  const onPress = async (n: Notification) => {
    if (!n.isRead) {
      try {
        await markRead.mutateAsync({ id: n.id });
        invalidate();
      } catch {
        // ignore — list will refetch
      }
    }
    if (n.type === "friend_request") {
      router.push("/message-requests");
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
        <Text style={[styles.title, { color: c.foreground }]}>Notifications</Text>
        {hasUnread ? (
          <Touchable onPress={onMarkAll} hitSlop={8} disabled={markAll.isPending}>
            <Text style={{ color: c.primary, fontFamily: "Inter_600SemiBold", fontSize: fs(14) }}>
              Mark all read
            </Text>
          </Touchable>
        ) : (
          <View style={{ width: 1 }} />
        )}
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          refreshing={isRefetching}
          onRefresh={refetch}
          renderItem={({ item }) => {
            const ic = iconFor(item.type);
            return (
              <Touchable
                style={[
                  styles.row,
                  { borderBottomColor: c.border },
                  !item.isRead && { backgroundColor: c.secondary },
                ]}
                onPress={() => onPress(item)}
              >
                <View>
                  <Avatar uri={item.actor?.avatarUrl} name={item.actor?.displayName} size={52} />
                  <View style={[styles.iconBadge, { backgroundColor: ic.color, borderColor: c.background }]}>
                    <Ionicons name={ic.name} size={13} color="#fff" />
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text
                    style={{
                      color: c.foreground,
                      fontFamily: item.isRead ? "Inter_400Regular" : "Inter_600SemiBold",
                      fontSize: fs(14),
                    }}
                  >
                    {messageFor(item)}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: fs(12), marginTop: 3 }}>
                    {timeAgo(item.createdAt)}
                  </Text>
                </View>
                {!item.isRead && <View style={[styles.dot, { backgroundColor: c.primary }]} />}
              </Touchable>
            );
          }}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 70, paddingHorizontal: 24 }}>
              <Ionicons name="notifications-outline" size={48} color={c.mutedForeground} />
              <Text style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}>
                No notifications yet. When people interact with you, you'll see it here.
              </Text>
            </View>
          }
        />
      )}
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
  title: { fontFamily: "Inter_700Bold", fontSize: fs(22) },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBadge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 10, height: 10, borderRadius: 5, marginLeft: 8 },
});
