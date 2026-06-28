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
      toast.error("Password kompokkhe 6 character hote hobe");
      return;
    }
    if (password !== confirm) {
      toast.error("Duita password mile nai");
      return;
    }
    if (!isSupabaseConfigured || !supabase) {
      toast.error("Ei environment e password change kora jachhe na");
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message || "Password change hoyni");
      } else {
        toast.success("Password change hoyeche");
        setPassword("");
        setConfirm("");
      }
    } catch {
      toast.error("Password change hoyni, abar try korun");
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsShell
      title="Password & security"
      description="Password change r login info"
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

      <SettingsCard title="Password change korun">
        <form onSubmit={changePassword} className="px-5 py-4 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password">Notun password</Label>
            <Input
              id="new-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Kompokkhe 6 character"
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-password">Password abar din</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Same password din"
              autoComplete="new-password"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Password change korun
            </Button>
          </div>
        </form>
      </SettingsCard>
    </SettingsShell>
  );
}
