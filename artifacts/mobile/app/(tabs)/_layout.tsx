import { Tabs } from "expo-router";
import {
  useListConversations,
  getListConversationsQueryKey,
  type Conversation,
} from "@workspace/api-client-react";
import { SolidDockTabBar } from "@/components/SolidDockTabBar";

export default function TabsLayout() {
  const { data: convData } = useListConversations({
    query: {
      refetchInterval: 15_000,
      queryKey: getListConversationsQueryKey(),
    },
  });
  const conversations = (convData ?? []) as Conversation[];
  const unreadChatCount = conversations.reduce((acc, c) => acc + (c.unreadCount || 0), 0);

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <SolidDockTabBar {...props} unreadCount={unreadChatCount} />}
    >
      <Tabs.Screen name="index" options={{ title: "Feed" }} />
      <Tabs.Screen name="friends" options={{ title: "Friends" }} />
      <Tabs.Screen name="reels" options={{ title: "Reels" }} />
      <Tabs.Screen name="chats" options={{ title: "Chats" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
      {/* Menu now opens from the header button beside the logo. */}
      <Tabs.Screen name="menu" options={{ href: null }} />
    </Tabs>
  );
}
