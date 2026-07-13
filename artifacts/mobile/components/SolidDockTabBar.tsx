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
  raised?: boolean;
  badge?: boolean;
};

/**
 * Per-route presentation for the "Solid Dock" tab bar. Route names that are not
 * listed here (e.g. the header-driven "menu" route) are skipped.
 */
const TABS: Record<string, TabConfig> = {
  index: { label: "Home", icon: "home", iconOutline: "home-outline" },
  friends: { label: "Friends", icon: "people", iconOutline: "people-outline" },
  reels: { label: "Reels", icon: "film", iconOutline: "film-outline", raised: true },
  notifications: {
    label: "Alerts",
    icon: "notifications",
    iconOutline: "notifications-outline",
    badge: true,
  },
  profile: { label: "Profile", icon: "person-circle", iconOutline: "person-circle-outline" },
};

const ORDER = ["index", "friends", "reels", "notifications", "profile"];

export function SolidDockTabBar({
  state,
  navigation,
  unreadCount = 0,
}: BottomTabBarProps & { unreadCount?: number }) {
  const c = useColors();
  const insets = useSafeAreaInsets();

  const routeByName = Object.fromEntries(state.routes.map((r) => [r.name, r]));

  return (
    <View style={{ backgroundColor: c.surface }}>
      <View
        style={[
          styles.bar,
          {
            backgroundColor: c.surface,
            borderTopColor: c.border,
            shadowColor: "#000",
          },
        ]}
      >
        {ORDER.map((name) => {
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

          const showBadge = cfg.badge && unreadCount > 0;

          if (cfg.raised) {
            return (
              <Pressable
                key={name}
                style={styles.item}
                onPress={onPress}
                // The raised button lifts above the bar; extend the touch area
                // upward so its protruding top stays tappable in React Native.
                hitSlop={{ top: 24, bottom: 0, left: 6, right: 6 }}
              >
                <View
                  style={[
                    styles.raised,
                    {
                      backgroundColor: c.primary,
                      shadowColor: c.primary,
                      borderColor: c.surface,
                    },
                  ]}
                >
                  <Ionicons name={cfg.icon} size={28} color={c.primaryForeground} />
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
          }

          return (
            <Pressable key={name} style={styles.item} onPress={onPress}>
              <View style={{ transform: [{ translateY: focused ? -3 : 0 }] }}>
                <Ionicons
                  name={focused ? cfg.icon : cfg.iconOutline}
                  size={26}
                  color={focused ? c.primary : c.mutedForeground}
                />
                {showBadge && (
                  <View style={[styles.badge, { backgroundColor: c.destructive, borderColor: c.surface }]}>
                    <Text style={styles.badgeText}>{unreadCount > 99 ? "99+" : unreadCount}</Text>
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
      <View style={{ height: insets.bottom, backgroundColor: c.surface }} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 64,
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      web: { boxShadow: "0 -8px 30px rgba(0,0,0,0.08)" } as object,
      default: {
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 14,
        elevation: 12,
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
      web: { boxShadow: "0 12px 24px rgba(0,0,0,0.28)" } as object,
      default: {
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
      },
    }),
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontFamily: "Inter_500Medium",
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
