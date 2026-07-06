import React from 'react';
import { 
  Megaphone, 
  ChevronDown, 
  Wallet, 
  Plus, 
  LayoutDashboard, 
  BarChart3, 
  Users, 
  Image as ImageIcon, 
  Settings, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  MoreHorizontal
} from 'lucide-react';
import './sunset.css';

export function Sunset() {
  return (
    <div className="sunset-theme flex flex-col h-screen overflow-hidden">
      {/* Top Bar */}
      <header className="h-20 bg-white border-b border-[#F5E6DF] flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2 text-[#FF7A1A]">
            <Megaphone size={28} className="fill-current" />
            <span className="text-2xl font-extrabold tracking-tight">HiMewo Ads</span>
          </div>
          
          <div className="h-10 w-px bg-[#F5E6DF]"></div>
          
          <button className="flex items-center gap-3 hover:bg-[#FFEDDF] p-2 rounded-xl transition-colors">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#FF5A5F] flex items-center justify-center text-white font-bold text-sm shadow-md">
              TC
            </div>
            <div className="text-left">
              <div className="text-sm font-bold text-[#2D1A11]">The Coffee Co.</div>
              <div className="text-xs text-[#8A6E63]">Ad Account • Active</div>
            </div>
            <ChevronDown size={16} className="text-[#8A6E63] ml-2" />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 bg-[#FFF7F2] py-2 px-4 rounded-full border border-[#FFEDDF]">
            <Wallet size={18} className="text-[#FF7A1A]" />
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-[#8A6E63] uppercase">Balance</span>
              <span className="text-sm font-extrabold text-[#2D1A11]">৳ 12,450</span>
            </div>
          </div>
          
          <button className="sunset-button px-6 py-2.5 flex items-center gap-2 text-sm">
            <Plus size={18} />
            Create Ad
          </button>
          
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-white shadow-sm ring-2 ring-[#FFEDDF]">
            <img src="https://i.pravatar.cc/100?img=5" alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[240px] bg-white border-r border-[#F5E6DF] flex flex-col py-6 shrink-0">
          <nav className="flex-1 px-4 space-y-2">
            {[
              { icon: LayoutDashboard, label: 'Campaigns', active: true },
              { icon: BarChart3, label: 'Insights' },
              { icon: Users, label: 'Audiences' },
              { icon: ImageIcon, label: 'Creatives' },
              { icon: Users, label: 'Team' },
              { icon: Wallet, label: 'Wallet' },
              { icon: Settings, label: 'Settings' },
            ].map((item, i) => (
              <a 
                key={i} 
                href="#" 
                className={`sunset-nav-item flex items-center gap-3 px-4 py-3 ${item.active ? 'active' : ''}`}
              >
                <item.icon size={20} strokeWidth={2.5} />
                {item.label}
              </a>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-[1280px] mx-auto space-y-8 pb-12">
            
            {/* Header */}
            <div className="flex items-end justify-between">
              <div>
                <h1 className="text-3xl font-extrabold text-[#2D1A11] mb-1">Ads Manager</h1>
                <p className="text-[#8A6E63] font-medium">Overview for The Coffee Co. (Last 7 days)</p>
              </div>
              <button className="sunset-button px-6 py-3 flex items-center gap-2 text-base">
                <Plus size={20} />
                Create Campaign
              </button>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: 'Spend', value: '৳ 42,500', delta: '+12%', up: true },
                { label: 'Impressions', value: '1.2M', delta: '+5%', up: true },
                { label: 'Clicks', value: '45.2K', delta: '+18%', up: true },
                { label: 'CTR', value: '3.8%', delta: '+0.4%', up: true },
                { label: 'Conversions', value: '842', delta: '-2%', up: false },
                { label: 'ROAS', value: '4.2x', delta: '+0.5x', up: true },
              ].map((kpi, i) => (
                <div key={i} className="sunset-card p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-[#FF7A1A]/5 to-[#FF5A5F]/5 rounded-full -translate-y-8 translate-x-8 group-hover:scale-150 transition-transform duration-500"></div>
                  <div className="text-[#8A6E63] font-bold text-xs uppercase tracking-wider mb-2">{kpi.label}</div>
                  <div className="text-2xl font-extrabold text-[#2D1A11] mb-2">{kpi.value}</div>
                  <div className={`flex items-center gap-1 text-sm font-bold ${kpi.up ? 'text-[#10B981]' : 'text-[#FF5A5F]'}`}>
                    {kpi.up ? <ArrowUpRight size={16} strokeWidth={3} /> : <ArrowDownRight size={16} strokeWidth={3} />}
                    {kpi.delta}
                  </div>
                </div>
              ))}
            </div>

            {/* Charts Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 sunset-card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-extrabold text-lg">Performance</h3>
                  <select className="bg-[#FFF7F2] border border-[#FFEDDF] rounded-xl px-4 py-2 font-bold text-sm text-[#2D1A11] outline-none">
                    <option>Impressions vs Clicks</option>
                    <option>Spend vs Conversions</option>
                  </select>
                </div>
                
                {/* Fake Chart SVG */}
                <div className="h-64 w-full relative">
                  <div className="absolute inset-0 flex flex-col justify-between pt-2 pb-8">
                    {[100, 75, 50, 25, 0].map(val => (
                      <div key={val} className="w-full h-px bg-[#F5E6DF] relative">
                        <span className="absolute -left-2 -translate-x-full -translate-y-1/2 text-xs font-bold text-[#8A6E63]">{val}k</span>
                      </div>
                    ))}
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-6 flex justify-between px-4 text-xs font-bold text-[#8A6E63]">
                    <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                  </div>
                  <div className="absolute inset-0 pb-6 pl-2">
                    <svg viewBox="0 0 1000 200" preserveAspectRatio="none" className="w-full h-full overflow-visible">
                      <defs>
                        <linearGradient id="sunset-grad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF7A1A" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#FF5A5F" stopOpacity="0.01" />
                        </linearGradient>
                      </defs>
                      <path 
                        d="M0,150 C100,140 200,80 300,90 C400,100 500,40 600,60 C700,80 800,20 900,30 L1000,40 L1000,200 L0,200 Z" 
                        fill="url(#sunset-grad)"
                      />
                      <path 
                        d="M0,150 C100,140 200,80 300,90 C400,100 500,40 600,60 C700,80 800,20 900,30 L1000,40" 
                        fill="none" 
                        stroke="#FF7A1A" 
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path 
                        d="M0,180 C150,170 250,130 350,150 C450,170 550,100 650,120 C750,140 850,90 1000,100" 
                        fill="none" 
                        stroke="#FFB300" 
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeDasharray="8 8"
                      />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="sunset-card p-6 flex flex-col">
                <h3 className="font-extrabold text-lg mb-6">Spend Breakdown</h3>
                <div className="flex-1 flex flex-col justify-center gap-6">
                  {[
                    { label: 'Instagram Feed', percent: 45, color: '#FF7A1A' },
                    { label: 'Facebook Feed', percent: 30, color: '#FF5A5F' },
                    { label: 'Stories', percent: 15, color: '#FFB300' },
                    { label: 'Explore', percent: 10, color: '#D93674' },
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm font-bold mb-2">
                        <span>{item.label}</span>
                        <span className="text-[#8A6E63]">{item.percent}%</span>
                      </div>
                      <div className="h-3 w-full bg-[#FFF7F2] rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.percent}%`, backgroundColor: item.color }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="sunset-card overflow-hidden">
              <div className="p-6 border-b border-[#F5E6DF] flex justify-between items-center">
                <h3 className="font-extrabold text-lg">Active Campaigns</h3>
                <div className="flex gap-2">
                  <button className="sunset-button-secondary px-4 py-2 text-sm flex items-center gap-2">
                    Filter <ChevronDown size={16} />
                  </button>
                  <button className="sunset-button-secondary px-4 py-2 text-sm">
                    Export
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left sunset-table whitespace-nowrap">
                  <thead className="bg-[#FFF7F2]">
                    <tr>
                      <th>Campaign Name</th>
                      <th>Status</th>
                      <th>Objective</th>
                      <th>Budget</th>
                      <th>Spent</th>
                      <th>Results</th>
                      <th>Cost per Result</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody className="text-sm font-medium">
                    {[
                      { name: 'Summer Iced Latte Promo', status: 'Active', objective: 'Conversions', budget: '৳ 2,500/d', spent: '৳ 12,400', results: '245 Purchases', cpr: '৳ 50.61' },
                      { name: 'New Store Opening - Gulshan', status: 'Active', objective: 'Traffic', budget: '৳ 1,000/d', spent: '৳ 4,200', results: '1,240 Clicks', cpr: '৳ 3.38' },
                      { name: 'Weekend Pastry Offer', status: 'Paused', objective: 'Engagement', budget: '৳ 500/d', spent: '৳ 1,500', results: '840 Engagements', cpr: '৳ 1.78' },
                      { name: 'Brand Awareness Q3', status: 'Active', objective: 'Reach', budget: '৳ 1,500/d', spent: '৳ 22,100', results: '450K Reach', cpr: '৳ 49.11/k' },
                      { name: 'App Install Campaign', status: 'Draft', objective: 'App Installs', budget: '৳ 3,000/d', spent: '৳ 0', results: '-', cpr: '-' },
                    ].map((row, i) => (
                      <tr key={i} className="hover:bg-[#FFF7F2]/50 transition-colors">
                        <td className="font-bold text-[#2D1A11]">{row.name}</td>
                        <td>
                          {row.status === 'Active' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#10B981]/10 text-[#10B981] text-xs font-bold"><div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div> Active</span>}
                          {row.status === 'Paused' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FFB300]/10 text-[#FFB300] text-xs font-bold"><div className="w-1.5 h-1.5 rounded-full bg-[#FFB300]"></div> Paused</span>}
                          {row.status === 'Draft' && <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#8A6E63]/10 text-[#8A6E63] text-xs font-bold"><div className="w-1.5 h-1.5 rounded-full bg-[#8A6E63]"></div> Draft</span>}
                        </td>
                        <td className="text-[#8A6E63]">{row.objective}</td>
                        <td>{row.budget}</td>
                        <td>{row.spent}</td>
                        <td className="font-bold">{row.results}</td>
                        <td className="text-[#8A6E63]">{row.cpr}</td>
                        <td>
                          <button className="p-2 text-[#8A6E63] hover:text-[#FF7A1A] hover:bg-[#FFEDDF] rounded-lg transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                    ))}
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
