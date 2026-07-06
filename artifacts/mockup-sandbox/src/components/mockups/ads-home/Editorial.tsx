import React from "react";
import { 
  Megaphone, LayoutDashboard, BarChart3, Users, ImageIcon, 
  CreditCard, Settings, Plus, ChevronDown, ArrowUpRight, 
  ArrowDownRight, Circle, Play, Pause, FileEdit, MoreHorizontal
} from "lucide-react";
import "./_ads_editorial.css";

export function Editorial() {
  return (
    <div className="theme-editorial min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-paper)', color: 'var(--text-main)', fontFamily: 'var(--font-sans)' }}>
      
      {/* Top Bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between px-6 border-b" style={{ backgroundColor: 'var(--bg-card)' }}>
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <Megaphone size={18} style={{ color: 'var(--accent-ink)' }} />
            <span className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-serif)' }}>HiMewo Ads</span>
          </div>
          
          <button className="flex items-center gap-2 text-sm px-3 py-1.5 rounded-md hover:bg-[#F7F6F3] transition-colors">
            <div className="w-5 h-5 rounded bg-[#E7E5E0] flex items-center justify-center text-xs">A</div>
            <span>Acme Corp HQ</span>
            <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
          </button>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 text-sm">
            <span style={{ color: 'var(--text-muted)' }}>Balance</span>
            <span style={{ fontFamily: 'var(--font-serif)', fontSize: '15px' }}>৳12,450</span>
          </div>
          <button className="flex items-center gap-2 px-4 py-1.5 text-sm text-white rounded transition-colors" style={{ backgroundColor: 'var(--accent-ink)' }}>
            <Plus size={16} />
            <span>Create Ad</span>
          </button>
          <img src="https://i.pravatar.cc/100?img=5" alt="User" className="w-8 h-8 rounded-full border" />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-56 border-r flex flex-col justify-between py-6" style={{ backgroundColor: 'var(--bg-paper)' }}>
          <nav className="flex flex-col gap-1 px-3">
            <SidebarItem icon={<LayoutDashboard size={18} />} label="Campaigns" active />
            <SidebarItem icon={<BarChart3 size={18} />} label="Insights" />
            <SidebarItem icon={<Users size={18} />} label="Audiences" />
            <SidebarItem icon={<ImageIcon size={18} />} label="Creatives" />
            <SidebarItem icon={<CreditCard size={18} />} label="Wallet" />
          </nav>
          <nav className="flex flex-col gap-1 px-3">
            <SidebarItem icon={<Users size={18} />} label="Team" />
            <SidebarItem icon={<Settings size={18} />} label="Settings" />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8 lg:p-10">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Page Header */}
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl mb-1" style={{ fontFamily: 'var(--font-serif)', color: 'var(--text-main)' }}>Ads Manager</h1>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Acme Corp HQ • ID: 104928471</p>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span style={{ color: 'var(--text-muted)' }}>Last 30 days</span>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
              <KpiCard label="Spend" value="৳45,200" delta="+12.4%" positive />
              <KpiCard label="Impressions" value="1.24M" delta="+5.2%" positive />
              <KpiCard label="Clicks" value="45.2K" delta="-1.1%" />
              <KpiCard label="CTR" value="3.76%" delta="+0.4%" positive />
              <KpiCard label="Conversions" value="842" delta="+18.2%" positive />
              <KpiCard label="ROAS" value="2.4x" delta="+0.1x" positive />
            </div>

            {/* Chart Area */}
            <div className="border bg-white rounded p-6">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-lg" style={{ fontFamily: 'var(--font-serif)' }}>Performance Overview</h3>
                <div className="flex items-center gap-4 text-sm" style={{ color: 'var(--text-muted)' }}>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#1B3B5A]"></div> Impressions</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-[#E7E5E0]"></div> Clicks</div>
                </div>
              </div>
              <div className="h-[240px] w-full relative">
                {/* Fake Y-Axis */}
                <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-between text-xs text-right" style={{ color: 'var(--text-faint)' }}>
                  <span>50k</span>
                  <span>25k</span>
                  <span>0</span>
                </div>
                {/* Fake Chart Grid */}
                <div className="absolute left-10 right-0 top-0 bottom-6 border-b border-l flex flex-col justify-between">
                  <div className="border-t border-dashed w-full h-0" style={{ borderColor: 'var(--border-thin)' }}></div>
                  <div className="border-t border-dashed w-full h-0" style={{ borderColor: 'var(--border-thin)' }}></div>
                  <div className="w-full h-0"></div>
                </div>
                {/* Fake SVG Line */}
                <div className="absolute left-10 right-0 top-0 bottom-6">
                  <svg className="w-full h-full" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <path d="M0,80 Q10,75 20,60 T40,40 T60,55 T80,20 T100,10" fill="none" stroke="var(--accent-ink)" strokeWidth="1.5" />
                    <path d="M0,95 Q15,90 25,85 T50,80 T70,88 T90,75 T100,70" fill="none" stroke="var(--border-thin)" strokeWidth="1.5" />
                  </svg>
                </div>
                {/* Fake X-Axis */}
                <div className="absolute left-10 right-0 bottom-0 h-6 flex justify-between items-end text-xs" style={{ color: 'var(--text-faint)' }}>
                  <span>Oct 1</span>
                  <span>Oct 8</span>
                  <span>Oct 15</span>
                  <span>Oct 22</span>
                  <span>Oct 30</span>
                </div>
              </div>
            </div>

            {/* Campaigns Table */}
            <div className="border bg-white rounded overflow-hidden">
              <div className="p-5 border-b flex items-center justify-between">
                <h3 className="text-lg" style={{ fontFamily: 'var(--font-serif)' }}>Active Campaigns</h3>
                <div className="relative">
                  <input 
                    type="text" 
                    placeholder="Search campaigns..." 
                    className="border text-sm px-3 py-1.5 rounded w-64 bg-transparent outline-none focus:border-[#1B3B5A]"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left whitespace-nowrap">
                  <thead className="bg-[#F7F6F3] border-b" style={{ color: 'var(--text-muted)' }}>
                    <tr>
                      <th className="px-5 py-3 font-medium">Name</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 font-medium">Objective</th>
                      <th className="px-5 py-3 font-medium text-right">Budget</th>
                      <th className="px-5 py-3 font-medium text-right">Spent</th>
                      <th className="px-5 py-3 font-medium text-right">Results</th>
                      <th className="px-5 py-3 font-medium">Delivery</th>
                      <th className="px-5 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: 'var(--border-thin)' }}>
                    <TableRow 
                      name="Q3 Retargeting - Urban" status="active" objective="Conversions" 
                      budget="৳1,500/d" spent="৳12,400" results="124 Pur." delivery="Delivering" 
                    />
                    <TableRow 
                      name="Brand Awareness - Dhaka" status="paused" objective="Traffic" 
                      budget="৳500/d" spent="৳4,200" results="8,041 Clicks" delivery="Paused" 
                    />
                    <TableRow 
                      name="Spring Sale - Catalog" status="active" objective="Conversions" 
                      budget="৳2,000/d" spent="৳8,900" results="45 Pur." delivery="Learning" 
                    />
                    <TableRow 
                      name="Lookalike 1% - High LTV" status="active" objective="Engagement" 
                      budget="৳800/d" spent="৳5,100" results="2.1k Eng." delivery="Delivering" 
                    />
                    <TableRow 
                      name="Video Views - New Product" status="draft" objective="Traffic" 
                      budget="৳1,000/d" spent="৳0" results="-" delivery="In Review" 
                    />
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarItem({ icon, label, active = false }: { icon: React.ReactNode, label: string, active?: boolean }) {
  return (
    <a 
      href="#" 
      className={`flex items-center gap-3 px-3 py-2 text-sm rounded-md transition-colors ${
        active 
          ? "bg-[#E7E5E0] font-medium" 
          : "hover:bg-[#E7E5E0]/50 text-[var(--text-muted)]"
      }`}
      style={active ? { color: 'var(--text-main)' } : {}}
    >
      <div style={{ color: active ? 'var(--accent-ink)' : 'var(--text-muted)' }}>
        {icon}
      </div>
      {label}
    </a>
  );
}

function KpiCard({ label, value, delta, positive = false }: { label: string, value: string, delta: string, positive?: boolean }) {
  return (
    <div className="border bg-white rounded p-5 flex flex-col justify-between">
      <span className="text-sm mb-3" style={{ color: 'var(--text-muted)' }}>{label}</span>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-2xl" style={{ fontFamily: 'var(--font-serif)' }}>{value}</span>
        <div className="flex items-center text-xs" style={{ color: positive ? 'var(--positive)' : 'var(--negative)' }}>
          {positive ? <ArrowUpRight size={12} className="mr-0.5" /> : <ArrowDownRight size={12} className="mr-0.5" />}
          {delta}
        </div>
      </div>
    </div>
  );
}

function TableRow({ name, status, objective, budget, spent, results, delivery }: any) {
  const statusIcon = 
    status === 'active' ? <Play size={12} className="text-[var(--positive)] fill-current" /> :
    status === 'paused' ? <Pause size={12} className="text-[var(--text-muted)] fill-current" /> :
    <FileEdit size={12} className="text-[var(--text-muted)]" />;

  const statusBg = 
    status === 'active' ? 'bg-[#2E5C46]/10 text-[var(--positive)]' :
    status === 'paused' ? 'bg-[#E7E5E0] text-[var(--text-muted)]' :
    'bg-[#E7E5E0] text-[var(--text-muted)]';

  return (
    <tr className="hover:bg-[#F9F8F6] transition-colors group cursor-pointer">
      <td className="px-5 py-4 font-medium" style={{ color: 'var(--text-main)' }}>{name}</td>
      <td className="px-5 py-4">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs capitalize ${statusBg}`}>
          {statusIcon}
          {status}
        </span>
      </td>
      <td className="px-5 py-4 text-[var(--text-muted)]">{objective}</td>
      <td className="px-5 py-4 text-right" style={{ fontFamily: 'var(--font-serif)' }}>{budget}</td>
      <td className="px-5 py-4 text-right" style={{ fontFamily: 'var(--font-serif)' }}>{spent}</td>
      <td className="px-5 py-4 text-right" style={{ fontFamily: 'var(--font-serif)' }}>{results}</td>
      <td className="px-5 py-4">
        <div className="flex items-center gap-2">
          <Circle size={8} className={
            delivery === 'Delivering' ? "fill-[var(--positive)] text-[var(--positive)]" :
            delivery === 'Learning' ? "fill-[var(--accent-ink)] text-[var(--accent-ink)]" :
            "fill-transparent text-[var(--text-muted)]"
          } />
          <span className="text-[var(--text-muted)]">{delivery}</span>
        </div>
      </td>
      <td className="px-5 py-4 text-right">
        <button className="text-[var(--text-faint)] hover:text-[var(--accent-ink)] transition-colors opacity-0 group-hover:opacity-100">
          <MoreHorizontal size={18} />
        </button>
      </td>
    </tr>
  );
}
