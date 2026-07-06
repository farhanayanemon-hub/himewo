import React from 'react';
import { PenSquare, LayoutGrid, Search, MessageSquare, Users, Bell, Menu, Check, CheckCheck } from 'lucide-react';
import './_chat_editorial.css';

const activeFriends = [
  { id: 1, name: 'Eleanor', avatar: 'https://i.pravatar.cc/100?img=1' },
  { id: 2, name: 'Arthur', avatar: 'https://i.pravatar.cc/100?img=11' },
  { id: 3, name: 'Beatrice', avatar: 'https://i.pravatar.cc/100?img=5' },
  { id: 4, name: 'Julian', avatar: 'https://i.pravatar.cc/100?img=8' },
  { id: 5, name: 'Clara', avatar: 'https://i.pravatar.cc/100?img=9' },
  { id: 6, name: 'Theodore', avatar: 'https://i.pravatar.cc/100?img=12' },
];

const conversations = [
  {
    id: 1,
    name: 'Eleanor Vance',
    avatar: 'https://i.pravatar.cc/100?img=1',
    message: 'The exhibition opens at six this evening. Shall we meet at the gallery?',
    time: '12:42 PM',
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: 'Arthur Pendelton',
    avatar: 'https://i.pravatar.cc/100?img=11',
    message: 'You: The manuscript revisions look excellent. Sent them over.',
    time: '10:15 AM',
    unread: 0,
    online: true,
  },
  {
    id: 3,
    name: 'Studio Architects',
    avatar: 'https://i.pravatar.cc/100?img=3',
    message: 'Beatrice: I prefer the matte finish for the lounge space.',
    time: 'Yesterday',
    unread: 5,
    online: false,
  },
  {
    id: 4,
    name: 'Julian Sterling',
    avatar: 'https://i.pravatar.cc/100?img=8',
    message: 'Could you forward the itinerary when you have a moment?',
    time: 'Yesterday',
    unread: 0,
    online: false,
  },
  {
    id: 5,
    name: 'Clara Kensington',
    avatar: 'https://i.pravatar.cc/100?img=9',
    message: 'You: It was a pleasure catching up. Let\'s do it again soon.',
    time: 'Tuesday',
    unread: 0,
    online: false,
  },
  {
    id: 6,
    name: 'Theodore Finch',
    avatar: 'https://i.pravatar.cc/100?img=12',
    message: 'I have secured the reservations for Friday.',
    time: 'Monday',
    unread: 0,
    online: false,
  },
  {
    id: 7,
    name: 'Book Club',
    avatar: 'https://i.pravatar.cc/100?img=20',
    message: 'Alice: Chapter four fundamentally shifts the perspective.',
    time: 'Sunday',
    unread: 0,
    online: false,
  },
];

export function Editorial() {
  return (
    <div className="chat-editorial flex justify-center items-center min-h-screen bg-[#E5E5E5] p-4">
      {/* Phone Wrapper */}
      <div className="relative w-[390px] h-[844px] bg-[var(--bg-paper)] overflow-hidden shadow-2xl ring-1 ring-black/5 flex flex-col">
        
        {/* Header */}
        <header className="px-5 pt-12 pb-4 flex items-center justify-between border-b border-[var(--border-hairline)] bg-[var(--bg-paper)] z-10 relative">
          <div className="flex items-center gap-3">
            <div className="relative">
              <img src="https://i.pravatar.cc/100?img=32" alt="My avatar" className="w-9 h-9 rounded-full object-cover" />
            </div>
            <h1 className="font-serif text-xl font-medium tracking-tight text-[var(--text-ink)]">
              himewo chat
            </h1>
          </div>
          <div className="flex items-center gap-4 text-[var(--text-ink)]">
            <button className="focus:outline-none">
              <PenSquare className="w-5 h-5 stroke-[1.5px]" />
            </button>
            <button className="focus:outline-none">
              <LayoutGrid className="w-5 h-5 stroke-[1.5px]" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto pb-24">
          
          {/* Search */}
          <div className="px-5 py-4">
            <div className="relative flex items-center w-full h-10 bg-[var(--surface-alt)] rounded-full border border-[var(--border-hairline)] px-4">
              <Search className="w-4 h-4 text-[var(--text-muted)] stroke-[1.5px]" />
              <input 
                type="text" 
                placeholder="Search chats" 
                className="bg-transparent border-none outline-none w-full pl-3 text-sm text-[var(--text-ink)] placeholder:text-[var(--text-muted)] font-sans"
              />
            </div>
          </div>

          {/* Active / Stories */}
          <div className="px-5 py-2 border-b border-[var(--border-hairline)]">
            <div className="flex gap-5 overflow-x-auto no-scrollbar pb-2">
              <div className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer">
                <div className="w-14 h-14 rounded-full border border-[var(--border-hairline)] border-dashed flex items-center justify-center bg-[var(--bg-paper)] text-[var(--text-muted)] relative">
                  <div className="text-xl font-light mb-1">+</div>
                </div>
                <span className="text-[11px] text-[var(--text-muted)]">Your Story</span>
              </div>
              
              {activeFriends.map((friend) => (
                <div key={friend.id} className="flex flex-col items-center gap-2 flex-shrink-0 cursor-pointer">
                  <div className="relative">
                    <img src={friend.avatar} alt={friend.name} className="w-14 h-14 rounded-full object-cover border border-[var(--border-hairline)]" />
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[var(--accent-green)] border-2 border-[var(--bg-paper)] rounded-full"></div>
                  </div>
                  <span className="text-[11px] text-[var(--text-ink)]">{friend.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Conversations */}
          <div className="flex flex-col">
            {conversations.map((chat) => (
              <div key={chat.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--surface-alt)] cursor-pointer transition-colors border-b border-[var(--border-hairline)]">
                <div className="relative flex-shrink-0">
                  <img src={chat.avatar} alt={chat.name} className="w-12 h-12 rounded-full object-cover border border-[var(--border-hairline)]" />
                  {chat.online && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-[var(--accent-green)] border-2 border-[var(--bg-paper)] rounded-full"></div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`font-serif text-base truncate ${chat.unread ? 'font-semibold text-[var(--text-ink)]' : 'font-normal text-[var(--text-ink)]'}`}>
                      {chat.name}
                    </h3>
                    <span className={`text-xs ml-2 flex-shrink-0 ${chat.unread ? 'text-[var(--accent-teal)] font-medium' : 'text-[var(--text-muted)]'}`}>
                      {chat.time}
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center gap-2">
                    <p className={`text-sm truncate ${chat.unread ? 'text-[var(--text-ink)] font-medium' : 'text-[var(--text-muted)]'}`}>
                      {chat.message}
                    </p>
                    {chat.unread > 0 ? (
                      <div className="w-5 h-5 rounded-full bg-[var(--accent-teal)] text-white text-[10px] font-medium flex items-center justify-center flex-shrink-0">
                        {chat.unread}
                      </div>
                    ) : chat.message.startsWith('You:') ? (
                      <CheckCheck className="w-4 h-4 text-[var(--text-muted)] stroke-[1.5px] flex-shrink-0" />
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </main>

        {/* Bottom Tab Bar */}
        <nav className="absolute bottom-0 w-full bg-[var(--bg-paper)] border-t border-[var(--border-hairline)] pb-8 pt-3 px-6 flex justify-between items-center z-20">
          <div className="flex flex-col items-center gap-1.5 cursor-pointer text-[var(--accent-teal)]">
            <MessageSquare className="w-6 h-6 stroke-[1.5px] fill-[var(--accent-teal)]/10" />
            <span className="text-[10px] font-medium tracking-wide">Chats</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-ink)] transition-colors">
            <Users className="w-6 h-6 stroke-[1.5px]" />
            <span className="text-[10px] font-medium tracking-wide">People</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-ink)] transition-colors relative">
            <div className="relative">
              <Bell className="w-6 h-6 stroke-[1.5px]" />
              <div className="absolute top-0 right-0 w-2 h-2 bg-[var(--accent-red)] rounded-full border border-[var(--bg-paper)]"></div>
            </div>
            <span className="text-[10px] font-medium tracking-wide">Alerts</span>
          </div>
          
          <div className="flex flex-col items-center gap-1.5 cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-ink)] transition-colors">
            <Menu className="w-6 h-6 stroke-[1.5px]" />
            <span className="text-[10px] font-medium tracking-wide">Menu</span>
          </div>
        </nav>

      </div>
    </div>
  );
}
