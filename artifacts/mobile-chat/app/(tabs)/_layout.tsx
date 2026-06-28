import { fs } from "@/constants/typography";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";
import {
  useListConversations,
  useGetUnreadNotificationCount,
  type Conversation,
  type UnreadCount,
} from "@workspace/api-client-react";

export default function TabsLayout() {
  const c = useColors();

  const { data: convData } = useListConversations();
  const conversations = (convData ?? []) as Conversation[];
  const chatUnread = conversations.filter((conv) => conv.unreadCount > 0).length;

  const { data: countData } = useGetUnreadNotificationCount();
  const notifUnread = (countData as UnreadCount | undefined)?.count ?? 0;

  const badge = (n: number) => (n > 0 ? (n > 99 ? "99+" : n) : undefined);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: c.primary,
        tabBarInactiveTintColor: c.mutedForeground,
        tabBarStyle: {
          backgroundColor: c.card,
          borderTopWidth: 0,
          height: 60,
          paddingTop: 6,
          paddingBottom: 8,
          ...Platform.select({
            web: { boxShadow: "0 -4px 18px rgba(58,40,26,0.10)" },
            default: {
              shadowColor: "#3a281a",
              shadowOffset: { width: 0, height: -3 },
              shadowOpacity: 0.1,
              shadowRadius: 12,
              elevation: 14,
            },
          }),
        },
        tabBarLabelStyle: { fontFamily: "Inter_600SemiBold", fontSize: fs(11) },
        tabBarBadgeStyle: {
          backgroundColor: c.destructive,
          color: "#fff",
          fontFamily: "Inter_700Bold",
          fontSize: fs(10),
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarBadge: badge(chatUnread),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubble" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="people"
        options={{
          title: "People",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="people" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Notifications",
          tabBarBadge: badge(notifUnread),
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="notifications" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="menu"
        options={{
          title: "Menu",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="menu" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
