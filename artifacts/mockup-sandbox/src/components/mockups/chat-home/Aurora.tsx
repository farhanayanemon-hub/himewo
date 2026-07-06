import React from "react";
import { Search, Edit, LayoutGrid, MessageCircle, Users, Bell, Menu } from "lucide-react";
import "./aurora.css";

const STORIES = [
  { id: 1, name: "Your Story", avatar: "https://i.pravatar.cc/100?img=12", online: false, isMe: true },
  { id: 2, name: "Sarah", avatar: "https://i.pravatar.cc/100?img=5", online: true },
  { id: 3, name: "Mike", avatar: "https://i.pravatar.cc/100?img=11", online: true },
  { id: 4, name: "Emma", avatar: "https://i.pravatar.cc/100?img=9", online: true },
  { id: 5, name: "Alex", avatar: "https://i.pravatar.cc/100?img=33", online: false },
  { id: 6, name: "Jessica", avatar: "https://i.pravatar.cc/100?img=47", online: true },
];

const CONVERSATIONS = [
  {
    id: 1,
    name: "Design Team",
    avatar: "https://i.pravatar.cc/100?img=20",
    message: "Sarah: Let's review the new prototype",
    time: "2m",
    unread: 3,
    online: false,
  },
  {
    id: 2,
    name: "Mike Johnson",
    avatar: "https://i.pravatar.cc/100?img=11",
    message: "Are we still on for lunch?",
    time: "1h",
    unread: 1,
    online: true,
  },
  {
    id: 3,
    name: "Emma Wilson",
    avatar: "https://i.pravatar.cc/100?img=9",
    message: "You: Sounds great, thanks! ✨",
    time: "2h",
    unread: 0,
    online: true,
  },
  {
    id: 4,
    name: "Product Updates",
    avatar: "https://i.pravatar.cc/100?img=41",
    message: "New feature rollout starting tomorrow",
    time: "5h",
    unread: 0,
    online: false,
  },
  {
    id: 5,
    name: "Jessica Chen",
    avatar: "https://i.pravatar.cc/100?img=47",
    message: "Can you send me the latest files?",
    time: "Yesterday",
    unread: 0,
    online: true,
  },
  {
    id: 6,
    name: "Alex Thompson",
    avatar: "https://i.pravatar.cc/100?img=33",
    message: "You: I'll take a look.",
    time: "Mon",
    unread: 0,
    online: false,
  },
  {
    id: 7,
    name: "David Miller",
    avatar: "https://i.pravatar.cc/100?img=60",
    message: "Looks good to me 👍",
    time: "Sun",
    unread: 0,
    online: false,
  },
];

export function Aurora() {
  return (
    <div className="flex justify-center items-center min-h-screen bg-black/90 p-4">
      {/* Mobile Device Wrapper */}
      <div className="w-[390px] h-[844px] aurora-chat-bg relative overflow-hidden rounded-[40px] border-[6px] border-black/80 shadow-[0_0_50px_rgba(167,139,250,0.15)] flex flex-col">
        
        {/* Header */}
        <div className="pt-12 pb-4 px-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src="https://i.pravatar.cc/100?img=12" alt="Me" className="w-10 h-10 rounded-full border border-white/20 object-cover" />
              <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full aurora-online-dot"></div>
            </div>
            <h1 className="text-xl font-bold tracking-tight aurora-text-gradient">himewo chat</h1>
          </div>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full aurora-glass-card flex items-center justify-center text-white/80 hover:text-white transition-colors">
              <Edit className="w-5 h-5" />
            </button>
            <button className="w-10 h-10 rounded-full aurora-glass-card flex items-center justify-center text-white/80 hover:text-white transition-colors">
              <LayoutGrid className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-5 mb-5 z-10">
          <div className="h-11 rounded-full aurora-glass-card flex items-center px-4 gap-3">
            <Search className="w-5 h-5 text-white/40" />
            <input 
              type="text" 
              placeholder="Search chats" 
              className="bg-transparent border-none outline-none text-white/90 placeholder:text-white/40 w-full text-[15px]"
              readOnly
            />
          </div>
        </div>

        {/* Stories/Active */}
        <div className="mb-2 z-10">
          <div className="flex gap-4 overflow-x-auto no-scrollbar px-5 pb-4">
            {STORIES.map((story) => (
              <div key={story.id} className="flex flex-col items-center gap-1.5 min-w-[64px]">
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full p-[2px] ${story.isMe ? 'aurora-glass-card border border-white/10' : 'bg-gradient-to-tr from-violet-400 to-sky-400'}`}>
                    <img 
                      src={story.avatar} 
                      alt={story.name} 
                      className="w-full h-full rounded-full object-cover border-2 border-[#090812]" 
                    />
                  </div>
                  {story.online && (
                    <div className="absolute bottom-0 right-0 w-[14px] h-[14px] rounded-full aurora-online-dot"></div>
                  )}
                  {story.isMe && (
                    <div className="absolute bottom-0 right-0 w-[18px] h-[18px] rounded-full aurora-bg-gradient flex items-center justify-center border-2 border-[#090812]">
                      <div className="w-2 h-0.5 bg-white rounded-full relative">
                        <div className="w-2 h-0.5 bg-white rounded-full absolute rotate-90"></div>
                      </div>
                    </div>
                  )}
                </div>
                <span className="text-xs text-white/70 font-medium truncate w-full text-center">
                  {story.name}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Chat List */}
        <div className="flex-1 overflow-y-auto no-scrollbar pb-[90px] rounded-t-[32px] aurora-glass border-t border-white/10 mt-1 relative z-10">
          <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mt-3 mb-2"></div>
          
          <div className="px-3 flex flex-col gap-1 pt-2">
            {CONVERSATIONS.map((chat) => (
              <div key={chat.id} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/5 transition-colors cursor-pointer relative overflow-hidden group">
                <div className="relative flex-shrink-0">
                  <img src={chat.avatar} alt={chat.name} className="w-14 h-14 rounded-2xl object-cover border border-white/10 shadow-sm" />
                  {chat.online && (
                    <div className="absolute -bottom-1 -right-1 w-[14px] h-[14px] rounded-full aurora-online-dot"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className={`font-semibold truncate text-[16px] ${chat.unread > 0 ? 'text-white' : 'text-white/90'}`}>
                      {chat.name}
                    </h3>
                    <span className={`text-[12px] ${chat.unread > 0 ? 'text-blue-300 font-medium' : 'text-white/40'}`}>
                      {chat.time}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`truncate text-[14px] pr-2 ${chat.unread > 0 ? 'text-white/90 font-medium' : 'text-white/50'}`}>
                      {chat.message}
                    </p>
                    {chat.unread > 0 && (
                      <div className="aurora-bg-gradient min-w-[20px] h-5 rounded-full flex items-center justify-center px-1.5 text-[11px] font-bold text-white shadow-[0_0_10px_rgba(167,139,250,0.5)] flex-shrink-0">
                        {chat.unread}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Tab Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-[88px] aurora-glass border-t border-white/10 z-20 px-6 pb-6 pt-3 flex justify-between items-center">
          <button className="flex flex-col items-center gap-1">
            <div className="relative">
              <MessageCircle className="w-6 h-6 text-white" />
              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 border-2 border-[#1a1532] text-[9px] font-bold flex items-center justify-center text-white">4</div>
            </div>
            <span className="text-[10px] font-semibold text-white">Chats</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
            <Users className="w-6 h-6" />
            <span className="text-[10px] font-medium">People</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
            <Bell className="w-6 h-6" />
            <span className="text-[10px] font-medium">Alerts</span>
          </button>
          
          <button className="flex flex-col items-center gap-1 opacity-50 hover:opacity-100 transition-opacity">
            <Menu className="w-6 h-6" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
