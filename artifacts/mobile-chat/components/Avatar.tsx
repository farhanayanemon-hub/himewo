import { fs } from "@/constants/typography";
import { shadow } from "@/constants/shadows";
import { Image } from "expo-image";
import { View, Text, StyleSheet } from "react-native";
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

export function Avatar({ uri, name, size = 40, online, ring }: AvatarProps) {
  const c = useColors();
  const radius = size / 2;

  return (
    <View style={[{ width: size, height: size, borderRadius: radius }, shadow("sm")]}>
      <View
        style={[
          {
            width: size,
            height: size,
            borderRadius: radius,
            backgroundColor: c.secondary,
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
          },
          ring && { borderWidth: 2, borderColor: c.primary },
        ]}
      >
        {uri ? (
          <Image
            source={{ uri }}
            style={{ width: size, height: size }}
            contentFit="cover"
            transition={150}
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
      {online !== undefined && (
        <View
          style={[
            styles.dot,
            {
              width: size * 0.28,
              height: size * 0.28,
              borderRadius: size * 0.14,
              borderColor: c.card,
              backgroundColor: online ? "#31a24c" : "#9ca3af",
            },
          ]}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  dot: {
    position: "absolute",
    right: 0,
    bottom: 0,
    borderWidth: 2,
  },
});
