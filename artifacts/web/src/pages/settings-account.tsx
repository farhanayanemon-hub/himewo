import { SettingsShell, SettingsCard, SettingsRow } from "@/components/settings/settings-shell";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

export default function SettingsAccountPage() {
  const { user } = useAuth();

  return (
    <SettingsShell
      title="Account Center"
      description="Apnar personal details r account info"
    >
      <SettingsCard title="Personal details">
        <SettingsRow title="Naam" control={<span className="text-muted-foreground">{user?.displayName || "—"}</span>} />
        <SettingsRow title="Username" control={<span className="text-muted-foreground">@{user?.username || "—"}</span>} />
        {user?.email ? (
          <SettingsRow title="Email" control={<span className="text-muted-foreground">{user.email}</span>} />
        ) : null}
        {user?.phone ? (
          <SettingsRow title="Phone" control={<span className="text-muted-foreground">{user.phone}</span>} />
        ) : null}
      </SettingsCard>

      <SettingsCard>
        <div className="px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="font-medium">Profile edit korun</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Bio, photo, work, education update korun
            </p>
          </div>
          <Link href="/edit-profile">
            <Button variant="outline">Edit profile</Button>
          </Link>
        </div>
      </SettingsCard>
    </SettingsShell>
  );
}
