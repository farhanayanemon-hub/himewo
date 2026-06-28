import { Touchable } from "@/components/Touchable";
import { fs } from "@/constants/typography";
import { shadow } from "@/constants/shadows";
import {
  ActivityIndicator,
  ScrollView,
  Switch,
  Text,
  View,
  StyleSheet,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMySettings,
  useUpdateMySettings,
  getGetMySettingsQueryKey,
  type UserSettings,
  type UserSettingsUpdate,
} from "@workspace/api-client-react";
import { useColors } from "@/hooks/useColors";

type Key = keyof Pick<
  UserSettings,
  | "notifyMessages"
  | "notifyLikes"
  | "notifyComments"
  | "notifyFriendRequests"
  | "pushNotifications"
  | "emailNotifications"
>;

const ROWS: { key: Key; title: string; subtitle: string }[] = [
  { key: "notifyMessages", title: "Messages", subtitle: "New chats and replies" },
  { key: "notifyFriendRequests", title: "Friend requests", subtitle: "When someone wants to connect" },
  { key: "notifyLikes", title: "Reactions", subtitle: "When people react to your posts" },
  { key: "notifyComments", title: "Comments", subtitle: "When people comment on your posts" },
  { key: "pushNotifications", title: "Push notifications", subtitle: "Alerts on this device" },
  { key: "emailNotifications", title: "Email notifications", subtitle: "Updates sent to your email" },
];

export default function NotificationSettingsScreen() {
  const c = useColors();
  const qc = useQueryClient();
  const { data, isLoading } = useGetMySettings();
  const settings = data as UserSettings | undefined;
  const update = useUpdateMySettings();

  const save = async (patch: UserSettingsUpdate) => {
    await update.mutateAsync({ data: patch });
    qc.invalidateQueries({ queryKey: getGetMySettingsQueryKey() });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View style={[styles.header, { backgroundColor: c.card }, shadow("sm")]}>
        <Touchable onPress={() => router.back()} hitSlop={8}>
          <Ionicons name="arrow-back" size={24} color={c.foreground} />
        </Touchable>
        <Text style={{ color: c.foreground, fontFamily: "Inter_700Bold", fontSize: fs(18) }}>
          Notifications and sounds
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading || !settings ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>NOTIFY ME ABOUT</Text>
          <View style={[styles.card, { backgroundColor: c.card }, shadow("md")]}>
            {ROWS.map((row, i) => (
              <View
                key={row.key}
                style={[styles.toggleRow, i < ROWS.length - 1 && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
                    {row.title}
                  </Text>
                  <Text style={{ color: c.mutedForeground, fontSize: fs(12), marginTop: 2 }}>{row.subtitle}</Text>
                </View>
                <Switch
                  value={settings[row.key]}
                  onValueChange={(v) => save({ [row.key]: v } as UserSettingsUpdate)}
                  trackColor={{ true: c.primary }}
                />
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 2,
  },
  sectionTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: fs(12),
    letterSpacing: 0.5,
    marginLeft: 16,
    marginBottom: 8,
    marginTop: 20,
  },
  card: { marginHorizontal: 16, borderRadius: 16 },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
