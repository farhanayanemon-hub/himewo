import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useAccount } from "@/lib/account-context";
import { formatCents } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Megaphone,
  LayoutGrid,
  BarChart3,
  Users2,
  Images,
  UserCog,
  Wallet,
  Settings,
  Plus,
  LogOut,
} from "lucide-react";

const NAV = [
  { href: "/campaigns", label: "Campaigns", icon: LayoutGrid },
  { href: "/insights", label: "Insights", icon: BarChart3 },
  { href: "/audiences", label: "Audiences", icon: Users2 },
  { href: "/creatives", label: "Creatives", icon: Images },
  { href: "/team", label: "Team", icon: UserCog },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const { accounts, selectedAccount, selectedAccountId, setSelectedAccountId } =
    useAccount();

  return (
    <div className="min-h-screen w-full bg-muted/20">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background px-4">
        <Link href="/campaigns" className="flex items-center gap-2 font-semibold">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Megaphone className="h-4 w-4" />
          </span>
          <span className="hidden sm:inline">HiMewo Ads</span>
        </Link>

        <div className="ml-2 flex items-center gap-2">
          <Select
            value={selectedAccountId ? String(selectedAccountId) : undefined}
            onValueChange={(v) => setSelectedAccountId(Number(v))}
          >
            <SelectTrigger className="w-[200px]" data-testid="account-switcher">
              <SelectValue placeholder="Select ad account" />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link href="/accounts">
            <Button variant="outline" size="icon" title="Manage accounts">
              <Plus className="h-4 w-4" />
            </Button>
          </Link>
        </div>

        <div className="ml-auto flex items-center gap-3">
          {selectedAccount && (
            <div className="hidden text-right sm:block">
              <div className="text-xs text-muted-foreground">Balance</div>
              <div className="text-sm font-semibold">
                {formatCents(selectedAccount.balanceCents, selectedAccount.currency)}
              </div>
            </div>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-full outline-none">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.avatarUrl ?? undefined} />
                  <AvatarFallback>
                    {(user?.displayName ?? "U").slice(0, 1).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <div className="px-2 py-1.5 text-sm">
                <div className="font-medium">{user?.displayName}</div>
                <div className="text-xs text-muted-foreground">
                  @{user?.username}
                </div>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void signOut()}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl">
        {/* Sidebar */}
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r bg-background p-3 md:block">
          <nav className="space-y-1">
            {NAV.map((item) => {
              const active =
                location === item.href ||
                location.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Mobile nav */}
        <div className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t bg-background py-1 md:hidden">
          {NAV.map((item) => {
            const active =
              location === item.href || location.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-2 py-1 text-[10px]",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="min-w-0 flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
