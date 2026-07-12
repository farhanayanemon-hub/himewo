import { useCallback, useEffect, useState } from "react";
import { SettingsShell, SettingsCard, SettingsRow } from "@/components/settings/settings-shell";
import { useAuth, type TotpEnrollment } from "@/lib/auth";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldOff, Copy } from "lucide-react";

type PwStep = "idle" | "method" | "verify" | "newpass";
type MfaState = "loading" | "off" | "enrolling" | "on";

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Something went wrong";
}

export default function SettingsSecurityPage() {
  const {
    user,
    supabaseEnabled,
    sendResetEmailOtp,
    sendResetPhoneOtp,
    verifyEmailOtp,
    verifyPhoneOtpNoSync,
    setPassword: setAccountPassword,
    listTotpFactors,
    enrollTotp,
    verifyTotpEnrollment,
    unenrollTotp,
  } = useAuth();

  // ---------------- Change password (OTP-gated) ----------------
  const [pwStep, setPwStep] = useState<PwStep>("idle");
  const [contacts, setContacts] = useState<{ email: string | null; phone: string | null }>({
    email: null,
    phone: null,
  });
  const [method, setMethod] = useState<"email" | "phone">("email");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwBusy, setPwBusy] = useState(false);

  const startPasswordChange = async () => {
    if (!isSupabaseConfigured || !supabase) {
      toast.error("Password can't be changed in this environment");
      return;
    }
    setPwBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      const email = data.user?.email ?? null;
      const phone = data.user?.phone ? `+${data.user.phone.replace(/^\+/, "")}` : null;
      if (!email && !phone) {
        toast.error("No email or phone number on this account");
        return;
      }
      setContacts({ email, phone });
      setMethod(email ? "email" : "phone");
      setOtp("");
      setPassword("");
      setConfirm("");
      setPwStep("method");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPwBusy(false);
    }
  };

  const sendCode = async () => {
    setPwBusy(true);
    try {
      if (method === "email" && contacts.email) {
        await sendResetEmailOtp(contacts.email);
        toast.success(`We sent a code to ${contacts.email}`);
      } else if (method === "phone" && contacts.phone) {
        await sendResetPhoneOtp(contacts.phone);
        toast.success(`We sent a code to ${contacts.phone}`);
      } else {
        toast.error("No contact method available");
        return;
      }
      setPwStep("verify");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPwBusy(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwBusy(true);
    try {
      if (method === "email" && contacts.email) {
        await verifyEmailOtp(contacts.email, otp.trim());
      } else if (contacts.phone) {
        await verifyPhoneOtpNoSync(contacts.phone, otp.trim());
      }
      setPwStep("newpass");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPwBusy(false);
    }
  };

  const saveNewPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      toast.error("Passwords don't match");
      return;
    }
    setPwBusy(true);
    try {
      await setAccountPassword(password);
      toast.success("Password changed");
      setPwStep("idle");
      setOtp("");
      setPassword("");
      setConfirm("");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setPwBusy(false);
    }
  };

  // ---------------- Two-factor authentication ----------------
  const [mfaState, setMfaState] = useState<MfaState>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [enrollCode, setEnrollCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [mfaBusy, setMfaBusy] = useState(false);

  const loadFactors = useCallback(async () => {
    if (!supabaseEnabled) {
      setMfaState("off");
      return;
    }
    try {
      const factors = await listTotpFactors();
      const verified = factors.find((f) => f.status === "verified");
      if (verified) {
        setFactorId(verified.id);
        setMfaState("on");
      } else {
        setFactorId(null);
        setMfaState("off");
      }
    } catch {
      setMfaState("off");
    }
  }, [supabaseEnabled, listTotpFactors]);

  useEffect(() => {
    void loadFactors();
  }, [loadFactors]);

  const startEnroll = async () => {
    setMfaBusy(true);
    try {
      const data = await enrollTotp();
      setEnrollment(data);
      setEnrollCode("");
      setMfaState("enrolling");
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMfaBusy(false);
    }
  };

  const confirmEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enrollment) return;
    setMfaBusy(true);
    try {
      await verifyTotpEnrollment(enrollment.factorId, enrollCode.trim());
      toast.success("Two-factor authentication is on");
      setEnrollment(null);
      setEnrollCode("");
      await loadFactors();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMfaBusy(false);
    }
  };

  const disableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factorId) return;
    setMfaBusy(true);
    try {
      await unenrollTotp(factorId, disableCode.trim());
      toast.success("Two-factor authentication is off");
      setShowDisable(false);
      setDisableCode("");
      await loadFactors();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setMfaBusy(false);
    }
  };

  const copySecret = async () => {
    if (!enrollment) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      toast.success("Setup key copied");
    } catch {
      toast.error("Couldn't copy — select and copy the key manually");
    }
  };

  return (
    <SettingsShell
      title="Password & security"
      description="Password change, two-factor authentication and login info"
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
        <div className="px-5 py-4 space-y-4">
          {pwStep === "idle" && (
            <>
              <p className="text-sm text-muted-foreground">
                To keep your account safe, changing your password requires a
                verification code sent to your email or phone.
              </p>
              <Button onClick={startPasswordChange} disabled={pwBusy}>
                {pwBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Change password
              </Button>
            </>
          )}

          {pwStep === "method" && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Where should we send your verification code?
              </p>
              <div className="space-y-2">
                {contacts.email && (
                  <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
                    <input
                      type="radio"
                      name="pw-method"
                      checked={method === "email"}
                      onChange={() => setMethod("email")}
                    />
                    <span className="text-sm">Email — {contacts.email}</span>
                  </label>
                )}
                {contacts.phone && (
                  <label className="flex items-center gap-3 rounded-lg border p-3 cursor-pointer">
                    <input
                      type="radio"
                      name="pw-method"
                      checked={method === "phone"}
                      onChange={() => setMethod("phone")}
                    />
                    <span className="text-sm">Phone — {contacts.phone}</span>
                  </label>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" onClick={() => setPwStep("idle")}>
                  Cancel
                </Button>
                <Button onClick={sendCode} disabled={pwBusy}>
                  {pwBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send code
                </Button>
              </div>
            </div>
          )}

          {pwStep === "verify" && (
            <form onSubmit={verifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="pw-otp">Verification code</Label>
                <Input
                  id="pw-otp"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="ghost" onClick={() => setPwStep("method")}>
                  Back
                </Button>
                <Button type="submit" disabled={pwBusy || otp.trim().length === 0}>
                  {pwBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Verify
                </Button>
              </div>
            </form>
          )}

          {pwStep === "newpass" && (
            <form onSubmit={saveNewPassword} className="space-y-4">
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
                <Button type="submit" disabled={pwBusy}>
                  {pwBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Save new password
                </Button>
              </div>
            </form>
          )}
        </div>
      </SettingsCard>

      <SettingsCard title="Two-factor authentication">
        <div className="px-5 py-4 space-y-4">
          {!supabaseEnabled ? (
            <p className="text-sm text-muted-foreground">
              Two-factor authentication isn't available in this environment.
            </p>
          ) : mfaState === "loading" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Checking status…
            </div>
          ) : mfaState === "on" ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium text-green-600 dark:text-green-500">
                <ShieldCheck className="w-5 h-5" /> Two-factor authentication is on
              </div>
              <p className="text-sm text-muted-foreground">
                When you log in, you'll be asked for a 6-digit code from your
                authenticator app after entering your password. Keep your setup
                key or authenticator backup safe — if you lose access to the
                app, you won't be able to log in.
              </p>
              {!showDisable ? (
                <Button variant="outline" onClick={() => setShowDisable(true)}>
                  <ShieldOff className="w-4 h-4 mr-2" />
                  Turn off two-factor authentication
                </Button>
              ) : (
                <form onSubmit={disableMfa} className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="disable-code">
                      Enter a current code from your authenticator app to turn
                      2FA off
                    </Label>
                    <Input
                      id="disable-code"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="6-digit code"
                      value={disableCode}
                      onChange={(e) => setDisableCode(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setShowDisable(false);
                        setDisableCode("");
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="destructive"
                      disabled={mfaBusy || disableCode.trim().length === 0}
                    >
                      {mfaBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                      Turn off
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : mfaState === "enrolling" && enrollment ? (
            <form onSubmit={confirmEnroll} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Scan this QR code with an authenticator app (Google
                Authenticator, Authy, 1Password…), then enter the 6-digit code
                it shows to finish.
              </p>
              <div className="flex justify-center">
                <img
                  src={enrollment.qrCode}
                  alt="2FA QR code"
                  className="w-44 h-44 rounded-lg border bg-white p-2"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Can't scan? Enter this setup key manually:
                </p>
                <div className="flex items-center gap-2">
                  <code className="text-xs break-all bg-muted rounded px-2 py-1 flex-1">
                    {enrollment.secret}
                  </code>
                  <Button type="button" size="icon" variant="ghost" onClick={copySecret}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Save this key somewhere safe — it's the only way to restore
                  your authenticator if you switch phones.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="enroll-code">Code from the app</Label>
                <Input
                  id="enroll-code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="6-digit code"
                  value={enrollCode}
                  onChange={(e) => setEnrollCode(e.target.value)}
                  required
                />
              </div>
              <div className="flex gap-2 justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEnrollment(null);
                    setMfaState("off");
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={mfaBusy || enrollCode.trim().length === 0}>
                  {mfaBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Verify & turn on
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Add an extra layer of security: after entering your password,
                you'll also need a 6-digit code from an authenticator app on
                your phone.
              </p>
              <Button onClick={startEnroll} disabled={mfaBusy}>
                {mfaBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                <ShieldCheck className="w-4 h-4 mr-2" />
                Enable two-factor authentication
              </Button>
            </div>
          )}
        </div>
      </SettingsCard>
    </SettingsShell>
  );
}
