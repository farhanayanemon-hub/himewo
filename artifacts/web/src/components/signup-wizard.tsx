import { useEffect, useMemo, useRef, useState } from "react";
import { detectCountry } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  COUNTRIES,
  DEFAULT_COUNTRY,
  countryFlag,
  findCountry,
  type Country,
} from "@/lib/countries";

const inputClass =
  "h-12 rounded-lg border-[#dddfe2] dark:border-[#3e4042] bg-white dark:bg-[#3a3b3c] px-4 text-base placeholder:text-[#90949c] focus-visible:ring-2 focus-visible:ring-primary";

type Step =
  | "name"
  | "dob"
  | "gender"
  | "phone"
  | "email"
  | "otp"
  | "password"
  | "done";

const PROGRESS_STEPS: Step[] = ["name", "dob", "gender", "phone", "otp", "password"];

function stepIndex(step: Step): number {
  if (step === "email") return PROGRESS_STEPS.indexOf("phone");
  if (step === "done") return PROGRESS_STEPS.length;
  return PROGRESS_STEPS.indexOf(step);
}

function computeAge(dob: string): number | null {
  if (!dob) return null;
  const d = new Date(dob + "T00:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Something went wrong. Please try again.";
}

function CountryPicker({
  value,
  onChange,
}: {
  value: Country;
  onChange: (c: Country) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.dialCode.includes(q) ||
        c.code.toLowerCase() === q,
    );
  }, [query]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between h-12 rounded-lg border border-[#dddfe2] dark:border-[#3e4042] bg-white dark:bg-[#3a3b3c] px-4 text-base"
        aria-label="Select country"
      >
        <span className="flex items-center gap-2 truncate">
          <span className="text-xl">{countryFlag(value.code)}</span>
          <span className="truncate">{value.name}</span>
          <span className="text-muted-foreground">{value.dialCode}</span>
        </span>
        <span className="text-muted-foreground">▾</span>
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
          <div className="p-2">
            <Input
              autoFocus
              placeholder="Search country…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-10"
            />
          </div>
          <div className="max-h-56 overflow-y-auto pb-1">
            {filtered.map((c) => (
              <button
                key={c.code}
                type="button"
                onClick={() => {
                  onChange(c);
                  setOpen(false);
                  setQuery("");
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent"
              >
                <span className="text-lg">{countryFlag(c.code)}</span>
                <span className="flex-1 truncate">{c.name}</span>
                <span className="text-muted-foreground">{c.dialCode}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-sm text-muted-foreground">No country found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Celebration() {
  return (
    <div className="relative flex flex-col items-center justify-center py-10">
      <div className="relative">
        <div className="h-24 w-24 rounded-full aurora-button flex items-center justify-center animate-in zoom-in-50 duration-500">
          <svg viewBox="0 0 24 24" className="h-12 w-12 text-white" fill="none">
            <path
              d="M5 13l4 4L19 7"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {["-top-3 -left-4", "-top-5 right-0", "top-8 -right-6", "bottom-0 -left-6", "-bottom-4 right-2"].map(
          (pos, i) => (
            <span
              key={pos}
              className={`absolute ${pos} text-xl animate-bounce`}
              style={{ animationDelay: `${i * 150}ms` }}
            >
              {["🎉", "✨", "💙", "🎊", "⭐"][i]}
            </span>
          ),
        )}
      </div>
      <h2 className="mt-6 text-2xl font-bold animate-in fade-in slide-in-from-bottom-2 duration-700">
        You're all set!
      </h2>
      <p className="mt-1 text-sm text-muted-foreground text-center animate-in fade-in duration-1000">
        Welcome to HiMewo. Your account is ready.
      </p>
    </div>
  );
}

export function SignupWizard({ onClose }: { onClose: () => void }) {
  const {
    setWizardActive,
    sendEmailOtp,
    verifyEmailOtp,
    sendPhoneOtp,
    verifyPhoneOtpNoSync,
    setPassword: applyPassword,
    completeWizardSignup,
    refreshUser,
    signOut,
  } = useAuth();

  const [step, setStep] = useState<Step>("name");
  const [history, setHistory] = useState<Step[]>([]);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState<"male" | "female" | null>(null);
  const [country, setCountry] = useState<Country>(DEFAULT_COUNTRY);
  const [detected, setDetected] = useState<Country | null>(null);
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contactMethod, setContactMethod] = useState<"phone" | "email">("phone");
  const [otp, setOtp] = useState("");
  const [password, setPasswordValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track whether the wizard created a Supabase session (OTP verified) and
  // whether signup fully completed, so an abandoned wizard doesn't leave a
  // half-created session with no profile behind.
  const sessionCreated = useRef(false);
  const completed = useRef(false);

  useEffect(() => {
    setWizardActive(true);
    return () => {
      setWizardActive(false);
      if (sessionCreated.current && !completed.current) {
        void signOut().catch(() => {});
      }
    };
  }, [setWizardActive, signOut]);

  // Best-effort IP country detection for the email path.
  useEffect(() => {
    let cancelled = false;
    detectCountry()
      .then((geo) => {
        if (cancelled) return;
        const c = findCountry(geo.countryCode);
        if (c) {
          setDetected(c);
          setCountry(c);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const age = computeAge(dob);

  function goTo(next: Step) {
    setHistory((h) => [...h, step]);
    setStep(next);
    setError(null);
  }

  function goBack() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const prev = h[h.length - 1];
      setStep(prev);
      setError(null);
      return h.slice(0, -1);
    });
  }

  const fullPhone = phone.trim().startsWith("+")
    ? phone.trim()
    : `${country.dialCode}${phone.trim().replace(/^0+/, "")}`;

  async function handleSendOtp() {
    setError(null);
    setBusy(true);
    try {
      if (contactMethod === "phone") {
        await sendPhoneOtp(fullPhone);
      } else {
        await sendEmailOtp(email.trim());
      }
      goTo("otp");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyOtp() {
    setError(null);
    setBusy(true);
    try {
      if (contactMethod === "phone") {
        await verifyPhoneOtpNoSync(fullPhone, otp.trim());
      } else {
        await verifyEmailOtp(email.trim(), otp.trim());
      }
      sessionCreated.current = true;
      goTo("password");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function handleSetPassword() {
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      await applyPassword(password);
      await completeWizardSignup({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: gender!,
        birthday: dob,
        country: country.code,
        email: contactMethod === "email" ? email.trim() : undefined,
        phone: contactMethod === "phone" ? fullPhone : undefined,
      });
      completed.current = true;
      goTo("done");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const progress = Math.min(stepIndex(step), PROGRESS_STEPS.length);
  const pct = (progress / PROGRESS_STEPS.length) * 100;

  const nameValid = firstName.trim().length >= 2 && lastName.trim().length >= 1;
  const dobValid = age !== null && age >= 13 && age <= 120;

  return (
    <div className="fixed inset-0 z-50 bg-background sm:bg-black/60 sm:backdrop-blur-sm sm:flex sm:items-center sm:justify-center">
      <div className="flex h-full w-full flex-col bg-background sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-md sm:rounded-2xl sm:shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 px-4 pt-4">
          {step !== "done" && (
            <button
              type="button"
              onClick={history.length > 0 ? goBack : onClose}
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
          {step !== "done" && (
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

        <div className="flex-1 overflow-y-auto px-5 py-6 sm:min-h-[380px]">
          {step === "name" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-bold">What's your name?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Use the name you go by in everyday life.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  aria-label="First name"
                  placeholder="First name"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
                <Input
                  aria-label="Last name"
                  placeholder="Last name"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <Button
                className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
                disabled={!nameValid}
                onClick={() => goTo("dob")}
              >
                Next
              </Button>
            </div>
          )}

          {step === "dob" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-bold">When's your birthday?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Choose your date of birth. You can always make this private later.
                </p>
              </div>
              <Input
                type="date"
                aria-label="Date of birth"
                value={dob}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setDob(e.target.value)}
                className={inputClass}
              />
              {age !== null && (
                <p
                  className={`text-sm font-semibold ${
                    dobValid ? "text-primary" : "text-destructive"
                  }`}
                >
                  {age} years old
                  {!dobValid && age < 13 && " — you must be at least 13 to join"}
                </p>
              )}
              <Button
                className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
                disabled={!dobValid}
                onClick={() => goTo("gender")}
              >
                Next
              </Button>
            </div>
          )}

          {step === "gender" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-bold">What's your gender?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You can change who sees this later.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {(["male", "female"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setGender(g)}
                    className={`flex items-center justify-between rounded-lg border px-4 py-3.5 text-base font-medium transition-colors ${
                      gender === g
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-[#dddfe2] dark:border-[#3e4042]"
                    }`}
                  >
                    {g === "male" ? "Male" : "Female"}
                    <span
                      className={`h-5 w-5 rounded-full border-2 ${
                        gender === g ? "border-primary bg-primary" : "border-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
              <Button
                className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
                disabled={!gender}
                onClick={() => goTo("phone")}
              >
                Next
              </Button>
            </div>
          )}

          {step === "phone" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-bold">What's your mobile number?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We'll send you a code to confirm it's you.
                </p>
              </div>
              <CountryPicker value={country} onChange={setCountry} />
              <div className="flex gap-2">
                <div className="flex h-12 items-center rounded-lg border border-[#dddfe2] dark:border-[#3e4042] bg-muted px-3 text-base text-muted-foreground">
                  {country.dialCode}
                </div>
                <Input
                  type="tel"
                  aria-label="Phone number"
                  placeholder="1XXX XXXXXX"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={`${inputClass} flex-1`}
                />
              </div>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
                disabled={busy || phone.trim().length < 6}
                onClick={() => {
                  setContactMethod("phone");
                  void handleSendOtp();
                }}
              >
                {busy ? "Sending code…" : "Next"}
              </Button>
              <div className="relative py-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[#dadde1] dark:border-[#3e4042]" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-background px-2 text-xs uppercase text-muted-foreground">
                    or
                  </span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-11 rounded-lg"
                onClick={() => {
                  setContactMethod("email");
                  goTo("email");
                }}
              >
                Sign up with email address
              </Button>
            </div>
          )}

          {step === "email" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-bold">What's your email address?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We'll send you a code to confirm it's you.
                </p>
              </div>
              <Input
                type="email"
                aria-label="Email address"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              {detected && (
                <p className="text-xs text-muted-foreground">
                  {countryFlag(detected.code)} Detected country: {detected.name}
                </p>
              )}
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
                disabled={busy || !/^\S+@\S+\.\S+$/.test(email.trim())}
                onClick={() => {
                  setContactMethod("email");
                  void handleSendOtp();
                }}
              >
                {busy ? "Sending code…" : "Next"}
              </Button>
            </div>
          )}

          {step === "otp" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-bold">Enter the code</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  We sent a code to{" "}
                  <span className="font-semibold text-foreground">
                    {contactMethod === "phone" ? fullPhone : email.trim()}
                  </span>
                  .
                </p>
              </div>
              <Input
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Verification code"
                placeholder="123456"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className={`${inputClass} text-center text-xl tracking-[0.5em]`}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
                disabled={busy || otp.trim().length < 4}
                onClick={() => void handleVerifyOtp()}
              >
                {busy ? "Verifying…" : "Verify"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                disabled={busy}
                onClick={() => void handleSendOtp()}
              >
                Resend code
              </Button>
            </div>
          )}

          {step === "password" && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div>
                <h2 className="text-2xl font-bold">Create a password</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You'll use it to log in with your{" "}
                  {contactMethod === "phone" ? "number" : "email"} later. At least 8
                  characters.
                </p>
              </div>
              <Input
                type="password"
                autoComplete="new-password"
                aria-label="New password"
                placeholder="New password"
                value={password}
                onChange={(e) => setPasswordValue(e.target.value)}
                className={inputClass}
              />
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button
                className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
                disabled={busy || password.length < 8}
                onClick={() => void handleSetPassword()}
              >
                {busy ? "Finishing…" : "Finish signup"}
              </Button>
            </div>
          )}

          {step === "done" && (
            <div className="animate-in fade-in duration-500">
              <Celebration />
              <Button
                className="w-full h-12 text-lg font-bold rounded-lg aurora-button text-white"
                onClick={() => void refreshUser()}
              >
                Go to HiMewo
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
