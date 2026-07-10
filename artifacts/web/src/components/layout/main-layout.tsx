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
  Video, 
  Search, 
  Menu,
  Settings,
  LogOut,
  UsersRound,
  FileText,
  Store,
  Clock,
  Bookmark,
  CalendarDays,
  Radio,
  MonitorPlay,
  Clapperboard,
  Wallet,
  Moon,
  Sun,
  Megaphone,
  type LucideIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { MobileNav, MobileMenuButton } from "./mobile-nav";

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
  color,
  size = "md",
}: {
  icon: LucideIcon;
  color?: string;
  size?: "sm" | "md";
}) {
  const ic = size === "sm" ? "w-5 h-5" : "w-[22px] h-[22px]";
  return <Icon className={`${ic} ${color ?? "text-muted-foreground"}`} />;
}

// Lets the user post/react/comment as a page they manage, Facebook-style.
// Only shown when the user actually owns or edits at least one page.
function PageSwitcher() {
  const { user } = useAuth();
  const { actingPage, switchTo } = useActingPage();
  const { data: pages } = useListPages({ mine: true });

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
          onClick={() => actingPage && switchTo(null)}
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
                switchTo({
                  id: p.id,
                  name: p.name,
                  avatarUrl: p.avatarUrl ?? null,
                })
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
  const [location, navigate] = useLocation();
  const { data: unreadCount } = useGetUnreadNotificationCount();
  const { data: earnings } = useGetEarningsSummary();
  const [searchQuery, setSearchQuery] = useState("");

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  const navItems = [
    { href: "/", icon: Home, label: "Home", color: "text-teal-500" },
    { href: "/friends", icon: Users, label: "Friends", color: "text-purple-500" },
    { href: "/reels", icon: Video, label: "Reels", color: "text-pink-500" },
    { href: "/groups", icon: UsersRound, label: "Groups", color: "text-emerald-500" },
    { href: "/pages", icon: FileText, label: "Pages", color: "text-orange-500" },
    { href: "/marketplace", icon: Store, label: "Marketplace", color: "text-amber-500" },
    ...(earnings?.enabled
      ? [{ href: "/earnings", icon: Wallet, label: "Earnings", color: "text-green-500" }]
      : []),
  ];

  const shortcutItems = [
    { href: "/live", icon: Radio, label: "Live", color: "text-red-500" },
    { href: "/watch", icon: MonitorPlay, label: "Watch", color: "text-teal-500" },
    { href: "/events", icon: CalendarDays, label: "Events", color: "text-rose-500" },
    { href: "/stories", icon: Clapperboard, label: "Stories", color: "text-purple-500" },
    { href: "/memories", icon: Clock, label: "Memories", color: "text-cyan-500" },
    { href: "/saved", icon: Bookmark, label: "Saved", color: "text-pink-500" },
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
            <Link href="/" className="text-2xl font-extrabold tracking-tight aurora-gradient-text">
              HiMewo
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
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href} className="relative">
                    <Button variant="ghost" size="icon" className={`rounded-xl w-14 h-12 press [&_svg]:!size-6 ${isActive ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
                      <Icon />
                    </Button>
                    {isActive && <span className="absolute -bottom-[14px] left-2 right-2 h-1 rounded-full bg-gradient-to-r from-teal-400 via-purple-400 to-pink-400" />}
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
            <PageSwitcher />
            <Link href="/me" className="hidden md:block">
              <img src={avatarSrc(user?.avatarUrl)} alt="" className="w-10 h-10 rounded-full border border-border cursor-pointer object-cover hover:ring-2 ring-primary transition-all" />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 flex gap-6 pt-6">
        {/* Left Sidebar */}
        <aside className="hidden lg:block w-[280px] shrink-0 sticky top-[88px] h-[calc(100vh-88px)] overflow-y-auto pb-6">
          <nav className="space-y-1">
            <Link href="/me" className="flex items-center gap-3 p-3 mb-2 rounded-2xl aurora-glass-card hover:bg-muted/40 transition-colors">
              <img src={avatarSrc(user?.avatarUrl)} alt="" className="w-8 h-8 rounded-full object-cover" />
              <span className="font-medium">{user?.displayName}</span>
            </Link>
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                  <NavIcon icon={Icon} color={item.color} size="sm" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            {shortcutItems.map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                  <NavIcon icon={Icon} color={item.color} size="sm" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            <div className="my-4 border-t border-border" />
            <button
              onClick={openAdsManager}
              className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground"
            >
              <NavIcon icon={Megaphone} color="text-blue-500" size="sm" />
              <span className="font-medium">Ads Manager</span>
            </button>
            <Link href="/settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
              <NavIcon icon={Settings} color="text-slate-500" size="sm" />
              <span className="font-medium">Settings</span>
            </Link>
            <button onClick={signOut} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
              <NavIcon icon={LogOut} color="text-red-500" size="sm" />
              <span className="font-medium">Log Out</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 max-w-[740px] mx-auto min-w-0">
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

      <MobileNav user={user} />
    </div>
  );
}
