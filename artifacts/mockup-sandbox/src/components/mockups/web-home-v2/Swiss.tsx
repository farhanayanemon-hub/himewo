import React from 'react';
import './swiss.css';
import { 
  Search, Home, Users, PlaySquare, Component, Bell, MessageSquare, 
  Menu, UserCircle, Users2, Bookmark, Store, Video, Plus, Image as ImageIcon, 
  Smile, MoreHorizontal, ThumbsUp, MessageCircle, Share2, Verified, Check,
  ChevronRight, Circle
} from 'lucide-react';

export function Swiss() {
  return (
    <div className="flex w-[2560px] h-[100dvh] swiss-theme overflow-hidden bg-zinc-900">
      <Panel theme="light" label="LIGHT" />
      <div className="w-[1px] h-full bg-zinc-800 shrink-0" />
      <Panel theme="dark" label="DARK" />
    </div>
  );
}

function Panel({ theme, label }: { theme: 'light' | 'dark', label: string }) {
  const isLight = theme === 'light';
  
  return (
    <div className={`relative w-[1280px] h-full shrink-0 flex flex-col swiss-${theme} swiss-panel`}>
      <div className="swiss-pill">{label}</div>
      
      {/* Top Nav */}
      <header className="h-[60px] w-full swiss-nav flex items-center justify-between px-6 shrink-0 z-40">
        <div className="flex items-center gap-6 w-1/3">
          <div className="text-2xl font-bold tracking-tighter">HiMewo.</div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 swiss-text-secondary" />
            <input 
              type="text" 
              placeholder="SEARCH..." 
              className="w-full h-9 pl-9 pr-4 text-xs swiss-input"
            />
          </div>
        </div>

        <nav className="flex items-center gap-12 w-1/3 justify-center h-full">
          <NavItem icon={<Home className="w-5 h-5" />} active />
          <NavItem icon={<Users className="w-5 h-5" />} />
          <NavItem icon={<PlaySquare className="w-5 h-5" />} />
          <NavItem icon={<Component className="w-5 h-5" />} />
        </nav>

        <div className="flex items-center justify-end gap-6 w-1/3">
          <button className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full swiss-bg-accent" />
          </button>
          <button>
            <MessageSquare className="w-5 h-5" />
          </button>
          <img src="https://i.pravatar.cc/100?img=33" alt="Avatar" className="w-8 h-8 object-cover grayscale" />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-[280px] shrink-0 swiss-border-r h-full overflow-y-auto swiss-scroll p-6">
          <div className="flex flex-col gap-2">
            <SidebarItem icon={<img src="https://i.pravatar.cc/100?img=33" className="w-6 h-6 object-cover grayscale" />} label="Eleanor Vance" />
            <SidebarItem icon={<Users2 className="w-5 h-5" />} label="Friends" />
            <SidebarItem icon={<Component className="w-5 h-5" />} label="Groups" />
            <SidebarItem icon={<Video className="w-5 h-5" />} label="Reels" />
            <SidebarItem icon={<Store className="w-5 h-5" />} label="Marketplace" />
            <SidebarItem icon={<Bookmark className="w-5 h-5" />} label="Saved" />
          </div>
          
          <div className="mt-8 pt-8 swiss-border-t">
            <div className="text-[10px] font-bold tracking-widest swiss-text-secondary mb-4 uppercase">Shortcuts</div>
            <div className="flex flex-col gap-2">
              <SidebarItem label="Design Enthusiasts" image="https://picsum.photos/seed/design/50/50" />
              <SidebarItem label="Architecture Daily" image="https://picsum.photos/seed/arch/50/50" />
              <SidebarItem label="Typography Masters" image="https://picsum.photos/seed/type/50/50" />
            </div>
          </div>
        </aside>

        {/* Center Feed */}
        <div className="flex-1 max-w-[640px] mx-auto h-full overflow-y-auto swiss-scroll px-8 py-8">
          
          {/* Stories */}
          <div className="flex gap-4 mb-8 overflow-x-auto swiss-scroll pb-2">
            <div className="w-[120px] h-[200px] shrink-0 swiss-story relative flex flex-col justify-end p-4 group cursor-pointer">
              <div className="absolute top-4 left-4 w-8 h-8 bg-white border border-black flex items-center justify-center rounded-full z-10">
                <Plus className="w-4 h-4 text-black" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wider relative z-10">Create<br/>Story</span>
            </div>
            
            <StoryCard image="https://picsum.photos/seed/s1/300/500" avatar="https://i.pravatar.cc/100?img=12" name="Jane Doe" />
            <StoryCard image="https://picsum.photos/seed/s2/300/500" avatar="https://i.pravatar.cc/100?img=45" name="Mark Smith" />
            <StoryCard image="https://picsum.photos/seed/s3/300/500" avatar="https://i.pravatar.cc/100?img=68" name="Sarah Lee" />
            <StoryCard image="https://picsum.photos/seed/s4/300/500" avatar="https://i.pravatar.cc/100?img=19" name="Tom Hardy" />
          </div>

          {/* Composer */}
          <div className="swiss-border mb-8 p-5">
            <div className="flex gap-4 mb-4">
              <img src="https://i.pravatar.cc/100?img=33" alt="Avatar" className="w-10 h-10 object-cover grayscale" />
              <input 
                type="text" 
                placeholder="WHAT'S ON YOUR MIND?" 
                className="w-full bg-transparent outline-none text-sm placeholder:text-current placeholder:opacity-40"
              />
            </div>
            <div className="swiss-border-t pt-4 flex items-center justify-between">
              <div className="flex gap-6">
                <button className="flex items-center gap-2 text-xs font-semibold tracking-wider hover:opacity-70 transition-opacity">
                  <Video className="w-4 h-4" /> LIVE
                </button>
                <button className="flex items-center gap-2 text-xs font-semibold tracking-wider hover:opacity-70 transition-opacity">
                  <ImageIcon className="w-4 h-4" /> PHOTO
                </button>
                <button className="flex items-center gap-2 text-xs font-semibold tracking-wider hover:opacity-70 transition-opacity">
                  <Smile className="w-4 h-4" /> FEELING
                </button>
              </div>
              <button className="swiss-btn-accent px-6 py-2">POST</button>
            </div>
          </div>

          {/* Posts */}
          <div className="flex flex-col gap-8 pb-20">
            <PostCard 
              avatar="https://i.pravatar.cc/100?img=47"
              name="Design Repository"
              verified
              time="2 HOURS AGO"
              content="Dieter Rams' 10 principles for good design remain as relevant today as when they were first written. Good design is innovative. Good design makes a product useful. Good design is aesthetic. Good design makes a product understandable. Good design is unobtrusive. Good design is honest. Good design is long-lasting. Good design is thorough down to the last detail. Good design is environmental-friendly. Good design is as little design as possible."
              likes="1.2K"
              comments="45"
              shares="128"
            />
            
            <PostCard 
              avatar="https://i.pravatar.cc/100?img=11"
              name="Marcus Braun"
              time="5 HOURS AGO"
              content="Spotted this brutalist masterpiece while walking through London today. The concrete textures and strict geometry are incredible."
              image="https://picsum.photos/seed/brutalist/800/600"
              likes="856"
              comments="32"
              shares="14"
            />
          </div>
        </div>

        {/* Right Sidebar */}
        <aside className="w-[280px] shrink-0 swiss-border-l h-full overflow-y-auto swiss-scroll p-6 hidden lg:block">
          <div className="mb-8">
            <div className="text-[10px] font-bold tracking-widest swiss-text-secondary mb-4 uppercase flex justify-between">
              <span>Sponsored</span>
              <span>—</span>
            </div>
            <div className="group cursor-pointer">
              <img src="https://picsum.photos/seed/chair/300/200" className="w-full aspect-[3/2] object-cover grayscale mb-3" />
              <div className="text-sm font-bold mb-1">Braun SK4 Radio</div>
              <div className="text-xs swiss-text-secondary mb-2">Original 1956 Edition</div>
              <div className="text-xs font-bold">৳ 45,000</div>
            </div>
          </div>
          
          <div className="swiss-border-t pt-8">
            <div className="text-[10px] font-bold tracking-widest swiss-text-secondary mb-4 uppercase flex justify-between items-center">
              <span>Contacts</span>
              <Search className="w-3 h-3" />
            </div>
            <div className="flex flex-col gap-3">
              <ContactItem name="Alice Wonderland" avatar="https://i.pravatar.cc/100?img=1" />
              <ContactItem name="Bob Builder" avatar="https://i.pravatar.cc/100?img=2" />
              <ContactItem name="Charlie Chaplin" avatar="https://i.pravatar.cc/100?img=3" />
              <ContactItem name="Diana Prince" avatar="https://i.pravatar.cc/100?img=4" />
              <ContactItem name="Evan Hansen" avatar="https://i.pravatar.cc/100?img=5" />
              <ContactItem name="Fiona Gallagher" avatar="https://i.pravatar.cc/100?img=6" />
              <ContactItem name="George Lucas" avatar="https://i.pravatar.cc/100?img=7" />
              <ContactItem name="Harry Potter" avatar="https://i.pravatar.cc/100?img=8" />
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}

function NavItem({ icon, active }: { icon: React.ReactNode, active?: boolean }) {
  return (
    <button className={`relative h-full flex items-center px-4 transition-colors ${active ? 'swiss-accent' : 'swiss-text-secondary hover:text-current'}`}>
      {icon}
      {active && <div className="absolute bottom-0 left-0 w-full h-[2px] swiss-bg-accent" />}
    </button>
  );
}

function SidebarItem({ icon, image, label }: { icon?: React.ReactNode, image?: string, label: string }) {
  return (
    <button className="flex items-center gap-4 w-full p-2 swiss-hover transition-colors text-left group">
      {icon && <div className="w-8 h-8 flex items-center justify-center shrink-0">{icon}</div>}
      {image && <img src={image} className="w-8 h-8 object-cover grayscale group-hover:grayscale-0 transition-all" />}
      <span className="text-sm font-medium">{label}</span>
    </button>
  );
}

function StoryCard({ image, avatar, name }: { image: string, avatar: string, name: string }) {
  return (
    <div className="w-[120px] h-[200px] shrink-0 relative group cursor-pointer overflow-hidden border border-transparent hover:border-current transition-colors">
      <img src={image} className="absolute inset-0 w-full h-full object-cover grayscale group-hover:scale-105 transition-transform duration-700" />
      <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
      <div className="absolute top-3 left-3 w-8 h-8 p-[2px] bg-white rounded-full z-10">
        <img src={avatar} className="w-full h-full object-cover rounded-full grayscale" />
      </div>
      <div className="absolute bottom-3 left-3 right-3 text-xs font-semibold text-white z-10 drop-shadow-md">
        {name}
      </div>
    </div>
  );
}

function PostCard({ avatar, name, verified, time, content, image, likes, comments, shares }: { 
  avatar: string, name: string, verified?: boolean, time: string, content: string, image?: string, likes: string, comments: string, shares: string 
}) {
  return (
    <article className="swiss-border p-5">
      <header className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <img src={avatar} className="w-10 h-10 object-cover grayscale" />
          <div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-bold">{name}</span>
              {verified && <Verified className="w-3.5 h-3.5 swiss-accent" />}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-semibold tracking-wider swiss-text-secondary mt-0.5">
              <span>{time}</span>
              <span>·</span>
              <Users className="w-3 h-3" />
            </div>
          </div>
        </div>
        <button className="swiss-text-secondary hover:text-current">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </header>
      
      <div className="text-sm leading-relaxed mb-4">
        {content}
      </div>
      
      {image && (
        <div className="mb-4 -mx-5 border-y swiss-border overflow-hidden">
          <img src={image} className="w-full h-auto object-cover grayscale hover:grayscale-0 transition-all duration-500 max-h-[500px]" />
        </div>
      )}
      
      <div className="flex items-center justify-between pb-4 swiss-border-b mb-2 text-xs font-semibold swiss-text-secondary">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-black flex items-center justify-center">
            <ThumbsUp className="w-2.5 h-2.5 text-white" />
          </div>
          <span>{likes}</span>
        </div>
        <div className="flex gap-4">
          <span>{comments} COMMENTS</span>
          <span>{shares} SHARES</span>
        </div>
      </div>
      
      <div className="flex justify-between pt-2">
        <button className="flex-1 flex justify-center items-center gap-2 py-2 text-xs font-bold tracking-wider hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <ThumbsUp className="w-4 h-4" /> LIKE
        </button>
        <button className="flex-1 flex justify-center items-center gap-2 py-2 text-xs font-bold tracking-wider hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <MessageCircle className="w-4 h-4" /> COMMENT
        </button>
        <button className="flex-1 flex justify-center items-center gap-2 py-2 text-xs font-bold tracking-wider hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
          <Share2 className="w-4 h-4" /> SHARE
        </button>
      </div>
    </article>
  );
}

function ContactItem({ name, avatar }: { name: string, avatar: string }) {
  return (
    <button className="flex items-center gap-3 w-full group hover:opacity-70 transition-opacity">
      <div className="relative">
        <img src={avatar} className="w-8 h-8 object-cover grayscale group-hover:grayscale-0 transition-all" />
        <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border border-white dark:border-black rounded-full" />
      </div>
      <span className="text-xs font-semibold">{name}</span>
    </button>
  );
}
