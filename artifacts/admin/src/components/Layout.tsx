import { type ReactNode } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  MessagesSquare,
  FileText,
  Flag,
  Boxes,
  Megaphone,
  BadgeCheck,
  Settings,
  ShieldCheck,
  ScrollText,
  Coins,
  Target,
  LogOut,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { Avatar, Badge, cn } from "./ui";
import type { Permission } from "../lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Users;
  perm: Permission;
}

const NAV: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard, perm: "dashboard.view" },
  { href: "/users", label: "Users", icon: Users, perm: "users.view" },
  {
    href: "/messages",
    label: "Messages",
    icon: MessagesSquare,
    perm: "messages.view",
  },
  { href: "/content", label: "Content", icon: FileText, perm: "content.view" },
  { href: "/reports", label: "Reports", icon: Flag, perm: "reports.view" },
  {
    href: "/communities",
    label: "Communities",
    icon: Boxes,
    perm: "communities.view",
  },
  {
    href: "/verification",
    label: "Verification",
    icon: BadgeCheck,
    perm: "verification.view",
  },
  {
    href: "/announcements",
    label: "Announcements",
    icon: Megaphone,
    perm: "announcements.view",
  },
  { href: "/earnings", label: "Earnings", icon: Coins, perm: "earnings.view" },
  { href: "/ads", label: "Ads Review", icon: Target, perm: "ads.view" },
  { href: "/roles", label: "Roles", icon: ShieldCheck, perm: "roles.view" },
  { href: "/settings", label: "Settings", icon: Settings, perm: "settings.view" },
  { href: "/audit", label: "Audit log", icon: ScrollText, perm: "audit.view" },
];

const roleTone = {
  admin: "violet",
  moderator: "blue",
  support: "green",
  user: "neutral",
} as const;

export function Layout({ children }: { children: ReactNode }) {
  const { me, can, signOut } = useAuth();
  const [location] = useLocation();

  const items = NAV.filter((n) => can(n.perm));

  return (
    <div className="flex min-h-screen">
      <aside className="aurora-glass-header fixed inset-y-0 left-0 flex w-64 flex-col border-r">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="aurora-gradient flex h-9 w-9 items-center justify-center rounded-xl text-lg font-bold text-white">
            H
          </div>
          <div>
            <p className="aurora-gradient-text text-sm font-bold">HiMewo</p>
            <p className="text-xs text-slate-500">Admin Console</p>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {items.map((item) => {
            const active =
              item.href === "/"
                ? location === "/"
                : location.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-brand-50 font-semibold text-brand-700"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                )}
              >
                <Icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-100 p-3">
          <div className="flex items-center gap-3 rounded-lg px-2 py-2">
            <Avatar name={me?.userId} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-slate-800">
                {me?.userId?.slice(0, 8) ?? "—"}
              </p>
              {me && (
                <Badge tone={roleTone[me.role]} className="mt-0.5">
                  {me.role}
                </Badge>
              )}
            </div>
            <button
              onClick={() => void signOut()}
              title="Sign out"
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <main className="ml-64 flex-1 bg-white">
        <div className="mx-auto max-w-6xl px-8 py-8">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {title}
        </h1>
        {description && (
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
