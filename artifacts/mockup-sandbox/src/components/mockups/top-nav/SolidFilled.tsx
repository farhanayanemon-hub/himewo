import {
  Search, MessageCircle, Bell,
} from "lucide-react";

// Solid / filled icon set (custom SVGs, FB-style bold silhouettes)
const icons: Record<string, React.ReactNode> = {
  Home: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 2.6 2.5 10.8a1 1 0 0 0 .65 1.76H4.5v7.94A1.5 1.5 0 0 0 6 22h4v-6a2 2 0 0 1 4 0v6h4a1.5 1.5 0 0 0 1.5-1.5v-7.94h1.35a1 1 0 0 0 .65-1.76L12 2.6Z" />
    </svg>
  ),
  Friends: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.3 0-7 1.7-7 4v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2c0-2.3-3.7-4-7-4Zm8-2.5a3.5 3.5 0 1 0-2.6-5.85A5.96 5.96 0 0 1 15 8c0 .9-.2 1.74-.55 2.5H17Zm.5 2.1c2.3.5 4.5 1.8 4.5 3.65V18a1 1 0 0 1-1 1h-3v-2c0-1.6-.9-2.9-2.15-3.85.55-.1 1.1-.15 1.65-.15Z" />
    </svg>
  ),
  Reels: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M4 2h16a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm3.2 2 2.4 4h3.6l-2.4-4h2.4l2.4 4h3.6l-2.4-4H20v0H4l3.2 4ZM10 11.5v6l5-3-5-3Z" />
    </svg>
  ),
  Circles: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M12 7a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-7 6a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm14 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm-7 1c-2.5 0-5.5 1.3-5.5 3.2V20a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-2.8c0-1.9-3-3.2-5.5-3.2Zm-8.5.5c-1.9.3-3.5 1.4-3.5 2.9V19a1 1 0 0 0 1 1h2.5v-2.8c0-.9.4-1.7 1-2.4-.35-.05-.7-.3-1-.3Zm17 0c-.3 0-.65.25-1 .3.6.7 1 1.5 1 2.4V20H23a1 1 0 0 0 1-1v-1.6c0-1.5-1.6-2.6-3.5-2.9Z" />
    </svg>
  ),
  Hubs: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M6 2h9l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1.5V8h4.5L14 3.5ZM8 12h8v2H8v-2Zm0 4h8v2H8v-2Z" />
    </svg>
  ),
  Shop: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M3 3h18l1 5a3 3 0 0 1-3 3 3.2 3.2 0 0 1-2.5-1.2A3.2 3.2 0 0 1 14 11a3.2 3.2 0 0 1-2-.7 3.2 3.2 0 0 1-2 .7 3.2 3.2 0 0 1-2.5-1.2A3.2 3.2 0 0 1 5 11a3 3 0 0 1-3-3l1-5Zm1 10.5c.3.1.7.2 1 .2.9 0 1.8-.3 2.5-.8.7.5 1.6.8 2.5.8s1.8-.3 2-.6c.2.3 1.1.6 2 .6s1.8-.3 2.5-.8c.7.5 1.6.8 2.5.8.3 0 .7-.1 1-.2V20a2 2 0 0 1-2 2h-3v-5h-4v5H6a2 2 0 0 1-2-2v-6.5Z" />
    </svg>
  ),
  Earnings: (
    <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
      <path d="M20 6H5.5A1.5 1.5 0 0 1 4 4.5 1.5 1.5 0 0 1 5.5 3H19a1 1 0 0 0 0-2H5.5A3.5 3.5 0 0 0 2 4.5v14A3.5 3.5 0 0 0 5.5 22H20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2Zm-3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3Z" />
    </svg>
  ),
};

const navItems = [
  { key: "Home", active: true },
  { key: "Friends" },
  { key: "Reels" },
  { key: "Circles" },
  { key: "Hubs" },
  { key: "Shop" },
  { key: "Earnings" },
];

export function SolidFilled() {
  return (
    <div className="min-h-screen bg-background p-6">
      <p className="text-sm text-muted-foreground mb-4">
        Option 1 — Solid Filled: Facebook-er moto mota/bhora (filled) icon, active hole gradient color
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
            {navItems.map(({ key, active }) => (
              <div key={key} className="relative" title={key}>
                <button
                  className={`rounded-xl w-14 h-12 flex items-center justify-center transition ${
                    active
                      ? "text-purple-600 bg-purple-500/10"
                      : "text-muted-foreground/70 hover:bg-muted/60 hover:text-foreground"
                  }`}
                >
                  {icons[key]}
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
          <span key={n.key}>{n.key}</span>
        ))}
      </div>
    </div>
  );
}
