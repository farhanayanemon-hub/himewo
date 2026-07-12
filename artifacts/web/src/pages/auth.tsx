import { useState, type FormEvent } from "react";
import { avatarSrc } from "@/lib/avatar";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { SignupWizard } from "@/components/signup-wizard";
import { AccountRecovery, isPhoneLike, normalizePhone } from "@/components/auth-recovery";

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong. Please try again.";
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1Z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.61 0 3.06.55 4.2 1.64l3.15-3.15C17.45 1.45 14.96.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75Z"
      />
    </svg>
  );
}

const inputClass =
  "h-12 rounded-lg border-[#dddfe2] dark:border-[#3e4042] bg-white dark:bg-[#3a3b3c] px-4 text-base placeholder:text-[#90949c] focus-visible:ring-2 focus-visible:ring-primary";

function DevLogin() {
  const { devUsers, signInAsDevUser } = useAuth();
  return (
    <div className="mx-auto w-full max-w-[400px] bg-white dark:bg-[#242526] p-6 rounded-xl shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.1)] space-y-6">
      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">Development Login</h2>
        <p className="text-sm text-muted-foreground">Select a profile to continue</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {devUsers.map((u) => (
          <button
            key={u.id}
            onClick={() => signInAsDevUser(u.id)}
            className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 transition-all text-left"
          >
            <img src={avatarSrc(u.avatarUrl)} alt="" className="w-10 h-10 rounded-full object-cover bg-muted" />
            <div className="overflow-hidden">
              <div className="font-medium text-sm truncate">{u.displayName}</div>
              <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function SignInForm() {
  const { signInWithEmail, signInWithPhonePassword } = useAuth();
  const { toast } = useToast();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isPhoneLike(identifier)) {
        await signInWithPhonePassword(normalizePhone(identifier), password);
      } else {
        await signInWithEmail(identifier.trim(), password);
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast({ variant: "destructive", title: "Sign in failed", description: message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Input
        id="signin-identifier"
        type="text"
        aria-label="Email address or mobile number"
        autoComplete="username"
        placeholder="Email address or mobile number"
        value={identifier}
        onChange={(e) => setIdentifier(e.target.value)}
        required
        className={inputClass}
      />
      <Input
        id="signin-password"
        type="password"
        aria-label="Password"
        autoComplete="current-password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
        className={inputClass}
      />
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
      >
        {loading ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}


function PhoneAuth() {
  const { sendPhoneOtp, verifyPhoneOtp } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSendOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await sendPhoneOtp(phone);
      setStep("otp");
      toast({ title: "Code sent", description: `We sent a code to ${phone}.` });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast({ variant: "destructive", title: "Could not send code", description: message });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await verifyPhoneOtp(phone, otp);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast({ variant: "destructive", title: "Verification failed", description: message });
    } finally {
      setLoading(false);
    }
  }

  if (step === "otp") {
    return (
      <form onSubmit={handleVerifyOtp} className="space-y-3">
        <Input
          id="otp-code"
          type="text"
          aria-label="Verification code"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value)}
          required
          className={inputClass}
        />
        <p className="text-xs text-muted-foreground">Enter the code sent to {phone}.</p>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button
          type="submit"
          disabled={loading}
          className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
        >
          {loading ? "Verifying…" : "Verify & Continue"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="w-full"
          disabled={loading}
          onClick={() => {
            setStep("phone");
            setOtp("");
            setError(null);
          }}
        >
          Use a different number
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendOtp} className="space-y-3">
      <Input
        id="phone-number"
        type="tel"
        aria-label="Phone number"
        autoComplete="tel"
        placeholder="+880 1XXX XXXXXX"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        required
        className={inputClass}
      />
      <p className="text-xs text-muted-foreground">Include your country code.</p>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button
        type="submit"
        disabled={loading}
        className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
      >
        {loading ? "Sending code…" : "Send Code"}
      </Button>
    </form>
  );
}

function FacebookCard() {
  const { signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<"landing" | "login" | "phone">("landing");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [recovery, setRecovery] = useState<"forgot" | "find" | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleGoogle() {
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      const message = getErrorMessage(err);
      toast({ variant: "destructive", title: "Google sign in failed", description: message });
      setGoogleLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[400px]">
      {wizardOpen && <SignupWizard onClose={() => setWizardOpen(false)} />}
      {recovery && (
        <AccountRecovery mode={recovery} onClose={() => setRecovery(null)} />
      )}
      <div className="bg-white dark:bg-[#242526] rounded-xl p-4 shadow-[0_2px_4px_rgba(0,0,0,0.1),0_8px_16px_rgba(0,0,0,0.1)] space-y-3">
        {mode === "landing" && (
          <>
            <Button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
            >
              Create new account
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setMode("login")}
              className="w-full h-12 text-lg font-bold rounded-lg"
            >
              Login
            </Button>
            <button
              type="button"
              onClick={() => setRecovery("find")}
              className="block w-full text-center text-sm text-primary hover:underline pt-1"
            >
              Find my account
            </button>
            <div className="relative py-1">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-[#dadde1] dark:border-[#3e4042]" />
              </div>
              <div className="relative flex justify-center">
                <span className="bg-white dark:bg-[#242526] px-2 text-xs uppercase text-muted-foreground">
                  or
                </span>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogle}
              disabled={googleLoading}
              className="w-full h-11 rounded-lg"
            >
              <GoogleIcon />
              {googleLoading ? "Redirecting…" : "Continue with Google"}
            </Button>
          </>
        )}

        {mode === "login" && (
          <>
            <SignInForm />
            <div className="text-center">
              <button
                type="button"
                onClick={() => setRecovery("forgot")}
                className="text-sm text-primary hover:underline"
              >
                Forgotten password?
              </button>
            </div>
            <div className="border-t border-[#dadde1] dark:border-[#3e4042] my-1" />
            <button
              type="button"
              onClick={() => setMode("phone")}
              className="block w-full text-center text-sm text-primary hover:underline"
            >
              Log in with phone number
            </button>
            <button
              type="button"
              onClick={() => setMode("landing")}
              className="block w-full text-center text-sm text-primary hover:underline"
            >
              ← Back
            </button>
          </>
        )}

        {mode === "phone" && (
          <>
            <div className="text-center pb-3 border-b border-[#dadde1] dark:border-[#3e4042]">
              <h2 className="text-2xl font-bold">Log in with phone</h2>
            </div>
            <PhoneAuth />
            <button
              type="button"
              onClick={() => setMode("login")}
              className="block w-full text-center text-sm text-primary hover:underline"
            >
              ← Log in with email
            </button>
          </>
        )}
      </div>

      {mode === "landing" && (
        <p className="text-center text-sm text-foreground mt-6">
          <span className="font-semibold">Create a Page</span> for a celebrity, brand or business.
        </p>
      )}
    </div>
  );
}

export default function AuthPage() {
  const { supabaseEnabled } = useAuth();

  return (
    <div className="min-h-screen w-full bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-[980px] grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          <div className="text-center md:text-left animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h1 className="aurora-gradient-text text-6xl md:text-7xl font-extrabold tracking-tight drop-shadow-sm">
              HiMewo
            </h1>
            <p className="mt-3 text-xl md:text-2xl leading-snug text-foreground max-w-md mx-auto md:mx-0">
              HiMewo keeps you connected with your friends and family. 💙
            </p>
          </div>

          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {supabaseEnabled ? <FacebookCard /> : <DevLogin />}
          </div>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-muted-foreground">
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 px-4">
          <span>English (UK)</span>
          <span>বাংলা</span>
          <span>हिन्दी</span>
          <span>العربية</span>
          <span>More…</span>
        </div>
        <p className="mt-2">HiMewo © 2026</p>
      </footer>
    </div>
  );
}
