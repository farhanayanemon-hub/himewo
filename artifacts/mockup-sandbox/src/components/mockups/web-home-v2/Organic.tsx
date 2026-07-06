import React from 'react';
import { 
  Home, 
  Users, 
  PlaySquare, 
  CircleDot, 
  Bell, 
  MessageCircle, 
  Search,
  Store,
  Bookmark,
  UserCircle,
  MoreHorizontal,
  ThumbsUp,
  MessageSquare,
  Share2,
  Image as ImageIcon,
  Smile,
  CheckCircle2,
  Globe2
} from 'lucide-react';
import './organic.css';

export function Organic() {
  return (
    <div className="flex flex-row w-max min-h-screen font-sans bg-[#f5efe6]">
      {/* LIGHT MODE PANEL */}
      <div className="relative w-[1280px] shrink-0 border-r border-[#e3ddcf] overflow-hidden organic-theme flex flex-col">
        <div className="absolute top-4 left-4 z-50 px-3 py-1 bg-black/80 text-white text-xs font-bold tracking-widest rounded-full backdrop-blur-sm">LIGHT</div>
        <OrganicApp />
      </div>

      {/* DARK MODE PANEL */}
      <div className="relative w-[1280px] shrink-0 overflow-hidden organic-theme dark-mode flex flex-col">
        <div className="absolute top-4 left-4 z-50 px-3 py-1 bg-white/80 text-black text-xs font-bold tracking-widest rounded-full backdrop-blur-sm">DARK</div>
        <OrganicApp />
      </div>
    </div>
  );
}

function OrganicApp() {
  return (
    <div className="flex-1 flex flex-col h-full bg-org-bg text-org-text org-grain relative">
      {/* NAVBAR */}
      <header className="h-16 px-4 flex items-center justify-between bg-org-nav border-b border-org-border z-20">
        <div className="flex items-center gap-4 w-[300px]">
          <div className="w-10 h-10 bg-org-sage text-white org-rounded-blob flex items-center justify-center font-serif text-xl font-bold italic shadow-sm">
            H
          </div>
          <div className="relative group hidden xl:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-org-text-muted" />
            <input 
              type="text" 
              placeholder="Search local..." 
              className="pl-9 pr-4 py-2 bg-org-bg border border-transparent focus:border-org-sage/30 rounded-full text-sm outline-none w-[220px] transition-all placeholder:text-org-text-muted/70 text-org-text"
            />
          </div>
        </div>

        <nav className="flex items-center gap-1 sm:gap-2">
          <NavIcon icon={<Home className="w-6 h-6" />} active />
          <NavIcon icon={<Users className="w-6 h-6" />} />
          <NavIcon icon={<PlaySquare className="w-6 h-6" />} />
          <NavIcon icon={<CircleDot className="w-6 h-6" />} />
        </nav>

        <div className="flex items-center justify-end gap-3 w-[300px]">
          <button className="w-10 h-10 rounded-full bg-org-bg flex items-center justify-center hover-bg-sage-bg transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-org-terra rounded-full border border-org-bg"></span>
          </button>
          <button className="w-10 h-10 rounded-full bg-org-bg flex items-center justify-center hover-bg-sage-bg transition-colors">
            <MessageCircle className="w-5 h-5" />
          </button>
          <img src="https://i.pravatar.cc/100?img=32" alt="User" className="w-10 h-10 rounded-full object-cover border-2 border-org-bg cursor-pointer hover:border-org-sage transition-colors" />
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex justify-center gap-6 p-6 overflow-y-auto z-10 relative">
        {/* LEFT COLUMN */}
        <div className="hidden lg:flex flex-col gap-2 w-[280px] shrink-0">
          <Shortcut icon={<UserCircle className="w-5 h-5" />} label="Eleanor Root" />
          <Shortcut icon={<Users className="w-5 h-5" />} label="Community Friends" />
          <Shortcut icon={<CircleDot className="w-5 h-5" />} label="Garden Groups" />
          <Shortcut icon={<PlaySquare className="w-5 h-5" />} label="Daily Reels" />
          <Shortcut icon={<Store className="w-5 h-5" />} label="Farmers Market" />
          <Shortcut icon={<Bookmark className="w-5 h-5" />} label="Saved Seeds" />
          
          <div className="mt-4 pt-4 border-t border-org-border">
            <h3 className="font-serif text-lg font-medium text-org-text-muted mb-3 px-3">Your Collectives</h3>
            <Shortcut icon={<div className="w-6 h-6 bg-org-terra-bg text-org-terra org-rounded-blob flex items-center justify-center text-xs font-bold">P</div>} label="Pottery Enthusiasts" />
            <Shortcut icon={<div className="w-6 h-6 bg-org-sage-bg text-org-sage org-rounded-blob-alt flex items-center justify-center text-xs font-bold">S</div>} label="Sourdough Starters" />
          </div>
        </div>

        {/* CENTER COLUMN */}
        <div className="w-full max-w-[580px] flex flex-col gap-6 shrink-0 pb-20">
          {/* STORIES */}
          <div className="flex gap-3 overflow-hidden h-[200px]">
            <div className="w-[110px] shrink-0 bg-org-card org-rounded org-shadow flex flex-col relative overflow-hidden group cursor-pointer border border-org-border">
              <img src="https://i.pravatar.cc/100?img=32" className="w-full h-[130px] object-cover" alt="Me" />
              <div className="flex-1 bg-org-card flex flex-col items-center justify-end pb-3">
                <span className="text-xs font-medium text-org-text">Create Story</span>
              </div>
              <div className="absolute bottom-[38px] left-1/2 -translate-x-1/2 w-8 h-8 bg-org-sage text-white rounded-full flex items-center justify-center border-4 border-org-card group-hover:scale-110 transition-transform">
                <span className="text-lg leading-none mb-0.5">+</span>
              </div>
            </div>
            
            <StoryCard img="https://picsum.photos/seed/s1/200/300" avatar="https://i.pravatar.cc/100?img=12" name="Jasper Fenn" />
            <StoryCard img="https://picsum.photos/seed/s2/200/300" avatar="https://i.pravatar.cc/100?img=44" name="Cora Mills" />
            <StoryCard img="https://picsum.photos/seed/s3/200/300" avatar="https://i.pravatar.cc/100?img=68" name="Finnley" />
          </div>

          {/* COMPOSER */}
          <div className="bg-org-card org-rounded org-shadow p-4 border border-org-border">
            <div className="flex gap-3 mb-4">
              <img src="https://i.pravatar.cc/100?img=32" className="w-10 h-10 rounded-full" alt="Me" />
              <div className="flex-1 bg-org-bg rounded-full px-4 flex items-center cursor-pointer border border-org-border/50 hover:border-org-sage/30 transition-colors">
                <span className="text-org-text-muted text-sm">Plant a new thought, Eleanor...</span>
              </div>
            </div>
            <div className="flex border-t border-org-border pt-3 gap-2">
              <ComposerAction icon={<ImageIcon className="w-5 h-5 text-org-sage" />} label="Photo/Video" />
              <ComposerAction icon={<Smile className="w-5 h-5 text-org-terra" />} label="Feeling/Activity" />
            </div>
          </div>

          {/* POSTS */}
          <PostCard 
            avatar="https://i.pravatar.cc/100?img=47"
            name="Rowan Thorne"
            time="2 hrs ago"
            content="First harvest from the new raised beds! 🍅 The heirloom tomatoes are doing exceptionally well this season despite the strange weather we've been having. Thinking of making a large batch of roasted tomato soup. Anyone have a good recipe that incorporates fresh basil?"
            image="https://picsum.photos/seed/tomatoes/600/400"
            reactions="142"
            comments="28"
            shares="5"
          />

          <PostCard 
            avatar="https://i.pravatar.cc/100?img=25"
            name="Hazel Woods"
            time="5 hrs ago"
            content="Just finished reading 'Braiding Sweetgrass'. Such a phenomenal perspective on ecology and our relationship with the natural world. It completely reframed how I look at my morning walks in the reserve. Highly recommend to everyone in the local reading circle!"
            reactions="89"
            comments="14"
            shares="2"
          />
        </div>

        {/* RIGHT COLUMN */}
        <div className="hidden xl:flex flex-col gap-6 w-[300px] shrink-0">
          <div className="bg-org-card org-rounded org-shadow p-5 border border-org-border relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-org-sage opacity-5 org-rounded-blob-alt -translate-y-4 translate-x-4 pointer-events-none" />
            <h3 className="text-xs font-bold tracking-wider text-org-text-muted mb-4 uppercase">Marketplace Highlight</h3>
            <div className="flex items-center gap-3 cursor-pointer group">
              <img src="https://picsum.photos/seed/ceramics/120/120" className="w-20 h-20 org-rounded object-cover group-hover:opacity-90 transition-opacity" alt="Ad" />
              <div>
                <h4 className="font-serif font-medium text-org-text leading-tight mb-1 group-hover:text-org-sage transition-colors">Hand-thrown Matcha Mugs</h4>
                <p className="text-xs text-org-text-muted mb-1">Local artisan</p>
                <span className="text-sm font-semibold text-org-terra">৳ 450</span>
              </div>
            </div>
          </div>

          <div className="flex-1">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-medium text-org-text-muted">Community</h3>
              <Search className="w-4 h-4 text-org-text-muted cursor-pointer hover:text-org-sage transition-colors" />
            </div>
            <div className="flex flex-col gap-2">
              <Contact avatar="https://i.pravatar.cc/100?img=1" name="Arthur Pend" active />
              <Contact avatar="https://i.pravatar.cc/100?img=9" name="Silas Creek" active />
              <Contact avatar="https://i.pravatar.cc/100?img=16" name="Willa May" active />
              <Contact avatar="https://i.pravatar.cc/100?img=22" name="Felix Stone" />
              <Contact avatar="https://i.pravatar.cc/100?img=33" name="Opal Rivers" active />
              <Contact avatar="https://i.pravatar.cc/100?img=45" name="August Pine" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function NavIcon({ icon, active }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <div className={`w-14 h-12 flex items-center justify-center rounded-xl cursor-pointer transition-colors relative ${active ? 'text-org-sage' : 'text-org-text-muted hover:bg-org-sage-bg hover:text-org-sage'}`}>
      {icon}
      {active && <div className="absolute bottom-0 w-8 h-1 bg-org-sage rounded-t-full" />}
    </div>
  );
}

function Shortcut({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-org-sage-bg cursor-pointer transition-colors text-org-text hover:text-org-sage group">
      <div className="text-org-text-muted group-hover:text-org-sage transition-colors">{icon}</div>
      <span className="font-medium text-sm">{label}</span>
    </div>
  );
}

function StoryCard({ img, avatar, name }: { img: string, avatar: string, name: string }) {
  return (
    <div className="w-[110px] shrink-0 org-rounded relative overflow-hidden group cursor-pointer">
      <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Story" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />
      <div className="absolute top-3 left-3 w-8 h-8 rounded-full border-2 border-org-sage p-[1px]">
        <img src={avatar} className="w-full h-full rounded-full object-cover" alt={name} />
      </div>
      <span className="absolute bottom-3 left-3 right-3 text-xs font-medium text-white text-shadow-sm truncate">{name}</span>
    </div>
  );
}

function ComposerAction({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl hover:bg-org-sage-bg cursor-pointer transition-colors text-org-text-muted hover:text-org-sage">
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

function PostCard({ avatar, name, time, content, image, reactions, comments, shares }: {
  avatar: string;
  name: string;
  time: string;
  content: string;
  image?: string;
  reactions: string;
  comments: string;
  shares: string;
}) {
  return (
    <div className="bg-org-card org-rounded org-shadow border border-org-border overflow-hidden">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-3 items-center">
            <img src={avatar} className="w-10 h-10 rounded-full object-cover" alt={name} />
            <div>
              <div className="flex items-center gap-1">
                <span className="font-serif font-medium text-org-text">{name}</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-org-sage" />
              </div>
              <div className="flex items-center gap-1 text-xs text-org-text-muted mt-0.5">
                <span>{time}</span>
                <span>·</span>
                <Globe2 className="w-3 h-3" />
              </div>
            </div>
          </div>
          <button className="text-org-text-muted hover:bg-org-sage-bg p-2 rounded-full transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
        
        <p className="text-sm text-org-text leading-relaxed mb-3">{content}</p>
      </div>
      
      {image && (
        <img src={image} className="w-full max-h-[350px] object-cover" alt="Post attachment" />
      )}
      
      <div className="px-4 py-3">
        <div className="flex items-center justify-between text-xs text-org-text-muted mb-3 pb-3 border-b border-org-border">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              <div className="w-5 h-5 bg-org-sage rounded-full flex items-center justify-center border-2 border-org-card z-10">
                <span className="text-[10px] text-white">🌱</span>
              </div>
              <div className="w-5 h-5 bg-org-terra rounded-full flex items-center justify-center border-2 border-org-card">
                <span className="text-[10px] text-white">🤎</span>
              </div>
            </div>
            <span>{reactions}</span>
          </div>
          <div className="flex gap-3">
            <span className="hover:underline cursor-pointer">{comments} remarks</span>
            <span className="hover:underline cursor-pointer">{shares} seeds</span>
          </div>
        </div>
        
        <div className="flex gap-1">
          <PostAction icon={<ThumbsUp className="w-5 h-5" />} label="Acknowledge" />
          <PostAction icon={<MessageSquare className="w-5 h-5" />} label="Remark" />
          <PostAction icon={<Share2 className="w-5 h-5" />} label="Sow" />
        </div>
      </div>
    </div>
  );
}

function PostAction({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <div className="flex-1 flex items-center justify-center gap-2 p-2 rounded-xl hover:bg-org-sage-bg cursor-pointer transition-colors text-org-text-muted hover:text-org-sage font-medium text-sm">
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Contact({ avatar, name, active }: { avatar: string, name: string, active?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-org-sage-bg cursor-pointer transition-colors group">
      <div className="relative">
        <img src={avatar} className="w-9 h-9 rounded-full object-cover" alt={name} />
        {active && (
          <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-org-sage rounded-full border-2 border-org-bg"></div>
        )}
      </div>
      <span className="font-medium text-sm text-org-text group-hover:text-org-sage transition-colors">{name}</span>
    </div>
  );
}
