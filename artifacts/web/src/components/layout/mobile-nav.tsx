import { useState, type ComponentType } from "react";
import { Link, useLocation } from "wouter";
import {
  Home,
  Users,
  Video,
  Store,
  Menu as MenuIcon,
  Settings,
  LogOut,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

type IconType = ComponentType<{ className?: string }>;
export type MobileNavItem = { href: string; icon: IconType; label: string; color?: string };

function NavIcon({ icon: Icon, color }: { icon: IconType; color?: string }) {
  return <Icon className={`w-5 h-5 ${color ?? "text-muted-foreground"}`} />;
}

export function MobileNav({
  navItems,
  shortcutItems,
  user,
  onSignOut,
}: {
  navItems: MobileNavItem[];
  shortcutItems: MobileNavItem[];
  user: { displayName?: string | null; avatarUrl?: string | null } | null;
  onSignOut: () => void;
}) {
  const [location] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const bottomItems: (MobileNavItem & { color: string })[] = [
    { href: "/", icon: Home, label: "Home", color: "text-teal-500" },
    { href: "/friends", icon: Users, label: "Friends", color: "text-purple-500" },
    { href: "/reels", icon: Video, label: "Reels", color: "text-pink-500" },
    { href: "/marketplace", icon: Store, label: "Market", color: "text-amber-500" },
  ];

  const onBottomRoute = bottomItems.some((i) =>
    i.href === "/" ? location === "/" : location.startsWith(i.href),
  );
  const menuActive = !onBottomRoute;

  return (
    <>
      {/* App-style bottom tab bar — mobile only */}
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-50 aurora-glass-header"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-stretch justify-around h-16">
          {bottomItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? location === "/"
                : location.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex flex-1 flex-col items-center justify-center gap-1 press"
              >
                <span
                  className={`relative flex items-center justify-center w-9 h-9 rounded-[12px] transition-all duration-200 ${
                    isActive
                      ? "aurora-glass scale-110 -translate-y-0.5"
                      : "opacity-80"
                  }`}
                >
                  <Icon className={`relative w-[20px] h-[20px] ${isActive ? item.color : "text-muted-foreground"}`} />
                </span>
                <span
                  className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex flex-1 flex-col items-center justify-center gap-1 press"
          >
            <span
              className={`relative flex items-center justify-center w-9 h-9 rounded-[12px] transition-all duration-200 ${
                menuActive
                  ? "aurora-glass scale-110 -translate-y-0.5"
                  : "opacity-80"
              }`}
            >
              <MenuIcon className={`relative w-[20px] h-[20px] ${menuActive ? "text-purple-500" : "text-muted-foreground"}`} />
            </span>
            <span
              className={`text-[10px] font-medium ${menuActive ? "text-primary" : "text-muted-foreground"}`}
            >
              Menu
            </span>
          </button>
        </div>
      </nav>

      {/* Full menu drawer for overflow items */}
      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[300px] overflow-y-auto p-0">
          <SheetHeader className="px-4 pt-4 pb-2 text-left">
            <SheetTitle className="text-xl font-extrabold aurora-gradient-text">
              HiMewo
            </SheetTitle>
          </SheetHeader>
          <div className="px-2 pb-6">
            <Link
              href="/me"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <img
                src={user?.avatarUrl || ""}
                alt=""
                className="w-9 h-9 rounded-full object-cover"
              />
              <span className="font-semibold">{user?.displayName}</span>
            </Link>

            <div className="my-2 border-t border-border" />

            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <NavIcon icon={Icon} color={item.color} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}

            {shortcutItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
                >
                  <NavIcon icon={Icon} color={item.color} />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}

            <div className="my-2 border-t border-border" />

            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <NavIcon icon={Settings} color="text-slate-500" />
              <span className="font-medium">Settings</span>
            </Link>
            <button
              onClick={() => {
                setMenuOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <NavIcon icon={LogOut} color="text-red-500" />
              <span className="font-medium">Log Out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
