import { useRef, useEffect } from "react";
import {
  Animated,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useColors } from "@/hooks/useColors";

interface CreateActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onSelectStory: () => void;
  onSelectReel: () => void;
}

interface ActionItem {
  id: string;
  title: string;
  sub: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bgColor: string;
  onPress: () => void;
}

export function CreateActionSheet({
  visible,
  onClose,
  onSelectStory,
  onSelectReel,
}: CreateActionSheetProps) {
  const c = useColors();
  const slideAnim = useRef(new Animated.Value(400)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 24,
        stiffness: 280,
      }).start();
    } else {
      slideAnim.setValue(400);
    }
  }, [visible, slideAnim]);

  const items: ActionItem[] = [
    {
      id: "post",
      title: "Create Post",
      sub: "Share a status, photos or poll on Feed",
      icon: "create-outline",
      color: "#3b82f6",
      bgColor: "#3b82f618",
      onPress: () => {
        onClose();
        router.push("/create-post");
      },
    },
    {
      id: "story",
      title: "Create Story",
      sub: "Share photos, videos or text with 50+ filters",
      icon: "book-outline",
      color: "#8b5cf6",
      bgColor: "#8b5cf618",
      onPress: () => {
        onClose();
        onSelectStory();
      },
    },
    {
      id: "reel",
      title: "Create Reel",
      sub: "Share short-form video reels with music & stickers",
      icon: "videocam-outline",
      color: "#ec4899",
      bgColor: "#ec489918",
      onPress: () => {
        onClose();
        onSelectReel();
      },
    },
    {
      id: "live",
      title: "Go Live",
      sub: "Broadcast live video to friends & followers",
      icon: "radio-outline",
      color: "#ef4444",
      bgColor: "#ef444418",
      onPress: () => {
        onClose();
        router.push("/live" as never);
      },
    },
    {
      id: "event",
      title: "Create Event",
      sub: "Plan and invite friends to an occasion",
      icon: "calendar-outline",
      color: "#f59e0b",
      bgColor: "#f59e0b18",
      onPress: () => {
        onClose();
        router.push("/events" as never);
      },
    },
    {
      id: "hub",
      title: "Create Hub",
      sub: "Build a brand, business or creator page",
      icon: "flag-outline",
      color: "#10b981",
      bgColor: "#10b98118",
      onPress: () => {
        onClose();
        router.push("/pages" as never);
      },
    },
    {
      id: "circle",
      title: "Create Circle",
      sub: "Create a community group for shared passions",
      icon: "people-outline",
      color: "#06b6d4",
      bgColor: "#06b6d418",
      onPress: () => {
        onClose();
        router.push("/groups" as never);
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
                { backgroundColor: c.card, borderColor: c.border, transform: [{ translateY: slideAnim }] },
              ]}
            >
              {/* Drag handle */}
              <View style={[styles.handle, { backgroundColor: c.border }]} />

              {/* Header */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: c.foreground }]}>Create</Text>
                <Pressable
                  onPress={onClose}
                  hitSlop={8}
                  style={[styles.closeBtn, { backgroundColor: c.secondary }]}
                >
                  <Ionicons name="close" size={18} color={c.foreground} />
                </Pressable>
              </View>

              {/* Action List */}
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
              >
                {items.map((item, idx) => (
                  <View key={item.id}>
                    <Pressable
                      style={({ pressed }) => [
                        styles.optionRow,
                        { backgroundColor: pressed ? c.secondary : "transparent" },
                      ]}
                      onPress={item.onPress}
                    >
                      <View style={[styles.iconWrap, { backgroundColor: item.bgColor }]}>
                        <Ionicons name={item.icon} size={22} color={item.color} />
                      </View>
                      <View style={styles.textWrap}>
                        <Text style={[styles.optionTitle, { color: c.foreground }]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.optionSub, { color: c.mutedForeground }]} numberOfLines={1}>
                          {item.sub}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={18} color={c.mutedForeground} />
                    </Pressable>
                    {idx < items.length - 1 && (
                      <View style={[styles.divider, { backgroundColor: c.border }]} />
                    )}
                  </View>
                ))}
              </ScrollView>
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
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: StyleSheet.hairlineWidth,
    maxHeight: "82%",
    paddingBottom: 34,
  },
  handle: {
    width: 38,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 10,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  textWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  optionSub: {
    fontSize: 12,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 66,
  },
});
