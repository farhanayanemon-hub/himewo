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
    { key: "notifyLikes", title: "Likes & reactions", subtitle: "Post e react korle" },
    { key: "notifyComments", title: "Comments", subtitle: "Post e comment korle" },
    { key: "notifyFriendRequests", title: "Friend requests", subtitle: "Notun request asle" },
    { key: "notifyMessages", title: "Messages", subtitle: "Notun message asle" },
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
          subtitle="Phone e push paben"
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
          subtitle="Email e summary paben"
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
