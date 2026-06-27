import { useCallback } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import {
  useListNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  getListNotificationsQueryKey,
  getGetUnreadNotificationCountQueryKey,
  NotificationType,
  type Notification,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/Avatar";
import { useColors } from "@/hooks/useColors";
import { timeAgo } from "@/lib/format";

function notificationText(n: Notification): string {
  const actor = n.actor?.displayName ?? "Someone";
  switch (n.type) {
    case NotificationType.reaction:
      return `${actor} reacted to your post.`;
    case NotificationType.comment:
      return `${actor} commented on your post.`;
    case NotificationType.friend_request:
      return `${actor} sent you a friend request.`;
    case NotificationType.friend_accept:
      return `${actor} accepted your friend request.`;
    case NotificationType.follow:
      return `${actor} started following you.`;
    case NotificationType.message:
      return `${actor} sent you a message.`;
    case NotificationType.group_invite:
      return `${actor} invited you to a group.`;
    case NotificationType.page_follow:
      return `${actor} followed your page.`;
    case NotificationType.mention:
      return `${actor} mentioned you.`;
    case NotificationType.share:
      return `${actor} shared your post.`;
    case NotificationType.story_view:
      return `${actor} viewed your story.`;
    default:
      return `${actor} sent you a notification.`;
  }
}

function notificationIcon(type: NotificationType): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case NotificationType.reaction:
      return "heart";
    case NotificationType.comment:
    case NotificationType.mention:
      return "chatbubble";
    case NotificationType.friend_request:
    case NotificationType.friend_accept:
      return "person-add";
    case NotificationType.follow:
    case NotificationType.page_follow:
      return "person";
    case NotificationType.message:
      return "mail";
    case NotificationType.group_invite:
      return "people";
    case NotificationType.share:
      return "arrow-redo";
    case NotificationType.story_view:
      return "eye";
    default:
      return "notifications";
  }
}

export default function NotificationsScreen() {
  const c = useColors();
  const qc = useQueryClient();

  const { data, isLoading, isRefetching, refetch } = useListNotifications();
  const notifications = (data ?? []) as Notification[];

  const markAll = useMarkAllNotificationsRead();
  const markRead = useMarkNotificationRead();

  const invalidate = useCallback(() => {
    qc.invalidateQueries({ queryKey: getListNotificationsQueryKey() });
    qc.invalidateQueries({ queryKey: getGetUnreadNotificationCountQueryKey() });
  }, [qc]);

  const onRefresh = useCallback(() => {
    invalidate();
    refetch();
  }, [invalidate, refetch]);

  const handleMarkAll = () => {
    markAll.mutate(undefined, { onSuccess: invalidate });
  };

  const navigateTarget = (n: Notification) => {
    if (n.entityType === "post" && n.entityId != null) {
      router.push(`/post/${n.entityId}`);
    } else if (n.actor?.id) {
      router.push(`/profile/${n.actor.id}`);
    }
  };

  const handlePress = (n: Notification) => {
    if (!n.isRead) {
      markRead.mutate({ id: n.id }, { onSuccess: invalidate });
    }
    navigateTarget(n);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top"]}>
      <View
        style={[styles.header, { backgroundColor: c.card, borderBottomColor: c.border }]}
      >
        <Text style={[styles.title, { color: c.foreground }]}>Notifications</Text>
        <Pressable onPress={handleMarkAll} hitSlop={8}>
          <Text style={[styles.markAll, { color: c.primary }]}>Mark all read</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={onRefresh}
              tintColor={c.primary}
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={[
                styles.row,
                {
                  backgroundColor: item.isRead ? c.card : c.primary + "1a",
                  borderBottomColor: c.border,
                },
              ]}
              onPress={() => handlePress(item)}
            >
              <View>
                <Avatar
                  uri={item.actor?.avatarUrl}
                  name={item.actor?.displayName}
                  size={52}
                />
                <View style={[styles.badge, { backgroundColor: c.primary }]}>
                  <Ionicons
                    name={notificationIcon(item.type)}
                    size={12}
                    color={c.primaryForeground}
                  />
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.text, { color: c.foreground }]}>
                  {notificationText(item)}
                </Text>
                <Text style={{ color: c.mutedForeground, fontSize: 12, marginTop: 2 }}>
                  {timeAgo(item.createdAt)}
                </Text>
              </View>
              {!item.isRead && (
                <View style={[styles.unreadDot, { backgroundColor: c.primary }]} />
              )}
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60, paddingHorizontal: 20 }}>
              <Ionicons name="notifications-outline" size={48} color={c.mutedForeground} />
              <Text
                style={{ color: c.mutedForeground, marginTop: 12, textAlign: "center" }}
              >
                You're all caught up!
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  title: { fontFamily: "Inter_700Bold", fontSize: 22 },
  markAll: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badge: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { fontFamily: "Inter_500Medium", fontSize: 14, lineHeight: 19 },
  unreadDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
