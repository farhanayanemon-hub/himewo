import { useRef, useEffect } from "react";
import {
  Animated,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";

interface CreateActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectStory: () => void;
  onSelectReel: () => void;
}

interface ActionTile {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  gradient: [string, string];
  onPress: () => void;
}

export function CreateActionSheet({
  visible,
  onClose,
  onSelectStory,
  onSelectReel,
}: CreateActionSheetProps) {
  const c = useColors();
  const slideAnim = useRef(new Animated.Value(300)).current;

  const triggerHaptic = () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}
  };

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 26,
        stiffness: 300,
      }).start();
    } else {
      slideAnim.setValue(300);
    }
  }, [visible, slideAnim]);

  const tiles: ActionTile[] = [
    {
      id: "post",
      title: "Post",
      icon: "images",
      gradient: ["#2563EB", "#06B6D4"],
      onPress: () => {
        triggerHaptic();
        onClose();
        router.push("/create-post");
      },
    },
    {
      id: "story",
      title: "Story",
      icon: "camera",
      // Instagram classic sunset gradient
      gradient: ["#833AB4", "#FD1D1D"],
      onPress: () => {
        triggerHaptic();
        onClose();
        onSelectStory();
      },
    },
    {
      id: "reel",
      title: "Reel",
      icon: "videocam",
      gradient: ["#EC4899", "#8B5CF6"],
      onPress: () => {
        triggerHaptic();
        onClose();
        onSelectReel();
      },
    },
    {
      id: "live",
      title: "Live",
      icon: "radio",
      gradient: ["#EF4444", "#F97316"],
      onPress: () => {
        triggerHaptic();
        onClose();
        router.push("/live" as never);
      },
    },
    {
      id: "event",
      title: "Event",
      icon: "calendar",
      gradient: ["#F59E0B", "#EA580C"],
      onPress: () => {
        triggerHaptic();
        onClose();
        router.push("/events" as never);
      },
    },
    {
      id: "poll",
      title: "Poll",
      icon: "bar-chart",
      gradient: ["#10B981", "#059669"],
      onPress: () => {
        triggerHaptic();
        onClose();
        router.push("/create-post?poll=1" as never);
      },
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.sheet,
                {
                  backgroundColor: c.card,
                  borderColor: c.border,
                  transform: [{ translateY: slideAnim }],
                },
              ]}
            >
              {/* Instagram Pill Drag Handle */}
              <View style={[styles.handle, { backgroundColor: c.border }]} />

              {/* Minimalist Top Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: c.foreground }]}>Create</Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={10}
                  style={({ pressed }) => [
                    styles.closeBtn,
                    {
                      backgroundColor: c.secondary,
                      transform: [{ scale: pressed ? 0.9 : 1 }],
                    },
                  ]}
                  accessibilityLabel="Close"
                >
                  <Ionicons name="close" size={18} color={c.foreground} />
                </Pressable>
              </View>

              {/* Instagram-Style 3x2 Grid */}
              <View style={styles.gridContainer}>
                {tiles.map((tile) => (
                  <Pressable
                    key={tile.id}
                    onPress={tile.onPress}
                    style={({ pressed }) => [
                      styles.gridTile,
                      { transform: [{ scale: pressed ? 0.92 : 1 }] },
                    ]}
                  >
                    <LinearGradient
                      colors={tile.gradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.iconCircle}
                    >
                      <Ionicons name={tile.icon} size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={[styles.tileLabel, { color: c.foreground }]}>
                      {tile.title}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    paddingBottom: Platform.OS === "ios" ? 40 : 28,
    paddingTop: 8,
    ...Platform.select({
      web: {
        boxShadow: "0 -12px 40px rgba(0,0,0,0.45)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.35,
        shadowRadius: 16,
        elevation: 16,
      },
    }),
  },
  handle: {
    width: 44,
    height: 4.5,
    borderRadius: 3,
    alignSelf: "center",
    marginTop: 6,
    marginBottom: 6,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 22,
    paddingVertical: 10,
    marginBottom: 6,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    paddingVertical: 8,
    justifyContent: "space-around",
    rowGap: 20,
  },
  gridTile: {
    width: "30%",
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
    ...Platform.select({
      web: {
        boxShadow: "0 8px 18px rgba(0,0,0,0.22)",
      } as object,
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.22,
        shadowRadius: 6,
        elevation: 4,
      },
    }),
  },
  tileLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    textAlign: "center",
  },
});
