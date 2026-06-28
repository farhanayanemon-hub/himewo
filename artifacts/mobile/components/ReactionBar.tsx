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
  useWindowDimensions,
} from "react-native";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";
import { ReactionType } from "@workspace/api-client-react";
import { reactionConfig, reactionOrder } from "@/constants/reactions";
import { useColors } from "@/hooks/useColors";
import { useSounds } from "@/lib/sounds";

interface ReactionBarProps {
  viewerReaction?: ReactionType | null;
  onReact: (type: ReactionType) => void;
  size?: "default" | "sm";
}

const SCREEN_MARGIN = 12;
const PICKER_PAD = 8;
const PICKER_GAP = 4;
const MAX_ITEM = 44;

function AnimatedReaction({
  type,
  index,
  itemWidth,
  emojiSize,
  onPick,
}: {
  type: ReactionType;
  index: number;
  itemWidth: number;
  emojiSize: number;
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
      style={[styles.reaction, { width: itemWidth }]}
      hitSlop={4}
    >
      <Animated.Text
        style={{ fontSize: emojiSize, transform: [{ scale: Animated.multiply(scale, press) }] }}
      >
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
  const { play } = useSounds();
  const { width: screenW } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState({ x: SCREEN_MARGIN, y: 200 });
  const btnRef = useRef<View>(null);
  const active = viewerReaction ? reactionConfig[viewerReaction] : null;
  const isSm = size === "sm";

  // Size the picker so it always fits on screen, no matter how narrow.
  const count = reactionOrder.length;
  const available = screenW - SCREEN_MARGIN * 2 - PICKER_PAD * 2 - (count - 1) * PICKER_GAP;
  const itemWidth = Math.max(28, Math.min(MAX_ITEM, Math.floor(available / count)));
  const emojiSize = Math.round(itemWidth * 0.74);
  const pickerWidth = count * itemWidth + (count - 1) * PICKER_GAP + PICKER_PAD * 2;

  const showPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const node = btnRef.current && findNodeHandle(btnRef.current);
    if (node) {
      UIManager.measureInWindow(node, (x, y) => {
        const maxLeft = Math.max(SCREEN_MARGIN, screenW - pickerWidth - SCREEN_MARGIN);
        const left = Math.min(Math.max(SCREEN_MARGIN, x - 8), maxLeft);
        setAnchor({ x: left, y: Math.max(80, y - 70) });
        setOpen(true);
      });
    } else {
      setOpen(true);
    }
  };

  const pick = (t: ReactionType) => {
    setOpen(false);
    Haptics.selectionAsync();
    play("reaction");
    onReact(t);
  };

  return (
    <>
      <Pressable
        ref={btnRef}
        onPress={() => {
          play("reaction");
          onReact(viewerReaction || ReactionType.like);
        }}
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
                width: pickerWidth,
                backgroundColor: c.card,
                borderColor: c.border,
              },
            ]}
          >
            {reactionOrder.map((t, i) => (
              <AnimatedReaction
                key={t}
                type={t}
                index={i}
                itemWidth={itemWidth}
                emojiSize={emojiSize}
                onPick={pick}
              />
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
    gap: PICKER_GAP,
    paddingHorizontal: PICKER_PAD,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  reaction: { alignItems: "center", justifyContent: "center" },
});
