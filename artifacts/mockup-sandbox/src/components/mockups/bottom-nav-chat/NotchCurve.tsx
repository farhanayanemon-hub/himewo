import React from 'react';
import { MessageCircle, Users, PenSquare, Bell, Menu, Search, Edit } from 'lucide-react';

export function NotchCurve() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-neutral-900 p-4 sm:p-8 font-sans selection:bg-indigo-100">
      {/* Phone Frame */}
      <div className="relative w-full max-w-[390px] h-[844px] bg-slate-50 rounded-[48px] overflow-hidden shadow-2xl ring-[12px] ring-neutral-800 flex flex-col">

        {/* Top Status Bar Placeholder */}
        <div className="w-full h-12 bg-white flex items-center justify-between px-6 pt-2 z-20">
          <span className="text-[14px] font-bold text-slate-800">9:41</span>
          <div className="flex gap-1.5 items-center">
            <div className="w-4 h-3 bg-slate-800 rounded-sm"></div>
            <div className="w-3 h-3 bg-slate-800 rounded-full"></div>
            <div className="w-5 h-3 bg-slate-800 rounded-sm"></div>
          </div>
        </div>

        {/* Header */}
        <header className="px-5 pb-3 bg-white sticky top-0 z-10 flex items-center justify-between border-b border-slate-100/60">
          <h1 className="text-2xl font-black text-indigo-600 tracking-tighter">Chats</h1>
          <div className="flex gap-2">
            <div className="w-9 h-9 bg-slate-100/80 rounded-full flex items-center justify-center text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors">
               <Search size={20} />
            </div>
            <div className="w-9 h-9 bg-slate-100/80 rounded-full flex items-center justify-center text-slate-600 cursor-pointer hover:bg-slate-200 transition-colors">
               <Edit size={20} />
            </div>
          </div>
        </header>

        {/* Feed Content - Chat List */}
        <div className="flex-1 overflow-y-auto bg-slate-50 space-y-0 pb-40 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
          
          {/* Chat 1 */}
          <div className="flex items-center gap-4 p-4 bg-white border-b border-slate-100/50 cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="relative">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-500 font-bold text-lg">
                AL
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <div className="text-[15px] font-bold text-slate-800 truncate">Alex Rivera</div>
                <div className="text-[12px] font-semibold text-indigo-600">9:40 AM</div>
              </div>
              <div className="text-[14px] font-medium text-slate-800 truncate">Are we still on for lunch today?</div>
            </div>
          </div>

          {/* Chat 2 */}
          <div className="flex items-center gap-4 p-4 bg-white border-b border-slate-100/50 cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="relative">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold text-lg">
                MJ
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <div className="text-[15px] font-bold text-slate-800 truncate">Mia Johnson</div>
                <div className="text-[12px] text-slate-400">Yesterday</div>
              </div>
              <div className="text-[14px] text-slate-500 truncate">The new designs look amazing!</div>
            </div>
          </div>

          {/* Chat 3 */}
          <div className="flex items-center gap-4 p-4 bg-white border-b border-slate-100/50 cursor-pointer hover:bg-slate-50 transition-colors">
            <div className="relative">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center text-rose-500 font-bold text-lg">
                SJ
              </div>
              <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-0.5">
                <div className="text-[15px] font-bold text-slate-800 truncate">Steve Jobs</div>
                <div className="text-[12px] text-slate-400">Tue</div>
              </div>
              <div className="text-[14px] text-slate-500 truncate">Let's put a dent in the universe.</div>
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
                <svg width="100" height="64" viewBox="0 0 100 64" fill="currentColor" className="block">
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
            <NavItem icon={MessageCircle} label="Chats" active />
            <NavItem icon={Users} label="People" />

            {/* Compose FAB */}
            <div className="flex flex-col items-center justify-between w-16 h-[64px] pt-1 pb-1.5 relative group cursor-pointer">
              <div className="relative w-full flex justify-center">
                <button className="absolute -top-[22px] w-[56px] h-[56px] bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-full flex items-center justify-center text-white shadow-[0_8px_20px_rgba(79,70,229,0.3)] group-hover:-translate-y-1 transition-all duration-300 border-[3px] border-white/20">
                  <PenSquare size={24} strokeWidth={2.5} />
                </button>
              </div>
              <span className="text-[11px] font-semibold tracking-tight text-slate-400 mt-auto group-hover:text-indigo-500 transition-colors">New</span>
            </div>

            <NavItem icon={Bell} label="Notifs" badge={5} />
            <NavItem icon={Menu} label="Menu" />
          </div>
        </div>
      </div>
    </div>
  );
}

const NavItem = ({ icon: Icon, label, active, badge }: any) => (
  <button className="flex flex-col items-center justify-between w-16 h-[64px] pt-2 pb-1.5 group cursor-pointer">
    <div className={`relative flex items-center justify-center w-[44px] h-[32px] rounded-xl transition-all duration-300 ${active ? 'bg-indigo-50 text-indigo-600 scale-105' : 'text-slate-400 group-hover:bg-slate-50 group-hover:text-slate-600'}`}>
      <Icon
        size={22}
        strokeWidth={active ? 2.5 : 2}
      />

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
