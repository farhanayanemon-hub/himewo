import { ActivityIndicator, Switch, View } from "react-native";
import {
  useGetMySettings,
  useUpdateMySettings,
  getGetMySettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { SettingsScreen, Section, Row } from "@/components/settings/SettingsUI";
import { useColors } from "@/hooks/useColors";

export default function NotificationSettingsScreen() {
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
      <SettingsScreen title="Notifications">
        <View style={{ paddingVertical: 40, alignItems: "center" }}>
          <ActivityIndicator color={c.primary} />
        </View>
      </SettingsScreen>
    );
  }

  const activity: {
    key: keyof typeof data;
    title: string;
    subtitle: string;
  }[] = [
    { key: "notifyLikes", title: "Likes & reactions", subtitle: "When someone reacts to your post" },
    { key: "notifyComments", title: "Comments", subtitle: "When someone comments on your post" },
    { key: "notifyFriendRequests", title: "Friend requests", subtitle: "When you get a new request" },
    { key: "notifyMessages", title: "Messages", subtitle: "When you get a new message" },
  ];

  return (
    <SettingsScreen title="Notifications">
      <Section title="Activity">
        {activity.map((r, i) => (
          <Row
            key={r.key}
            title={r.title}
            subtitle={r.subtitle}
            last={i === activity.length - 1}
            right={
              <Switch
                value={Boolean(data[r.key])}
                onValueChange={(v) => save({ [r.key]: v })}
                trackColor={{ true: c.primary }}
              />
            }
          />
        ))}
      </Section>

      <Section title="Delivery">
        <Row
          title="Push notifications"
          subtitle="Get push on your phone"
          right={
            <Switch
              value={data.pushNotifications}
              onValueChange={(v) => save({ pushNotifications: v })}
              trackColor={{ true: c.primary }}
            />
          }
        />
        <Row
          title="Email notifications"
          subtitle="Get a summary by email"
          last
          right={
            <Switch
              value={data.emailNotifications}
              onValueChange={(v) => save({ emailNotifications: v })}
              trackColor={{ true: c.primary }}
            />
          }
        />
      </Section>
    </SettingsScreen>
  );
}
