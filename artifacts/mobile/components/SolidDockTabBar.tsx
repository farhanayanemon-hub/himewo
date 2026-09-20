import { View, Text, Pressable, Platform, StyleSheet, DeviceEventEmitter } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export function SolidDockTabBar({
  state,
  navigation,
  unreadCount = 0,
}: BottomTabBarProps & { unreadCount?: number }) {
  const insets = useSafeAreaInsets();
  const currentRouteName = state.routes[state.index]?.name;

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const navigateTo = (routeName: string) => {
    triggerHaptic();
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) return;

    const focused = currentRouteName === routeName;
    const event = navigation.emit({
      type: "tabPress",
      target: route.key,
      canPreventDefault: true,
    });
    if (!focused && !event.defaultPrevented) {
      navigation.navigate(routeName);
    } else if (focused && routeName === "index") {
      DeviceEventEmitter.emit("himewo:scroll-feed-to-top");
    }
  };

  const handleCreatePress = () => {
    triggerHaptic();
    DeviceEventEmitter.emit("himewo:open-create-sheet");
  };

  const isHomeFocused = currentRouteName === "index";
  const isChatsFocused = currentRouteName === "chats";
  const isProfileFocused = currentRouteName === "profile";

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        { bottom: Math.max(insets.bottom, 12) + 6 },
      ]}
    >
      <View pointerEvents="box-none" style={styles.dockRow}>
        {/* ISLAND 1 (LEFT): Separate Dark Circle [ 💬 ] */}
        <Pressable
          onPress={() => navigateTo("chats")}
          style={({ pressed }) => [
            styles.circleIsland,
            isChatsFocused && styles.islandActive,
            { transform: [{ scale: pressed ? 0.92 : 1 }] },
          ]}
          accessibilityLabel="Chats"
          hitSlop={8}
        >
          <Ionicons
            name={isChatsFocused ? "chatbubbles" : "chatbubbles-outline"}
            size={22}
            color="#FFFFFF"
          />
          {unreadCount > 0 ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </Pressable>

        {/* ISLAND 2 (MIDDLE): Combined Pill [ ⌂ Home ] + [ + ] */}
        <View style={styles.centerIsland}>
          {/* Active / Inactive Home Pill */}
          <Pressable
            onPress={() => navigateTo("index")}
            style={({ pressed }) => [
              styles.homePill,
              isHomeFocused && styles.homePillActive,
              { transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
            accessibilityLabel="Home Feed"
            hitSlop={6}
          >
            <Ionicons
              name={isHomeFocused ? "home" : "home-outline"}
              size={18}
              color="#FFFFFF"
            />
            <Text
              style={[
                styles.homeText,
                { color: isHomeFocused ? "#FFFFFF" : "rgba(255,255,255,0.7)" },
              ]}
            >
              Home
            </Text>
          </Pressable>

          {/* Electric Cyan Plus Button */}
          <Pressable
            onPress={handleCreatePress}
            style={({ pressed }) => [
              styles.cyanPlusBtn,
              { transform: [{ scale: pressed ? 0.90 : 1 }] },
            ]}
            accessibilityLabel="Create Post or Story"
            hitSlop={8}
          >
            <Ionicons name="add" size={26} color="#14171D" />
          </Pressable>
        </View>

        {/* ISLAND 3 (RIGHT): Separate Dark Circle [ 👤 ] */}
        <Pressable
          onPress={() => navigateTo("profile")}
          style={({ pressed }) => [
            styles.circleIsland,
            isProfileFocused && styles.islandActive,
            { transform: [{ scale: pressed ? 0.92 : 1 }] },
          ]}
          accessibilityLabel="Profile"
          hitSlop={8}
        >
          <Ionicons
            name={isProfileFocused ? "person" : "person-outline"}
            size={22}
            color="#FFFFFF"
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  dockRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  circleIsland: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#14171D",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    ...Platform.select({
      web: {
        boxShadow: "0 14px 34px -4px rgba(0,0,0,0.38), 0 4px 14px rgba(0,0,0,0.22)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.38,
        shadowRadius: 16,
        elevation: 12,
      },
    }),
  },
  islandActive: {
    borderColor: "rgba(255,255,255,0.25)",
  },
  centerIsland: {
    height: 52,
    paddingLeft: 6,
    paddingRight: 6,
    borderRadius: 26,
    backgroundColor: "#14171D",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    ...Platform.select({
      web: {
        boxShadow: "0 14px 34px -4px rgba(0,0,0,0.38), 0 4px 14px rgba(0,0,0,0.22)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.38,
        shadowRadius: 16,
        elevation: 12,
      },
    }),
  },
  homePill: {
    height: 40,
    paddingHorizontal: 14,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  homePillActive: {
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  homeText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  cyanPlusBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#00C2E8",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        boxShadow: "0 0 16px rgba(0, 194, 232, 0.55)",
      } as object,
      default: {
        shadowColor: "#00C2E8",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 6,
      },
    }),
  },
  badge: {
    position: "absolute",
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#14171D",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
    lineHeight: 12,
  },
});
