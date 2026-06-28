import { SettingsShell, SettingsCard, SettingsRow } from "@/components/settings/settings-shell";
import {
  useGetMySettings,
  useUpdateMySettings,
  getGetMySettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function SettingsNotificationsPage() {
  const { data, isLoading } = useGetMySettings();
  const update = useUpdateMySettings();
  const qc = useQueryClient();

  const save = (patch: Record<string, unknown>) => {
    update.mutate(
      { data: patch },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetMySettingsQueryKey() });
          toast.success("Notification settings update hoyeche");
        },
        onError: () => toast.error("Update hoyni, abar try korun"),
      },
    );
  };

  if (isLoading || !data) {
    return (
      <SettingsShell title="Notifications">
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </SettingsShell>
    );
  }

  const rows: { key: keyof typeof data; title: string; desc: string }[] = [
    { key: "notifyLikes", title: "Likes & reactions", desc: "Keu apnar post e react korle" },
    { key: "notifyComments", title: "Comments", desc: "Apnar post e comment korle" },
    { key: "notifyFriendRequests", title: "Friend requests", desc: "Notun friend request asle" },
    { key: "notifyMessages", title: "Messages", desc: "Notun message asle" },
  ];

  return (
    <SettingsShell
      title="Notifications"
      description="Kon kaaj er jonno notification paben"
    >
      <SettingsCard title="Activity">
        {rows.map((r) => (
          <SettingsRow
            key={r.key}
            title={r.title}
            description={r.desc}
            control={
              <Switch
                checked={Boolean(data[r.key])}
                onCheckedChange={(v) => save({ [r.key]: v })}
              />
            }
          />
        ))}
      </SettingsCard>

      <SettingsCard title="Delivery">
        <SettingsRow
          title="Push notifications"
          description="Phone/browser e push paben"
          control={
            <Switch
              checked={data.pushNotifications}
              onCheckedChange={(v) => save({ pushNotifications: v })}
            />
          }
        />
        <SettingsRow
          title="Email notifications"
          description="Email e summary paben"
          control={
            <Switch
              checked={data.emailNotifications}
              onCheckedChange={(v) => save({ emailNotifications: v })}
            />
          }
        />
      </SettingsCard>
    </SettingsShell>
  );
}
