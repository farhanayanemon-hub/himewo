import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useColors } from "@/hooks/useColors";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

type TabConfig = {
  label: string;
  icon: IoniconName;
  iconOutline: IoniconName;
  badgeKey?: "chat" | "notif";
};

const TABS: Record<string, TabConfig> = {
  index: { label: "Chats", icon: "chatbubble", iconOutline: "chatbubble-outline", badgeKey: "chat" },
  people: { label: "People", icon: "people", iconOutline: "people-outline" },
  notifications: {
    label: "Alerts",
    icon: "notifications",
    iconOutline: "notifications-outline",
    badgeKey: "notif",
  },
  menu: { label: "Menu", icon: "menu", iconOutline: "menu-outline" },
};

export function SolidDockTabBar({
  state,
  navigation,
  chatUnread = 0,
  notifUnread = 0,
}: BottomTabBarProps & { chatUnread?: number; notifUnread?: number }) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { backgroundColor: c.card, borderTopColor: c.border }]}>
      <View style={[styles.bar, { paddingBottom: Math.max(4, insets.bottom) }]}>
        {state.routes.map((route, index) => {
          const cfg = TABS[route.name];
          if (!cfg) return null;
          const focused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const count = cfg.badgeKey === "chat" ? chatUnread : cfg.badgeKey === "notif" ? notifUnread : 0;

          return (
            <Pressable
              key={route.key}
              style={styles.item}
              onPress={onPress}
              hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}
            >
              <View style={styles.iconWrap}>
                <Ionicons
                  name={focused ? cfg.icon : cfg.iconOutline}
                  size={24}
                  color={focused ? c.primary : c.mutedForeground}
                />
                {count > 0 && (
                  <View style={[styles.badge, { backgroundColor: c.destructive, borderColor: c.card }]}>
                    <Text style={styles.badgeText}>{count > 99 ? "99+" : count}</Text>
                  </View>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  { color: focused ? c.primary : c.mutedForeground },
                  focused && styles.labelActive,
                ]}
              >
                {cfg.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingTop: 8,
    paddingHorizontal: 12,
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  iconWrap: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  labelActive: {
    fontFamily: "Inter_700Bold",
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -10,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
  },
});
