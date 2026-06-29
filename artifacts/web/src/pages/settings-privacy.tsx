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
          toast.success("Privacy settings updated");
        },
        onError: () => toast.error("Couldn't update, please try again"),
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
      description="Control who can see what"
    >
      <SettingsCard title="Who can see">
        <SettingsRow
          title="Who can see your profile"
          description="Make your profile public or friends only"
          control={
            <Select
              value={data.profileVisibility}
              onValueChange={(v) => save({ profileVisibility: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public (everyone)</SelectItem>
                <SelectItem value="friends">Friends</SelectItem>
                <SelectItem value="only_me">Only me</SelectItem>
              </SelectContent>
            </Select>
          }
        />
        <SettingsRow
          title="Who can see your posts"
          description="Default audience for new posts"
          control={
            <Select
              value={data.postVisibility}
              onValueChange={(v) => save({ postVisibility: v })}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Public (everyone)</SelectItem>
                <SelectItem value="friends">Friends</SelectItem>
                <SelectItem value="only_me">Only me</SelectItem>
              </SelectContent>
            </Select>
          }
        />
      </SettingsCard>

      <SettingsCard title="Lock profile">
        <SettingsRow
          title="Lock your profile"
          description="Only friends can see your posts, photos and intro. Others see just your name and profile picture."
          control={
            <Switch
              checked={Boolean(data.isLocked)}
              onCheckedChange={(v) => save({ isLocked: v })}
            />
          }
        />
      </SettingsCard>

      <SettingsCard title="Friend requests">
        <SettingsRow
          title="Who can send you friend requests"
          control={
            <Select
              value={data.friendRequestPrivacy}
              onValueChange={(v) => save({ friendRequestPrivacy: v })}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="everyone">Everyone</SelectItem>
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
          title="Show online status"
          description="Let friends see when you're online"
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
