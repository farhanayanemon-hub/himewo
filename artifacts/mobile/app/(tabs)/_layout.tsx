import { Tabs } from "expo-router";
import {
  useGetUnreadNotificationCount,
  getGetUnreadNotificationCountQueryKey,
} from "@workspace/api-client-react";
import { SolidDockTabBar } from "@/components/SolidDockTabBar";

export default function TabsLayout() {
  const { data: unread } = useGetUnreadNotificationCount({
    query: {
      refetchInterval: 30_000,
      queryKey: getGetUnreadNotificationCountQueryKey(),
    },
  });
  const unreadCount = (unread as { count?: number } | undefined)?.count ?? 0;

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <SolidDockTabBar {...props} unreadCount={unreadCount} />}
    >
      <Tabs.Screen name="index" options={{ title: "Home" }} />
      <Tabs.Screen name="friends" options={{ title: "Friends" }} />
      <Tabs.Screen name="reels" options={{ title: "Reels" }} />
      <Tabs.Screen name="notifications" options={{ title: "Alerts" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      {/* Menu now opens from the header button beside the logo. */}
      <Tabs.Screen name="menu" options={{ href: null }} />
    </Tabs>
  );
}
