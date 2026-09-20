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
  MessageCircle,
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
        className="md:hidden flex items-center justify-center w-11 h-11 rounded-full bg-card border border-border/80 shadow-[0_4px_14px_rgba(0,0,0,0.06)] active:scale-90 transition-transform cursor-pointer"
      >
        <MenuIcon className="w-5 h-5 text-foreground stroke-[2.4]" />
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
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}

            <div className="my-2 border-t border-border" />
            <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Shortcuts
            </div>

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
                  <span className="font-medium text-sm">{item.label}</span>
                </Link>
              );
            })}

            <div className="my-2 border-t border-border" />

            <Link
              href="/settings"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <Settings className="w-5 h-5" />
              <span className="font-medium text-sm">Settings & Privacy</span>
            </Link>

            <button
              onClick={() => {
                setMenuOpen(false);
                onSignOut();
              }}
              className="flex items-center gap-3 p-3 rounded-xl hover:bg-destructive/10 text-destructive transition-colors w-full text-left"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium text-sm">Log Out</span>
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

/**
 * 3-Island Floating Dock Navigation (mobile only):
 * Exact match to Dribbble design reference:
 * - Island 1 (Left): Separate dark circular button [ 💬 ] (Messages)
 * - Island 2 (Middle): Combined dark pill [ ⌂ Home ] + Electric Cyan [ + ] (Create)
 * - Island 3 (Right): Separate dark circular button [ 👤 ] (Profile)
 */
export function MobileNav({
  user,
  unreadCount = 0,
}: {
  user: { displayName?: string | null; avatarUrl?: string | null; username?: string | null } | null;
  unreadCount?: number;
}) {
  const [location, navigate] = useLocation();
  const { actingPage } = useActingPage();
  const profileHref = actingPage ? `/pages/${actingPage.id}` : "/me";

  const isHomeActive = location === "/";
  const isChatsActive = location.startsWith("/messages");
  const isProfileActive =
    location === profileHref ||
    location === "/me" ||
    location.startsWith("/profile/") ||
    Boolean(user?.username && location === `/${user.username}`);

  const handleCreate = () => {
    if (location === "/") {
      const el = document.getElementById("main-post-composer");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        const input = el.querySelector("textarea");
        input?.focus();
        return;
      }
    }
    navigate("/");
  };

  return (
    <nav
      className="md:hidden fixed bottom-3 inset-x-0 z-50 pointer-events-none flex justify-center pb-[env(safe-area-inset-bottom)]"
    >
      <div className="pointer-events-auto flex items-center gap-2.5">
        {/* ISLAND 1 (LEFT): Separate Dark Circle [ 💬 ] */}
        <Link
          href="/messages"
          aria-label="Chats"
          className={`relative w-[48px] h-[48px] rounded-full bg-[#14171D] text-white flex items-center justify-center shadow-[0_12px_28px_rgba(0,0,0,0.35)] border border-white/10 active:scale-90 transition-transform ${
            isChatsActive ? "ring-2 ring-white/30" : ""
          }`}
        >
          <MessageCircle className="w-5 h-5 text-white" />
          {unreadCount > 0 ? (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[17px] h-4 px-1 rounded-full bg-red-500 text-white text-[9px] font-extrabold leading-none border-2 border-[#14171D]">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </Link>

        {/* ISLAND 2 (MIDDLE): Combined Pill [ ⌂ Home ] + [ + ] */}
        <div className="h-[48px] px-1.5 rounded-full bg-[#14171D] text-white flex items-center gap-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.35)] border border-white/10">
          {/* Active Home Pill */}
          <Link
            href="/"
            aria-label="Home Feed"
            className={`h-[38px] px-3.5 rounded-full flex items-center gap-1.5 active:scale-95 transition-all ${
              isHomeActive
                ? "bg-white/15 text-white font-bold"
                : "text-white/70 hover:text-white"
            }`}
          >
            <NavHomeIcon className="w-4 h-4 text-white" fill={isHomeActive ? "currentColor" : "none"} />
            <span className="text-xs font-bold tracking-tight">Home</span>
          </Link>

          {/* Cyan Plus Button */}
          <button
            onClick={handleCreate}
            aria-label="Create Post"
            className="w-[38px] h-[38px] rounded-full bg-[#00C2E8] text-[#14171D] flex items-center justify-center font-black text-xl shadow-[0_0_14px_rgba(0,194,232,0.55)] active:scale-90 transition-transform cursor-pointer"
          >
            +
          </button>
        </div>

        {/* ISLAND 3 (RIGHT): Separate Dark Circle [ 👤 ] */}
        <Link
          href={profileHref}
          aria-label="Profile"
          className={`w-[48px] h-[48px] rounded-full bg-[#14171D] text-white flex items-center justify-center shadow-[0_12px_28px_rgba(0,0,0,0.35)] border border-white/10 active:scale-90 transition-transform ${
            isProfileActive ? "ring-2 ring-white/30" : ""
          }`}
        >
          <UserCircle className="w-5 h-5 text-white" />
        </Link>
      </div>
    </nav>
  );
}
