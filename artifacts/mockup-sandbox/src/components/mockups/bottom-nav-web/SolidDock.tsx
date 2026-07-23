import React, { useState } from 'react';
import { Home, Users, Clapperboard, Store } from 'lucide-react';

export const SolidDock = () => {
  const [activeTab, setActiveTab] = useState('Home');

  return (
    <div className="relative w-full h-[100dvh] min-h-[800px] max-w-[400px] mx-auto bg-slate-50 flex flex-col overflow-hidden sm:border-x sm:border-slate-200 sm:shadow-2xl font-sans text-slate-900">
      {/* App Header */}
      <header className="px-5 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/60 shadow-sm">
        <h1 className="text-[22px] font-black text-[#0055FF] tracking-tight">HiMewo</h1>
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700">
             <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </div>
      </header>

      {/* Feed Content (Faux) */}
      <div className="flex-1 overflow-y-auto pb-32 hide-scrollbar">
        {[1, 2, 3].map((item) => (
          <div key={item} className="bg-white mb-2 p-4 border-b border-slate-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden flex items-center justify-center">
                 <img src={`https://i.pravatar.cc/100?img=${item + 20}`} alt="User" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 flex flex-col gap-1.5">
                <div className="h-3 w-28 bg-slate-200 rounded-sm"></div>
                <div className="h-2 w-16 bg-slate-100 rounded-sm"></div>
              </div>
            </div>
            <div className="w-full h-[220px] bg-slate-100 rounded-xl mb-3 overflow-hidden border border-slate-100">
               <img src={`https://picsum.photos/seed/${item * 10}/400/300`} alt="Post content" className="w-full h-full object-cover opacity-80" />
            </div>
            <div className="flex gap-4 mt-2">
              <div className="h-7 w-20 bg-slate-100 rounded-full"></div>
              <div className="h-7 w-16 bg-slate-100 rounded-full"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Nav Area */}
      <div className="absolute bottom-0 w-full z-50 pointer-events-none flex flex-col">
        {/* Main Dock */}
        <div className="relative pointer-events-auto bg-white border-t border-slate-200/80 shadow-[0_-12px_40px_rgba(0,0,0,0.06)] h-[64px] flex items-end justify-between px-2 pb-[10px]">
          
          {/* 1. Home (Active) */}
          <button 
            onClick={() => setActiveTab('Home')}
            className="flex-1 flex flex-col items-center justify-end group relative h-full"
          >
            <div className={`mb-1 relative flex flex-col items-center transform transition-all duration-200 active:scale-95 ${activeTab === 'Home' ? '-translate-y-1' : ''}`}>
              <Home className={`w-[26px] h-[26px] transition-colors duration-200 ${activeTab === 'Home' ? 'text-[#0055FF] stroke-[2.5px] fill-[#0055FF]/10' : 'text-slate-400 stroke-[2.5px] group-hover:text-slate-600'}`} />
              {activeTab === 'Home' && (
                <div className="absolute -bottom-3 w-1.5 h-1.5 rounded-full bg-[#0055FF]" />
              )}
            </div>
            <span className={`text-[10px] tracking-wide leading-none transition-colors duration-200 ${activeTab === 'Home' ? 'font-bold text-[#0055FF]' : 'font-semibold text-slate-400 group-hover:text-slate-600'}`}>Home</span>
          </button>

          {/* 2. Friends */}
          <button 
            onClick={() => setActiveTab('Friends')}
            className="flex-1 flex flex-col items-center justify-end group relative h-full"
          >
            <div className={`mb-1 relative flex flex-col items-center transform transition-all duration-200 active:scale-95 ${activeTab === 'Friends' ? '-translate-y-1' : ''}`}>
              <Users className={`w-[26px] h-[26px] transition-colors duration-200 ${activeTab === 'Friends' ? 'text-[#0055FF] stroke-[2.5px] fill-[#0055FF]/10' : 'text-slate-400 stroke-[2.5px] group-hover:text-slate-600'}`} />
              {activeTab === 'Friends' && (
                <div className="absolute -bottom-3 w-1.5 h-1.5 rounded-full bg-[#0055FF]" />
              )}
            </div>
            <span className={`text-[10px] tracking-wide leading-none transition-colors duration-200 ${activeTab === 'Friends' ? 'font-bold text-[#0055FF]' : 'font-semibold text-slate-400 group-hover:text-slate-600'}`}>Friends</span>
          </button>

          {/* 3. Reels (Raised Center) */}
          <div 
            onClick={() => setActiveTab('Reels')}
            className="flex-1 flex flex-col items-center justify-end group relative h-full pointer-events-auto cursor-pointer"
          >
            {/* The Raised Button */}
            <div className="absolute bottom-[24px] w-[58px] h-[58px] rounded-[20px] bg-gradient-to-tr from-[#0055FF] to-[#3377FF] shadow-[0_12px_28px_-6px_rgba(0,85,255,0.7),inset_0_2px_4px_rgba(255,255,255,0.3)] flex items-center justify-center text-white transform transition-all duration-300 hover:-translate-y-1 active:scale-95 active:translate-y-0 z-20">
              <Clapperboard className="w-[28px] h-[28px] stroke-[2.5px] fill-white/10" />
            </div>
            {/* Cutout/glow effect under button */}
            <div className="absolute bottom-[24px] w-[58px] h-[58px] rounded-[20px] bg-[#0055FF]/20 blur-xl z-10 pointer-events-none"></div>
            
            {activeTab === 'Reels' && (
              <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#0055FF]" />
            )}
            <span className={`text-[10px] tracking-wide leading-none transition-colors duration-200 ${activeTab === 'Reels' ? 'font-bold text-[#0055FF]' : 'font-semibold text-slate-400 group-hover:text-slate-600'}`}>Reels</span>
          </div>

          {/* 4. Market */}
          <button 
            onClick={() => setActiveTab('Market')}
            className="flex-1 flex flex-col items-center justify-end group relative h-full"
          >
            <div className={`mb-1 relative flex flex-col items-center transform transition-all duration-200 active:scale-95 ${activeTab === 'Market' ? '-translate-y-1' : ''}`}>
              <Store className={`w-[26px] h-[26px] transition-colors duration-200 ${activeTab === 'Market' ? 'text-[#0055FF] stroke-[2.5px] fill-[#0055FF]/10' : 'text-slate-400 stroke-[2.5px] group-hover:text-slate-600'}`} />
              {activeTab === 'Market' && (
                <div className="absolute -bottom-3 w-1.5 h-1.5 rounded-full bg-[#0055FF]" />
              )}
            </div>
            <span className={`text-[10px] tracking-wide leading-none transition-colors duration-200 ${activeTab === 'Market' ? 'font-bold text-[#0055FF]' : 'font-semibold text-slate-400 group-hover:text-slate-600'}`}>Market</span>
          </button>

          {/* 5. Profile */}
          <button 
            onClick={() => setActiveTab('Profile')}
            className="flex-1 flex flex-col items-center justify-end group relative h-full"
          >
            <div className={`mb-1 relative flex flex-col items-center transform transition-all duration-200 active:scale-95 ${activeTab === 'Profile' ? '-translate-y-1' : ''}`}>
              <div className={`w-[26px] h-[26px] rounded-full overflow-hidden border-[2px] transition-colors duration-200 shadow-sm ${activeTab === 'Profile' ? 'border-[#0055FF]' : 'border-slate-300 group-hover:border-slate-500'}`}>
                <img src="https://i.pravatar.cc/100?img=13" alt="Profile" className="w-full h-full object-cover" />
              </div>
              {activeTab === 'Profile' && (
                <div className="absolute -bottom-3 w-1.5 h-1.5 rounded-full bg-[#0055FF]" />
              )}
            </div>
            <span className={`text-[10px] tracking-wide leading-none transition-colors duration-200 ${activeTab === 'Profile' ? 'font-bold text-[#0055FF]' : 'font-semibold text-slate-400 group-hover:text-slate-600'}`}>Profile</span>
          </button>
          
        </div>
        
        {/* Home Indicator line (Safe area visual) */}
        <div className="bg-white pb-[14px] pt-1 flex justify-center pointer-events-auto">
          <div className="w-[130px] h-[5px] bg-slate-800/20 rounded-full"></div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </div>
  );
};

export default SolidDock;
