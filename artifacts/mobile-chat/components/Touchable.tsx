import { useRef } from "react";
import {
  Animated,
  Pressable,
  type GestureResponderEvent,
  type PressableProps,
} from "react-native";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export interface TouchableProps extends PressableProps {
  /** How far to scale down while pressed (1 = no scale). Default 0.96. */
  scaleTo?: number;
  /** Opacity while pressed. Default 0.7. */
  activeOpacity?: number;
}

/**
 * A drop-in replacement for <Pressable> that adds a smooth, Facebook-style
 * press animation (subtle spring scale-down + opacity dip). Use it for any
 * tappable button so presses feel responsive across the app.
 */
export function Touchable({
  scaleTo = 0.96,
  activeOpacity = 0.7,
  style,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: TouchableProps) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(1)).current;

  const handlePressIn = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: scaleTo,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
    Animated.timing(opacity, {
      toValue: activeOpacity,
      duration: 80,
      useNativeDriver: true,
    }).start();
    onPressIn?.(e);
  };

  const handlePressOut = (e: GestureResponderEvent) => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
    Animated.timing(opacity, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
    onPressOut?.(e);
  };

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[style as never, { transform: [{ scale }], opacity }]}
      {...rest}
    />
  );
}
