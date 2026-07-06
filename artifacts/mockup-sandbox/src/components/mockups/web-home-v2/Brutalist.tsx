import React from "react";
import {
  Search,
  Home,
  Users,
  Video,
  MonitorPlay,
  Bell,
  MessageCircle,
  MoreHorizontal,
  ThumbsUp,
  MessageSquare,
  Share2,
  Image as ImageIcon,
  Smile,
  Store,
  Bookmark,
  CheckCircle,
  Globe2,
} from "lucide-react";
import "./brutalist-theme.css";

const SHORTCUTS = [
  { icon: Users, label: "Friends", color: "text-[#2b5cff]" },
  { icon: Users, label: "Groups", color: "text-[#ff00ff]" },
  { icon: Video, label: "Reels", color: "text-[#00ffff]" },
  { icon: Store, label: "Marketplace", color: "text-[#ffe600]" },
  { icon: Bookmark, label: "Saved", color: "text-[#ff0055]" },
];

const CONTACTS = [
  { name: "Alice Johnson", avatar: "https://i.pravatar.cc/100?img=1" },
  { name: "Bob Smith", avatar: "https://i.pravatar.cc/100?img=2" },
  { name: "Charlie Davis", avatar: "https://i.pravatar.cc/100?img=3" },
  { name: "Diana Prince", avatar: "https://i.pravatar.cc/100?img=4" },
  { name: "Evan Wright", avatar: "https://i.pravatar.cc/100?img=5" },
];

const Feed = () => {
  return (
    <div className="w-full h-full min-h-screen bru-theme p-4 flex flex-col gap-6 font-['Space_Grotesk'] text-[length:var(--bru-text)]">
      {/* Top Nav */}
      <nav className="bru-box flex items-center justify-between px-6 py-3 sticky top-0 z-50">
        <div className="flex items-center gap-4 w-1/4">
          <div className="text-3xl font-bold tracking-tighter uppercase" style={{ color: "var(--bru-primary)" }}>
            HiMewo
          </div>
          <div className="relative w-full max-w-xs hidden xl:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: "var(--bru-text-muted)" }} />
            <input
              type="text"
              placeholder="Search HiMewo..."
              className="bru-input w-full py-2 pl-10 pr-4 font-bold text-sm"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 lg:gap-8 justify-center flex-1">
          <button className="bru-button bru-button-accent p-3">
            <Home className="w-6 h-6" />
          </button>
          <button className="bru-button p-3">
            <Users className="w-6 h-6" />
          </button>
          <button className="bru-button p-3">
            <Video className="w-6 h-6" />
          </button>
          <button className="bru-button p-3">
            <MonitorPlay className="w-6 h-6" />
          </button>
        </div>

        <div className="flex items-center gap-4 justify-end w-1/4">
          <button className="bru-button p-3 rounded-full hidden md:block">
            <Bell className="w-5 h-5" />
          </button>
          <button className="bru-button p-3 rounded-full hidden md:block">
            <MessageCircle className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-full border-3 overflow-hidden bru-box-sm">
            <img src="https://i.pravatar.cc/100?img=11" alt="Me" className="w-full h-full object-cover" />
          </div>
        </div>
      </nav>

      {/* Main Content 3-col */}
      <div className="flex gap-6 max-w-7xl mx-auto w-full flex-1 items-start">
        {/* Left Col - Shortcuts */}
        <aside className="hidden lg:flex w-[280px] flex-col gap-2 sticky top-[100px]">
          <button className="flex items-center gap-4 p-3 bru-button justify-start w-full text-left bg-[var(--bru-bg)] shadow-none border-transparent hover:border-[var(--bru-border)] hover:bg-[var(--bru-panel)]">
            <div className="w-10 h-10 rounded-full border-[3px] border-[var(--bru-border)] overflow-hidden shrink-0">
              <img src="https://i.pravatar.cc/100?img=11" alt="Me" className="w-full h-full object-cover" />
            </div>
            <span className="font-bold text-lg">Alex Mercer</span>
          </button>
          
          {SHORTCUTS.map((s, i) => (
            <button key={i} className="flex items-center gap-4 p-3 bru-button justify-start w-full text-left bg-[var(--bru-bg)] shadow-none border-transparent hover:border-[var(--bru-border)] hover:bg-[var(--bru-panel)]">
              <s.icon className="w-8 h-8" style={{ color: "var(--bru-primary)" }} />
              <span className="font-bold text-lg">{s.label}</span>
            </button>
          ))}
        </aside>

        {/* Center Col - Feed */}
        <main className="flex-1 flex flex-col gap-6 max-w-[600px] mx-auto w-full">
          {/* Stories */}
          <div className="flex gap-4 overflow-hidden pb-4 pt-2 px-2 -mx-2">
            <div className="w-32 h-52 shrink-0 bru-box relative flex flex-col justify-end p-3 overflow-hidden cursor-pointer group">
              <img src="https://i.pravatar.cc/100?img=11" alt="Me" className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform" />
              <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="relative z-10">
                <div className="w-10 h-10 rounded-full bg-[var(--bru-primary)] border-2 border-black flex items-center justify-center text-white mb-2 mx-auto">
                  <span className="text-2xl font-bold leading-none">+</span>
                </div>
                <div className="text-white font-bold text-center text-sm">Create Story</div>
              </div>
            </div>
            {[6, 7, 8].map((img, i) => (
              <div key={i} className="w-32 h-52 shrink-0 bru-box relative flex flex-col justify-end p-3 overflow-hidden cursor-pointer group">
                <img src={`https://picsum.photos/seed/${img}/200/300`} alt="Story" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform" />
                <div className="absolute top-3 left-3 w-10 h-10 rounded-full border-2 border-[var(--bru-primary)] overflow-hidden z-10">
                  <img src={`https://i.pravatar.cc/100?img=${img}`} alt="User" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/80 to-transparent" />
                <div className="relative z-10 text-white font-bold text-sm">Friend {i+1}</div>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="bru-box p-4 flex flex-col gap-4">
            <div className="flex gap-4 items-center">
              <div className="w-12 h-12 rounded-full border-[3px] border-[var(--bru-border)] overflow-hidden shrink-0">
                <img src="https://i.pravatar.cc/100?img=11" alt="Me" className="w-full h-full object-cover" />
              </div>
              <input
                type="text"
                placeholder="What's on your mind, Alex?"
                className="bru-input w-full p-3 font-bold text-lg rounded-full"
              />
            </div>
            <div className="h-[3px] w-full bg-[var(--bru-border)] my-1" />
            <div className="flex gap-4">
              <button className="flex-1 bru-button py-2 flex items-center justify-center gap-2">
                <Video className="w-5 h-5 text-red-500" />
                <span className="hidden sm:inline">Live</span>
              </button>
              <button className="flex-1 bru-button py-2 flex items-center justify-center gap-2">
                <ImageIcon className="w-5 h-5 text-green-500" />
                <span className="hidden sm:inline">Photo</span>
              </button>
              <button className="flex-1 bru-button py-2 flex items-center justify-center gap-2">
                <Smile className="w-5 h-5 text-yellow-500" />
                <span className="hidden sm:inline">Feeling</span>
              </button>
            </div>
          </div>

          {/* Post 1 - Text only */}
          <div className="bru-box p-5 flex flex-col gap-4">
            <div className="flex justify-between items-start">
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-full border-[3px] border-[var(--bru-border)] overflow-hidden shrink-0">
                  <img src="https://i.pravatar.cc/100?img=12" alt="User" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="font-bold text-lg">Sarah Jenkins</h3>
                    <CheckCircle className="w-4 h-4 text-[var(--bru-primary)] fill-current" />
                  </div>
                  <div className="flex items-center gap-1 text-sm font-bold opacity-70">
                    <span>2 hrs</span>
                    <span>•</span>
                    <Globe2 className="w-3 h-3" />
                  </div>
                </div>
              </div>
              <button className="p-2 hover:bg-[var(--bru-bg)] border-[3px] border-transparent hover:border-[var(--bru-border)] transition-colors">
                <MoreHorizontal className="w-6 h-6" />
              </button>
            </div>
            
            <div className="text-xl font-bold leading-snug">
              Just deployed my new portfolio site using a brutalist design system! 🚀
              <br/><br/>
              What do you guys think? Drop your thoughts below 👇
            </div>

            <div className="flex justify-between items-center py-2 text-sm font-bold opacity-80 border-b-[3px] border-[var(--bru-border)] pb-4">
              <div className="flex items-center gap-1">
                <span className="text-xl">🔥❤️</span>
                <span>124</span>
              </div>
              <div className="flex gap-4">
                <span>42 Comments</span>
                <span>12 Shares</span>
              </div>
            </div>

            <div className="flex gap-4 pt-1">
              <button className="flex-1 bru-button py-2 flex items-center justify-center gap-2 bg-[var(--bru-bg)] border-transparent hover:border-[var(--bru-border)] hover:bg-[var(--bru-panel)] shadow-none">
                <ThumbsUp className="w-5 h-5" /> Like
              </button>
              <button className="flex-1 bru-button py-2 flex items-center justify-center gap-2 bg-[var(--bru-bg)] border-transparent hover:border-[var(--bru-border)] hover:bg-[var(--bru-panel)] shadow-none">
                <MessageSquare className="w-5 h-5" /> Comment
              </button>
              <button className="flex-1 bru-button py-2 flex items-center justify-center gap-2 bg-[var(--bru-bg)] border-transparent hover:border-[var(--bru-border)] hover:bg-[var(--bru-panel)] shadow-none">
                <Share2 className="w-5 h-5" /> Share
              </button>
            </div>
          </div>

          {/* Post 2 - With Image */}
          <div className="bru-box p-0 flex flex-col">
            <div className="p-5 pb-3">
              <div className="flex justify-between items-start">
                <div className="flex gap-3">
                  <div className="w-12 h-12 rounded-full border-[3px] border-[var(--bru-border)] overflow-hidden shrink-0">
                    <img src="https://i.pravatar.cc/100?img=15" alt="User" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className="font-bold text-lg">Design Collective</h3>
                    </div>
                    <div className="flex items-center gap-1 text-sm font-bold opacity-70">
                      <span>5 hrs</span>
                      <span>•</span>
                      <Globe2 className="w-3 h-3" />
                    </div>
                  </div>
                </div>
                <button className="p-2 hover:bg-[var(--bru-bg)] border-[3px] border-transparent hover:border-[var(--bru-border)] transition-colors">
                  <MoreHorizontal className="w-6 h-6" />
                </button>
              </div>
              <div className="mt-4 text-lg font-bold">
                Neon signs in Tokyo hit different at midnight. 📸
              </div>
            </div>
            
            <div className="w-full h-[400px] border-y-[3px] border-[var(--bru-border)] overflow-hidden">
              <img src="https://picsum.photos/seed/tokyo/600/400" alt="Tokyo" className="w-full h-full object-cover" />
            </div>

            <div className="p-5 pt-3 flex flex-col gap-4">
              <div className="flex justify-between items-center py-2 text-sm font-bold opacity-80 border-b-[3px] border-[var(--bru-border)] pb-4">
                <div className="flex items-center gap-1">
                  <span className="text-xl">👍😮</span>
                  <span>8.2K</span>
                </div>
                <div className="flex gap-4">
                  <span>1.1K Comments</span>
                  <span>340 Shares</span>
                </div>
              </div>

              <div className="flex gap-4">
                <button className="flex-1 bru-button py-2 flex items-center justify-center gap-2 bg-[var(--bru-bg)] border-transparent hover:border-[var(--bru-border)] hover:bg-[var(--bru-panel)] shadow-none">
                  <ThumbsUp className="w-5 h-5" /> Like
                </button>
                <button className="flex-1 bru-button py-2 flex items-center justify-center gap-2 bg-[var(--bru-bg)] border-transparent hover:border-[var(--bru-border)] hover:bg-[var(--bru-panel)] shadow-none">
                  <MessageSquare className="w-5 h-5" /> Comment
                </button>
                <button className="flex-1 bru-button py-2 flex items-center justify-center gap-2 bg-[var(--bru-bg)] border-transparent hover:border-[var(--bru-border)] hover:bg-[var(--bru-panel)] shadow-none">
                  <Share2 className="w-5 h-5" /> Share
                </button>
              </div>
            </div>
          </div>
        </main>

        {/* Right Col - Sponsored & Contacts */}
        <aside className="hidden xl:flex w-[320px] flex-col gap-6 sticky top-[100px]">
          {/* Sponsored */}
          <div>
            <h4 className="font-bold text-lg mb-3 opacity-70 uppercase tracking-widest">Sponsored</h4>
            <div className="bru-box p-3 flex flex-col gap-3 group cursor-pointer hover:-translate-y-1 transition-transform">
              <div className="w-full h-40 border-[3px] border-[var(--bru-border)] overflow-hidden">
                <img src="https://picsum.photos/seed/keyboard/300/200" alt="Product" className="w-full h-full object-cover" />
              </div>
              <div>
                <div className="font-bold text-lg leading-tight group-hover:text-[var(--bru-primary)]">Mechanical Keyboard Pro Max</div>
                <div className="text-sm opacity-70 font-bold mt-1">mechkeys.store</div>
                <div className="mt-2 font-bold text-[var(--bru-primary)] text-xl">৳ 12,500</div>
              </div>
            </div>
          </div>

          <div className="h-[3px] w-full bg-[var(--bru-border)] opacity-20" />

          {/* Contacts */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-lg opacity-70 uppercase tracking-widest">Contacts</h4>
              <Search className="w-5 h-5 opacity-70" />
            </div>
            <div className="flex flex-col gap-2">
              {CONTACTS.map((contact, i) => (
                <button key={i} className="flex items-center gap-4 p-2 bru-button justify-start w-full text-left bg-[var(--bru-bg)] shadow-none border-transparent hover:border-[var(--bru-border)] hover:bg-[var(--bru-panel)]">
                  <div className="relative">
                    <div className="w-10 h-10 rounded-full border-[3px] border-[var(--bru-border)] overflow-hidden shrink-0">
                      <img src={contact.avatar} alt={contact.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[var(--bru-bg)] rounded-full" />
                  </div>
                  <span className="font-bold text-[15px]">{contact.name}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export function Brutalist() {
  return (
    <div className="flex w-[2560px] h-screen overflow-hidden bg-black text-white">
      {/* Light Mode Panel */}
      <div className="w-[1280px] h-full overflow-y-auto relative border-r-[3px] border-zinc-800">
        <div className="absolute top-4 left-4 z-[100] bg-black text-white px-3 py-1 text-xs font-bold uppercase tracking-widest border-2 border-white shadow-[2px_2px_0px_#fff]">
          Light
        </div>
        <Feed />
      </div>
      
      {/* Dark Mode Panel */}
      <div className="w-[1280px] h-full overflow-y-auto relative bru-dark bg-[var(--bru-bg)]">
        <div className="absolute top-4 left-4 z-[100] bg-white text-black px-3 py-1 text-xs font-bold uppercase tracking-widest border-2 border-black shadow-[2px_2px_0px_#000]">
          Dark
        </div>
        <Feed />
      </div>
    </div>
  );
}
