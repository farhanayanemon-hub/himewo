import { View, Text, Pressable, Platform, StyleSheet, DeviceEventEmitter } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, usePathname } from "expo-router";
import * as Haptics from "expo-haptics";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";

export function SolidDockTabBar({
  state,
  navigation,
  unreadCount = 0,
}: BottomTabBarProps & { unreadCount?: number }) {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const currentRouteName = state.routes[state.index]?.name;

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  const navigateTo = (routeName: string) => {
    triggerHaptic();
    const route = state.routes.find((r) => r.name === routeName);
    if (!route) {
      router.push(`/${routeName}` as never);
      return;
    }

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
  const isReelsFocused = currentRouteName === "reels";
  const isShopFocused = currentRouteName === "shop" || pathname.startsWith("/shop");
  const isChatsFocused = currentRouteName === "chats";
  const isProfileFocused = currentRouteName === "profile";

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.container,
        { bottom: Math.max(insets.bottom, 10) + 4 },
      ]}
    >
      <View pointerEvents="box-none" style={styles.dockRow}>
        {/* ISLAND 1 (FAR LEFT): Separate Dark Circle [ 💬 ] */}
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
            size={23}
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

        {/* ISLAND 2 (MIDDLE PILL): [ ➕ Plus ] [ ⌂ Feed ] [ 🎬 Reels ] [ 🛍️ Shop ] */}
        <View style={styles.centerIsland}>
          {/* 1. Electric Cyan Plus Button FIRST (in place of Home) */}
          <Pressable
            onPress={handleCreatePress}
            style={({ pressed }) => [
              styles.cyanPlusBtn,
              { transform: [{ scale: pressed ? 0.90 : 1 }] },
            ]}
            accessibilityLabel="Create Content"
            hitSlop={8}
          >
            <Ionicons name="add" size={26} color="#0E1117" />
          </Pressable>

          {/* 2. Feed / Home (Always visible) */}
          <Pressable
            onPress={() => navigateTo("index")}
            style={({ pressed }) => [
              styles.iconPill,
              isHomeFocused && styles.pillActive,
              { transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
            accessibilityLabel="Home Feed"
            hitSlop={6}
          >
            <Ionicons
              name={isHomeFocused ? "home" : "home-outline"}
              size={22}
              color="#FFFFFF"
            />
          </Pressable>

          {/* 3. Reels */}
          <Pressable
            onPress={() => navigateTo("reels")}
            style={({ pressed }) => [
              styles.iconPill,
              isReelsFocused && styles.pillActive,
              { transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
            accessibilityLabel="Reels"
            hitSlop={6}
          >
            <Ionicons
              name={isReelsFocused ? "film" : "film-outline"}
              size={22}
              color="#FFFFFF"
            />
          </Pressable>

          {/* 4. Shop */}
          <Pressable
            onPress={() => navigateTo("shop")}
            style={({ pressed }) => [
              styles.iconPill,
              isShopFocused && styles.pillActive,
              { transform: [{ scale: pressed ? 0.94 : 1 }] },
            ]}
            accessibilityLabel="Shop"
            hitSlop={6}
          >
            <Ionicons
              name={isShopFocused ? "bag-handle" : "bag-handle-outline"}
              size={22}
              color="#FFFFFF"
            />
          </Pressable>
        </View>

        {/* ISLAND 3 (FAR RIGHT): Separate Dark Circle [ 👤 ] */}
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
            size={23}
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
    justifyContent: "space-between",
    width: "100%",
    maxWidth: 430,
    paddingHorizontal: 12,
  },
  circleIsland: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#11141A",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.10)",
    ...Platform.select({
      web: {
        boxShadow: "0 16px 36px -4px rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.25)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
        elevation: 6,
      },
    }),
  },
  islandActive: {
    borderColor: "rgba(0,194,232,0.55)",
    backgroundColor: "#161B22",
  },
  centerIsland: {
    height: 50,
    paddingHorizontal: 6,
    borderRadius: 25,
    backgroundColor: "#11141A",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.10)",
    ...Platform.select({
      web: {
        boxShadow: "0 16px 36px -4px rgba(0,0,0,0.45), 0 6px 16px rgba(0,0,0,0.25)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.28,
        shadowRadius: 10,
        elevation: 6,
      },
    }),
  },
  iconPill: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  pillActive: {
    backgroundColor: "rgba(255,255,255,0.18)",
  },
  cyanPlusBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#00C2E8",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        boxShadow: "0 0 20px rgba(0, 194, 232, 0.6)",
      } as object,
      default: {
        shadowColor: "#00C2E8",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.65,
        shadowRadius: 10,
        elevation: 8,
      },
    }),
  },
  badge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 19,
    height: 19,
    borderRadius: 9.5,
    backgroundColor: "#EF4444",
    borderWidth: 2,
    borderColor: "#11141A",
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
