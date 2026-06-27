import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  Text,
  View,
  StyleSheet,
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

/** A single emoji in the picker that pops in with a staggered spring. */
function PickerEmoji({
  emoji,
  index,
  onPress,
}: {
  emoji: string;
  index: number;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(0)).current;
  const press = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 260,
      delay: index * 40,
      easing: Easing.bezier(0.18, 0.89, 0.32, 1.28),
      useNativeDriver: true,
    }).start();
  }, [anim, index]);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() =>
        Animated.spring(press, { toValue: 1.35, useNativeDriver: true, speed: 40 }).start()
      }
      onPressOut={() =>
        Animated.spring(press, { toValue: 1, useNativeDriver: true, speed: 40 }).start()
      }
      style={styles.reaction}
      hitSlop={4}
    >
      <Animated.Text
        style={{
          fontSize: 32,
          opacity: anim,
          transform: [
            {
              translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }),
            },
            { scale: Animated.multiply(anim, press) },
          ],
        }}
      >
        {emoji}
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
  const containerAnim = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(1)).current;
  const active = viewerReaction ? reactionConfig[viewerReaction] : null;
  const isSm = size === "sm";

  useEffect(() => {
    if (open) {
      containerAnim.setValue(0);
      Animated.spring(containerAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 18,
        bounciness: 10,
      }).start();
    }
  }, [open, containerAnim]);

  const showPicker = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const node = btnRef.current && findNodeHandle(btnRef.current);
    if (node) {
      UIManager.measureInWindow(node, (x, y) => {
        setAnchor({ x: Math.max(12, x - 8), y: Math.max(80, y - 64) });
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

  const quickReact = () => {
    burst.setValue(0.4);
    Animated.spring(burst, {
      toValue: 1,
      useNativeDriver: true,
      speed: 16,
      bounciness: 14,
    }).start();
    onReact(viewerReaction || ReactionType.like);
  };

  return (
    <>
      <Pressable
        ref={btnRef}
        onPress={quickReact}
        onLongPress={showPicker}
        delayLongPress={220}
        style={styles.btn}
        hitSlop={8}
      >
        {active ? (
          <Animated.Text style={{ fontSize: isSm ? 15 : 18, transform: [{ scale: burst }] }}>
            {active.emoji}
          </Animated.Text>
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

      <Modal visible={open} transparent animationType="none">
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Animated.View
            style={[
              styles.picker,
              {
                top: anchor.y,
                left: anchor.x,
                backgroundColor: c.card,
                borderColor: c.border,
                opacity: containerAnim,
                transform: [
                  { scale: containerAnim.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) },
                  {
                    translateY: containerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [12, 0],
                    }),
                  },
                ],
              },
            ]}
          >
            {reactionOrder.map((t, i) => (
              <PickerEmoji
                key={t}
                emoji={reactionConfig[t].emoji}
                index={i}
                onPress={() => pick(t)}
              />
            ))}
          </Animated.View>
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
