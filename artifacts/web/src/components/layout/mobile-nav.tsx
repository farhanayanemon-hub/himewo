import { useState, type ComponentType } from "react";
import { avatarSrc } from "@/lib/avatar";
import { useActingPage } from "@/lib/acting-page";
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

/**
 * Menu button that lives in the top header (right beside the logo) on
 * mobile. Opens the full menu drawer with all navigation + settings.
 */
export function MobileMenuButton({
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
  const [menuOpen, setMenuOpen] = useState(false);
  const { actingPage } = useActingPage();
  const profileHref = actingPage ? `/pages/${actingPage.id}` : "/me";
  const profileAvatar = actingPage ? actingPage.avatarUrl : user?.avatarUrl;
  const profileName = actingPage ? actingPage.name : user?.displayName;

  return (
    <>
      <button
        onClick={() => setMenuOpen(true)}
        aria-label="Menu"
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-xl aurora-glass press"
      >
        <MenuIcon className="w-5 h-5 text-foreground" />
      </button>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent side="right" className="w-[300px] overflow-y-auto p-0">
          <SheetHeader className="px-4 pt-4 pb-2 text-left">
            <SheetTitle className="text-xl font-extrabold aurora-gradient-text">
              HiMewo
            </SheetTitle>
          </SheetHeader>
          <div className="px-2 pb-6">
            <Link
              href={profileHref}
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <img
                src={avatarSrc(profileAvatar)}
                alt=""
                className="w-9 h-9 rounded-full object-cover"
              />
              <span className="font-semibold">{profileName}</span>
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

/**
 * Bottom tab bar (mobile only): Home / Friends / Reels(raised) / Market / Profile.
 * "Solid Dock" style — a solid docked bar with a label under every item and a
 * raised squircle center button (Reels) that lifts above the bar.
 */
export function MobileNav({
  user,
}: {
  user: { displayName?: string | null; avatarUrl?: string | null } | null;
}) {
  const [location] = useLocation();
  const { actingPage } = useActingPage();
  const profileHref = actingPage ? `/pages/${actingPage.id}` : "/me";
  const profileAvatar = actingPage ? actingPage.avatarUrl : user?.avatarUrl;

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const profileActive =
    location === profileHref ||
    location === "/me" ||
    location.startsWith("/profile/");

  const StdItem = ({
    href,
    icon: Icon,
    label,
    active,
  }: {
    href: string;
    icon: IconType;
    label: string;
    active: boolean;
  }) => (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center justify-end h-full gap-1 pb-2 press"
    >
      <span
        className={`relative flex items-center justify-center transition-transform duration-200 ${
          active ? "-translate-y-0.5" : ""
        }`}
      >
        <Icon className={`w-6 h-6 ${active ? "text-primary" : "text-muted-foreground"}`} />
        {active && (
          <span className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-primary" />
        )}
      </span>
      <span
        className={`text-[10px] leading-none ${
          active ? "text-primary font-bold" : "text-muted-foreground font-semibold"
        }`}
      >
        {label}
      </span>
    </Link>
  );

  const reelsActive = isActive("/reels");

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border shadow-[0_-12px_40px_rgba(0,0,0,0.10)]"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="relative flex items-end justify-around h-16 px-1">
        <StdItem href="/" icon={Home} label="Home" active={isActive("/")} />
        <StdItem href="/friends" icon={Users} label="Friends" active={isActive("/friends")} />

        {/* Reels — raised center button */}
        <Link
          href="/reels"
          className="relative flex flex-1 flex-col items-center justify-end h-full pb-2 press"
        >
          <span
            className={`absolute bottom-[22px] flex items-center justify-center w-14 h-14 rounded-[18px] bg-primary text-primary-foreground shadow-[0_12px_28px_-6px_rgba(0,0,0,0.35)] ring-4 ring-background transition-transform duration-200 ${
              reelsActive ? "scale-105" : ""
            }`}
          >
            <Video className="w-7 h-7" />
          </span>
          <span
            className={`text-[10px] leading-none ${
              reelsActive ? "text-primary font-bold" : "text-muted-foreground font-semibold"
            }`}
          >
            Reels
          </span>
        </Link>

        <StdItem href="/marketplace" icon={Store} label="Market" active={isActive("/marketplace")} />

        {/* Profile — avatar */}
        <Link
          href={profileHref}
          className="flex flex-1 flex-col items-center justify-end h-full gap-1 pb-2 press"
        >
          <span
            className={`relative flex items-center justify-center transition-transform duration-200 ${
              profileActive ? "-translate-y-0.5" : ""
            }`}
          >
            <img
              src={avatarSrc(profileAvatar)}
              alt=""
              className={`w-6 h-6 rounded-full object-cover ${
                profileActive ? "ring-2 ring-primary" : ""
              }`}
            />
            {profileActive && (
              <span className="absolute -bottom-2 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </span>
          <span
            className={`text-[10px] leading-none ${
              profileActive ? "text-primary font-bold" : "text-muted-foreground font-semibold"
            }`}
          >
            Profile
          </span>
        </Link>
      </div>
    </nav>
  );
}
