import { MainLayout } from "@/components/layout/main-layout";
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

export function SettingsShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto animate-in fade-in">
        <div className="flex items-center gap-3 mb-5">
          <Link
            href="/settings"
            className="w-9 h-9 rounded-full bg-card border border-border flex items-center justify-center hover:bg-muted transition-colors"
            aria-label="Back to settings"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold leading-tight">{title}</h1>
            {description ? (
              <p className="text-sm text-muted-foreground">{description}</p>
            ) : null}
          </div>
        </div>
        <div className="space-y-4">{children}</div>
      </div>
    </MainLayout>
  );
}

export function SettingsCard({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
      {title ? (
        <div className="px-5 pt-4 pb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </h2>
        </div>
      ) : null}
      <div className="divide-y divide-border">{children}</div>
    </div>
  );
}

export function SettingsRow({
  title,
  description,
  control,
}: {
  title: string;
  description?: string;
  control: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div className="min-w-0">
        <p className="font-medium leading-tight">{title}</p>
        {description ? (
          <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
        ) : null}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}
