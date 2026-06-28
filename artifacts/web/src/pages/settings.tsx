import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/lib/auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  UserCog,
  ShieldCheck,
  Lock,
  Bell,
  Globe,
  HelpCircle,
  ChevronRight,
  LogOut,
} from "lucide-react";

const SECTIONS = [
  {
    href: "/settings/account",
    icon: UserCog,
    title: "Account Center",
    desc: "Personal details, naam, profile photo",
  },
  {
    href: "/settings/privacy",
    icon: ShieldCheck,
    title: "Privacy",
    desc: "Ke ki dekhte parbe, friend request settings",
  },
  {
    href: "/settings/security",
    icon: Lock,
    title: "Password & security",
    desc: "Password change, login info",
  },
  {
    href: "/settings/notifications",
    icon: Bell,
    title: "Notifications",
    desc: "Like, comment, message er notification",
  },
  {
    href: "/settings/language",
    icon: Globe,
    title: "Language",
    desc: "App er bhasha set korun",
  },
  {
    href: "/settings/help",
    icon: HelpCircle,
    title: "Help & support",
    desc: "Common proshno r jogajog",
  },
];

export default function SettingsPage() {
  const { user, signOut } = useAuth();

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto animate-in fade-in">
        <h1 className="text-2xl font-bold mb-1">Settings & privacy</h1>
        <p className="text-sm text-muted-foreground mb-5">
          {user?.displayName
            ? `${user.displayName} er account manage korun`
            : "Apnar account manage korun"}
        </p>

        <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden divide-y divide-border">
          {SECTIONS.map((s) => {
            const Icon = s.icon;
            return (
              <Link
                key={s.href}
                href={s.href}
                className="flex items-center gap-4 px-5 py-4 hover:bg-muted transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium leading-tight">{s.title}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    {s.desc}
                  </p>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </Link>
            );
          })}
        </div>

        <div className="mt-6">
          <Button
            variant="destructive"
            className="w-full"
            onClick={signOut}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}
