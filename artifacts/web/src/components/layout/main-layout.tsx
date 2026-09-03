import { ReactNode, useState, useCallback } from "react";
import { avatarSrc } from "@/lib/avatar";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import {
  useGetUnreadNotificationCount,
  useGetEarningsSummary,
  useListPages,
} from "@workspace/api-client-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Check, ChevronDown } from "lucide-react";
import { 
  Home, 
  Users, 
  MessageCircle, 
  Bell, 
  Search, 
  Menu,
  Settings,
  LogOut,
  Globe,
  LayoutGrid,
  ShoppingBag,
  Clock,
  Bookmark,
  BadgeCheck,
  CalendarDays,
  Radio,
  MonitorPlay,
  Clapperboard,
  Wallet,
  Moon,
  Sun,
  Megaphone,
  Film,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavIcons } from "@/lib/nav-icons";
import { Button } from "@/components/ui/button";
import { MobileNav, MobileMenuButton } from "./mobile-nav";
import { PixelCatIcon } from "@/components/logo";

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark"),
  );

  const toggle = useCallback(() => {
    const next = !document.documentElement.classList.contains("dark");
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("himewo-theme", next ? "dark" : "light");
    setIsDark(next);
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggle}
      className="rounded-full aurora-glass hover:bg-muted/60"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </Button>
  );
}

function NavIcon({
  icon: Icon,
  iconUrl,
  size = "md",
}: {
  icon: LucideIcon;
  iconUrl?: string;
  size?: "sm" | "md";
}) {
  const ic = size === "sm" ? "w-5 h-5" : "w-[22px] h-[22px]";
  if (iconUrl) {
    return <img src={iconUrl} alt="" className={`${ic} object-contain opacity-70`} />;
  }
  return <Icon className={`${ic} text-muted-foreground`} />;
}

// Lets the user post/react/comment as a page they manage, Facebook-style.
// Only shown when the user actually owns or edits at least one page.
function PageSwitcher() {
  const { user } = useAuth();
  const { actingPage, switchTo } = useActingPage();
  const { data: pages } = useListPages({ mine: true });
  const [, navigate] = useLocation();

  if (!pages || pages.length === 0) return null;

  const activeName = actingPage ? actingPage.name : user?.displayName;
  const activeAvatar = actingPage ? actingPage.avatarUrl : user?.avatarUrl;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="rounded-full aurora-glass hover:bg-muted/60 gap-2 pl-1 pr-2 h-10"
          aria-label="Switch acting identity"
        >
          <img
            src={avatarSrc(activeAvatar)}
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-border"
          />
          <span className="hidden md:inline max-w-[120px] truncate text-sm font-medium">
            {activeName}
          </span>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Acting as</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => actingPage && switchTo(null, () => navigate("/me"))}
          className="gap-3 py-2"
        >
          <img
            src={avatarSrc(user?.avatarUrl)}
            alt=""
            className="w-8 h-8 rounded-full object-cover border border-border"
          />
          <span className="flex-1 truncate">{user?.displayName}</span>
          {!actingPage && <Check className="w-4 h-4 text-primary" />}
        </DropdownMenuItem>
        {pages.map((p) => {
          const isActive = actingPage?.id === p.id;
          return (
            <DropdownMenuItem
              key={p.id}
              onClick={() =>
                !isActive &&
                switchTo(
                  {
                    id: p.id,
                    name: p.name,
                    avatarUrl: p.avatarUrl ?? null,
                  },
                  // Land on the Hub's own page so the switch is clearly visible.
                  () => navigate(`/pages/${p.id}`),
                )
              }
              className="gap-3 py-2"
            >
              <img
                src={avatarSrc(p.avatarUrl)}
                alt=""
                className="w-8 h-8 rounded-full object-cover border border-border"
              />
              <span className="flex-1 truncate">{p.name}</span>
              {isActive && <Check className="w-4 h-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function MainLayout({ children, rightSidebar }: { children: ReactNode; rightSidebar?: ReactNode }) {
  const { user, signOut } = useAuth();
  const { actingPage } = useActingPage();
  const [location, navigate] = useLocation();
  const { data: unreadCount } = useGetUnreadNotificationCount();
  const { data: earnings } = useGetEarningsSummary();
  const [searchQuery, setSearchQuery] = useState("");

  // When acting as a page, "your profile" everywhere points to the page's
  // profile and shows the page's identity (Facebook-style full switch).
  const profileHref = actingPage ? `/pages/${actingPage.id}` : "/me";
  const profileAvatar = actingPage ? actingPage.avatarUrl : user?.avatarUrl;
  const profileName = actingPage ? actingPage.name : user?.displayName;

  // Open the Ads Manager with an SSO token handoff so the user doesn't have
  // to log in again (session is passed in the URL hash, never sent to a server).
  const openAdsManager = async () => {
    let url = "https://ads.himewo.com/";
    try {
      if (supabase) {
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          const p = new URLSearchParams({
            sso: "1",
            at: data.session.access_token,
            rt: data.session.refresh_token,
          });
          url += `#${p.toString()}`;
        }
      }
    } catch {
      // fall through — open without SSO
    }
    window.open(url, "_blank", "noopener");
  };

  const navIcons = useNavIcons();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const navItems = [
    { href: "/",        icon: Home,        label: "Feed",    iconUrl: navIcons.home },
    { href: "/friends", icon: Users,       label: "Friends", iconUrl: navIcons.friends },
    { href: "/reels",   icon: Clapperboard,label: "Reels",   iconUrl: navIcons.reels },
    { href: "/groups",  icon: Globe,       label: "Circles", iconUrl: navIcons.circles },
    { href: "/pages",   icon: LayoutGrid,  label: "Hubs",    iconUrl: navIcons.hubs },
    { href: "/shop",    icon: ShoppingBag, label: "Shop",    iconUrl: navIcons.shop },
    ...(earnings?.enabled
      ? [{ href: "/earnings", icon: Wallet, label: "Wallet", iconUrl: navIcons.earnings }]
      : []),
  ];

  const shortcutItems = [
    { href: "/live",     icon: Radio,       label: "Live",          iconUrl: navIcons.live },
    { href: "/watch",    icon: MonitorPlay, label: "Watch",         iconUrl: navIcons.watch },
    { href: "/events",   icon: CalendarDays,label: "Events",        iconUrl: navIcons.events },
    { href: "/stories",  icon: Film,        label: "Stories",       iconUrl: navIcons.stories },
    { href: "/memories", icon: Clock,       label: "Memories",      iconUrl: navIcons.memories },
    { href: "/saved",    icon: Bookmark,    label: "Saved",         iconUrl: navIcons.saved },
    { href: "/verified", icon: BadgeCheck,  label: "Verified Badge",iconUrl: navIcons.verified },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full aurora-glass-header">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <MobileMenuButton
              navItems={navItems}
              shortcutItems={shortcutItems}
              user={user}
              onSignOut={signOut}
            />
            <Link href="/" className="flex items-center group" aria-label="HiMewo Home">
              <PixelCatIcon size={46} glow={false} className="group-hover:scale-110 transition-transform" />
            </Link>

            <form onSubmit={handleSearch} className="hidden md:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search HiMewo..." 
                className="pl-9 pr-4 py-2 bg-muted/50 border-none rounded-full w-64 focus:ring-1 focus:ring-primary text-sm"
              />
            </form>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = item.href === "/"
                  ? location === "/"
                  : location.startsWith(item.href);
                return (
                  <Link key={item.href} href={item.href} className="relative pb-[3px]">
                    <button
                      className={`relative flex items-center justify-center w-14 h-12 rounded-xl transition-all duration-200 press ${
                        isActive
                          ? "bg-violet-50 dark:bg-violet-500/15"
                          : "hover:bg-muted/60"
                      }`}
                    >
                      {item.iconUrl ? (
                        <img
                          src={item.iconUrl}
                          alt=""
                          className={`w-7 h-7 object-contain transition-all ${
                            isActive
                              ? "scale-110"
                              : "opacity-50 grayscale-[20%]"
                          }`}
                          style={isActive ? { filter: "drop-shadow(0 0 8px rgba(139,92,246,0.5)) hue-rotate(0deg)" } : {}}
                        />
                      ) : (
                        <Icon
                          className="w-6 h-6 transition-all"
                          style={{
                            color: isActive ? "#8b5cf6" : undefined,
                            filter: isActive ? "drop-shadow(0 0 8px rgba(139,92,246,0.4))" : undefined,
                            transform: isActive ? "scale(1.1)" : undefined,
                          }}
                        />
                      )}
                    </button>
                    {isActive && (
                      <span
                        className="absolute bottom-0 left-2 right-2 h-[3px] rounded-full"
                        style={{ background: "#8b5cf6" }}
                      />
                    )}
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/messages">
              <Button variant="ghost" size="icon" className="rounded-full aurora-glass hover:bg-muted/60">
                <MessageCircle className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="rounded-full aurora-glass hover:bg-muted/60 relative">
                <Bell className="w-5 h-5" />
                {unreadCount?.count ? (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-destructive text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                    {unreadCount.count > 9 ? '9+' : unreadCount.count}
                  </span>
                ) : null}
              </Button>
            </Link>
            <Link href={profileHref} className="hidden md:block">
              <img src={avatarSrc(profileAvatar)} alt="" className="w-10 h-10 rounded-full border border-border cursor-pointer object-cover hover:ring-2 ring-primary transition-all" />
            </Link>
            <PageSwitcher />
          </div>
        </div>
      </header>

      <div className={`flex-1 w-full flex gap-6 ${location === "/reels" ? "px-0 pt-0" : "px-4 pt-6"}`}>
        {/* Left Sidebar */}
        <aside className="hidden lg:block w-[280px] shrink-0 sticky top-[88px] h-[calc(100vh-88px)] overflow-y-auto pb-6">
          <nav className="space-y-1">
            <Link href={profileHref} className="flex items-center gap-3 p-3 mb-2 rounded-2xl aurora-glass-card hover:bg-muted/40 transition-colors">
              <img src={avatarSrc(profileAvatar)} alt="" className="w-8 h-8 rounded-full object-cover" />
              <span className="font-medium">{profileName}</span>
            </Link>
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                  <NavIcon icon={Icon} iconUrl={item.iconUrl} size="sm" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            {shortcutItems.map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                  <NavIcon icon={Icon} iconUrl={item.iconUrl} size="sm" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            <div className="my-4 border-t border-border" />
            <button
              onClick={openAdsManager}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <NavIcon icon={Megaphone} size="sm" />
              <span className="font-medium">Ads Manager</span>
            </button>
            <Link href="/settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
              <NavIcon icon={Settings} size="sm" />
              <span className="font-medium">Settings</span>
            </Link>
            <button onClick={signOut} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
              <NavIcon icon={LogOut} size="sm" />
              <span className="font-medium">Log Out</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className={`flex-1 min-w-0 ${location === "/reels" ? "max-w-none p-0" : "max-w-[740px] mx-auto"}`}>
          {children}
        </main>

        {/* Right Sidebar */}
        <aside className="hidden xl:block w-[300px] shrink-0 sticky top-[88px] h-[calc(100vh-88px)] overflow-y-auto pb-6">
          {rightSidebar ?? (
            <>
              <div className="mb-4">
                <h3 className="text-muted-foreground font-semibold px-2">Contacts</h3>
              </div>
              <div className="space-y-1 p-2 text-sm text-muted-foreground text-center">
                No contacts yet.
              </div>
            </>
          )}
        </aside>
      </div>

      <MobileNav user={user} unreadCount={unreadCount?.count ?? 0} />
    </div>
  );
}
