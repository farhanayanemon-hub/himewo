import React, { useState } from "react";
import { Image } from "expo-image";
import { View, Text, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import colorTokens from "@/constants/colors";
import { useColors } from "@/hooks/useColors";

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  online?: boolean;
  ring?: boolean;
}

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const Avatar = React.memo(function Avatar({
  uri,
  name,
  size = 40,
  online,
  ring,
}: AvatarProps) {
  const c = useColors();
  const radius = size / 2;
  const innerSize = ring ? size - 4 : size;
  const [hasError, setHasError] = useState(false);

  const showImage = Boolean(uri && !hasError);

  const inner = (
    <View
      style={{
        width: innerSize,
        height: innerSize,
        borderRadius: innerSize / 2,
        backgroundColor: c.secondary,
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      {showImage ? (
        <Image
          source={{ uri: uri! }}
          style={{ width: innerSize, height: innerSize }}
          contentFit="cover"
          transition={100}
          cachePolicy="memory-disk"
          priority="high"
          onError={() => setHasError(true)}
        />
      ) : (
        <Text
          style={{
            color: c.mutedForeground,
            fontFamily: "Inter_600SemiBold",
            fontSize: size * 0.4,
          }}
        >
          {initials(name)}
        </Text>
      )}
    </View>
  );

  return (
    <View style={{ width: size, height: size }}>
      {ring ? (
        <LinearGradient
          colors={colorTokens.auroraGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            width: size,
            height: size,
            borderRadius: radius,
            padding: 2,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {inner}
        </LinearGradient>
      ) : (
        inner
      )}
      {online && (
        <View
          style={[
            styles.dot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              borderColor: c.card,
              backgroundColor: "#31a24c",
            },
          ]}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    borderWidth: 2,
  },
});
