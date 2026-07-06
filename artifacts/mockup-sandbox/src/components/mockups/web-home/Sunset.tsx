import React from 'react';
import { 
  Search, Home, Users, Clapperboard, UsersRound, Store, 
  MessageCircle, Bell, Plus, Image as ImageIcon, Video, 
  Smile, MapPin, MoreHorizontal, ThumbsUp, MessageSquare, 
  Share2, Globe, Heart, Laugh, CheckCircle2,
  Tv, Calendar, Clock, Bookmark, CircleDollarSign,
  AlignLeft, Menu
} from 'lucide-react';
import './sunset.css';

export function Sunset() {
  return (
    <div className="sunset-theme min-h-screen w-full flex flex-col overflow-x-hidden">
      {/* Top Header */}
      <header className="sticky top-0 z-50 h-16 bg-white/80 backdrop-blur-md border-b flex items-center justify-between px-4 lg:px-8">
        
        {/* Left: Logo & Search */}
        <div className="flex items-center gap-3 w-1/4">
          <div className="sunset-gradient-bg text-white p-2 rounded-2xl cursor-pointer hover:opacity-90 transition-opacity">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5Z"/>
              <path d="M2 17l10 5 10-5"/>
              <path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="hidden xl:block text-2xl font-extrabold sunset-gradient-text tracking-tight cursor-pointer">
            HiMewo
          </h1>
          <div className="relative group hidden md:block ml-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#FF7A1A]" />
            <input 
              type="text" 
              placeholder="Search HiMewo..." 
              className="bg-[#FFF6F0] text-[var(--hm-text)] placeholder:text-[var(--hm-text-muted)] rounded-full pl-11 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-[#FF7A1A]/30 w-[240px] xl:w-[280px] transition-all text-sm font-medium"
            />
          </div>
        </div>

        {/* Center: Main Nav */}
        <div className="flex items-center justify-center gap-2 xl:gap-4 w-2/4">
          <NavIcon icon={Home} active />
          <NavIcon icon={Users} />
          <NavIcon icon={Clapperboard} />
          <NavIcon icon={UsersRound} />
          <NavIcon icon={Store} className="hidden sm:flex" />
        </div>

        {/* Right: User Utils */}
        <div className="flex items-center justify-end gap-3 w-1/4">
          <button className="sunset-btn-icon w-10 h-10 md:hidden">
            <Search className="w-5 h-5" />
          </button>
          <button className="sunset-btn-icon w-10 h-10 hidden sm:flex">
            <Menu className="w-5 h-5" />
          </button>
          <button className="sunset-btn-icon w-10 h-10 relative">
            <MessageCircle className="w-5 h-5" />
            <span className="absolute top-0 right-0 bg-[#FF5A5F] text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white">3</span>
          </button>
          <button className="sunset-btn-icon w-10 h-10 relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-0 right-0 bg-[#FF5A5F] text-white text-[10px] font-bold px-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full border-2 border-white">9+</span>
          </button>
          <button className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#FFE4D1] ml-1 hover:border-[#FF7A1A] transition-colors cursor-pointer">
            <img src="https://i.pravatar.cc/100?img=12" alt="Current User" className="w-full h-full object-cover" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 max-w-[1600px] mx-auto w-full pt-6 px-4 gap-6">
        
        {/* Left Sidebar */}
        <aside className="hidden lg:block w-[280px] xl:w-[320px] flex-shrink-0 sticky top-24 h-[calc(100vh-6rem)] sunset-scroll overflow-y-auto pb-8 pr-2">
          
          {/* User Row */}
          <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/60 cursor-pointer transition-colors mb-4 group">
            <img src="https://i.pravatar.cc/100?img=12" alt="Alex Rivera" className="w-12 h-12 rounded-full shadow-sm group-hover:scale-105 transition-transform" />
            <div>
              <h3 className="font-bold text-[var(--hm-text)]">Alex Rivera</h3>
              <p className="text-sm text-[var(--hm-text-muted)] font-medium">@arivera</p>
            </div>
          </div>

          <div className="space-y-1 mb-6">
            <SidebarItem icon={Users} label="Friends" color="#FF7A1A" />
            <SidebarItem icon={Clapperboard} label="Reels" color="#D91C84" />
            <SidebarItem icon={UsersRound} label="Groups" color="#FF5A5F" />
            <SidebarItem icon={AlignLeft} label="Pages" color="#FFB020" />
            <SidebarItem icon={Store} label="Marketplace" color="#FF7A1A" />
            <SidebarItem icon={CircleDollarSign} label="Earnings" color="#10B981" />
          </div>

          <hr className="border-[var(--hm-border)] mb-5 ml-3 mr-4" />
          
          <h4 className="px-3 mb-3 font-bold text-[#7A5F52] text-sm uppercase tracking-wider">Shortcuts</h4>
          <div className="space-y-1">
            <SidebarItem icon={Tv} label="Live" />
            <SidebarItem icon={Clapperboard} label="Watch" />
            <SidebarItem icon={Calendar} label="Events" />
            <SidebarItem icon={Clock} label="Memories" />
            <SidebarItem icon={Bookmark} label="Saved" />
          </div>

          <p className="px-4 mt-8 text-xs text-[var(--hm-text-muted)]/70 font-medium leading-relaxed">
            Privacy · Terms · Advertising · Ad Choices · Cookies · More · HiMewo © 2025
          </p>
        </aside>

        {/* Center Feed */}
        <main className="flex-1 max-w-[680px] mx-auto flex flex-col gap-6 pb-20">
          
          {/* Stories Bar */}
          <div className="flex gap-3 overflow-x-auto pb-4 sunset-scroll snap-x">
            {/* Create Story */}
            <div className="snap-start flex-shrink-0 w-[140px] h-[220px] rounded-3xl overflow-hidden relative group cursor-pointer shadow-sm">
              <img src="https://i.pravatar.cc/300?img=12" alt="You" className="w-full h-[65%] object-cover group-hover:scale-105 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 right-0 h-[45%] bg-white flex flex-col items-center justify-end pb-4">
                <div className="absolute -top-5 bg-[#FF7A1A] text-white p-2 rounded-full border-4 border-white shadow-sm group-hover:scale-110 transition-transform">
                  <Plus className="w-5 h-5" />
                </div>
                <span className="font-bold text-sm">Create Story</span>
              </div>
            </div>

            {/* Story 1 */}
            <StoryCard img="https://picsum.photos/seed/story1/300/500" avatar="https://i.pravatar.cc/100?img=44" name="Sarah Jenkins" />
            <StoryCard img="https://picsum.photos/seed/story2/300/500" avatar="https://i.pravatar.cc/100?img=33" name="Mike Ross" />
            <StoryCard img="https://picsum.photos/seed/story3/300/500" avatar="https://i.pravatar.cc/100?img=22" name="Elena Cruz" />
            <StoryCard img="https://picsum.photos/seed/story4/300/500" avatar="https://i.pravatar.cc/100?img=11" name="David Kim" />
          </div>

          {/* Composer */}
          <div className="sunset-card p-4 sm:p-5">
            <div className="flex gap-3 mb-4">
              <img src="https://i.pravatar.cc/100?img=12" alt="Alex" className="w-11 h-11 rounded-full object-cover shadow-sm" />
              <div className="flex-1 bg-[#FFF6F0] rounded-full px-5 flex items-center hover:bg-[#FFE4D1] cursor-text transition-colors">
                <span className="text-[var(--hm-text-muted)] font-medium text-lg">What's on your mind, Alex?</span>
              </div>
            </div>
            <hr className="border-[var(--hm-border)] mb-4" />
            <div className="flex items-center justify-between px-2">
              <ComposerBtn icon={Video} label="Live Video" color="#FF5A5F" />
              <ComposerBtn icon={ImageIcon} label="Photo/Video" color="#10B981" />
              <ComposerBtn icon={Smile} label="Feeling" color="#FFB020" className="hidden sm:flex" />
            </div>
          </div>

          {/* Posts Stream */}
          
          {/* Post 1: Image Post */}
          <PostCard 
            avatar="https://i.pravatar.cc/100?img=44"
            name="Sarah Jenkins"
            verified={true}
            time="2 hours ago"
            content="Just caught the most beautiful golden hour at the coast! 🌅 The colors are absolutely unreal today. Nature putting on a show for us."
            image="https://picsum.photos/seed/sunset/800/600"
            likes="1.2K"
            comments="148"
            shares="32"
          />

          {/* Post 2: Sponsored Ad */}
          <div className="sunset-card overflow-hidden">
            <div className="p-4 sm:p-5 pb-3 flex items-center justify-between">
              <div className="flex gap-3 items-center">
                <img src="https://picsum.photos/seed/brand/100" alt="Brand" className="w-12 h-12 rounded-2xl object-cover shadow-sm" />
                <div>
                  <h4 className="font-bold text-lg leading-tight flex items-center gap-1 cursor-pointer hover:underline">
                    Aurora Roasters
                  </h4>
                  <div className="flex items-center gap-1 text-[var(--hm-text-muted)] text-xs font-medium">
                    <span>Sponsored</span>
                    <span>•</span>
                    <Globe className="w-3 h-3" />
                  </div>
                </div>
              </div>
              <button className="w-9 h-9 rounded-full hover:bg-[#FFF6F0] flex items-center justify-center text-[var(--hm-text-muted)] transition-colors">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
            <p className="px-4 sm:px-5 pb-3 text-[15px] leading-relaxed">
              Start your mornings right with our new single-origin Ethiopian blend. Notes of jasmine, peach, and milk chocolate. ☕✨<br/><br/>
              Order now and get 20% off your first bag with code <span className="font-bold text-[#FF7A1A]">AURORA20</span>
            </p>
            <div className="relative group cursor-pointer">
              <img src="https://picsum.photos/seed/coffee/800/500" alt="Coffee" className="w-full h-[350px] object-cover" />
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4 flex items-end justify-between text-white">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider opacity-80 mb-1">auroraroasters.com</p>
                  <h5 className="font-bold text-xl">Ethiopian Yirgacheffe Blend</h5>
                </div>
                <button className="bg-white text-black px-5 py-2 rounded-full font-bold text-sm hover:bg-gray-100 transition-colors">Shop Now</button>
              </div>
            </div>
            <ReactionRow likes="4.8K" comments="302" shares="89" />
          </div>

          {/* Post 3: Text Post */}
          <PostCard 
            avatar="https://i.pravatar.cc/100?img=33"
            name="Mike Ross"
            time="5 hours ago"
            content="Does anyone else have that one friend who says 'I'm 5 minutes away' when they haven't even put their shoes on yet? Asking for a friend. 🙃🚗"
            likes="342"
            comments="89"
            shares="12"
          />

        </main>

        {/* Right Sidebar */}
        <aside className="hidden xl:block w-[320px] flex-shrink-0 sticky top-24 h-[calc(100vh-6rem)] sunset-scroll overflow-y-auto pb-8 pl-2">
          
          {/* Friend Requests */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-[var(--hm-text-muted)] uppercase text-xs tracking-wider">Friend Requests</h4>
              <button className="text-[#FF7A1A] font-bold text-sm hover:underline">See All</button>
            </div>
            <div className="sunset-card p-4 flex gap-3 items-center mb-2">
              <img src="https://i.pravatar.cc/100?img=55" alt="Emma" className="w-14 h-14 rounded-full object-cover" />
              <div className="flex-1">
                <h5 className="font-bold">Emma Watson</h5>
                <p className="text-xs text-[var(--hm-text-muted)] mb-2">12 mutual friends</p>
                <div className="flex gap-2">
                  <button className="sunset-btn-primary py-1.5 px-4 text-xs flex-1">Confirm</button>
                  <button className="bg-[#FFF0E6] text-[var(--hm-text)] py-1.5 px-4 rounded-full font-bold text-xs hover:bg-[#FFE4D1] transition-colors">Delete</button>
                </div>
              </div>
            </div>
          </div>

          <hr className="border-[var(--hm-border)] my-5" />

          {/* Birthdays */}
          <div className="mb-6">
            <h4 className="font-bold text-[var(--hm-text-muted)] uppercase text-xs tracking-wider mb-4">Birthdays</h4>
            <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/60 cursor-pointer transition-colors">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#FF5A5F] flex items-center justify-center text-white shadow-sm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-8a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8"/><path d="M4 16s.5-1 2-1 2.5 2 4 2 2.5-2 4-2 2.5 2 4 2 2-1 2-1"/><path d="M2 21h20"/><path d="M7 8v3"/><path d="M12 8v3"/><path d="M17 8v3"/><path d="M7 4h.01"/><path d="M12 4h.01"/><path d="M17 4h.01"/></svg>
              </div>
              <p className="text-sm font-medium leading-tight text-[var(--hm-text-muted)]">
                <span className="font-bold text-[var(--hm-text)]">Jason Lee</span> and <span className="font-bold text-[var(--hm-text)]">2 others</span> have birthdays today.
              </p>
            </div>
          </div>

          <hr className="border-[var(--hm-border)] my-5" />

          {/* Contacts */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-[var(--hm-text-muted)] uppercase text-xs tracking-wider">Contacts</h4>
              <div className="flex gap-2">
                <button className="text-[var(--hm-text-muted)] hover:bg-white/60 p-1.5 rounded-full transition-colors"><Search className="w-4 h-4" /></button>
                <button className="text-[var(--hm-text-muted)] hover:bg-white/60 p-1.5 rounded-full transition-colors"><MoreHorizontal className="w-4 h-4" /></button>
              </div>
            </div>
            
            <div className="space-y-1">
              <ContactItem name="David Kim" img="https://i.pravatar.cc/100?img=11" online />
              <ContactItem name="Elena Cruz" img="https://i.pravatar.cc/100?img=22" online />
              <ContactItem name="Mike Ross" img="https://i.pravatar.cc/100?img=33" />
              <ContactItem name="Sarah Jenkins" img="https://i.pravatar.cc/100?img=44" online />
              <ContactItem name="Jessica Taylor" img="https://i.pravatar.cc/100?img=47" />
              <ContactItem name="Robert Chen" img="https://i.pravatar.cc/100?img=59" online />
              <ContactItem name="Amanda Smith" img="https://i.pravatar.cc/100?img=68" />
              <ContactItem name="Chris Evans" img="https://i.pravatar.cc/100?img=15" online />
            </div>
          </div>

        </aside>

      </div>
    </div>
  );
}

// --- Subcomponents ---

function NavIcon({ icon: Icon, active, className = "" }: { icon: any, active?: boolean, className?: string }) {
  return (
    <div className={`w-14 xl:w-20 md:w-16 h-12 flex items-center justify-center rounded-2xl cursor-pointer transition-all ${active ? 'bg-[#FFF0E6]' : 'hover:bg-white/50'} ${className} relative`}>
      <Icon className={`w-[26px] h-[26px] ${active ? 'text-[#FF7A1A] stroke-[2.5px]' : 'text-[#7A5F52]'}`} />
      {active && <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-8 h-1 bg-[#FF7A1A] rounded-t-md" />}
    </div>
  );
}

function SidebarItem({ icon: Icon, label, color = "#7A5F52" }: { icon: any, label: string, color?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white/60 cursor-pointer transition-all group">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-white shadow-sm group-hover:scale-105 transition-transform" style={{ color }}>
        <Icon className="w-5 h-5" />
      </div>
      <span className="font-bold text-[15px]">{label}</span>
    </div>
  );
}

function StoryCard({ img, avatar, name }: { img: string, avatar: string, name: string }) {
  return (
    <div className="snap-start flex-shrink-0 w-[140px] h-[220px] rounded-3xl overflow-hidden relative group cursor-pointer">
      <img src={img} alt="Story" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
      <div className="absolute top-3 left-3 w-10 h-10 rounded-full p-[3px] bg-gradient-to-tr from-[#FF7A1A] to-[#D91C84] z-10 shadow-sm">
        <img src={avatar} alt={name} className="w-full h-full rounded-full border-2 border-white object-cover" />
      </div>
      <p className="absolute bottom-3 left-3 right-3 text-white font-bold text-xs leading-tight drop-shadow-md z-10">{name}</p>
    </div>
  );
}

function ComposerBtn({ icon: Icon, label, color, className = "" }: { icon: any, label: string, color: string, className?: string }) {
  return (
    <button className={`flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-full hover:bg-[#FFF6F0] transition-colors flex-1 justify-center ${className}`}>
      <Icon className="w-6 h-6" style={{ color }} />
      <span className="font-bold text-[15px] text-[var(--hm-text-muted)] whitespace-nowrap">{label}</span>
    </button>
  );
}

function PostCard({ 
  avatar, name, verified, time, content, image, likes, comments, shares 
}: { 
  avatar: string, name: string, verified?: boolean, time: string, content: string, image?: string, likes: string, comments: string, shares: string 
}) {
  return (
    <div className="sunset-card overflow-hidden">
      {/* Post Header */}
      <div className="p-4 sm:p-5 pb-3 flex items-center justify-between">
        <div className="flex gap-3 items-center">
          <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover shadow-sm border border-[var(--hm-border)]" />
          <div>
            <h4 className="font-bold text-lg leading-tight flex items-center gap-1 cursor-pointer hover:underline">
              {name}
              {verified && <CheckCircle2 className="w-4 h-4 text-[#FF7A1A] fill-[#FF7A1A] text-white" />}
            </h4>
            <div className="flex items-center gap-1 text-[var(--hm-text-muted)] text-xs font-medium">
              <span>{time}</span>
              <span>•</span>
              <Globe className="w-3 h-3" />
            </div>
          </div>
        </div>
        <button className="w-9 h-9 rounded-full hover:bg-[#FFF6F0] flex items-center justify-center text-[var(--hm-text-muted)] transition-colors">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Post Content */}
      <p className="px-4 sm:px-5 pb-3 text-[15px] leading-relaxed whitespace-pre-wrap">{content}</p>

      {/* Optional Image */}
      {image && (
        <div className="w-full max-h-[500px] overflow-hidden">
          <img src={image} alt="Post content" className="w-full object-cover" />
        </div>
      )}

      {/* Reaction Stats & Buttons */}
      <ReactionRow likes={likes} comments={comments} shares={shares} />
    </div>
  );
}

function ReactionRow({ likes, comments, shares }: { likes: string, comments: string, shares: string }) {
  return (
    <div className="px-4 sm:px-5 py-3">
      {/* Stats */}
      <div className="flex items-center justify-between text-sm text-[var(--hm-text-muted)] mb-3 pb-3 border-b border-[var(--hm-border)]">
        <div className="flex items-center gap-1.5 cursor-pointer hover:underline">
          <div className="flex -space-x-1">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#FF7A1A] to-[#FF5A5F] flex items-center justify-center border-2 border-white z-20">
              <ThumbsUp className="w-2.5 h-2.5 text-white fill-white" />
            </div>
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-400 to-red-600 flex items-center justify-center border-2 border-white z-10">
              <Heart className="w-2.5 h-2.5 text-white fill-white" />
            </div>
          </div>
          <span>{likes}</span>
        </div>
        <div className="flex gap-3">
          <span className="cursor-pointer hover:underline">{comments} comments</span>
          <span className="cursor-pointer hover:underline">{shares} shares</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-1">
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-[#FFF6F0] text-[var(--hm-text-muted)] font-bold transition-colors">
          <ThumbsUp className="w-5 h-5" />
          <span>Like</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-[#FFF6F0] text-[var(--hm-text-muted)] font-bold transition-colors">
          <MessageSquare className="w-5 h-5" />
          <span>Comment</span>
        </button>
        <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl hover:bg-[#FFF6F0] text-[var(--hm-text-muted)] font-bold transition-colors">
          <Share2 className="w-5 h-5" />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
}

function ContactItem({ name, img, online }: { name: string, img: string, online?: boolean }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-2xl hover:bg-white/60 cursor-pointer transition-colors group">
      <div className="relative">
        <img src={img} alt={name} className="w-10 h-10 rounded-full object-cover border border-[var(--hm-border)] group-hover:scale-105 transition-transform" />
        {online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#10B981] border-2 border-[var(--hm-bg)] rounded-full"></div>}
      </div>
      <span className="font-bold text-[14px] text-[var(--hm-text)]">{name}</span>
    </div>
  );
}
