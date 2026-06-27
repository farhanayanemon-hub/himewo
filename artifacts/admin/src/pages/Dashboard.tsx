import { useQuery } from "@tanstack/react-query";
import {
  Users as UsersIcon,
  FileText,
  Boxes,
  Flag,
  BadgeCheck,
  Film,
  MessageSquare,
  Heart,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { api } from "../lib/api";
import { fmtNumber } from "../lib/format";
import type { Metrics, GrowthPoint } from "../lib/types";
import { Card, CardHeader, Loading, ErrorNote } from "../components/ui";
import { PageHeader } from "../components/Layout";
import type { ReactNode } from "react";

function Stat({
  icon,
  label,
  value,
  hint,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          {label}
        </p>
        <div className="text-brand-500">{icon}</div>
      </div>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </Card>
  );
}

export function Dashboard() {
  const metrics = useQuery({
    queryKey: ["metrics"],
    queryFn: () => api.get<Metrics>("/admin/metrics"),
  });
  const growth = useQuery({
    queryKey: ["metrics", "growth"],
    queryFn: () => api.get<GrowthPoint[]>("/admin/metrics/growth"),
  });

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="A live overview of activity across HiMewo."
      />

      {metrics.isLoading && <Loading />}
      <ErrorNote error={metrics.error} />

      {metrics.data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat
              icon={<UsersIcon size={18} />}
              label="Total users"
              value={fmtNumber(metrics.data.users.total)}
              hint={`+${fmtNumber(metrics.data.users.newThisWeek)} this week`}
            />
            <Stat
              icon={<FileText size={18} />}
              label="Posts"
              value={fmtNumber(metrics.data.content.posts)}
              hint={`+${fmtNumber(metrics.data.content.postsThisWeek)} this week`}
            />
            <Stat
              icon={<Flag size={18} />}
              label="Open reports"
              value={fmtNumber(metrics.data.moderation.openReports)}
              hint="Awaiting review"
            />
            <Stat
              icon={<BadgeCheck size={18} />}
              label="Pending verification"
              value={fmtNumber(metrics.data.moderation.pendingVerifications)}
              hint="Awaiting review"
            />
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <MiniStat label="New today" value={metrics.data.users.newToday} />
            <MiniStat label="Verified" value={metrics.data.users.verified} />
            <MiniStat label="Suspended" value={metrics.data.users.suspended} />
            <MiniStat label="Banned" value={metrics.data.users.banned} />
            <MiniStat label="Groups" value={metrics.data.communities.groups} />
            <MiniStat label="Pages" value={metrics.data.communities.pages} />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader
                title="Growth"
                subtitle="Daily signups and posts over the last 14 days"
              />
              <div className="h-72 px-2 py-4">
                {growth.data && (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growth.data}>
                      <defs>
                        <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis
                        dataKey="day"
                        tickFormatter={(d: string) => d.slice(5)}
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#94a3b8" }}
                        axisLine={false}
                        tickLine={false}
                        width={28}
                      />
                      <Tooltip
                        contentStyle={{
                          borderRadius: 12,
                          border: "1px solid #e2e8f0",
                          fontSize: 12,
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="signups"
                        stroke="#6366f1"
                        fill="url(#g1)"
                        strokeWidth={2}
                        name="Signups"
                      />
                      <Area
                        type="monotone"
                        dataKey="posts"
                        stroke="#10b981"
                        fill="url(#g2)"
                        strokeWidth={2}
                        name="Posts"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Card>

            <Card>
              <CardHeader title="Content breakdown" />
              <div className="space-y-1 px-5 py-3">
                <ContentRow
                  icon={<FileText size={16} />}
                  label="Posts"
                  value={metrics.data.content.posts}
                />
                <ContentRow
                  icon={<MessageSquare size={16} />}
                  label="Comments"
                  value={metrics.data.content.comments}
                />
                <ContentRow
                  icon={<Film size={16} />}
                  label="Reels"
                  value={metrics.data.content.reels}
                />
                <ContentRow
                  icon={<Boxes size={16} />}
                  label="Active stories"
                  value={metrics.data.content.activeStories}
                />
                <ContentRow
                  icon={<Heart size={16} />}
                  label="Reactions"
                  value={metrics.data.content.reactions}
                />
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <Card className="px-4 py-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-0.5 text-lg font-semibold text-slate-900">
        {fmtNumber(value)}
      </p>
    </Card>
  );
}

function ContentRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between border-b border-slate-50 py-2 last:border-0">
      <div className="flex items-center gap-2 text-sm text-slate-600">
        <span className="text-slate-400">{icon}</span>
        {label}
      </div>
      <span className="text-sm font-semibold text-slate-900">
        {fmtNumber(value)}
      </span>
    </div>
  );
}
