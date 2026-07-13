import { View, Text, Pressable, Platform, StyleSheet } from "react-native";
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

/**
 * The bar is laid out with the four real tabs split around a raised center
 * "New chat" compose action: Chats · People · [Compose] · Alerts · Menu.
 * Compose is not a route — it routes to the People picker to start a chat.
 */
const LEFT = ["index", "people"];
const RIGHT = ["notifications", "menu"];

export function SolidDockTabBar({
  state,
  navigation,
  chatUnread = 0,
  notifUnread = 0,
}: BottomTabBarProps & { chatUnread?: number; notifUnread?: number }) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  const routeByName = Object.fromEntries(state.routes.map((r) => [r.name, r]));

  const renderTab = (name: string) => {
    const cfg = TABS[name];
    const route = routeByName[name];
    if (!cfg || !route) return null;

    const routeIndex = state.routes.findIndex((r) => r.key === route.key);
    const focused = state.index === routeIndex;

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
      <Pressable key={name} style={styles.item} onPress={onPress}>
        <View style={{ transform: [{ translateY: focused ? -3 : 0 }] }}>
          <Ionicons
            name={focused ? cfg.icon : cfg.iconOutline}
            size={26}
            color={focused ? c.primary : c.mutedForeground}
          />
          {count > 0 && (
            <View style={[styles.badge, { backgroundColor: c.destructive, borderColor: c.background }]}>
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
  };

  return (
    <View style={{ backgroundColor: c.background }}>
      <View style={[styles.bar, { backgroundColor: c.background, borderTopColor: c.border }]}>
        {LEFT.map(renderTab)}

        {/* Raised center — New chat / compose (routes to the People picker) */}
        <Pressable
          style={styles.item}
          // Extend the touch area upward so the raised button's protruding top
          // stays tappable in React Native.
          hitSlop={{ top: 24, bottom: 0, left: 6, right: 6 }}
          onPress={() => {
            const peopleRoute = routeByName["people"];
            if (!peopleRoute) return;
            const event = navigation.emit({
              type: "tabPress",
              target: peopleRoute.key,
              canPreventDefault: true,
            });
            if (!event.defaultPrevented) navigation.navigate("people");
          }}
          accessibilityRole="button"
          accessibilityLabel="New chat"
        >
          <View
            style={[
              styles.raised,
              { backgroundColor: c.primary, shadowColor: c.primary, borderColor: c.background },
            ]}
          >
            <Ionicons name="create" size={26} color={c.primaryForeground} />
          </View>
          <Text style={[styles.label, { color: c.mutedForeground }]}>New</Text>
        </Pressable>

        {RIGHT.map(renderTab)}
      </View>
      <View style={{ height: insets.bottom, backgroundColor: c.background }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 64,
    paddingHorizontal: 6,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { boxShadow: "0 -8px 30px rgba(58,40,26,0.10)" } as object,
      default: {
        shadowColor: "#3a281a",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 14,
        elevation: 14,
      },
    }),
  },
  item: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    height: "100%",
  },
  raised: {
    position: "absolute",
    bottom: 18,
    width: 58,
    height: 58,
    borderRadius: 20,
    borderWidth: 4,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: { boxShadow: "0 12px 24px rgba(192,132,252,0.5)" } as object,
      default: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.45,
        shadowRadius: 12,
        elevation: 10,
      },
    }),
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: "Inter_600SemiBold",
  },
  labelActive: {
    fontFamily: "Inter_700Bold",
  },
  badge: {
    position: "absolute",
    top: -5,
    right: -8,
    minWidth: 17,
    height: 17,
    borderRadius: 9,
    borderWidth: 1.5,
    paddingHorizontal: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#fff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    lineHeight: 12,
  },
});
