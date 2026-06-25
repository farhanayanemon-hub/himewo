import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";

export default function AuthPage() {
  const { devUsers, signInAsDevUser, supabaseEnabled } = useAuth();

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-5xl font-extrabold text-primary tracking-tight">HiMewo</h1>
          <p className="text-muted-foreground text-lg">Connect with your community.</p>
        </div>

        {!supabaseEnabled && (
          <div className="bg-card border border-border p-6 rounded-2xl shadow-sm space-y-6">
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
                  <img src={u.avatarUrl} alt="" className="w-10 h-10 rounded-full object-cover bg-muted" />
                  <div className="overflow-hidden">
                    <div className="font-medium text-sm truncate">{u.displayName}</div>
                    <div className="text-xs text-muted-foreground truncate">@{u.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
