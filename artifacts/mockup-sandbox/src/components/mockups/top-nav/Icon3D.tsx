import { Search, MessageCircle, Bell } from "lucide-react";

// 3D icon set — AI-generated glossy claymorphism icons
const navItems = [
  { img: "/__mockup/images/icons3d/home.png", label: "Home", active: true },
  { img: "/__mockup/images/icons3d/friends.png", label: "Friends" },
  { img: "/__mockup/images/icons3d/reels.png", label: "Reels" },
  { img: "/__mockup/images/icons3d/circles.png", label: "Circles" },
  { img: "/__mockup/images/icons3d/hubs.png", label: "Hubs" },
  { img: "/__mockup/images/icons3d/shop.png", label: "Shop" },
  { img: "/__mockup/images/icons3d/earnings.png", label: "Earnings" },
];

export function Icon3D() {
  return (
    <div className="min-h-screen bg-background p-6">
      <p className="text-sm text-muted-foreground mb-4">
        Option 4 — 3D Icons: glossy 3D render icon set; active hole halka boro + tinted background, inactive gulo slightly faded
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
            {navItems.map(({ img, label, active }) => (
              <div key={label} className="relative" title={label}>
                <button
                  className={`rounded-xl w-14 h-12 flex items-center justify-center transition ${
                    active
                      ? "bg-gradient-to-b from-purple-500/15 to-pink-500/10"
                      : "hover:bg-muted/60"
                  }`}
                >
                  <img
                    src={img}
                    alt={label}
                    className={`object-contain transition ${
                      active
                        ? "w-9 h-9 drop-shadow-md"
                        : "w-8 h-8 opacity-65 saturate-[.75] hover:opacity-100 hover:saturate-100"
                    }`}
                  />
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
      <div className="mt-6">
        <p className="text-xs text-muted-foreground mb-3">Icon gulo boro kore dekhte:</p>
        <div className="flex gap-4">
          {navItems.map(({ img, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <div className="w-16 h-16 rounded-2xl bg-muted/40 border flex items-center justify-center">
                <img src={img} alt={label} className="w-12 h-12 object-contain" />
              </div>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
