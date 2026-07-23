import {
  Home, Users, Video, UsersRound, FileText, Store, Wallet,
  Search, MessageCircle, Bell,
} from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", active: true },
  { icon: Users, label: "Friends" },
  { icon: Video, label: "Reels" },
  { icon: UsersRound, label: "Circles" },
  { icon: FileText, label: "Hubs" },
  { icon: Store, label: "Shop" },
  { icon: Wallet, label: "Earnings" },
];

export function Current() {
  return (
    <div className="min-h-screen bg-background p-6">
      <p className="text-sm text-muted-foreground mb-4">Current — ekhon jeta live ache</p>
      <header className="w-full rounded-2xl border bg-card/80 backdrop-blur shadow-sm">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-teal-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              HiMewo
            </span>
            <div className="relative hidden md:flex">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <div className="pl-9 pr-4 py-2 bg-muted/50 rounded-full w-56 text-sm text-muted-foreground">
                Search HiMewo...
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {navItems.map(({ icon: Icon, label, active }) => (
              <div key={label} className="relative" title={label}>
                <button
                  className={`rounded-xl w-14 h-12 flex items-center justify-center transition ${
                    active
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </button>
                {active && (
                  <span className="absolute -bottom-[6px] left-2 right-2 h-1 rounded-full bg-gradient-to-r from-teal-400 via-purple-400 to-pink-400" />
                )}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
              <MessageCircle className="w-5 h-5" />
            </button>
            <button className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
              <Bell className="w-5 h-5" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-400 to-purple-500" />
          </div>
        </div>
      </header>
      <div className="mt-4 flex gap-4 text-xs text-muted-foreground">
        {navItems.map((n) => (
          <span key={n.label}>{n.label}</span>
        ))}
      </div>
    </div>
  );
}
