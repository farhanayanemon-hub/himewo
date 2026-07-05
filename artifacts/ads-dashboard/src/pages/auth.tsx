import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Megaphone } from "lucide-react";

export default function AuthPage() {
  const {
    supabaseEnabled,
    devUsers,
    signInWithEmail,
    signInWithGoogle,
    signInAsDevUser,
  } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await signInWithEmail(email, password);
    } catch (err) {
      toast({
        title: "Login failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Megaphone className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">HiMewo Ads Manager</CardTitle>
          <CardDescription>
            Create and manage your ad campaigns.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {supabaseEnabled ? (
            <>
              <form onSubmit={handleEmailSignIn} className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Logging in..." : "Login"}
                </Button>
              </form>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => void signInWithGoogle()}
              >
                Continue with Google
              </Button>
            </>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground text-center">
                Dev mode — select a user.
              </p>
              {devUsers.map((u) => (
                <Button
                  key={u.id}
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => void signInAsDevUser(u.id)}
                >
                  {u.displayName}{" "}
                  <span className="text-muted-foreground">@{u.username}</span>
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
