import { useState } from "react";
import { SettingsShell, SettingsCard, SettingsRow } from "@/components/settings/settings-shell";
import { useAuth } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export default function SettingsSecurityPage() {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      toast.error("Password can't be changed in this environment");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message || "Couldn't change password");
      } else {
        toast.success("Password changed");
        setPassword("");
        setConfirm("");
      }
    } catch {
      toast.error("Couldn't change password, please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsShell
      title="Password & security"
      description="Password change and login info"
    >
      <SettingsCard title="Login info">
        <SettingsRow
          title="Email"
          control={
            <span className="text-muted-foreground">{user?.email || "—"}</span>
          }
        />
        <SettingsRow
          title="Username"
          control={
            <span className="text-muted-foreground">
              @{user?.username || "—"}
            </span>
          }
        />
      </SettingsCard>

      <SettingsCard title="Change password">
        <form onSubmit={changePassword} className="px-5 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">New password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Confirm password</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Re-enter the same password"
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Change password
            </Button>
          </div>
        </form>
      </SettingsCard>
    </SettingsShell>
  );
}
