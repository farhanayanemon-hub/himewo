import { SettingsShell, SettingsCard, SettingsRow } from "@/components/settings/settings-shell";
import {
  useGetMySettings,
  useUpdateMySettings,
  getGetMySettingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function SettingsPrivacyPage() {
  const { data, isLoading } = useGetMySettings();
  const update = useUpdateMySettings();
  const qc = useQueryClient();

  const save = (patch: Record<string, unknown>) => {
    update.mutate(
      { data: patch },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetMySettingsQueryKey() });
          toast.success("Privacy settings update hoyeche");
        },
        onError: () => toast.error("Update hoyni, abar try korun"),
      },
    );
  };

  if (isLoading || !data) {
    return (
      <SettingsShell title="Privacy">
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      </SettingsShell>
    );
  }

  return (
    <SettingsShell
      title="Privacy"
      description="Ke ki dekhte parbe ta control korun"
    >
      <SettingsCard title="Ke dekhte parbe">
        <SettingsRow
          title="Profile ke dekhte parbe"
          description="Apnar profile public naki sudhu friends"
          control={
            <Select
              value={data.profileVisibility}
              onValueChange={(v) => save({ profileVisibility: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public (shobai)</SelectItem>
                <SelectItem value="friends">Friends</SelectItem>
                <SelectItem value="only_me">Only me</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <SettingsRow
          title="Post ke dekhte parbe"
          description="Notun post er default audience"
          control={
            <Select
              value={data.postVisibility}
              onValueChange={(v) => save({ postVisibility: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public (shobai)</SelectItem>
                <SelectItem value="friends">Friends</SelectItem>
                <SelectItem value="only_me">Only me</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </SettingsCard>

      <SettingsCard title="Friend requests">
        <SettingsRow
          title="Ke friend request pathate parbe"
          control={
            <Select
              value={data.friendRequestPrivacy}
              onValueChange={(v) => save({ friendRequestPrivacy: v })}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone (shobai)</SelectItem>
                <SelectItem value="friends_of_friends">
                  Friends of friends
                </SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </SettingsCard>

      <SettingsCard title="Activity">
        <SettingsRow
          title="Online status dekhabo"
          description="Friends ra dekhte parbe apni online ki na"
          control={
            <Switch
              checked={data.showOnlineStatus}
              onCheckedChange={(v) => save({ showOnlineStatus: v })}
            />
          }
        />
      </SettingsCard>
    </SettingsShell>
  );
}
