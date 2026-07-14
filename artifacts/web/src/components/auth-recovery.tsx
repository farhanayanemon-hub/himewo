import { useEffect, useRef, useState, type FormEvent } from "react";
import { findAccount, type FindAccountResult } from "@workspace/api-client-react";
import { avatarSrc } from "@/lib/avatar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const inputClass =
  "h-14 rounded-xl border-[#dddfe2] dark:border-[#3e4042] bg-white dark:bg-[#3a3b3c] px-4 text-[17px] placeholder:text-[#90949c] focus:outline-none focus-visible:outline-none focus-visible:border-[#dddfe2] dark:focus-visible:border-[#3e4042]";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong. Please try again.";
}

/** Heuristic: an identifier without "@" made of digits/spaces/dashes is a phone. */
export function isPhoneLike(identifier: string): boolean {
  const t = identifier.trim();
  if (t.includes("@")) return false;
  return /^\+?[\d\s()-]{6,}$/.test(t);
}

/** Normalize to E.164 for Supabase: local BD "01712..." becomes "+8801712...". */
export function normalizePhone(identifier: string): string {
  const t = identifier.trim().replace(/[\s()-]/g, "");
  if (t.startsWith("+")) return t;
  if (t.startsWith("00")) return `+${t.slice(2)}`;
  if (t.startsWith("0")) return `+880${t.slice(1)}`;
  return `+${t}`;
}

type Step = "identifier" | "result" | "otp" | "password" | "done";

const RESET_STEPS: Step[] = ["identifier", "otp", "password"];

export function AccountRecovery({
  mode,
  onClose,
}: {
  mode: "forgot" | "find";
  onClose: () => void;
}) {
  const {
    setWizardActive,
    sendResetEmailOtp,
    sendResetPhoneOtp,
    verifyEmailOtp,
    verifyPhoneOtpNoSync,
    setPassword: applyPassword,
    refreshUser,
  } = useAuth();

  const [step, setStep] = useState<Step>("identifier");
  const [identifier, setIdentifier] = useState("");
  const [account, setAccount] = useState<FindAccountResult | null>(null);
  const [otp, setOtp] = useState("");
  const [password, setPasswordValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sessionCreated = useRef(false);
  const completed = useRef(false);

  // Suppress the auth provider's auto-login redirect while the flow is open so
  // the user can finish setting a new password before entering the app.
  useEffect(() => {
    setWizardActive(true);
    return () => {
      setWizardActive(false);
      // OTP verified = the user proved they own this existing account; if they
      // abandon before setting a password, just complete the login.
      if (sessionCreated.current && !completed.current) {
        void refreshUser().catch(() => {});
      }
    };
  }, [setWizardActive, refreshUser]);

  const usePhone = isPhoneLike(identifier);
  const contact = usePhone ? normalizePhone(identifier) : identifier.trim();

  async function sendOtp() {
    if (usePhone) {
      await sendResetPhoneOtp(contact);
    } else {
      await sendResetEmailOtp(contact);
    }
  }

  async function handleIdentifierNext(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "find") {
        const result = await findAccount({ identifier: identifier.trim() });
        if (!result.found) {
          setError(
            "No account matches that email or phone number. Check for typos and try again.",
          );
          return;
        }
        setAccount(result);
        setStep("result");
        return;
      }
      await sendOtp();
      setStep("otp");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleStartReset() {
    setError(null);
    setBusy(true);
    try {
      await sendOtp();
      setStep("otp");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (usePhone) {
        await verifyPhoneOtpNoSync(contact, otp.trim());
      } else {
        await verifyEmailOtp(contact, otp.trim());
      }
      sessionCreated.current = true;
      setStep("password");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSetPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await applyPassword(password);
      setStep("done");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleFinish() {
    completed.current = true;
    setWizardActive(false);
    await refreshUser().catch(() => {});
    onClose();
  }

  function goBack() {
    setError(null);
    if (step === "otp") {
      setOtp("");
      setStep(mode === "find" ? "result" : "identifier");
    } else if (step === "result") {
      setAccount(null);
      setStep("identifier");
    } else {
      onClose();
    }
  }

  const progressIdx =
    step === "done"
      ? RESET_STEPS.length
      : step === "result"
        ? 1
        : Math.max(RESET_STEPS.indexOf(step), 0) + (mode === "find" && step !== "identifier" ? 1 : 0);
  const totalSteps = mode === "find" ? RESET_STEPS.length + 1 : RESET_STEPS.length;
  const pct = (Math.min(progressIdx, totalSteps) / totalSteps) * 100;

  const title = mode === "find" ? "Find my account" : "Reset your password";

  return (
    <div className="fixed inset-0 z-50 bg-background sm:bg-black/60 sm:backdrop-blur-sm sm:flex sm:items-center sm:justify-center">
      <div className="flex h-full w-full flex-col bg-background sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-md sm:rounded-2xl sm:shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4">
          {step !== "done" && step !== "password" && (
            <button
              type="button"
              onClick={goBack}
              className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent"
              aria-label="Back"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none">
                <path
                  d="M15 19l-7-7 7-7"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          <span className="aurora-gradient-text text-xl font-extrabold">HiMewo</span>
          {step !== "done" && step !== "password" && (
            <button
              type="button"
              onClick={onClose}
              className="ml-auto flex h-9 w-9 items-center justify-center rounded-full hover:bg-accent text-muted-foreground"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>
        {/* Progress */}
        {step !== "done" && (
          <div className="px-4 pt-3">
            <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full aurora-button transition-all duration-500"
                style={{ width: `${Math.max(pct, 8)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:min-h-[320px]">
          {step === "identifier" && (
            <form
              onSubmit={handleIdentifierNext}
              className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300"
            >
              <div>
                <h2 className="text-2xl font-bold">{title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {mode === "find"
                    ? "Enter the email address or mobile number linked to your account."
                    : "Enter your email address or mobile number and we'll send you a verification code."}
                </p>
              </div>
              <Input
                autoFocus
                aria-label="Email address or mobile number"
                placeholder="Email address or mobile number"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                className={inputClass}
              />
              {usePhone && (
                <p className="text-xs text-muted-foreground">
                  We'll use {normalizePhone(identifier)} — include your country code if that
                  looks wrong.
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={busy || identifier.trim().length < 3}
                className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
              >
                {busy
                  ? mode === "find"
                    ? "Searching…"
                    : "Sending code…"
                  : mode === "find"
                    ? "Search"
                    : "Send Code"}
              </Button>
            </form>
          )}

          {step === "result" && account && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-bold">We found your account</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Is this you? You can reset the password to get back in.
                </p>
              </div>
              <div className="flex items-center gap-4 rounded-xl border border-border bg-card p-4">
                <img
                  src={avatarSrc(account.avatarUrl ?? null)}
                  alt=""
                  className="h-14 w-14 rounded-full object-cover bg-muted"
                />
                <div className="min-w-0">
                  <div className="font-semibold truncate">{account.displayName}</div>
                  <div className="text-sm text-muted-foreground truncate">
                    {account.maskedEmail ?? account.maskedPhone}
                  </div>
                </div>
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="button"
                onClick={handleStartReset}
                disabled={busy}
                className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
              >
                {busy ? "Sending code…" : "Reset password"}
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={goBack}>
                Not you? Search again
              </Button>
            </div>
          )}

          {step === "otp" && (
            <form
              onSubmit={handleVerifyOtp}
              className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300"
            >
              <div>
                <h2 className="text-2xl font-bold">Enter the code</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a verification code to {usePhone ? contact : identifier.trim()}.
                </p>
              </div>
              <Input
                autoFocus
                aria-label="Verification code"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                className={inputClass}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={busy || otp.trim().length === 0}
                className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
              >
                {busy ? "Verifying…" : "Verify"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={busy}
                onClick={async () => {
                  setError(null);
                  setBusy(true);
                  try {
                    await sendOtp();
                  } catch (err) {
                    setError(getErrorMessage(err));
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Resend code
              </Button>
            </form>
          )}

          {step === "password" && (
            <form
              onSubmit={handleSetPassword}
              className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300"
            >
              <div>
                <h2 className="text-2xl font-bold">Set a new password</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You're verified. Choose a new password (at least 8 characters).
                </p>
              </div>
              <Input
                autoFocus
                type="password"
                aria-label="New password"
                autoComplete="new-password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                required
                className={inputClass}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                type="submit"
                disabled={busy || password.length === 0}
                className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
              >
                {busy ? "Saving…" : "Save password"}
              </Button>
            </form>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-in fade-in zoom-in-95 duration-300">
              <div className="h-20 w-20 rounded-full aurora-button flex items-center justify-center">
                <svg viewBox="0 0 24 24" className="h-10 w-10 text-white" fill="none">
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h2 className="mt-5 text-2xl font-bold">Password updated!</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                You're all set — let's get you back in.
              </p>
              <Button
                type="button"
                onClick={handleFinish}
                className="mt-6 w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
              >
                Continue to HiMewo
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
