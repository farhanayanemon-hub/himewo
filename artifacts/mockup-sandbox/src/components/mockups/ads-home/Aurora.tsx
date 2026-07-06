import React from 'react';
import {
  Megaphone, ChevronDown, Bell, Search, LayoutDashboard,
  BarChart2, Users, Image as ImageIcon, Wallet, Settings,
  Plus, ArrowUpRight, ArrowDownRight, MoreHorizontal
} from 'lucide-react';
import './ads_aurora.css';

type Theme = 'dark' | 'light';

const KPIs = [
  { label: 'Spend', value: '৳14,250', delta: '+12.5%', positive: false },
  { label: 'Impressions', value: '1.24M', delta: '+18.2%', positive: true },
  { label: 'Clicks', value: '45.2K', delta: '+8.1%', positive: true },
  { label: 'CTR', value: '3.64%', delta: '+0.4%', positive: true },
  { label: 'Conversions', value: '1,204', delta: '+2.4%', positive: true },
  { label: 'ROAS', value: '4.2x', delta: '-0.1%', positive: false },
];

const CAMPAIGNS = [
  { id: 1, name: 'Q3 Retargeting - Dhaka', status: 'Active', objective: 'Conversions', budget: '৳1,500/d', spent: '৳8,450', results: '245', delivery: 'Learning' },
  { id: 2, name: 'Brand Awareness - Nationwide', status: 'Active', objective: 'Traffic', budget: '৳3,000/d', spent: '৳12,000', results: '42.1K', delivery: 'Active' },
  { id: 3, name: 'Eid Special Promo', status: 'Paused', objective: 'Conversions', budget: '৳5,000/d', spent: '৳24,500', results: '1,102', delivery: 'Completed' },
  { id: 4, name: 'App Install Campaign', status: 'Active', objective: 'Engagement', budget: '৳2,000/d', spent: '৳4,200', results: '850', delivery: 'Active' },
  { id: 5, name: 'Lookalike 1% - High LTV', status: 'Draft', objective: 'Conversions', budget: '৳1,000/d', spent: '৳0', results: '-', delivery: 'Draft' },
];

export function Aurora({ theme = 'dark' }: { theme?: Theme }) {
  return (
    <div className={`aurora-dashboard aurora-${theme} text-sm`}>
      {/* Top Bar */}
      <header className="aurora-glass sticky top-0 z-30 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 ap-text font-bold text-lg">
            <div className="w-8 h-8 rounded-lg aurora-bg-gradient flex items-center justify-center shadow-[0_0_15px_rgba(45,212,191,0.4)]">
              <Megaphone className="w-4 h-4 text-white" />
            </div>
            <span>HiMewo Ads</span>
          </div>
          <div className="h-6 w-px ap-fill" />
          <button className="flex items-center gap-2 ap-hover px-3 py-1.5 rounded-lg transition-colors border border-transparent ap-text">
            <div className="w-6 h-6 rounded bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold text-white">
              MA
            </div>
            <span className="font-medium">Main Account</span>
            <ChevronDown className="w-4 h-4 ap-muted" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full ap-fill border ap-bd">
            <Wallet className="w-4 h-4 text-[var(--accent-teal)]" />
            <span className="ap-muted text-xs">Balance</span>
            <span className="font-bold text-[var(--accent-teal)]">৳12,450</span>
          </div>
          <button className="aurora-button px-4 py-2 rounded-full font-medium flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            <span>Create Ad</span>
          </button>
          <button className="w-10 h-10 rounded-full flex items-center justify-center ap-hover border border-transparent transition-colors">
            <Bell className="w-5 h-5 ap-muted" />
          </button>
          <img src="https://i.pravatar.cc/100?img=5" alt="User" className="w-9 h-9 rounded-full border ap-bd" />
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-[240px] hidden lg:flex flex-col gap-1 p-4 h-[calc(100vh-64px)] sticky top-16 border-r ap-bd">
          <div className="text-xs font-semibold ap-muted uppercase tracking-wider mb-2 px-3 mt-4">Menu</div>

          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg ap-fill border ap-bd ap-text relative overflow-hidden group">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-current rounded-r-full" />
            <LayoutDashboard className="w-5 h-5" />
            <span className="font-medium">Campaigns</span>
          </a>

          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg ap-muted ap-hover transition-colors">
            <BarChart2 className="w-5 h-5" />
            <span className="font-medium">Insights</span>
          </a>

          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg ap-muted ap-hover transition-colors">
            <Users className="w-5 h-5" />
            <span className="font-medium">Audiences</span>
          </a>

          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg ap-muted ap-hover transition-colors">
            <ImageIcon className="w-5 h-5" />
            <span className="font-medium">Creatives</span>
          </a>

          <div className="my-2 border-t ap-bd" />

          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg ap-muted ap-hover transition-colors">
            <Wallet className="w-5 h-5" />
            <span className="font-medium">Wallet</span>
          </a>

          <a href="#" className="flex items-center gap-3 px-3 py-2.5 rounded-lg ap-muted ap-hover transition-colors">
            <Settings className="w-5 h-5" />
            <span className="font-medium">Settings</span>
          </a>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 lg:p-8 max-w-[1440px] mx-auto overflow-y-auto">

          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight mb-1 aurora-text-gradient">Ads Manager</h1>
              <p className="ap-muted">Main Account • ID: 8392-4421-992</p>
            </div>
            <div className="flex items-center gap-3 ap-fill rounded-xl p-1 border ap-bd">
              <button className="px-4 py-1.5 rounded-lg ap-fill ap-text font-medium shadow-sm">Last 7 Days</button>
              <button className="px-4 py-1.5 rounded-lg ap-muted font-medium transition-colors">Last 30 Days</button>
              <button className="px-4 py-1.5 rounded-lg ap-muted font-medium transition-colors">All Time</button>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
            {KPIs.map((kpi, i) => (
              <div key={i} className="aurora-glass-card rounded-2xl p-5 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <BarChart2 className="w-12 h-12 ap-text" />
                </div>
                <div className="ap-muted font-medium text-xs uppercase tracking-wider mb-2">{kpi.label}</div>
                <div className="text-2xl font-bold ap-text mb-2">{kpi.value}</div>
                <div className={`flex items-center gap-1 text-xs font-medium ${kpi.positive ? 'text-[var(--accent-teal)]' : 'text-[var(--accent-pink)]'}`}>
                  {kpi.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                  <span>{kpi.delta}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Chart Area */}
          <div className="aurora-glass-card rounded-2xl p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold ap-text">Performance Overview</h2>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--accent-blue)] shadow-[0_0_8px_var(--accent-blue)]" />
                  <span className="ap-muted">Impressions</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-[var(--accent-violet)] shadow-[0_0_8px_var(--accent-violet)]" />
                  <span className="ap-muted">Clicks</span>
                </div>
              </div>
            </div>

            {/* Fake Chart */}
            <div className="h-[250px] w-full relative flex items-end">
              {/* Y-axis grid */}
              <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-6">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-full border-t ap-bd border-dashed" />
                ))}
              </div>

              {/* SVG Curve */}
              <svg className="absolute inset-0 w-full h-[200px] bottom-6" preserveAspectRatio="none" viewBox="0 0 1000 200">
                <defs>
                  <linearGradient id="blueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(59, 130, 246, 0.4)" />
                    <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
                  </linearGradient>
                  <linearGradient id="violetGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="rgba(129, 140, 248, 0.4)" />
                    <stop offset="100%" stopColor="rgba(129, 140, 248, 0)" />
                  </linearGradient>
                </defs>

                <path d="M0,180 C100,160 200,100 300,120 C400,140 500,60 600,80 C700,100 800,40 900,50 C950,55 1000,30 1000,30 L1000,200 L0,200 Z" fill="url(#blueGrad)" />
                <path d="M0,180 C100,160 200,100 300,120 C400,140 500,60 600,80 C700,100 800,40 900,50 C950,55 1000,30 1000,30" fill="none" stroke="#3b82f6" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 8px rgba(59,130,246,0.6))' }} />

                <path d="M0,190 C150,180 250,140 350,150 C450,160 550,110 650,130 C750,150 850,90 1000,80 L1000,200 L0,200 Z" fill="url(#violetGrad)" />
                <path d="M0,190 C150,180 250,140 350,150 C450,160 550,110 650,130 C750,150 850,90 1000,80" fill="none" stroke="#818cf8" strokeWidth="3" style={{ filter: 'drop-shadow(0 0 8px rgba(129,140,248,0.6))' }} />
              </svg>

              {/* X-axis labels */}
              <div className="absolute bottom-0 w-full flex justify-between text-[10px] ap-muted px-2">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>
          </div>

          {/* Campaigns Table */}
          <div className="aurora-glass-card rounded-2xl overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b ap-bd">
              <h2 className="text-lg font-bold ap-text">Active Campaigns</h2>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ap-muted" />
                  <input
                    type="text"
                    placeholder="Search campaigns..."
                    className="ap-fill border ap-bd rounded-lg pl-9 pr-4 py-2 text-sm ap-text placeholder:opacity-50 focus:outline-none transition-all w-[240px]"
                  />
                </div>
                <button className="p-2 rounded-lg ap-fill border ap-bd ap-muted ap-hover transition-colors">
                  <MoreHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b ap-bd ap-fill text-[11px] uppercase tracking-wider ap-muted font-semibold">
                    <th className="py-4 px-5">Campaign Name</th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5">Objective</th>
                    <th className="py-4 px-5">Budget</th>
                    <th className="py-4 px-5">Spent</th>
                    <th className="py-4 px-5">Results</th>
                    <th className="py-4 px-5">Delivery</th>
                  </tr>
                </thead>
                <tbody>
                  {CAMPAIGNS.map(campaign => (
                    <tr key={campaign.id} className="aurora-table-row border-b ap-bd">
                      <td className="py-4 px-5">
                        <div className="font-semibold ap-text mb-1">{campaign.name}</div>
                        <div className="text-xs ap-muted">ID: {2849200000 + campaign.id}</div>
                      </td>
                      <td className="py-4 px-5">
                        <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border
                          ${campaign.status === 'Active' ? 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] border-[var(--accent-teal)]/20 shadow-[0_0_10px_rgba(45,212,191,0.2)]' :
                            campaign.status === 'Paused' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                            'ap-fill ap-muted ap-bd'}
                        `}>
                          {campaign.status === 'Active' && <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-teal)] mr-1.5 animate-pulse" />}
                          {campaign.status}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-sm ap-text">{campaign.objective}</td>
                      <td className="py-4 px-5 text-sm ap-text">{campaign.budget}</td>
                      <td className="py-4 px-5 text-sm ap-text">{campaign.spent}</td>
                      <td className="py-4 px-5 text-sm font-semibold ap-text">{campaign.results}</td>
                      <td className="py-4 px-5 text-sm">
                        <div className={`flex items-center gap-1.5
                          ${campaign.delivery === 'Active' ? 'ap-text' :
                            campaign.delivery === 'Learning' ? 'text-amber-500' : 'ap-muted'}
                        `}>
                          {campaign.delivery}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t ap-bd flex items-center justify-between text-xs ap-muted">
              <span>Showing 1 to 5 of 12 campaigns</span>
              <div className="flex gap-1">
                <button className="px-3 py-1.5 rounded border ap-bd ap-hover disabled:opacity-50">Prev</button>
                <button className="px-3 py-1.5 rounded border ap-bd ap-fill ap-text font-medium">1</button>
                <button className="px-3 py-1.5 rounded border ap-bd ap-hover">2</button>
                <button className="px-3 py-1.5 rounded border ap-bd ap-hover">3</button>
                <button className="px-3 py-1.5 rounded border ap-bd ap-hover">Next</button>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}

export default Aurora;
