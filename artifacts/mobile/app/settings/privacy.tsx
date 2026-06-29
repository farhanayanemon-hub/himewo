import { ActivityIndicator, Switch, View } from "react-native";
import {
  useGetMySettings,
  useUpdateMySettings,
  getGetMySettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { SettingsScreen, Section, Row, ChoiceRow } from "@/components/settings/SettingsUI";
import { useColors } from "@/hooks/useColors";

export default function PrivacySettingsScreen() {
  const c = useColors();
  const { data, isLoading } = useGetMySettings();
  const update = useUpdateMySettings();
  const qc = useQueryClient();

  const save = (patch: Record<string, unknown>) => {
    update.mutate(
      { data: patch },
      {
        onSuccess: () =>
          qc.invalidateQueries({ queryKey: getGetMySettingsQueryKey() }),
      },
    );
  };

  if (isLoading || !data) {
    return (
      <SettingsScreen title="Privacy">
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color={c.primary} />
        </View>
      </SettingsScreen>
    );
  }

  const visibilityOptions = [
    { value: "public", label: "Public (everyone)" },
    { value: "friends", label: "Friends" },
    { value: "only_me", label: "Only me" },
  ];

  return (
    <SettingsScreen title="Privacy">
      <Section title="Who can see your profile">
        {visibilityOptions.map((o, i) => (
          <ChoiceRow
            key={o.value}
            label={o.label}
            selected={data.profileVisibility === o.value}
            onPress={() => save({ profileVisibility: o.value })}
            last={i === visibilityOptions.length - 1}
          />
        ))}
      </Section>

      <Section title="Who can see your posts">
        {visibilityOptions.map((o, i) => (
          <ChoiceRow
            key={o.value}
            label={o.label}
            selected={data.postVisibility === o.value}
            onPress={() => save({ postVisibility: o.value })}
            last={i === visibilityOptions.length - 1}
          />
        ))}
      </Section>

      <Section title="Lock profile">
        <Row
          title="Lock your profile"
          subtitle="Only friends see your posts, photos and intro. Others see just your name and picture."
          last
          right={
            <Switch
              value={Boolean(data.isLocked)}
              onValueChange={(v) => save({ isLocked: v })}
              trackColor={{ true: c.primary }}
            />
          }
        />
      </Section>

      <Section title="Friend requests">
        <ChoiceRow
          label="Everyone"
          selected={data.friendRequestPrivacy === "everyone"}
          onPress={() => save({ friendRequestPrivacy: "everyone" })}
        />
        <ChoiceRow
          label="Friends of friends"
          selected={data.friendRequestPrivacy === "friends_of_friends"}
          onPress={() => save({ friendRequestPrivacy: "friends_of_friends" })}
          last
        />
      </Section>

      <Section title="Activity">
        <Row
          title="Show online status"
          subtitle="Friends can see if you're online"
          last
          right={
            <Switch
              value={data.showOnlineStatus}
              onValueChange={(v) => save({ showOnlineStatus: v })}
              trackColor={{ true: c.primary }}
            />
          }
        />
      </Section>
    </SettingsScreen>
  );
}
