import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useGetUnreadNotificationCount } from "@workspace/api-client-react";
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
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function MainLayout({ children, rightSidebar }: { children: ReactNode; rightSidebar?: ReactNode }) {
  const { user, signOut } = useAuth();
  const [location] = useLocation();
  const { data: unreadCount } = useGetUnreadNotificationCount();

  const navItems = [
    { href: "/", icon: Home, label: "Home" },
    { href: "/friends", icon: Users, label: "Friends" },
    { href: "/reels", icon: Video, label: "Reels" },
    { href: "/groups", icon: UsersRound, label: "Groups" },
    { href: "/pages", icon: FileText, label: "Pages" },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-2xl font-extrabold text-primary tracking-tight">
              HiMewo
            </Link>
            <div className="hidden md:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text" 
                placeholder="Search HiMewo..." 
                className="pl-9 pr-4 py-2 bg-muted/50 border-none rounded-full w-64 focus:ring-1 focus:ring-primary text-sm"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 md:gap-6">
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(item => {
                const Icon = item.icon;
                const isActive = location === item.href;
                return (
                  <Link key={item.href} href={item.href}>
                    <Button variant={isActive ? "secondary" : "ghost"} size="icon" className="rounded-xl w-12 h-12">
                      <Icon className={`w-6 h-6 ${isActive ? "text-primary fill-primary/20" : "text-muted-foreground"}`} />
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/messages">
              <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 hover:bg-muted">
                <MessageCircle className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/notifications">
              <Button variant="ghost" size="icon" className="rounded-full bg-muted/50 hover:bg-muted relative">
                <Bell className="w-5 h-5" />
                {unreadCount?.count ? (
                  <span className="absolute top-0 right-0 w-4 h-4 bg-destructive text-white text-[10px] font-bold flex items-center justify-center rounded-full">
                    {unreadCount.count > 9 ? '9+' : unreadCount.count}
                  </span>
                ) : null}
              </Button>
            </Link>
            <Link href="/me">
              <img src={user?.avatarUrl || ""} alt="" className="w-10 h-10 rounded-full border border-border cursor-pointer object-cover hover:ring-2 ring-primary transition-all" />
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 container mx-auto px-4 flex gap-6 pt-6">
        {/* Left Sidebar */}
        <aside className="hidden lg:block w-[280px] shrink-0 sticky top-[88px] h-[calc(100vh-88px)] overflow-y-auto pb-6">
          <nav className="space-y-1">
            <Link href="/me" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <img src={user?.avatarUrl || ""} alt="" className="w-8 h-8 rounded-full object-cover" />
              <span className="font-medium">{user?.displayName}</span>
            </Link>
            {navItems.map(item => {
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
                  <Icon className="w-6 h-6 text-primary" />
                  <span className="font-medium">{item.label}</span>
                </Link>
              );
            })}
            <div className="my-4 border-t border-border" />
            <Link href="/settings" className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
              <Settings className="w-6 h-6" />
              <span className="font-medium">Settings</span>
            </Link>
            <button onClick={signOut} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground">
              <LogOut className="w-6 h-6" />
              <span className="font-medium">Log Out</span>
            </button>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 max-w-[740px] mx-auto min-w-0">
          {children}
        </main>

        {/* Right Sidebar (Contacts) */}
        <aside className="hidden xl:block w-[280px] shrink-0 sticky top-[88px] h-[calc(100vh-88px)] overflow-y-auto pb-6">
          <div className="mb-4">
            <h3 className="text-muted-foreground font-semibold px-2">Contacts</h3>
          </div>
          <div className="space-y-1">
            {rightSidebar ?? <div className="p-2 text-sm text-muted-foreground text-center">No contacts yet.</div>}
          </div>
        </aside>
      </div>
    </div>
  );
}
