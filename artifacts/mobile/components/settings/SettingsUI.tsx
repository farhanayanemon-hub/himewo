import {
  Pressable,
  ScrollView,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColors } from "@/hooks/useColors";

export function SettingsScreen({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { borderBottomColor: c.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Pressable>
        <Text
          style={{
            color: c.foreground,
            fontFamily: "Inter_700Bold",
            fontSize: 18,
          }}
        >
          {title}
        </Text>
        <View style={{ width: 24 }} />
      </View>
      <ScrollView contentContainerStyle={{ paddingBottom: 40, paddingTop: 8 }}>
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  const c = useColors();
  return (
    <View>
      {title ? (
        <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>
          {title}
        </Text>
      ) : null}
      <View style={[styles.card, { backgroundColor: c.card, borderColor: c.border }]}>
        {children}
      </View>
    </View>
  );
}

export function Row({
  title,
  subtitle,
  right,
  onPress,
  last,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  last?: boolean;
}) {
  const c = useColors();
  const content = (
    <View
      style={[
        styles.row,
        !last && {
          borderBottomColor: c.border,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      <View style={{ flex: 1, paddingRight: 12 }}>
        <Text
          style={{
            color: c.foreground,
            fontFamily: "Inter_600SemiBold",
            fontSize: 15,
          }}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={{
              color: c.mutedForeground,
              fontFamily: "Inter_400Regular",
              fontSize: 13,
              marginTop: 2,
            }}
          >
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right}
    </View>
  );
  if (onPress) {
    return <Pressable onPress={onPress}>{content}</Pressable>;
  }
  return content;
}

export function ChoiceRow({
  label,
  subtitle,
  selected,
  onPress,
  last,
}: {
  label: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
  last?: boolean;
}) {
  const c = useColors();
  return (
    <Pressable onPress={onPress}>
      <View
        style={[
          styles.row,
          !last && {
            borderBottomColor: c.border,
            borderBottomWidth: StyleSheet.hairlineWidth,
          },
        ]}
      >
        <View style={{ flex: 1, paddingRight: 12 }}>
          <Text
            style={{
              color: c.foreground,
              fontFamily: "Inter_600SemiBold",
              fontSize: 15,
            }}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text
              style={{
                color: c.mutedForeground,
                fontFamily: "Inter_400Regular",
                fontSize: 13,
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
        {selected ? (
          <Ionicons name="checkmark" size={22} color={c.primary} />
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 16,
  },
  card: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
});
