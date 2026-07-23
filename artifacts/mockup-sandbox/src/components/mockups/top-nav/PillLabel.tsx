import {
  House, UserRound, Film, Users, LayoutGrid, Store, HandCoins,
  Search, MessageCircle, Bell,
} from "lucide-react";

// Pill + Label: active tab ekta gradient pill hoye label soho dekhay (Instagram/modern style)
const navItems = [
  { icon: House, label: "Home", active: true },
  { icon: UserRound, label: "Friends" },
  { icon: Film, label: "Reels" },
  { icon: Users, label: "Circles" },
  { icon: LayoutGrid, label: "Hubs" },
  { icon: Store, label: "Shop" },
  { icon: HandCoins, label: "Earnings" },
];

export function PillLabel() {
  return (
    <div className="min-h-screen bg-background p-6">
      <p className="text-sm text-muted-foreground mb-4">
        Option 3 — Pill + Label: active icon ekta gradient pill-e ghure jay ar pashe naam dekhay
      </p>
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
          <div className="flex items-center gap-1.5">
            {navItems.map(({ icon: Icon, label, active }) => (
              <button
                key={label}
                title={label}
                className={`h-11 rounded-full flex items-center justify-center gap-2 transition ${
                  active
                    ? "px-4 bg-gradient-to-r from-teal-500 via-purple-500 to-pink-500 text-white shadow-md"
                    : "w-12 text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                }`}
              >
                <Icon className="w-[22px] h-[22px]" strokeWidth={active ? 2.4 : 2} />
                {active && <span className="text-sm font-semibold">{label}</span>}
              </button>
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
