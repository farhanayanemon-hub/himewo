import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  Text,
  View,
  StyleSheet,
  Animated,
  findNodeHandle,
  UIManager,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { ReactionType } from "@workspace/api-client-react";
import { reactionConfig, reactionOrder } from "@/constants/reactions";
import { useColors } from "@/hooks/useColors";

interface ReactionBarProps {
  viewerReaction?: ReactionType | null;
  onReact: (type: ReactionType) => void;
  size?: "default" | "sm";
}

function AnimatedReaction({
  type,
  index,
  onPick,
}: {
  type: ReactionType;
  index: number;
  onPick: (t: ReactionType) => void;
}) {
  const scale = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 5,
      tension: 120,
      delay: index * 45,
      useNativeDriver: true,
    }).start();
  }, [scale, index]);

  return (
    <Pressable
      onPress={() => onPick(type)}
      onPressIn={() =>
        Animated.spring(press, { toValue: 1.4, useNativeDriver: true, friction: 4 }).start()
      }
      onPressOut={() =>
        Animated.spring(press, { toValue: 1, useNativeDriver: true, friction: 4 }).start()
      }
      style={styles.reaction}
      hitSlop={4}
    >
      <Animated.Text style={{ fontSize: 32, transform: [{ scale: Animated.multiply(scale, press) }] }}>
        {reactionConfig[type].emoji}
      </Animated.Text>
    </Pressable>
  );
}

export function ReactionBar({
  viewerReaction,
  onReact,
  size = "default",
}: ReactionBarProps) {
  const c = useColors();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: 16, y: 200 });
  const btnRef = useRef<View>(null);
  const active = viewerReaction ? reactionConfig[viewerReaction] : null;
  const isSm = size === "sm";

  const showPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const node = btnRef.current && findNodeHandle(btnRef.current);
    if (node) {
      UIManager.measureInWindow(node, (x, y) => {
        setAnchor({ x: Math.max(12, x - 8), y: Math.max(80, y - 70) });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  const pick = (t: ReactionType) => {
    setOpen(false);
    Haptics.selectionAsync();
    onReact(t);
  };

  return (
    <>
      <Pressable
        ref={btnRef}
        onPress={() => onReact(viewerReaction || ReactionType.like)}
        onLongPress={showPicker}
        delayLongPress={220}
        style={styles.btn}
        hitSlop={8}
      >
        {active ? (
          <Text style={{ fontSize: isSm ? 15 : 18 }}>{active.emoji}</Text>
        ) : (
          <Ionicons
            name="thumbs-up-outline"
            size={isSm ? 16 : 19}
            color={c.mutedForeground}
          />
        )}
        <Text
          style={{
            color: active ? active.color : c.mutedForeground,
            fontFamily: "Inter_600SemiBold",
            fontSize: isSm ? 12 : 14,
          }}
        >
          {active ? active.label : "Like"}
        </Text>
      </Pressable>

      <Modal visible={open} transparent animationType="fade">
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.picker,
              {
                top: anchor.y,
                left: anchor.x,
                backgroundColor: c.card,
                borderColor: c.border,
              },
            ]}
          >
            {reactionOrder.map((t, i) => (
              <AnimatedReaction key={t} type={t} index={i} onPick={pick} />
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: "row", alignItems: "center", gap: 6 },
  backdrop: { flex: 1 },
  picker: {
    position: "absolute",
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  reaction: { paddingHorizontal: 2 },
});
