import { Tabs } from "expo-router";
import { useState, useEffect } from "react";
import { DeviceEventEmitter } from "react-native";
import {
  useListConversations,
  getListConversationsQueryKey,
  type Conversation,
} from "@workspace/api-client-react";
import { SolidDockTabBar } from "../../components/SolidDockTabBar";
import { useChatPreferences } from "@/lib/chatPreferences";
import { CreateActionSheet } from "@/components/CreateActionSheet";
import { CreateMediaLauncherSheet } from "@/components/CreateMediaLauncherSheet";

export default function TabsLayout() {
  const { lockedChatIds, mutedChatIds, deletedChatIds } = useChatPreferences();
  const [createSheetOpen, setCreateSheetOpen] = useState(false);
  const [launcherMode, setLauncherMode] = useState<"story" | "reel" | null>(null);

  useEffect(() => {
    const subCreate = DeviceEventEmitter.addListener("himewo:open-create-sheet", () => {
      setCreateSheetOpen(true);
    });
    return () => subCreate.remove();
  }, []);

  const { data: convData } = useListConversations({
    query: {
      refetchInterval: 15_000,
      queryKey: getListConversationsQueryKey(),
    },
  });
  const conversations = (convData ?? []) as Conversation[];
  const unreadChatCount = conversations.reduce((acc, c) => {
    if (
      lockedChatIds.includes(c.id) ||
      mutedChatIds.includes(c.id) ||
      deletedChatIds.includes(c.id)
    ) {
      return acc;
    }
    return acc + (c.unreadCount || 0);
  }, 0);

  return (
    <>
      <Tabs
        screenOptions={{ headerShown: false }}
        tabBar={(props) => <SolidDockTabBar {...props} unreadCount={unreadChatCount} />}
      >
        <Tabs.Screen name="index" options={{ title: "Feed" }} />
        <Tabs.Screen name="friends" options={{ title: "Friends" }} />
        <Tabs.Screen name="reels" options={{ title: "Reels" }} />
        <Tabs.Screen name="shop" options={{ title: "Shop" }} />
        <Tabs.Screen name="chats" options={{ title: "Chats" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
        <Tabs.Screen name="notifications" options={{ href: null }} />
        {/* Menu now opens from the header button beside the logo. */}
        <Tabs.Screen name="menu" options={{ href: null }} />
      </Tabs>

      <CreateActionSheet
        visible={createSheetOpen}
        onClose={() => setCreateSheetOpen(false)}
        onSelectStory={() => setLauncherMode("story")}
        onSelectReel={() => setLauncherMode("reel")}
      />

      <CreateMediaLauncherSheet
        visible={!!launcherMode}
        mode={launcherMode ?? "story"}
        onClose={() => setLauncherMode(null)}
      />
    </>
  );
}
