import {
  House, UsersThree, FilmReel, UsersFour, Flag, Storefront, Wallet,
  Broadcast, MonitorPlay, CalendarBlank, Slideshow, ClockCounterClockwise,
  BookmarkSimple, SealCheck,
} from "@phosphor-icons/react";
import { Search, MessageCircle, Bell } from "lucide-react";

// Facebook-style: professional FILLED icon set (Phosphor Fill weight)
const navItems = [
  { icon: House, label: "Home", active: true },
  { icon: UsersThree, label: "Friends" },
  { icon: FilmReel, label: "Reels" },
  { icon: UsersFour, label: "Circles" },
  { icon: Flag, label: "Hubs" },
  { icon: Storefront, label: "Shop" },
  { icon: Wallet, label: "Earnings" },
];

const sideItems = [
  { icon: Broadcast, label: "Live", color: "text-red-500", bg: "bg-red-500/12" },
  { icon: MonitorPlay, label: "Watch", color: "text-teal-500", bg: "bg-teal-500/12" },
  { icon: CalendarBlank, label: "Events", color: "text-rose-500", bg: "bg-rose-500/12" },
  { icon: Slideshow, label: "Stories", color: "text-purple-500", bg: "bg-purple-500/12" },
  { icon: ClockCounterClockwise, label: "Memories", color: "text-cyan-500", bg: "bg-cyan-500/12" },
  { icon: BookmarkSimple, label: "Saved", color: "text-pink-500", bg: "bg-pink-500/12" },
  { icon: SealCheck, label: "Verified Badge", color: "text-blue-500", bg: "bg-blue-500/12" },
];

export function MetaFill() {
  return (
    <div className="min-h-screen bg-background p-6">
      <p className="text-sm text-muted-foreground mb-4">
        Option 5 — Meta Fill: Facebook-er moto professional bhora (filled) icon — top nav + sidebar dutoi
      </p>
      <header className="w-full rounded-2xl border bg-card/80 backdrop-blur shadow-sm">
        <div className="px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-teal-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
              HiMewo
            </span>
            <div className="relative hidden md:flex">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <div className="pl-9 pr-4 py-2 bg-muted/50 rounded-full w-52 text-sm text-muted-foreground">
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
                      ? "text-purple-600 bg-purple-500/10"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  <Icon size={26} weight={active ? "fill" : "regular"} />
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

      <div className="mt-6 grid grid-cols-[280px_1fr] gap-6">
        <aside className="rounded-2xl border bg-card/80 p-3">
          <p className="text-xs font-semibold text-muted-foreground px-2 mb-2">Sidebar shortcuts (filled)</p>
          {sideItems.map(({ icon: Icon, label, color, bg }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted/60 cursor-pointer"
            >
              <span className={`w-9 h-9 rounded-full ${bg} ${color} flex items-center justify-center`}>
                <Icon size={20} weight="fill" />
              </span>
              <span className="text-sm font-medium">{label}</span>
            </div>
          ))}
        </aside>
        <div className="rounded-2xl border bg-muted/20 flex items-center justify-center text-sm text-muted-foreground">
          Feed area
        </div>
      </div>
    </div>
  );
}
