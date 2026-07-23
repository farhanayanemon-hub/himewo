import {
  House, HeartHandshake, Clapperboard, Users, Newspaper, ShoppingBag, Coins,
  Search, MessageCircle, Bell,
} from "lucide-react";

// Color Pop: prottek icon-er nijer brand color SOBSOMOY dekhay, notun icon set
const navItems = [
  { icon: House, label: "Home", color: "text-teal-500", bg: "bg-teal-500/15", active: true },
  { icon: HeartHandshake, label: "Friends", color: "text-purple-500", bg: "bg-purple-500/15" },
  { icon: Clapperboard, label: "Reels", color: "text-pink-500", bg: "bg-pink-500/15" },
  { icon: Users, label: "Circles", color: "text-emerald-500", bg: "bg-emerald-500/15" },
  { icon: Newspaper, label: "Hubs", color: "text-orange-500", bg: "bg-orange-500/15" },
  { icon: ShoppingBag, label: "Shop", color: "text-amber-500", bg: "bg-amber-500/15" },
  { icon: Coins, label: "Earnings", color: "text-green-500", bg: "bg-green-500/15" },
];

export function ColorPop() {
  return (
    <div className="min-h-screen bg-background p-6">
      <p className="text-sm text-muted-foreground mb-4">
        Option 2 — Color Pop: notun icon set + prottekta icon-er nijer rong sobsomoy on, active hole rangin tinted background
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
          <div className="flex items-center gap-1">
            {navItems.map(({ icon: Icon, label, color, bg, active }) => (
              <div key={label} className="relative" title={label}>
                <button
                  className={`rounded-xl w-14 h-12 flex items-center justify-center transition ${color} ${
                    active ? bg : "hover:bg-muted/60 opacity-80 hover:opacity-100"
                  }`}
                >
                  <Icon className="w-6 h-6" strokeWidth={2.2} />
                </button>
                {active && (
                  <span className="absolute -bottom-[6px] left-3 right-3 h-1 rounded-full bg-teal-500" />
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
