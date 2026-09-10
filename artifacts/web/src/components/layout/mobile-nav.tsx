import { useState, type ComponentType } from "react";
import { avatarSrc } from "@/lib/avatar";
import { useActingPage } from "@/lib/acting-page";
import { Link, useLocation } from "wouter";
import {
  NavHomeIcon,
  NavFriendsIcon,
  NavReelsIcon,
} from "@/components/nav-icons";
import {
  Bell,
  UserCircle,
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
import { PixelCatIcon } from "@/components/logo";

type IconType = ComponentType<any>;
export type MobileNavItem = { href: string; icon: IconType; label: string; iconUrl?: string };

function NavIcon({ icon: Icon, iconUrl }: { icon: IconType; iconUrl?: string }) {
  if (iconUrl) {
    return <img src={iconUrl} alt="" className="w-5 h-5 object-contain" />;
  }
  return <Icon className="w-5 h-5 text-muted-foreground" />;
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
        <SheetContent side="left" className="w-[300px] overflow-y-auto p-0">
          <SheetHeader className="px-4 pt-4 pb-2 text-left">
            <SheetTitle className="text-xl font-extrabold aurora-gradient-text flex items-center gap-2">
              <PixelCatIcon size={24} glow />
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
                  <NavIcon icon={Icon} iconUrl={item.iconUrl} />
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
                  <NavIcon icon={Icon} iconUrl={item.iconUrl} />
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
              <NavIcon icon={Settings} />
              <span className="font-medium">Settings</span>
            </Link>
            <button
              onClick={() => {
                setMenuOpen(false);
                onSignOut();
              }}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <NavIcon icon={LogOut} />
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
  unreadCount = 0,
}: {
  user: { displayName?: string | null; avatarUrl?: string | null; username?: string | null } | null;
  unreadCount?: number;
}) {
  const [location] = useLocation();
  const { actingPage } = useActingPage();
  const profileHref = actingPage ? `/pages/${actingPage.id}` : "/me";

  const isActive = (href: string) =>
    href === "/" ? location === "/" : location.startsWith(href);

  const profileActive =
    location === profileHref ||
    location === "/me" ||
    location.startsWith("/profile/") ||
    Boolean(user?.username && location === `/${user.username}`);

  const StdItem = ({
    href,
    icon: Icon,
    label,
    active,
    badge,
  }: {
    href: string;
    icon: IconType;
    label: string;
    active: boolean;
    badge?: number;
  }) => (
    <Link
      href={href}
      className="flex flex-1 flex-col items-center justify-end h-full gap-1 pb-2 press"
    >
      <span
        className={`relative flex items-center justify-center transition-transform duration-200 ${
          active ? "-translate-y-[3px]" : ""
        }`}
      >
        <Icon
          className={`w-6 h-6 ${
            active ? "text-violet-500 dark:text-violet-400" : "text-muted-foreground"
          }`}
          {...(active ? { fill: "currentColor" } : {})}
        />
        {badge && badge > 0 ? (
          <span className="absolute -top-1.5 -right-2 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[9px] font-bold leading-none border border-background">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span
        className={`text-[10px] leading-none ${
          active ? "text-violet-500 dark:text-violet-400 font-bold" : "text-muted-foreground font-medium"
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
        <StdItem href="/" icon={NavHomeIcon} label="Feed" active={isActive("/")} />
        <StdItem href="/friends" icon={NavFriendsIcon} label="Friends" active={isActive("/friends")} />

        {/* Reels — raised center button with matching desktop clapperboard icon */}
        <Link
          href="/reels"
          className="relative flex flex-1 flex-col items-center justify-end h-full pb-1.5 press"
        >
          <span
            className={`absolute bottom-[20px] flex items-center justify-center w-[54px] h-[54px] rounded-[18px] bg-violet-500 dark:bg-violet-500 text-white shadow-[0_10px_24px_-4px_rgba(139,92,246,0.55)] ring-4 ring-background transition-transform duration-200 ${
              reelsActive ? "scale-105" : ""
            }`}
          >
            <NavReelsIcon className="w-6 h-6 text-white" />
          </span>
          <span
            className={`relative z-10 text-[10px] leading-tight font-medium ${
              reelsActive ? "text-violet-500 dark:text-violet-400 font-bold" : "text-muted-foreground"
            }`}
          >
            Reels
          </span>
        </Link>

        <StdItem
          href="/notifications"
          icon={Bell}
          label="Alerts"
          active={isActive("/notifications")}
          badge={unreadCount}
        />
        <StdItem
          href={profileHref}
          icon={UserCircle}
          label="Profile"
          active={profileActive}
        />
      </div>
    </nav>
  );
}
