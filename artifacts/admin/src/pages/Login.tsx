import { useState } from "react";
import { ShieldAlert, LogIn } from "lucide-react";
import { useAuth } from "../lib/auth";
import { Button, Card, Input, ErrorNote } from "../components/ui";

export function Login() {
  const { status, supabaseEnabled, signInWithEmail, signInWithGoogle, signInAsDev, signOut } =
    useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [devId, setDevId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const denied = status === "denied";

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white px-4">
      <Card className="w-full max-w-md">
        <div className="flex flex-col items-center gap-1 border-b border-slate-100 px-6 py-7 text-center">
          <div className="aurora-gradient mb-2 flex h-12 w-12 items-center justify-center rounded-2xl text-2xl font-bold text-white">
            H
          </div>
          <h1 className="aurora-gradient-text text-lg font-bold">HiMewo Admin</h1>
          <p className="text-sm text-slate-500">
            Sign in with a staff account to continue.
          </p>
        </div>

        <div className="space-y-4 px-6 py-6">
          {denied && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                You are signed in, but this account does not have admin panel
                access.
              </span>
            </div>
          )}

          <ErrorNote error={error} />

          {supabaseEnabled ? (
            <>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(() => signInWithEmail(email, password));
                }}
              >
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Email
                  </label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@himewo.com"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-slate-600">
                    Password
                  </label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" loading={busy}>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </Button>
              </form>

              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="h-px flex-1 bg-slate-200" />
                or
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <Button
                variant="outline"
                className="w-full"
                loading={busy}
                onClick={() => void run(signInWithGoogle)}
              >
                Continue with Google
              </Button>
            </>
          ) : (
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                void run(() => signInAsDev(devId));
              }}
            >
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                Supabase is not configured in this environment. Use a development
                user id (the API accepts <code>dev:&lt;uuid&gt;</code> tokens).
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">
                  User ID (UUID)
                </label>
                <Input
                  value={devId}
                  onChange={(e) => setDevId(e.target.value)}
                  placeholder="00000000-0000-4000-8000-000000000001"
                  required
                />
              </div>
              <Button type="submit" className="w-full" loading={busy}>
                <LogIn className="h-4 w-4" />
                Enter console
              </Button>
            </form>
          )}

          {denied && (
            <Button
              variant="ghost"
              className="w-full"
              onClick={() => void signOut()}
            >
              Sign out
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
