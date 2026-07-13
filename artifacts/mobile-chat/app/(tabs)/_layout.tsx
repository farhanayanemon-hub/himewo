import { Tabs } from "expo-router";
import {
  useListConversations,
  useGetUnreadNotificationCount,
  type Conversation,
  type UnreadCount,
} from "@workspace/api-client-react";
import { SolidDockTabBar } from "@/components/SolidDockTabBar";

export default function TabsLayout() {
  const { data: convData } = useListConversations();
  const conversations = (convData ?? []) as Conversation[];
  const chatUnread = conversations.filter((conv) => conv.unreadCount > 0).length;

  const { data: countData } = useGetUnreadNotificationCount();
  const notifUnread = (countData as UnreadCount | undefined)?.count ?? 0;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <SolidDockTabBar {...props} chatUnread={chatUnread} notifUnread={notifUnread} />
      )}
    >
      <Tabs.Screen name="index" options={{ title: "Chats" }} />
      <Tabs.Screen name="people" options={{ title: "People" }} />
      <Tabs.Screen name="notifications" options={{ title: "Notifications" }} />
      <Tabs.Screen name="menu" options={{ title: "Menu" }} />
    </Tabs>
  );
}
