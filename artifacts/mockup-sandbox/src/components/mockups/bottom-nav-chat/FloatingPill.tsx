import React, { useState } from 'react';
import { MessageCircle, Users, PenSquare, Bell, Menu, Search, Zap, Check, CheckCheck } from 'lucide-react';

const chatData = [
  {
    id: 1,
    name: "Alex Rivera",
    time: "2m ago",
    message: "Just built the slickest bottom navigation bar. Floating pills are definitely the future of mobile UI! 🚀",
    unread: 2,
    avatar: "https://i.pravatar.cc/100?img=11",
    status: "received"
  },
  {
    id: 2,
    name: "Sam Chen",
    time: "1h ago",
    message: "Sunday morning explorations. Finding new ways to make interfaces feel more alive and playful. ✨",
    unread: 0,
    avatar: "https://i.pravatar.cc/100?img=12",
    status: "read"
  },
  {
    id: 3,
    name: "Design Team",
    time: "3h ago",
    message: "Can we review the new chat mockup by EOD?",
    unread: 5,
    avatar: "https://i.pravatar.cc/100?img=33",
    status: "received",
    isGroup: true
  },
  {
    id: 4,
    name: "Mia Wong",
    time: "Yesterday",
    message: "Sounds like a plan! Let's catch up tomorrow.",
    unread: 0,
    avatar: "https://i.pravatar.cc/100?img=44",
    status: "read"
  },
  {
    id: 5,
    name: "David Kim",
    time: "Yesterday",
    message: "I sent you the assets via email.",
    unread: 0,
    avatar: "https://i.pravatar.cc/100?img=55",
    status: "delivered"
  },
  {
    id: 6,
    name: "Emma Stone",
    time: "Tuesday",
    message: "Haha that's hilarious 😂",
    unread: 0,
    avatar: "https://i.pravatar.cc/100?img=66",
    status: "read"
  }
];

function NavItem({ icon, label, isActive, badge, onClick }: any) {
  return (
    <button onClick={onClick} className="relative flex items-center justify-center group outline-none pointer-events-auto h-full">
      <div className={`flex items-center justify-center rounded-full transition-all duration-300 ${isActive ? 'bg-violet-100/80 text-violet-700 px-4 py-2.5 shadow-[0_2px_10px_rgba(139,92,246,0.15)] gap-1.5' : 'bg-transparent text-gray-400 p-2 group-hover:text-gray-600 group-hover:bg-gray-50'}`}>
        <div className={`transition-transform duration-300 ${isActive ? 'scale-100' : 'group-active:scale-90'}`}>
          {React.cloneElement(icon, { size: isActive ? 20 : 24, strokeWidth: 2.5 })}
        </div>
        
        {badge && !isActive && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white border-[1.5px] border-white shadow-sm pointer-events-none">
            {badge}
          </span>
        )}

        {isActive && (
          <span className="text-[14px] font-bold tracking-tight pr-1 whitespace-nowrap overflow-hidden">
            {label}
          </span>
        )}
      </div>
    </button>
  );
}

function ChatRow({ chat }: any) {
  return (
    <div className="flex items-center gap-3 p-3 mb-1 bg-white hover:bg-gray-50 rounded-2xl transition-colors cursor-pointer border border-transparent hover:border-gray-100 shadow-[0_2px_8px_transparent] hover:shadow-[0_2px_12px_rgb(0,0,0,0.03)] group">
      <div className="relative flex-shrink-0">
        <img src={chat.avatar} alt={chat.name} className="w-14 h-14 rounded-full object-cover shadow-sm ring-1 ring-gray-100" />
        {chat.unread > 0 && (
          <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <h3 className="font-bold text-gray-900 text-[16px] truncate group-hover:text-violet-600 transition-colors">{chat.name}</h3>
          <span className={`text-[12px] whitespace-nowrap ${chat.unread > 0 ? 'text-violet-600 font-semibold' : 'text-gray-400'}`}>{chat.time}</span>
        </div>
        <div className="flex items-center gap-1">
          {chat.unread === 0 && chat.status === 'read' && <CheckCheck size={14} className="text-blue-500 flex-shrink-0" />}
          {chat.unread === 0 && chat.status === 'delivered' && <CheckCheck size={14} className="text-gray-400 flex-shrink-0" />}
          <p className={`text-[14px] truncate ${chat.unread > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
            {chat.message}
          </p>
        </div>
      </div>
      {chat.unread > 0 && (
        <div className="flex-shrink-0 ml-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-violet-500 text-[12px] font-bold text-white shadow-sm">
            {chat.unread}
          </span>
        </div>
      )}
    </div>
  );
}

export default function FloatingPill() {
  const [activeTab, setActiveTab] = useState('Chats');

  return (
    <div className="relative w-full max-w-[420px] mx-auto bg-[#F8F9FA] min-h-[100dvh] shadow-2xl flex flex-col font-sans overflow-hidden border-x border-gray-100">
      
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-xl px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 z-20 border-b border-gray-100/50 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-sm">
            <MessageCircle size={20} className="text-white fill-white/20" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-br from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">Chats</h1>
        </div>
        <div className="flex gap-2">
          <button className="w-10 h-10 rounded-full bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors">
            <Search size={20} strokeWidth={2.5} />
          </button>
        </div>
      </header>
      
      {/* Chat List Content */}
      <main className="flex-1 overflow-y-auto pb-40 px-3 pt-4 space-y-1 relative z-0">
        {chatData.map(chat => (
          <ChatRow key={chat.id} chat={chat} />
        ))}
        {/* Extra spacing for bottom nav */}
        <div className="h-24"></div>
      </main>

      {/* Floating Bottom Nav Container */}
      <div className="absolute bottom-0 left-0 right-0 w-full px-5 pb-8 pt-12 z-50 pointer-events-none bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA]/90 to-transparent">
        
        {/* The Pill */}
        <div className="relative flex items-center justify-between w-full bg-white rounded-full shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] h-[72px] pointer-events-auto border border-gray-100/80">
          
          {/* Left Side */}
          <div className="flex flex-1 justify-around items-center h-full pl-2 pr-10">
            <NavItem icon={<MessageCircle />} label="Chats" isActive={activeTab === 'Chats'} onClick={() => setActiveTab('Chats')} />
            <NavItem icon={<Users />} label="People" isActive={activeTab === 'People'} onClick={() => setActiveTab('People')} />
          </div>
          
          {/* Raised Center Compose Button */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex items-center justify-center z-10 pointer-events-auto">
            {/* Glow effect under the button */}
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-full blur-[16px] opacity-40 top-8 scale-90 pointer-events-none"></div>
            
            <button className="relative z-10 w-[64px] h-[64px] rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 group border-[4px] border-white shadow-[0_8px_20px_rgba(168,85,247,0.3)]">
              <PenSquare size={26} strokeWidth={2.5} className="group-active:scale-90 transition-transform duration-300" />
            </button>
          </div>
          
          {/* Right Side */}
          <div className="flex flex-1 justify-around items-center h-full pr-2 pl-10">
            <NavItem icon={<Bell />} label="Notifications" badge="5" isActive={activeTab === 'Notifications'} onClick={() => setActiveTab('Notifications')} />
            <NavItem icon={<Menu />} label="Menu" isActive={activeTab === 'Menu'} onClick={() => setActiveTab('Menu')} />
          </div>

        </div>
      </div>
      
      {/* Home Indicator (iOS Safe Area) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-[4px] bg-black/20 rounded-full z-50 pointer-events-none"></div>
    </div>
  );
}
