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

const VISIBILITY: { value: NonNullable<UserSettingsUpdate["profileVisibility"]>; label: string }[] = [
  { value: "public", label: "Public" },
  { value: "friends", label: "Friends" },
  { value: "only_me", label: "Only me" },
];

const REQUEST_PRIVACY: { value: NonNullable<UserSettingsUpdate["friendRequestPrivacy"]>; label: string }[] = [
  { value: "everyone", label: "Everyone" },
  { value: "friends_of_friends", label: "Friends of friends" },
];

export default function PrivacySettingsScreen() {
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
          Privacy and safety
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {isLoading || !settings ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>WHO CAN SEE MY PROFILE</Text>
          <View style={[styles.card, { backgroundColor: c.card }, shadow("md")]}>
            {VISIBILITY.map((opt, i) => (
              <Touchable
                key={opt.value}
                style={[styles.optRow, i < VISIBILITY.length - 1 && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
                onPress={() => save({ profileVisibility: opt.value })}
              >
                <Text style={{ flex: 1, color: c.foreground, fontFamily: "Inter_500Medium", fontSize: fs(15) }}>
                  {opt.label}
                </Text>
                {settings.profileVisibility === opt.value && (
                  <Ionicons name="checkmark-circle" size={22} color={c.primary} />
                )}
              </Touchable>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>WHO CAN SEND FRIEND REQUESTS</Text>
          <View style={[styles.card, { backgroundColor: c.card }, shadow("md")]}>
            {REQUEST_PRIVACY.map((opt, i) => (
              <Touchable
                key={opt.value}
                style={[styles.optRow, i < REQUEST_PRIVACY.length - 1 && { borderBottomColor: c.border, borderBottomWidth: StyleSheet.hairlineWidth }]}
                onPress={() => save({ friendRequestPrivacy: opt.value })}
              >
                <Text style={{ flex: 1, color: c.foreground, fontFamily: "Inter_500Medium", fontSize: fs(15) }}>
                  {opt.label}
                </Text>
                {settings.friendRequestPrivacy === opt.value && (
                  <Ionicons name="checkmark-circle" size={22} color={c.primary} />
                )}
              </Touchable>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: c.mutedForeground }]}>ACTIVITY</Text>
          <View style={[styles.card, { backgroundColor: c.card }, shadow("md")]}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={{ color: c.foreground, fontFamily: "Inter_600SemiBold", fontSize: fs(15) }}>
                  Show online status
                </Text>
                <Text style={{ color: c.mutedForeground, fontSize: fs(12), marginTop: 2 }}>
                  Let people see when you're active
                </Text>
              </View>
              <Switch
                value={settings.showOnlineStatus}
                onValueChange={(v) => save({ showOnlineStatus: v })}
                trackColor={{ true: c.primary }}
              />
            </View>
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
  optRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
});
