import React, { useState } from 'react';
import { Home, Users, Clapperboard, Bell } from 'lucide-react';

export default function GlassBlur() {
  const [activeTab, setActiveTab] = useState('Home');

  return (
    <div className="relative min-h-[100dvh] w-full max-w-[430px] mx-auto bg-[#09090b] overflow-hidden text-white font-sans flex flex-col border-x border-white/5">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-indigo-500/10 blur-[120px] rounded-full mix-blend-screen -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-rose-500/10 blur-[100px] rounded-full mix-blend-screen translate-x-1/3 translate-y-1/3 pointer-events-none" />

      {/* Faux Content Header */}
      <header className="px-6 py-6 pt-12 flex justify-between items-center z-10 relative">
        <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-500">
          HiMewo
        </h1>
        <div className="flex gap-3">
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 backdrop-blur-md" />
          <div className="w-9 h-9 rounded-full bg-white/5 border border-white/10 backdrop-blur-md" />
        </div>
      </header>

      {/* Faux Feed Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-32 space-y-6 z-10 relative scrollbar-hide">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white/[0.03] border border-white/[0.08] rounded-[32px] p-5 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-white/10" />
              <div className="space-y-2">
                <div className="w-24 h-2.5 rounded-full bg-white/20" />
                <div className="w-16 h-2 rounded-full bg-white/10" />
              </div>
            </div>
            <div className="w-full h-56 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/5" />
            <div className="flex gap-4 mt-4">
              <div className="w-9 h-9 rounded-full bg-white/10" />
              <div className="w-9 h-9 rounded-full bg-white/10" />
              <div className="w-9 h-9 rounded-full bg-white/10" />
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Bar */}
      <div className="absolute bottom-0 inset-x-0 px-6 pb-8 pt-10 pointer-events-none z-50">
        <nav className="relative flex items-center justify-between px-3 py-3 rounded-full bg-white/[0.04] backdrop-blur-[40px] border border-white/10 shadow-[0_8px_32px_rgba(0,0,0,0.6)] pointer-events-auto">
          
          {/* Subtle top border highlight */}
          <div className="absolute inset-x-4 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />

          {/* 1. Home */}
          <button 
            onClick={() => setActiveTab('Home')}
            className={`relative flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full transition-all duration-500 ease-out ${activeTab === 'Home' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {activeTab === 'Home' && (
              <div className="absolute inset-0 bg-white/10 rounded-full blur-md" />
            )}
            <Home strokeWidth={activeTab === 'Home' ? 2.5 : 2} size={24} className="relative z-10" />
            <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-white transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.8)] ${activeTab === 'Home' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
          </button>

          {/* 2. Friends */}
          <button 
            onClick={() => setActiveTab('Friends')}
            className={`relative flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full transition-all duration-500 ease-out ${activeTab === 'Friends' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {activeTab === 'Friends' && (
              <div className="absolute inset-0 bg-white/10 rounded-full blur-md" />
            )}
            <Users strokeWidth={activeTab === 'Friends' ? 2.5 : 2} size={24} className="relative z-10" />
            <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-white transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.8)] ${activeTab === 'Friends' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
          </button>

          {/* Spacer for center button */}
          <div className="w-[60px]" />

          {/* 3. Reels (Center Raised) */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-7">
            {/* Ambient Bloom */}
            <div className="absolute inset-0 bg-rose-500/40 blur-[24px] rounded-full scale-[1.4] animate-pulse pointer-events-none" />
            
            <button 
              onClick={() => setActiveTab('Reels')}
              className="relative flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-tr from-rose-500 via-fuchsia-500 to-indigo-500 shadow-[0_8px_32px_rgba(244,63,94,0.4)] text-white transition-transform hover:scale-105 active:scale-95 group border border-white/20"
            >
              {/* Inner glass reflection */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-b from-white/30 to-transparent opacity-50" />
              <Clapperboard size={28} strokeWidth={2.5} className="relative z-10 drop-shadow-md" />
            </button>
          </div>

          {/* 4. Alerts */}
          <button 
            onClick={() => setActiveTab('Alerts')}
            className={`relative flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full transition-all duration-500 ease-out ${activeTab === 'Alerts' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
          >
            {activeTab === 'Alerts' && (
              <div className="absolute inset-0 bg-white/10 rounded-full blur-md" />
            )}
            <div className="relative">
              <Bell strokeWidth={activeTab === 'Alerts' ? 2.5 : 2} size={24} className="relative z-10" />
              <span className="absolute -top-1.5 -right-1.5 w-[18px] h-[18px] bg-rose-500 ring-2 ring-[#0f0f13] text-[10px] font-bold text-white flex items-center justify-center rounded-full z-20 shadow-md">
                3
              </span>
            </div>
            <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-white transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.8)] ${activeTab === 'Alerts' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
          </button>

          {/* 5. Profile */}
          <button 
            onClick={() => setActiveTab('Profile')}
            className={`relative flex flex-col items-center justify-center w-[52px] h-[52px] rounded-full transition-all duration-500 ease-out`}
          >
            {activeTab === 'Profile' && (
              <div className="absolute inset-0 bg-white/10 rounded-full blur-md" />
            )}
            <div className={`relative rounded-full p-[2px] transition-all duration-300 z-10 ${activeTab === 'Profile' ? 'bg-gradient-to-tr from-rose-500 to-indigo-500 scale-110' : 'bg-transparent grayscale-[50%] hover:grayscale-0'}`}>
              <img 
                src="https://i.pravatar.cc/100?img=13" 
                alt="Profile" 
                className={`w-7 h-7 rounded-full object-cover border-[1.5px] transition-colors duration-300 ${activeTab === 'Profile' ? 'border-[#0f0f13]' : 'border-transparent'}`}
              />
            </div>
            <div className={`absolute -bottom-1 w-1 h-1 rounded-full bg-white transition-all duration-300 shadow-[0_0_8px_rgba(255,255,255,0.8)] ${activeTab === 'Profile' ? 'opacity-100 scale-100' : 'opacity-0 scale-50'}`} />
          </button>
        </nav>
      </div>
    </div>
  );
}
