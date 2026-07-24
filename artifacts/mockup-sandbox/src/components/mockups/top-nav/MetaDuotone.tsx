import {
  House, UsersThree, FilmReel, UsersFour, Flag, Storefront, Wallet,
  Broadcast, MonitorPlay, CalendarBlank, Slideshow, ClockCounterClockwise,
  BookmarkSimple, SealCheck,
} from "@phosphor-icons/react";
import { Search, MessageCircle, Bell } from "lucide-react";

// Facebook-style DUOTONE: dui-tone rong-er depth-ola icon (Phosphor Duotone weight)
const navItems = [
  { icon: House, label: "Home", color: "text-teal-500", active: true },
  { icon: UsersThree, label: "Friends", color: "text-purple-500" },
  { icon: FilmReel, label: "Reels", color: "text-pink-500" },
  { icon: UsersFour, label: "Circles", color: "text-emerald-500" },
  { icon: Flag, label: "Hubs", color: "text-orange-500" },
  { icon: Storefront, label: "Shop", color: "text-amber-500" },
  { icon: Wallet, label: "Earnings", color: "text-green-500" },
];

const sideItems = [
  { icon: Broadcast, label: "Live", color: "text-red-500" },
  { icon: MonitorPlay, label: "Watch", color: "text-teal-500" },
  { icon: CalendarBlank, label: "Events", color: "text-rose-500" },
  { icon: Slideshow, label: "Stories", color: "text-purple-500" },
  { icon: ClockCounterClockwise, label: "Memories", color: "text-cyan-500" },
  { icon: BookmarkSimple, label: "Saved", color: "text-pink-500" },
  { icon: SealCheck, label: "Verified Badge", color: "text-blue-500" },
];

export function MetaDuotone() {
  return (
    <div className="min-h-screen bg-background p-6">
      <p className="text-sm text-muted-foreground mb-4">
        Option 6 — Meta Duotone: dui-tone (duotone) icon — prottek icon-er nijer rong, depth-ola premium look, top nav + sidebar
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
            {navItems.map(({ icon: Icon, label, color, active }) => (
              <div key={label} className="relative" title={label}>
                <button
                  className={`rounded-xl w-14 h-12 flex items-center justify-center transition ${color} ${
                    active ? "bg-muted/70" : "opacity-75 hover:opacity-100 hover:bg-muted/50"
                  }`}
                >
                  <Icon size={27} weight="duotone" />
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
          <p className="text-xs font-semibold text-muted-foreground px-2 mb-2">Sidebar shortcuts (duotone)</p>
          {sideItems.map(({ icon: Icon, label, color }) => (
            <div
              key={label}
              className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-muted/60 cursor-pointer"
            >
              <span className={`w-9 h-9 rounded-full bg-muted/50 ${color} flex items-center justify-center`}>
                <Icon size={22} weight="duotone" />
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
