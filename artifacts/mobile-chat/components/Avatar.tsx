import React, { memo } from "react";
import { fs } from "@/constants/typography";
import { Image } from "expo-image";
import { View, Text, StyleSheet } from "react-native";
import { useColors } from "@/hooks/useColors";

interface AvatarProps {
  uri?: string | null;
  name?: string;
  size?: number;
  /** undefined = no presence dot; true = green (online); false = grey (offline) */
  online?: boolean;
  ring?: boolean;
}

function initials(name?: string): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function AvatarComponent({ uri, name, size = 40, online, ring }: AvatarProps) {
  const c = useColors();
  const radius = size / 2;
  const validUri = typeof uri === "string" && uri.trim().length > 0 ? uri.trim() : null;
  const [hasError, setHasError] = React.useState(false);

  // Reset error state when validUri changes
  React.useEffect(() => {
    setHasError(false);
  }, [validUri]);

  return (
    <View style={{ width: size, height: size, position: "relative" }}>
      <View
        style={[
          styles.container,
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: c.secondary,
          },
          ring && { borderWidth: 2, borderColor: c.primary },
        ]}
      >
        {validUri && !hasError ? (
          <Image
            source={{ uri: validUri }}
            style={{ width: size, height: size }}
            contentFit="cover"
            cachePolicy="memory-disk"
            priority="high"
            recyclingKey={validUri}
            onError={() => setHasError(true)}
          />
        ) : (
          <Text
            style={[
              styles.initials,
              {
                color: c.mutedForeground,
                fontSize: size * 0.4,
              },
            ]}
          >
            {initials(name)}
          </Text>
        )}
      </View>
      {online !== undefined && (
        <View
          style={[
            styles.dot,
            {
              width: Math.max(12, size * 0.28),
              height: Math.max(12, size * 0.28),
              borderRadius: Math.max(6, size * 0.14),
              borderColor: c.card,
              backgroundColor: online ? "#31a24c" : "#9ca3af",
            },
          ]}
        />
      )}
    </View>
  );
}

export const Avatar = memo(AvatarComponent);

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    fontFamily: "Inter_600SemiBold",
  },
  dot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    borderWidth: 2.5,
  },
});
