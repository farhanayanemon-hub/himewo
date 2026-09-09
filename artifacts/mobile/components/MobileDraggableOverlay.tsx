import { useRef } from "react";
import {
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { MobileOverlayItem } from "@/lib/smartStickers";

interface MobileDraggableOverlayProps {
  overlay: MobileOverlayItem;
  isSelected: boolean;
  onSelect: () => void;
  onMove: (dx: number, dy: number) => void;
}

export function MobileDraggableOverlay({
  overlay,
  isSelected,
  onSelect,
  onMove,
}: MobileDraggableOverlayProps) {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        onSelect();
      },
      onPanResponderMove: (_, gestureState) => {
        const dxPercent = gestureState.dx / 4;
        const dyPercent = gestureState.dy / 6;
        onMove(dxPercent, dyPercent);
      },
    }),
  ).current;

  const bgStyle = overlay.bgStyle ?? "pill";
  const fnStyle = overlay.fontStyle ?? "modern";

  const getFontAttributes = () => {
    switch (fnStyle) {
      case "serif":
        return {
          fontFamily: Platform.select({ ios: "Georgia", default: "serif" }),
          fontStyle: "italic" as const,
        };
      case "neon":
        return {
          fontFamily: "Inter_700Bold",
          textShadowColor: overlay.color || "#a855f7",
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        };
      case "script":
        return {
          fontFamily: Platform.select({ ios: "Snell Roundhand", default: "serif" }),
          fontStyle: "italic" as const,
          fontWeight: "600" as const,
        };
      case "impact":
        return {
          fontFamily: "Inter_700Bold",
          letterSpacing: 1.5,
          textTransform: "uppercase" as const,
        };
      case "modern":
      default:
        return {
          fontFamily: "Inter_700Bold",
        };
    }
  };

  const renderContent = () => {
    switch (overlay.type) {
      case "emoji":
        return (
          <Text style={{ fontSize: overlay.fontSize ?? 44, textShadowColor: "rgba(0,0,0,0.5)", textShadowRadius: 4 }}>
            {overlay.content}
          </Text>
        );

      case "smart_time":
        return (
          <View style={styles.smartBadgeTime}>
            <Ionicons name="time" size={16} color="#f59e0b" />
            <Text style={styles.smartBadgeTimeText}>{overlay.content}</Text>
          </View>
        );

      case "smart_location":
        return (
          <View style={styles.smartBadgeLocation}>
            <Ionicons name="location-sharp" size={16} color="#ef4444" />
            <Text style={styles.smartBadgeLocationText}>{overlay.content}</Text>
          </View>
        );

      case "smart_music":
        return (
          <View style={styles.smartBadgeMusic}>
            <Ionicons name="musical-notes" size={16} color="#a855f7" />
            <View>
              <Text style={styles.smartBadgeMusicTitle}>{overlay.content}</Text>
              {overlay.subContent ? (
                <Text style={styles.smartBadgeMusicSub}>{overlay.subContent}</Text>
              ) : null}
            </View>
          </View>
        );

      case "smart_feeling":
        return (
          <View style={styles.smartBadgeFeeling}>
            <Ionicons name="sparkles" size={16} color="#10b981" />
            <Text style={styles.smartBadgeFeelingText}>{overlay.content}</Text>
          </View>
        );

      case "smart_poll":
        return (
          <View style={styles.smartBadgePoll}>
            <Text style={styles.smartBadgePollQuestion}>{overlay.content}</Text>
            <View style={styles.pollOptionsRow}>
              <View style={[styles.pollOptionBox, { backgroundColor: "#10b98133", borderColor: "#10b981" }]}>
                <Text style={[styles.pollOptionText, { color: "#10b981" }]}>YES 👍</Text>
              </View>
              <View style={[styles.pollOptionBox, { backgroundColor: "#ef444433", borderColor: "#ef4444" }]}>
                <Text style={[styles.pollOptionText, { color: "#ef4444" }]}>NO 👎</Text>
              </View>
            </View>
          </View>
        );

      case "text":
      default:
        return (
          <View
            style={[
              styles.textBadgeCommon,
              bgStyle === "pill" && styles.textBadgePill,
              bgStyle === "glass" && styles.textBadgeGlass,
              bgStyle === "neon" && styles.textBadgeNeon,
            ]}
          >
            <Text
              style={[
                styles.textBadgeContent,
                getFontAttributes(),
                {
                  color: overlay.color || "#ffffff",
                  fontSize: overlay.fontSize ?? 18,
                },
              ]}
            >
              {overlay.content}
            </Text>
          </View>
        );
    }
  };

  return (
    <View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        { left: `${overlay.x}%`, top: `${overlay.y}%` },
        isSelected && styles.selectedRing,
      ]}
    >
      {renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    transform: [{ translateX: -50 }, { translateY: -50 }],
    zIndex: 30,
    padding: 4,
  },
  selectedRing: {
    borderWidth: 1.5,
    borderColor: "#a855f7",
    borderRadius: 12,
    borderStyle: "dashed",
  },
  textBadgeCommon: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
  },
  textBadgePill: {
    backgroundColor: "#000000cc",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ffffff33",
  },
  textBadgeGlass: {
    backgroundColor: "#ffffff33",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ffffff66",
  },
  textBadgeNeon: {
    backgroundColor: "#000000ee",
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#a855f7",
  },
  textBadgeContent: {
    fontFamily: "Inter_700Bold",
  },
  smartBadgeTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: "#f59e0b",
    shadowColor: "#f59e0b",
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  smartBadgeTimeText: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: 1,
  },
  smartBadgeLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.6)",
  },
  smartBadgeLocationText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  smartBadgeMusic: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.85)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(168,85,247,0.7)",
  },
  smartBadgeMusicTitle: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  smartBadgeMusicSub: {
    color: "#a1a1aa",
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  smartBadgeFeeling: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16,185,129,0.7)",
  },
  smartBadgeFeelingText: {
    color: "#fff",
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  smartBadgePoll: {
    backgroundColor: "rgba(0,0,0,0.9)",
    borderRadius: 18,
    padding: 14,
    minWidth: 200,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  smartBadgePollQuestion: {
    color: "#fff",
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginBottom: 10,
    textAlign: "center",
  },
  pollOptionsRow: {
    flexDirection: "row",
    gap: 10,
    width: "100%",
  },
  pollOptionBox: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
  },
  pollOptionText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
});
