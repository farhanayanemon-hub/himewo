import React, { useState } from 'react';
import { MessageCircle, Users, PenSquare, Bell, Menu } from 'lucide-react';

export const SolidDock = () => {
  const [activeTab, setActiveTab] = useState('Chats');

  return (
    <div className="relative w-full h-[100dvh] min-h-[800px] max-w-[400px] mx-auto bg-slate-50 flex flex-col overflow-hidden sm:border-x sm:border-slate-200 sm:shadow-2xl font-sans text-slate-900">
      {/* App Header */}
      <header className="px-5 py-4 bg-white/90 backdrop-blur-md sticky top-0 z-10 flex items-center justify-between border-b border-slate-200/60 shadow-sm">
        <h1 className="text-[22px] font-black text-[#0055FF] tracking-tight">Chats</h1>
        <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors shadow-sm">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-700">
             <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
          </svg>
        </div>
      </header>

      {/* Chat List Content */}
      <div className="flex-1 overflow-y-auto pb-32 hide-scrollbar bg-white">
        {[
          { name: "Sarah Jenkins", msg: "Are we still on for tomorrow?", time: "12:34 PM", unread: 2, avatar: 32 },
          { name: "Design Team", msg: "I've uploaded the new assets.", time: "11:15 AM", unread: 0, avatar: 45 },
          { name: "Michael Chen", msg: "Sounds good, thanks!", time: "9:42 AM", unread: 0, avatar: 68 },
          { name: "Emma Watson", msg: "Can you send me that link?", time: "Yesterday", unread: 0, avatar: 21 },
          { name: "Dev Sync", msg: "API is deployed to staging now.", time: "Yesterday", unread: 5, avatar: 12 },
          { name: "Mom", msg: "Call me when you're free", time: "Monday", unread: 0, avatar: 54 },
          { name: "Alex Mercer", msg: "Haha yeah exactly 😂", time: "Sunday", unread: 0, avatar: 33 },
          { name: "Project Alpha", msg: "Meeting notes from yesterday attached.", time: "Sunday", unread: 0, avatar: 41 },
        ].map((chat, idx) => (
          <div key={idx} className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer">
            <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0 shadow-sm">
               <img src={`https://i.pravatar.cc/150?img=${chat.avatar}`} alt={chat.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1.5">
                <h3 className={`font-bold truncate ${chat.unread > 0 ? 'text-slate-900' : 'text-slate-800'}`}>{chat.name}</h3>
                <span className={`text-[11px] font-medium whitespace-nowrap ml-2 ${chat.unread > 0 ? 'text-[#0055FF]' : 'text-slate-400'}`}>{chat.time}</span>
              </div>
              <p className={`text-[13px] truncate ${chat.unread > 0 ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>{chat.msg}</p>
            </div>
            {chat.unread > 0 && (
              <div className="w-5 h-5 rounded-full bg-[#0055FF] flex items-center justify-center shrink-0 shadow-sm shadow-[#0055FF]/20">
                <span className="text-[10px] font-bold text-white leading-none">{chat.unread}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom Nav Area */}
      <div className="absolute bottom-0 w-full z-50 pointer-events-none flex flex-col">
        {/* Main Dock */}
        <div className="relative pointer-events-auto bg-white border-t border-slate-200/80 shadow-[0_-12px_40px_rgba(0,0,0,0.06)] h-[64px] flex items-end justify-between px-2 pb-[10px]">
          
          {/* 1. Chats (Active) */}
          <button 
            onClick={() => setActiveTab('Chats')}
            className="flex-1 flex flex-col items-center justify-end group relative h-full"
          >
            <div className={`mb-1 relative flex flex-col items-center transform transition-all duration-200 active:scale-95 ${activeTab === 'Chats' ? '-translate-y-1' : ''}`}>
              <MessageCircle className={`w-[26px] h-[26px] transition-colors duration-200 ${activeTab === 'Chats' ? 'text-[#0055FF] stroke-[2.5px] fill-[#0055FF]/10' : 'text-slate-400 stroke-[2.5px] group-hover:text-slate-600'}`} />
              {activeTab === 'Chats' && (
                <div className="absolute -bottom-3 w-1.5 h-1.5 rounded-full bg-[#0055FF]" />
              )}
            </div>
            <span className={`text-[10px] tracking-wide leading-none transition-colors duration-200 ${activeTab === 'Chats' ? 'font-bold text-[#0055FF]' : 'font-semibold text-slate-400 group-hover:text-slate-600'}`}>Chats</span>
          </button>

          {/* 2. People */}
          <button 
            onClick={() => setActiveTab('People')}
            className="flex-1 flex flex-col items-center justify-end group relative h-full"
          >
            <div className={`mb-1 relative flex flex-col items-center transform transition-all duration-200 active:scale-95 ${activeTab === 'People' ? '-translate-y-1' : ''}`}>
              <Users className={`w-[26px] h-[26px] transition-colors duration-200 ${activeTab === 'People' ? 'text-[#0055FF] stroke-[2.5px] fill-[#0055FF]/10' : 'text-slate-400 stroke-[2.5px] group-hover:text-slate-600'}`} />
              {activeTab === 'People' && (
                <div className="absolute -bottom-3 w-1.5 h-1.5 rounded-full bg-[#0055FF]" />
              )}
            </div>
            <span className={`text-[10px] tracking-wide leading-none transition-colors duration-200 ${activeTab === 'People' ? 'font-bold text-[#0055FF]' : 'font-semibold text-slate-400 group-hover:text-slate-600'}`}>People</span>
          </button>

          {/* 3. Compose (Raised Center) */}
          <div 
            onClick={() => setActiveTab('Compose')}
            className="flex-1 flex flex-col items-center justify-end group relative h-full pointer-events-auto cursor-pointer"
          >
            {/* The Raised Button */}
            <div className="absolute bottom-[24px] w-[58px] h-[58px] rounded-[20px] bg-gradient-to-tr from-[#0055FF] to-[#3377FF] shadow-[0_12px_28px_-6px_rgba(0,85,255,0.7),inset_0_2px_4px_rgba(255,255,255,0.3)] flex items-center justify-center text-white transform transition-all duration-300 hover:-translate-y-1 active:scale-95 active:translate-y-0 z-20">
              <PenSquare className="w-[28px] h-[28px] stroke-[2.5px] fill-white/10" />
            </div>
            {/* Cutout/glow effect under button */}
            <div className="absolute bottom-[24px] w-[58px] h-[58px] rounded-[20px] bg-[#0055FF]/20 blur-xl z-10 pointer-events-none"></div>
            
            {activeTab === 'Compose' && (
              <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-[#0055FF]" />
            )}
            <span className={`text-[10px] tracking-wide leading-none transition-colors duration-200 ${activeTab === 'Compose' ? 'font-bold text-[#0055FF]' : 'font-semibold text-slate-400 group-hover:text-slate-600'}`}>New</span>
          </div>

          {/* 4. Notifications */}
          <button 
            onClick={() => setActiveTab('Notifications')}
            className="flex-1 flex flex-col items-center justify-end group relative h-full"
          >
            <div className={`mb-1 relative flex flex-col items-center transform transition-all duration-200 active:scale-95 ${activeTab === 'Notifications' ? '-translate-y-1' : ''}`}>
              <div className="relative">
                <Bell className={`w-[26px] h-[26px] transition-colors duration-200 ${activeTab === 'Notifications' ? 'text-[#0055FF] stroke-[2.5px] fill-[#0055FF]/10' : 'text-slate-400 stroke-[2.5px] group-hover:text-slate-600'}`} />
                <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] px-1 items-center justify-center rounded-full bg-rose-500 text-[10px] font-black text-white border-2 border-white shadow-sm ring-1 ring-black/5">
                  5
                </span>
              </div>
              {activeTab === 'Notifications' && (
                <div className="absolute -bottom-3 w-1.5 h-1.5 rounded-full bg-[#0055FF]" />
              )}
            </div>
            <span className={`text-[10px] tracking-wide leading-none transition-colors duration-200 ${activeTab === 'Notifications' ? 'font-bold text-[#0055FF]' : 'font-semibold text-slate-400 group-hover:text-slate-600'}`}>Notifications</span>
          </button>

          {/* 5. Menu */}
          <button 
            onClick={() => setActiveTab('Menu')}
            className="flex-1 flex flex-col items-center justify-end group relative h-full"
          >
            <div className={`mb-1 relative flex flex-col items-center transform transition-all duration-200 active:scale-95 ${activeTab === 'Menu' ? '-translate-y-1' : ''}`}>
              <Menu className={`w-[26px] h-[26px] transition-colors duration-200 ${activeTab === 'Menu' ? 'text-[#0055FF] stroke-[2.5px] fill-[#0055FF]/10' : 'text-slate-400 stroke-[2.5px] group-hover:text-slate-600'}`} />
              {activeTab === 'Menu' && (
                <div className="absolute -bottom-3 w-1.5 h-1.5 rounded-full bg-[#0055FF]" />
              )}
            </div>
            <span className={`text-[10px] tracking-wide leading-none transition-colors duration-200 ${activeTab === 'Menu' ? 'font-bold text-[#0055FF]' : 'font-semibold text-slate-400 group-hover:text-slate-600'}`}>Menu</span>
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
