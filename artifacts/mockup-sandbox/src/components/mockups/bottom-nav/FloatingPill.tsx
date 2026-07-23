import React, { useState } from 'react';
import { Home, Users, Clapperboard, Bell, MoreHorizontal, Heart, MessageCircle, Share2, Search, Zap } from 'lucide-react';

const contentData = [
  {
    id: 1,
    name: "Alex Rivera",
    time: "2h ago",
    content: "Just built the slickest bottom navigation bar. Floating pills are definitely the future of mobile UI! 🚀",
    likes: "2.4k",
    comments: "128",
    shares: "45",
    color: "from-violet-100 to-fuchsia-100",
    text: "text-violet-600",
    placeholderClasses: "bg-gradient-to-tr from-violet-500/10 via-fuchsia-500/10 to-pink-500/10"
  },
  {
    id: 2,
    name: "Sam Chen",
    time: "5h ago",
    content: "Sunday morning explorations. Finding new ways to make interfaces feel more alive and playful. ✨",
    likes: "856",
    comments: "32",
    shares: "12",
    color: "from-amber-100 to-orange-100",
    text: "text-amber-600",
    placeholderClasses: "bg-gradient-to-tr from-amber-500/10 via-orange-500/10 to-rose-500/10"
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

function NavAvatar({ src, isActive, onClick }: any) {
  return (
    <button onClick={onClick} className="relative flex items-center justify-center group outline-none pointer-events-auto h-full">
      <div className={`flex items-center justify-center rounded-full transition-all duration-300 ${isActive ? 'bg-violet-100/80 text-violet-700 px-3 py-2 shadow-[0_2px_10px_rgba(139,92,246,0.15)] gap-2' : 'bg-transparent p-2 group-hover:opacity-80'}`}>
        <div className={`transition-transform duration-300 ${isActive ? 'scale-100' : 'group-active:scale-90'}`}>
          <img src={src} alt="Profile" className={`rounded-full object-cover shadow-sm ${isActive ? 'w-[22px] h-[22px] border-2 border-violet-200' : 'w-[26px] h-[26px] border-2 border-white ring-1 ring-gray-200'}`} />
        </div>
        
        {isActive && (
          <span className="text-[14px] font-bold tracking-tight pr-1 whitespace-nowrap overflow-hidden">
            Profile
          </span>
        )}
      </div>
    </button>
  );
}

function PostCard({ post }: any) {
  return (
    <div className="bg-white rounded-[24px] p-5 shadow-[0_2px_12px_rgb(0,0,0,0.02)] border border-gray-100 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${post.color} flex items-center justify-center font-bold ${post.text} text-[15px]`}>
            {post.name[0]}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-[15px] leading-tight">{post.name}</h3>
            <p className="text-[13px] text-gray-400 font-medium">{post.time}</p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-50 transition-colors">
          <MoreHorizontal size={20} />
        </button>
      </div>
      <p className="text-[15px] text-gray-700 leading-relaxed mb-4">{post.content}</p>
      <div className={`h-[200px] rounded-[16px] mb-4 overflow-hidden relative border border-gray-50 ${post.placeholderClasses}`}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-white/40 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-black/5 rounded-full blur-2xl -translate-x-1/4 translate-y-1/4"></div>
      </div>
      <div className="flex items-center justify-between text-gray-500 px-1">
        <button className="flex items-center gap-1.5 text-[13px] font-semibold hover:text-rose-500 transition-colors group">
          <Heart size={18} className="group-hover:fill-rose-500/20 transition-all" /> {post.likes}
        </button>
        <button className="flex items-center gap-1.5 text-[13px] font-semibold hover:text-violet-500 transition-colors group">
          <MessageCircle size={18} className="group-hover:fill-violet-500/20 transition-all" /> {post.comments}
        </button>
        <button className="flex items-center gap-1.5 text-[13px] font-semibold hover:text-blue-500 transition-colors">
          <Share2 size={18} /> {post.shares}
        </button>
      </div>
    </div>
  )
}

export default function FloatingPill() {
  const [activeTab, setActiveTab] = useState('Home');

  return (
    <div className="relative w-full max-w-[420px] mx-auto bg-[#F8F9FA] min-h-[100dvh] shadow-2xl flex flex-col font-sans overflow-hidden border-x border-gray-100">
      
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-xl px-5 pt-12 pb-4 flex items-center justify-between sticky top-0 z-20 border-b border-gray-100/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center shadow-sm">
            <Zap size={18} className="text-white fill-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-br from-violet-600 to-fuchsia-500 bg-clip-text text-transparent">HiMewo</h1>
        </div>
        <div className="flex gap-2">
          <button className="w-10 h-10 rounded-full bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] border border-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-50 transition-colors">
            <Search size={20} strokeWidth={2.5} />
          </button>
        </div>
      </header>
      
      {/* Feed Content */}
      <main className="flex-1 overflow-y-auto pb-40 px-4 pt-5 space-y-2 relative z-0">
        {contentData.map(post => (
          <PostCard key={post.id} post={post} />
        ))}
        {/* Extra spacing for bottom nav */}
        <div className="h-20"></div>
      </main>

      {/* Floating Bottom Nav Container */}
      <div className="absolute bottom-0 left-0 right-0 w-full px-5 pb-8 pt-12 z-50 pointer-events-none bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA]/90 to-transparent">
        
        {/* The Pill */}
        <div className="relative flex items-center justify-between w-full bg-white rounded-full shadow-[0_20px_40px_-10px_rgba(0,0,0,0.1)] h-[72px] pointer-events-auto border border-gray-100/80">
          
          {/* Left Side */}
          <div className="flex flex-1 justify-around items-center h-full pl-2 pr-10">
            <NavItem icon={<Home />} label="Home" isActive={activeTab === 'Home'} onClick={() => setActiveTab('Home')} />
            <NavItem icon={<Users />} label="Friends" isActive={activeTab === 'Friends'} onClick={() => setActiveTab('Friends')} />
          </div>
          
          {/* Raised Center Reels Button */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-6 flex items-center justify-center z-10 pointer-events-auto">
            {/* Glow effect under the button */}
            <div className="absolute inset-0 bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-full blur-[16px] opacity-40 top-8 scale-90 pointer-events-none"></div>
            
            <button className="relative z-10 w-[64px] h-[64px] rounded-full bg-gradient-to-tr from-violet-600 to-fuchsia-500 flex items-center justify-center text-white transition-transform hover:scale-105 active:scale-95 group border-[4px] border-white shadow-[0_8px_20px_rgba(168,85,247,0.3)]">
              <Clapperboard size={28} strokeWidth={2.5} className="group-active:-rotate-12 transition-transform duration-300" />
            </button>
          </div>
          
          {/* Right Side */}
          <div className="flex flex-1 justify-around items-center h-full pr-2 pl-10">
            <NavItem icon={<Bell />} label="Alerts" badge="3" isActive={activeTab === 'Alerts'} onClick={() => setActiveTab('Alerts')} />
            <NavAvatar src="https://i.pravatar.cc/100?img=13" isActive={activeTab === 'Profile'} onClick={() => setActiveTab('Profile')} />
          </div>

        </div>
      </div>
      
      {/* Home Indicator (iOS Safe Area) */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-[4px] bg-black/20 rounded-full z-50 pointer-events-none"></div>
    </div>
  );
}
