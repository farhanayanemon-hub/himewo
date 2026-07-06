import React from 'react';
import './bento.css';
import { 
  Home, Users, PlaySquare, Component, 
  Bell, MessageCircle, Search,
  Image as ImageIcon, Smile, MapPin,
  Heart, MessageSquare, Share2, MoreHorizontal,
  BadgeCheck, Clock, Globe, Plus, Store, Bookmark
} from 'lucide-react';

const AVATAR_1 = 'https://i.pravatar.cc/100?img=47';
const AVATAR_2 = 'https://i.pravatar.cc/100?img=33';
const AVATAR_3 = 'https://i.pravatar.cc/100?img=12';
const AVATAR_4 = 'https://i.pravatar.cc/100?img=25';

function WebFeedPanel({ theme }: { theme: 'light' | 'dark' }) {
  return (
    <div className={`w-[1280px] h-[900px] overflow-hidden flex flex-col relative bento-theme-${theme} bg-[var(--bg-app)] text-[var(--text-main)]`}>
      {/* Label Pill */}
      <div className="absolute top-4 left-4 z-50 bg-[var(--text-main)] text-[var(--bg-app)] px-4 py-1 rounded-full font-bold text-sm tracking-widest font-display z-50">
        {theme.toUpperCase()}
      </div>

      {/* Navbar */}
      <nav className="h-20 px-8 flex items-center justify-between z-40 relative">
        <div className="flex items-center gap-6 w-1/4">
          <div className="font-display font-bold text-3xl tracking-tight flex items-center gap-1 pl-24">
            <span className="w-8 h-8 rounded-xl bg-[var(--tile-bg-lime)] border-2 border-[var(--text-main)] flex items-center justify-center text-[var(--text-main)] text-xl shadow-[2px_2px_0_var(--text-main)]">H</span>
            iMewo
          </div>
        </div>

        <div className="flex-1 max-w-xl">
          <div className="h-12 bg-[var(--tile-bg-white)] rounded-2xl flex items-center px-4 border border-[var(--border-color)] shadow-sm group hover:border-[var(--tile-bg-cyan)] transition-colors">
            <Search className="w-5 h-5 text-[var(--text-muted)]" />
            <input 
              type="text" 
              placeholder="Search anything..." 
              className="bg-transparent border-none outline-none w-full ml-3 text-[var(--text-main)] placeholder-[var(--text-muted)] font-medium"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 w-1/4">
          <button className="bento-nav-icon"><Bell className="w-6 h-6" /></button>
          <button className="bento-nav-icon"><MessageCircle className="w-6 h-6" /></button>
          <div className="w-12 h-12 rounded-[20px] overflow-hidden border-2 border-[var(--border-color)] ml-2">
            <img src={AVATAR_1} alt="User" className="w-full h-full object-cover" />
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden px-6 pb-6 gap-6">
        
        {/* LEFT COLUMN - Navigation */}
        <div className="w-64 flex flex-col gap-4 overflow-y-auto pt-4 pb-20 no-scrollbar">
          <div className="bento-tile bg-[var(--tile-bg-white)] p-3 flex flex-col gap-2">
            {[
              { icon: Home, label: "Home", color: "var(--tile-bg-lime)", active: true },
              { icon: Users, label: "Friends", color: "var(--tile-bg-cyan)" },
              { icon: Component, label: "Groups", color: "var(--tile-bg-violet)" },
              { icon: PlaySquare, label: "Reels", color: "var(--tile-bg-pink)" },
              { icon: Store, label: "Marketplace", color: "var(--tile-bg-yellow)" },
              { icon: Bookmark, label: "Saved", color: "var(--tile-bg-coral)" },
            ].map((item, i) => (
              <button key={i} className={`flex items-center gap-4 p-3 rounded-xl transition-all ${item.active ? 'bg-[var(--text-main)] text-[var(--bg-app)]' : 'hover:bg-[var(--border-color)] text-[var(--text-main)]'}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center`} style={{ backgroundColor: item.active ? 'var(--bg-app)' : item.color, color: item.active ? 'var(--text-main)' : (theme === 'light' ? '#fff' : '#fff') }}>
                  <item.icon className="w-5 h-5" style={{ color: item.active ? 'var(--text-main)' : '#1a1a1a' }} />
                </div>
                <span className="font-bold text-lg font-display">{item.label}</span>
              </button>
            ))}
          </div>

          <div className="bento-tile bg-[var(--tile-bg-cyan)] p-5 text-[#1a1a1a] relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/20 rounded-full blur-xl -mr-10 -mt-10"></div>
            <h3 className="font-display font-bold text-xl mb-2">Pro Dashboard</h3>
            <p className="font-medium text-sm mb-4 opacity-90">Track your engagement and reach.</p>
            <button className="bg-[#1a1a1a] text-white px-4 py-2 rounded-xl font-bold text-sm w-full transition-transform group-hover:scale-105">View Stats</button>
          </div>
        </div>

        {/* CENTER COLUMN - Feed */}
        <div className="flex-1 flex flex-col overflow-y-auto pt-4 pb-20 no-scrollbar gap-6 items-center">
          <div className="w-[600px] max-w-full flex flex-col gap-6">
            
            {/* Stories Row */}
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              <div className="min-w-[120px] h-[200px] bento-tile bg-[var(--tile-bg-white)] flex flex-col relative group cursor-pointer">
                <img src={AVATAR_1} className="w-full h-3/4 object-cover" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 bg-[var(--tile-bg-lime)] rounded-full flex items-center justify-center border-4 border-[var(--tile-bg-white)] group-hover:scale-110 transition-transform">
                  <Plus className="w-6 h-6 text-[#1a1a1a]" />
                </div>
                <div className="h-1/4 flex items-center justify-center font-bold font-display text-sm pt-2">Add Story</div>
              </div>
              
              {[
                { img: 'https://picsum.photos/seed/s1/200/300', av: AVATAR_2, name: 'Sarah', color: 'var(--tile-bg-violet)' },
                { img: 'https://picsum.photos/seed/s2/200/300', av: AVATAR_3, name: 'Mike', color: 'var(--tile-bg-pink)' },
                { img: 'https://picsum.photos/seed/s3/200/300', av: AVATAR_4, name: 'Emma', color: 'var(--tile-bg-yellow)' },
              ].map((st, i) => (
                <div key={i} className="min-w-[120px] h-[200px] bento-tile relative group cursor-pointer overflow-hidden">
                  <img src={st.img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60"></div>
                  <div className="absolute top-3 left-3 w-10 h-10 rounded-xl p-[2px]" style={{ background: st.color }}>
                    <img src={st.av} className="w-full h-full rounded-[10px] object-cover" />
                  </div>
                  <div className="absolute bottom-3 left-3 font-bold font-display text-white text-sm">{st.name}</div>
                </div>
              ))}
            </div>

            {/* Composer */}
            <div className="bento-tile bg-[var(--tile-bg-white)] p-5 flex flex-col gap-4">
              <div className="flex gap-4">
                <img src={AVATAR_1} className="w-12 h-12 rounded-[18px] object-cover" />
                <input 
                  type="text" 
                  placeholder="What's cooking, Alex? 🍳" 
                  className="bg-[var(--bg-app)] flex-1 rounded-[18px] px-5 outline-none font-medium text-[var(--text-main)] placeholder-[var(--text-muted)]"
                />
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="flex gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 bg-[var(--tile-bg-lime)]/20 text-[#6ea33e] rounded-xl font-bold text-sm hover:bg-[var(--tile-bg-lime)]/30 transition-colors">
                    <ImageIcon className="w-5 h-5" /> Media
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[var(--tile-bg-yellow)]/20 text-[#a39023] rounded-xl font-bold text-sm hover:bg-[var(--tile-bg-yellow)]/30 transition-colors">
                    <Smile className="w-5 h-5" /> Vibe
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 bg-[var(--tile-bg-coral)]/20 text-[#a33a3a] rounded-xl font-bold text-sm hover:bg-[var(--tile-bg-coral)]/30 transition-colors">
                    <MapPin className="w-5 h-5" /> Drop
                  </button>
                </div>
                <button className="bg-[var(--text-main)] text-[var(--bg-app)] px-6 py-2 rounded-xl font-display font-bold hover:opacity-90">
                  Post
                </button>
              </div>
            </div>

            {/* Post 1 - Text & Image */}
            <div className="bento-tile bg-[var(--tile-bg-white)] flex flex-col">
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src={AVATAR_2} className="w-12 h-12 rounded-[18px] object-cover" />
                  <div>
                    <div className="flex items-center gap-1 font-display font-bold text-lg">
                      Sarah Jenkins <BadgeCheck className="w-5 h-5 text-[var(--tile-bg-cyan)] fill-current" />
                    </div>
                    <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs font-medium">
                      <Clock className="w-3 h-3" /> 2 hours ago
                      <span>•</span>
                      <Globe className="w-3 h-3" />
                    </div>
                  </div>
                </div>
                <button className="p-2 hover:bg-[var(--bg-app)] rounded-full text-[var(--text-muted)]"><MoreHorizontal className="w-5 h-5"/></button>
              </div>

              <div className="px-5 pb-4 font-medium text-[16px] leading-relaxed">
                Just found the most amazing hidden coffee spot in the city! The aesthetics are immaculate and the matcha latte is 10/10 🍵✨ Anyone want to go this weekend?
              </div>

              <div className="px-5 pb-4 relative">
                <div className="rounded-[24px] overflow-hidden relative">
                  <img src="https://picsum.photos/seed/coffee/600/400" className="w-full h-[350px] object-cover" />
                  <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-md px-3 py-1 rounded-full font-bold text-xs text-black">
                    📍 Neon Cafe, SF
                  </div>
                </div>
                
                {/* Floating Reactions */}
                <div className="absolute bottom-0 left-10 translate-y-1/2 flex gap-[-8px]">
                  <div className="w-10 h-10 rounded-full bg-[var(--tile-bg-coral)] flex items-center justify-center text-xl border-4 border-[var(--tile-bg-white)] shadow-md z-20">❤️</div>
                  <div className="w-10 h-10 rounded-full bg-[var(--tile-bg-yellow)] flex items-center justify-center text-xl border-4 border-[var(--tile-bg-white)] shadow-md -ml-3 z-10">🔥</div>
                  <div className="w-10 h-10 rounded-full bg-[var(--bg-app)] flex items-center justify-center text-xs font-bold border-4 border-[var(--tile-bg-white)] shadow-md -ml-3 z-0">
                    +42
                  </div>
                </div>
              </div>

              <div className="px-5 py-4 mt-2 flex justify-end text-[var(--text-muted)] text-sm font-bold gap-4">
                <span>12 Comments</span>
                <span>4 Shares</span>
              </div>

              <div className="px-5 pb-5 flex gap-2">
                <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-[var(--bg-app)] hover:bg-[var(--border-color)] transition-colors">
                  <Heart className="w-5 h-5" /> Like
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-[var(--bg-app)] hover:bg-[var(--border-color)] transition-colors">
                  <MessageSquare className="w-5 h-5" /> Comment
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold bg-[var(--bg-app)] hover:bg-[var(--border-color)] transition-colors">
                  <Share2 className="w-5 h-5" /> Share
                </button>
              </div>
            </div>

            {/* Post 2 - Text Only */}
            <div className="bento-tile bg-[var(--tile-bg-violet)] text-white flex flex-col p-6 relative overflow-hidden group">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
              
              <div className="flex items-center justify-between relative z-10 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-1 bg-white/20 rounded-[20px]">
                    <img src={AVATAR_3} className="w-10 h-10 rounded-[16px] object-cover" />
                  </div>
                  <div>
                    <div className="font-display font-bold text-lg text-white">Mike Chen</div>
                    <div className="text-white/70 text-xs font-medium">5 hours ago</div>
                  </div>
                </div>
                <div className="bento-badge bg-white text-[#1a1a1a] border-none shadow-none">HOT TAKE 🔥</div>
              </div>

              <div className="font-display font-bold text-2xl leading-tight relative z-10 mb-6">
                Unpopular opinion: Next.js is over-engineered for 90% of the projects it's used for. Sometimes a simple Vite + React setup is all you really need. 🤷‍♂️
              </div>

              <div className="flex items-center justify-between border-t border-white/20 pt-4 relative z-10">
                <div className="flex gap-[-8px]">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm border-2 border-[var(--tile-bg-violet)] z-20">👍</div>
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm border-2 border-[var(--tile-bg-violet)] -ml-2 z-10">💯</div>
                  <div className="w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-xs font-bold border-2 border-[var(--tile-bg-violet)] -ml-2 text-white z-0">
                    +128
                  </div>
                </div>
                <div className="flex gap-4">
                  <button className="text-white hover:text-white/80 font-bold flex items-center gap-2"><MessageSquare className="w-5 h-5"/> 45</button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* RIGHT COLUMN - Widgets */}
        <div className="w-72 flex flex-col gap-4 overflow-y-auto pt-4 pb-20 no-scrollbar">
          
          {/* Sponsored Bento */}
          <div className="bento-tile bg-[var(--tile-bg-yellow)] p-1 flex flex-col group">
            <div className="px-3 py-2 flex justify-between items-center text-[#1a1a1a]">
              <span className="font-bold text-xs uppercase tracking-wider">Sponsored</span>
              <MoreHorizontal className="w-4 h-4" />
            </div>
            <div className="bg-[var(--tile-bg-white)] rounded-[20px] m-1 p-3">
              <img src="https://picsum.photos/seed/headpn/300/200" className="w-full h-[120px] object-cover rounded-xl mb-3" />
              <div className="font-display font-bold text-lg mb-1 leading-tight">Neon Beats Pro Max</div>
              <p className="text-[var(--text-muted)] text-xs font-medium mb-3">Next-gen spatial audio in vibrant colors.</p>
              <div className="flex justify-between items-center">
                <span className="font-bold text-[var(--tile-bg-pink)] font-display">৳ 12,500</span>
                <button className="bg-[#1a1a1a] text-white px-3 py-1.5 rounded-lg text-xs font-bold">Buy Now</button>
              </div>
            </div>
          </div>

          {/* Active Friends Bento */}
          <div className="bento-tile bg-[var(--tile-bg-white)] p-4 flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg">Squad</h3>
              <Search className="w-4 h-4 text-[var(--text-muted)]" />
            </div>
            <div className="flex flex-col gap-3">
              {[
                { name: 'Sarah Jenkins', av: AVATAR_2, online: true, activity: 'Playing Valorant' },
                { name: 'Mike Chen', av: AVATAR_3, online: true },
                { name: 'Emma Watson', av: AVATAR_4, online: false, last: '2h' },
                { name: 'David Kim', av: 'https://i.pravatar.cc/100?img=11', online: true },
              ].map((friend, i) => (
                <div key={i} className="flex items-center gap-3 p-2 hover:bg-[var(--bg-app)] rounded-xl cursor-pointer transition-colors">
                  <div className="relative">
                    <img src={friend.av} className="w-10 h-10 rounded-[14px] object-cover" />
                    {friend.online && <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[var(--tile-bg-lime)] border-2 border-[var(--tile-bg-white)] rounded-full"></div>}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="font-bold text-sm truncate">{friend.name}</div>
                    {friend.activity ? (
                      <div className="text-xs text-[var(--tile-bg-violet)] font-medium truncate">🎮 {friend.activity}</div>
                    ) : friend.online ? (
                      <div className="text-xs text-[var(--tile-bg-lime)] font-medium">Online</div>
                    ) : (
                      <div className="text-xs text-[var(--text-muted)] font-medium">Last active {friend.last}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export function Bento() {
  return (
    <div className="bento-vibrant-container flex w-max min-h-screen bg-black overflow-hidden font-sans">
      <WebFeedPanel theme="light" />
      <div className="w-[1px] bg-white/20 shrink-0 h-[900px]"></div>
      <WebFeedPanel theme="dark" />
    </div>
  );
}
