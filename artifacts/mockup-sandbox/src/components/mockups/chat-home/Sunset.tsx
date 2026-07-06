import React from "react";
import { Search, Edit3, Grid, MessageCircle, Users, Bell, Menu, Check, CheckCheck } from "lucide-react";
import "./sunset.css";

export function Sunset() {
  const activeFriends = [
    { id: 1, name: "Your Story", img: "https://i.pravatar.cc/100?img=12", isYou: true },
    { id: 2, name: "Sarah", img: "https://i.pravatar.cc/100?img=5", online: true, story: true },
    { id: 3, name: "Mike", img: "https://i.pravatar.cc/100?img=11", online: true, story: true },
    { id: 4, name: "Emma", img: "https://i.pravatar.cc/100?img=9", online: true, story: false },
    { id: 5, name: "Alex", img: "https://i.pravatar.cc/100?img=14", online: true, story: true },
    { id: 6, name: "Chloe", img: "https://i.pravatar.cc/100?img=20", online: true, story: false },
    { id: 7, name: "Jason", img: "https://i.pravatar.cc/100?img=33", online: true, story: true },
  ];

  const conversations = [
    {
      id: 1,
      name: "Sarah Jenkins",
      img: "https://i.pravatar.cc/100?img=5",
      snippet: "Omg you have to see this! 😱",
      time: "12:45 PM",
      unread: 2,
      online: true,
    },
    {
      id: 2,
      name: "Design Team",
      img: "https://i.pravatar.cc/100?img=24",
      snippet: "Mike: Let's use the warm orange palette for this...",
      time: "11:30 AM",
      unread: 5,
      online: false,
    },
    {
      id: 3,
      name: "Alex Rivera",
      img: "https://i.pravatar.cc/100?img=14",
      snippet: "Sounds good, see ya then bro 👊",
      time: "Yesterday",
      unread: 0,
      isYou: true,
      readStatus: 'read',
      online: true,
    },
    {
      id: 4,
      name: "Emma Watson",
      img: "https://i.pravatar.cc/100?img=9",
      snippet: "Are we still on for coffee later?",
      time: "Yesterday",
      unread: 0,
      online: true,
    },
    {
      id: 5,
      name: "Jason Chen",
      img: "https://i.pravatar.cc/100?img=33",
      snippet: "Sent an attachment",
      time: "Tuesday",
      unread: 0,
      isYou: true,
      readStatus: 'delivered',
      online: false,
    },
    {
      id: 6,
      name: "Mom ❤️",
      img: "https://i.pravatar.cc/100?img=47",
      snippet: "Call me when you're free honey",
      time: "Monday",
      unread: 0,
      online: false,
    },
    {
      id: 7,
      name: "David Smith",
      img: "https://i.pravatar.cc/100?img=59",
      snippet: "haha yeah exactly",
      time: "Sunday",
      unread: 0,
      isYou: true,
      readStatus: 'read',
      online: false,
    },
  ];

  return (
    <div className="w-full min-h-[100dvh] bg-[#FFF8F5] text-[#3D1D0A] font-jakarta overflow-hidden relative">
      <link
        href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* HEADER */}
      <header className="px-5 pt-12 pb-4 flex items-center justify-between bg-gradient-to-b from-[#FFF0E8] to-[#FFF8F5]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img
              src="https://i.pravatar.cc/100?img=12"
              alt="You"
              className="w-10 h-10 rounded-full border-2 border-white shadow-sm object-cover"
            />
          </div>
          <h1 className="text-xl font-extrabold tracking-tight flex items-center">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF7A1A] to-[#FF3B7A]">
              himewo
            </span>
            <span className="ml-1 text-[#3D1D0A]">chat</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 rounded-full bg-white shadow-sm border border-[#FFE8E0] flex items-center justify-center text-[#FF7A1A] hover:bg-[#FFE8E0] transition-colors">
            <Grid className="w-5 h-5" />
          </button>
          <button className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#FF7A1A] to-[#FF3B7A] shadow-md flex items-center justify-center text-white hover:opacity-90 transition-opacity">
            <Edit3 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* SEARCH */}
      <div className="px-5 mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-[#FF7A1A]/60" />
          </div>
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full bg-white text-[#3D1D0A] placeholder-[#8A5C43]/60 rounded-3xl py-3.5 pl-11 pr-4 shadow-sm border border-[#FFE8E0] focus:outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 transition-shadow text-base font-medium"
          />
        </div>
      </div>

      {/* ACTIVE / STORIES ROW */}
      <div className="mb-6">
        <div className="flex gap-4 overflow-x-auto hide-scrollbar px-5 pb-2">
          {activeFriends.map((friend) => (
            <div key={friend.id} className="flex flex-col items-center gap-2 flex-shrink-0">
              <div className="relative">
                {friend.story ? (
                  <div className="p-[3px] rounded-full bg-gradient-to-tr from-[#FF7A1A] via-[#FF3B7A] to-[#FFB703]">
                    <div className="p-[2px] bg-[#FFF8F5] rounded-full">
                      <img
                        src={friend.img}
                        alt={friend.name}
                        className="w-14 h-14 rounded-full object-cover border border-[#FFF8F5]"
                      />
                    </div>
                  </div>
                ) : (
                  <img
                    src={friend.img}
                    alt={friend.name}
                    className="w-[60px] h-[60px] rounded-full object-cover border-2 border-white shadow-sm"
                  />
                )}
                {friend.isYou && (
                  <div className="absolute bottom-0 right-0 w-5 h-5 bg-[#FF7A1A] rounded-full border-2 border-[#FFF8F5] flex items-center justify-center shadow-sm">
                    <div className="w-2.5 h-2.5 bg-white rounded-full flex items-center justify-center">
                      <div className="w-0.5 h-2.5 bg-[#FF7A1A] rounded-full absolute" />
                      <div className="w-2.5 h-0.5 bg-[#FF7A1A] rounded-full absolute" />
                    </div>
                  </div>
                )}
                {friend.online && !friend.isYou && (
                  <div className="absolute bottom-0 right-0 w-[18px] h-[18px] bg-[#22C55E] rounded-full border-2 border-[#FFF8F5] shadow-sm" />
                )}
              </div>
              <span className="text-[13px] font-semibold text-[#8A5C43]">
                {friend.isYou ? "Add Story" : friend.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* CONVERSATIONS LIST */}
      <div className="px-3 pb-24">
        {conversations.map((chat) => (
          <div
            key={chat.id}
            className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/60 transition-colors mb-1 active:scale-[0.98]"
          >
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <img
                src={chat.img}
                alt={chat.name}
                className="w-14 h-14 rounded-full object-cover shadow-sm"
              />
              {chat.online && (
                <div className="absolute bottom-0 right-0 w-4 h-4 bg-[#22C55E] rounded-full border-2 border-[#FFF8F5]" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline mb-1">
                <h3 className={`text-base truncate ${chat.unread > 0 ? "font-bold text-[#3D1D0A]" : "font-semibold text-[#3D1D0A]/90"}`}>
                  {chat.name}
                </h3>
                <span className={`text-xs whitespace-nowrap ml-2 ${chat.unread > 0 ? "font-bold text-[#FF3B7A]" : "font-medium text-[#8A5C43]/70"}`}>
                  {chat.time}
                </span>
              </div>
              <div className="flex items-center gap-1.5 pr-2">
                {chat.isYou && (
                  <span className="text-[#8A5C43]/70">
                    {chat.readStatus === 'read' ? <CheckCheck className="w-4 h-4 text-[#FF7A1A]" /> : <Check className="w-4 h-4" />}
                  </span>
                )}
                <p className={`text-sm truncate ${chat.unread > 0 ? "font-semibold text-[#3D1D0A]/90" : "font-medium text-[#8A5C43]"}`}>
                  {chat.isYou ? "You: " : ""}{chat.snippet}
                </p>
              </div>
            </div>

            {/* Unread Badge */}
            {chat.unread > 0 && (
              <div className="w-[22px] h-[22px] rounded-full bg-gradient-to-tr from-[#FF7A1A] to-[#FF3B7A] shadow-md flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[11px] font-bold">
                  {chat.unread}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* BOTTOM TAB BAR */}
      <div className="fixed bottom-0 w-full bg-white/90 backdrop-blur-xl border-t border-[#FFE8E0] pb-safe pt-2 px-6 shadow-[0_-4px_20px_rgba(255,122,26,0.05)]">
        <div className="flex justify-between items-center pb-4 pt-1 max-w-md mx-auto">
          <button className="flex flex-col items-center gap-1.5 relative group">
            <div className="relative">
              <MessageCircle className="w-7 h-7 text-[#FF7A1A] fill-[#FF7A1A]/10 transition-transform group-active:scale-95" />
              <div className="absolute -top-1 -right-1 w-[18px] h-[18px] bg-[#FF3B7A] rounded-full border-2 border-white flex items-center justify-center shadow-sm">
                <span className="text-white text-[10px] font-bold">7</span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-[#FF7A1A]">Chats</span>
          </button>
          
          <button className="flex flex-col items-center gap-1.5 group">
            <Users className="w-7 h-7 text-[#8A5C43]/50 group-active:scale-95 transition-transform" />
            <span className="text-[11px] font-semibold text-[#8A5C43]/70">People</span>
          </button>

          <button className="flex flex-col items-center gap-1.5 group relative">
            <Bell className="w-7 h-7 text-[#8A5C43]/50 group-active:scale-95 transition-transform" />
            <span className="text-[11px] font-semibold text-[#8A5C43]/70">Alerts</span>
          </button>

          <button className="flex flex-col items-center gap-1.5 group">
            <Menu className="w-7 h-7 text-[#8A5C43]/50 group-active:scale-95 transition-transform" />
            <span className="text-[11px] font-semibold text-[#8A5C43]/70">Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
}
