import React from 'react';
import { Home, Users, Clapperboard, Store, Heart, MessageCircle, Share2, MoreHorizontal, Image as ImageIcon } from 'lucide-react';

export function NotchCurve() {
  return (
    <div className="w-full min-h-[100dvh] bg-slate-50 flex flex-col relative font-sans selection:bg-indigo-100 mx-auto max-w-[400px] overflow-hidden">
      {/* Header */}
      <header className="px-5 pb-3 pt-4 bg-white sticky top-0 z-10 flex items-center justify-between border-b border-slate-100/60 shadow-sm shadow-slate-100/50">
        <h1 className="text-2xl font-black text-indigo-600 tracking-tighter">HiMewo</h1>
        <div className="w-9 h-9 bg-slate-100/80 rounded-full flex items-center justify-center text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors">
           <MoreHorizontal size={20} />
        </div>
      </header>

      {/* Feed Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5 pb-32 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        {/* Post 1 */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 font-bold text-sm">
              AL
            </div>
            <div>
              <div className="text-[14px] font-bold text-slate-800 leading-tight">Alex Rivera</div>
              <div className="text-[12px] text-slate-400">2 hrs ago</div>
            </div>
          </div>
          <div className="space-y-2 mb-3">
            <div className="w-full h-4 bg-slate-100 rounded-full"></div>
            <div className="w-4/5 h-4 bg-slate-100 rounded-full"></div>
          </div>
          <div className="w-full h-48 bg-gradient-to-tr from-slate-100 to-indigo-50 rounded-2xl mb-4 flex items-center justify-center text-slate-300">
            <ImageIcon size={32} strokeWidth={1.5} />
          </div>
          <div className="flex gap-5 text-slate-400 px-1">
            <div className="flex items-center gap-1.5 hover:text-rose-500 cursor-pointer transition-colors"><Heart size={20} /> <span className="text-xs font-semibold">24</span></div>
            <div className="flex items-center gap-1.5 hover:text-indigo-500 cursor-pointer transition-colors"><MessageCircle size={20} /> <span className="text-xs font-semibold">5</span></div>
            <div className="flex items-center gap-1.5 ml-auto hover:text-slate-600 cursor-pointer transition-colors"><Share2 size={20} /></div>
          </div>
        </div>

        {/* Post 2 */}
        <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100/50">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-500 font-bold text-sm">
              MJ
            </div>
            <div>
              <div className="text-[14px] font-bold text-slate-800 leading-tight">Mia Johnson</div>
              <div className="text-[12px] text-slate-400">5 hrs ago</div>
            </div>
          </div>
          <div className="space-y-2 mb-3">
            <div className="w-11/12 h-4 bg-slate-100 rounded-full"></div>
            <div className="w-2/3 h-4 bg-slate-100 rounded-full"></div>
          </div>
           <div className="flex gap-5 text-slate-400 px-1 mt-4">
            <div className="flex items-center gap-1.5 text-rose-500 cursor-pointer"><Heart size={20} className="fill-rose-500" /> <span className="text-xs font-semibold">102</span></div>
            <div className="flex items-center gap-1.5 hover:text-indigo-500 cursor-pointer transition-colors"><MessageCircle size={20} /> <span className="text-xs font-semibold">12</span></div>
            <div className="flex items-center gap-1.5 ml-auto hover:text-slate-600 cursor-pointer transition-colors"><Share2 size={20} /></div>
          </div>
        </div>
      </div>

      {/* Bottom Nav Area */}
      <div className="absolute bottom-0 left-0 w-full z-20 pointer-events-none">
        {/* Shadows and Background */}
        <div className="absolute bottom-0 w-full flex flex-col drop-shadow-[0_-8px_20px_rgba(0,0,0,0.05)] pointer-events-auto">
          {/* The SVG & Flex Row */}
          <div className="flex w-full h-[64px]">
            <div className="flex-1 bg-white rounded-tl-[32px]"></div>
            <div className="w-[100px] h-[64px] text-white">
              <svg width="100" height="64" viewBox="0 0 100 64" fill="currentColor" className="block w-full h-full">
                <path d="M 0 0 L 8 0 C 24 0, 24 44, 50 44 C 76 44, 76 0, 92 0 L 100 0 L 100 64 L 0 64 Z" />
              </svg>
            </div>
            <div className="flex-1 bg-white rounded-tr-[32px]"></div>
          </div>
          {/* Safe Area Fill */}
          <div className="w-full h-[32px] bg-white"></div>
        </div>

        {/* Interactive Foreground */}
        <div className="absolute bottom-[32px] w-full h-[64px] px-3 flex justify-between items-center pointer-events-auto z-10">
          <NavItem icon={Home} label="Home" active />
          <NavItem icon={Users} label="Friends" />

          {/* Reels FAB */}
          <div className="flex flex-col items-center justify-between w-16 h-[64px] pt-1 pb-1.5 relative group cursor-pointer">
            <div className="relative w-full flex justify-center">
              <button className="absolute -top-[22px] w-[56px] h-[56px] bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(79,70,229,0.3)] group-hover:-translate-y-1 transition-all duration-300 border-[3px] border-white/20">
                <Clapperboard size={24} strokeWidth={2.5} />
              </button>
            </div>
            <span className="text-[11px] font-semibold tracking-tight text-slate-400 mt-auto group-hover:text-indigo-500 transition-colors">Reels</span>
          </div>

          <NavItem icon={Store} label="Market" />
          <NavItem avatar="https://i.pravatar.cc/100?img=13" label="Profile" />
        </div>
      </div>
    </div>
  );
}

const NavItem = ({ icon: Icon, label, active, badge, avatar }: any) => (
  <button className="flex flex-col items-center justify-between w-16 h-[64px] pt-2 pb-1.5 group cursor-pointer">
    <div className={`relative flex items-center justify-center w-[44px] h-[32px] rounded-xl transition-all duration-300 ${active ? 'bg-indigo-50 text-indigo-600 scale-105' : 'text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-600'}`}>
      {avatar ? (
        <div className={`w-[28px] h-[28px] rounded-full overflow-hidden ring-2 transition-all ${active ? 'ring-indigo-600 ring-offset-2 ring-offset-white' : 'ring-transparent'}`}>
          <img src={avatar} alt={label} className="w-full h-full object-cover" />
        </div>
      ) : (
        <Icon
          size={22}
          strokeWidth={active ? 2.5 : 2}
        />
      )}

      {badge && (
        <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white shadow-sm px-1 z-10">
          {badge}
        </span>
      )}
    </div>
    <span className={`text-[11px] font-semibold tracking-tight transition-colors ${active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'}`}>
      {label}
    </span>
  </button>
);

export default NotchCurve;
