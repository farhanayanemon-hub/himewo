import React from 'react';
import {
  Home, Users, PlaySquare, Component, Store, Bell, MessageCircle,
  Search, Plus, Image as ImageIcon, Video, Smile, MoreHorizontal,
  ThumbsUp, MessageSquare, Share2, Heart, Laugh, Gift, Globe2,
  Bookmark, Flag, Clock, CalendarDays, Activity, Check, X
} from 'lucide-react';
import './aurora.css';

type Theme = 'dark' | 'light';

export function Aurora({ theme = 'dark' }: { theme?: Theme }) {
  return (
    <div className={`aurora-bg aurora-${theme} min-h-screen ap-text`}>
      {/* Header */}
      <header className="aurora-glass-header fixed top-0 w-full z-50 h-16 px-4 flex items-center justify-between">
        <div className="flex items-center gap-4 w-[280px]">
          <div className="text-2xl font-bold tracking-tighter aurora-gradient-text">HiMewo</div>
          <div className="flex items-center aurora-glass rounded-full px-3 py-1.5 w-64">
            <Search size={18} className="ap-muted mr-2" />
            <input
              type="text"
              placeholder="Search HiMewo"
              className="bg-transparent border-none outline-none text-sm w-full ap-text placeholder:opacity-60"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 h-full flex-1 justify-center max-w-[600px]">
          {[
            { icon: Home, active: true },
            { icon: Users },
            { icon: PlaySquare },
            { icon: Component },
            { icon: Store }
          ].map((item, i) => (
            <div key={i} className={`flex-1 h-full flex items-center justify-center cursor-pointer ap-hover rounded-xl transition-colors relative ${item.active ? 'text-teal-400' : 'ap-muted'}`}>
              <item.icon size={26} strokeWidth={item.active ? 2.5 : 2} />
              {item.active && (
                <div className="absolute bottom-0 w-full h-1 bg-gradient-to-r from-teal-400 to-purple-400 rounded-t-full shadow-[0_0_10px_rgba(94,234,212,0.5)]" />
              )}
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 w-[300px] justify-end">
          <button className="aurora-glass w-10 h-10 rounded-full flex items-center justify-center ap-hover transition-colors">
            <MenuIcon size={20} />
          </button>
          <button className="aurora-glass w-10 h-10 rounded-full flex items-center justify-center ap-hover transition-colors relative">
            <MessageCircle size={20} />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center ap-ring border-2">3</span>
          </button>
          <button className="aurora-glass w-10 h-10 rounded-full flex items-center justify-center ap-hover transition-colors relative">
            <Bell size={20} />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center ap-ring border-2">9</span>
          </button>
          <img src="https://i.pravatar.cc/100?img=12" alt="Profile" className="w-10 h-10 rounded-full cursor-pointer border ap-bd-strong ml-2 shadow-[0_0_15px_rgba(192,132,252,0.3)]" />
        </div>
      </header>

      {/* Main Content */}
      <div className="pt-20 max-w-[1400px] mx-auto flex justify-between px-4 gap-6">

        {/* Left Sidebar */}
        <div className="w-[280px] hidden xl:block sticky top-20 h-[calc(100vh-80px)] overflow-y-auto scrollbar-hide pb-4">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3 p-3 rounded-2xl ap-hover cursor-pointer transition-colors aurora-glass-card mb-2">
              <img src="https://i.pravatar.cc/100?img=12" alt="Profile" className="w-11 h-11 rounded-full border ap-bd-strong" />
              <span className="font-semibold text-base">Eleanor Shellstrop</span>
            </div>

            <SidebarItem icon={Users} label="Friends" color="text-teal-400" />
            <SidebarItem icon={PlaySquare} label="Reels" color="text-purple-400" />
            <SidebarItem icon={Component} label="Groups" color="text-blue-400" />
            <SidebarItem icon={Flag} label="Pages" color="text-orange-400" />
            <SidebarItem icon={Store} label="Marketplace" color="text-pink-400" />
            <SidebarItem icon={Gift} label="Earnings" color="text-emerald-400" />

            <div className="h-px ap-divider my-2 mx-3" />
            <h3 className="ap-muted font-semibold px-3 py-2 text-sm uppercase tracking-wider">Shortcuts</h3>

            <SidebarItem icon={Activity} label="Live" />
            <SidebarItem icon={PlaySquare} label="Watch" />
            <SidebarItem icon={CalendarDays} label="Events" />
            <SidebarItem icon={Clock} label="Memories" />
            <SidebarItem icon={Bookmark} label="Saved" />
          </div>
        </div>

        {/* Center Feed */}
        <div className="flex-1 max-w-[680px] min-w-[500px]">

          {/* Stories */}
          <div className="flex gap-3 mb-6 overflow-x-auto scrollbar-hide pb-2 px-1">
            <div className="w-32 h-48 rounded-2xl relative overflow-hidden group cursor-pointer flex-shrink-0 aurora-glass-card">
              <img src="https://i.pravatar.cc/100?img=12" alt="User" className="w-full h-32 object-cover" />
              <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full ap-ring border-[3px] flex items-center justify-center aurora-button z-10 top-[110px]">
                <Plus size={24} className="text-white" />
              </div>
              <span className="absolute bottom-3 left-0 right-0 text-center text-[13px] font-medium ap-text">Create Story</span>
            </div>

            {[
              { img: "https://picsum.photos/seed/s1/200/300", avatar: "https://i.pravatar.cc/100?img=33", name: "Chidi Anagonye" },
              { img: "https://picsum.photos/seed/s2/200/300", avatar: "https://i.pravatar.cc/100?img=47", name: "Tahani Al-Jamil" },
              { img: "https://picsum.photos/seed/s3/200/300", avatar: "https://i.pravatar.cc/100?img=68", name: "Jason Mendoza" },
              { img: "https://picsum.photos/seed/s4/200/300", avatar: "https://i.pravatar.cc/100?img=5", name: "Janet" },
            ].map((story, i) => (
              <div key={i} className="w-32 h-48 rounded-2xl relative overflow-hidden group cursor-pointer flex-shrink-0 shadow-lg">
                <img src={story.img} alt="Story" className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/80" />
                <div className="absolute top-3 left-3 aurora-story-ring z-10">
                  <img src={story.avatar} alt="Avatar" className="w-9 h-9 rounded-full border-2 border-black/40" />
                </div>
                <span className="absolute bottom-3 left-3 text-[13px] font-medium text-white drop-shadow-md z-10">{story.name}</span>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="aurora-glass-card rounded-2xl p-4 mb-6 relative z-10">
            <div className="flex gap-3 mb-4">
              <img src="https://i.pravatar.cc/100?img=12" alt="Profile" className="w-10 h-10 rounded-full border ap-bd" />
              <button className="flex-1 ap-fill ap-hover rounded-full px-4 text-left ap-muted transition-colors border ap-bd">
                What's on your mind, Eleanor?
              </button>
            </div>
            <div className="h-px ap-divider mb-3" />
            <div className="flex justify-between items-center px-2">
              <button className="flex items-center gap-2 text-sm font-medium ap-hover px-3 py-2 rounded-xl transition-colors ap-text">
                <Video size={20} className="text-pink-400" /> Live Video
              </button>
              <button className="flex items-center gap-2 text-sm font-medium ap-hover px-3 py-2 rounded-xl transition-colors ap-text">
                <ImageIcon size={20} className="text-teal-400" /> Photo/Video
              </button>
              <button className="flex items-center gap-2 text-sm font-medium ap-hover px-3 py-2 rounded-xl transition-colors hidden sm:flex ap-text">
                <Smile size={20} className="text-yellow-500" /> Feeling/Activity
              </button>
            </div>
          </div>

          {/* Posts */}
          <div className="space-y-6 pb-20">
            <PostCard
              avatar="https://i.pravatar.cc/100?img=33"
              name="Chidi Anagonye"
              time="2 hours ago"
              content="Just finished reading 'What We Owe to Each Other' for the 400th time. Still finding new nuances in Scanlon's arguments. Anyone want to discuss ethical particularism?"
              likes={42}
              comments={12}
              shares={3}
            />

            <PostCard
              avatar="https://i.pravatar.cc/100?img=47"
              name="Tahani Al-Jamil"
              time="5 hours ago"
              content="Throwback to that time I hosted a small gathering for my dear friend Elon. The ice sculptures were simply divine! ✨🥂"
              image="https://picsum.photos/seed/party/600/400"
              likes={892}
              comments={45}
              shares={18}
            />

            <SponsoredCard />

            <PostCard
              avatar="https://i.pravatar.cc/100?img=68"
              name="Jason Mendoza"
              time="12 hours ago"
              content="BORTLES!!! 🏈🔥 Jaguars are going all the way this year, I can feel it in my bones! Duval till I die!"
              likes={156}
              comments={89}
              shares={12}
            />
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[300px] hidden lg:block sticky top-20 h-[calc(100vh-80px)] overflow-y-auto scrollbar-hide pb-4">
          <div className="flex flex-col gap-6">

            {/* Friend Requests */}
            <div className="aurora-glass-card p-4 rounded-2xl">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold ap-text">Friend Requests</h3>
                <button className="text-teal-400 text-sm hover:underline">See All</button>
              </div>
              <div className="flex items-center gap-3">
                <img src="https://i.pravatar.cc/100?img=8" alt="User" className="w-14 h-14 rounded-full border ap-bd-strong" />
                <div className="flex-1">
                  <h4 className="font-semibold text-[15px]">Michael Realman</h4>
                  <div className="flex items-center gap-1 mt-1 text-xs ap-muted">
                    <div className="flex -space-x-1">
                      <img src="https://i.pravatar.cc/100?img=12" className="w-4 h-4 rounded-full border ap-ring" />
                      <img src="https://i.pravatar.cc/100?img=33" className="w-4 h-4 rounded-full border ap-ring" />
                    </div>
                    <span>4 mutual friends</span>
                  </div>
                  <div className="flex gap-2 mt-2">
                    <button className="bg-teal-500 hover:bg-teal-400 text-slate-900 font-semibold px-3 py-1.5 rounded-lg text-sm flex-1 transition-colors">Confirm</button>
                    <button className="ap-fill-2 ap-hover ap-text font-semibold px-3 py-1.5 rounded-lg text-sm flex-1 transition-colors">Delete</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Birthdays */}
            <div>
              <h3 className="font-semibold ap-muted text-sm uppercase tracking-wider mb-3 px-1">Birthdays</h3>
              <div className="flex items-center gap-3 p-3 rounded-xl ap-hover transition-colors cursor-pointer">
                <Gift className="text-purple-400" size={28} />
                <p className="text-sm ap-text">
                  <span className="font-semibold">Simone Garnett</span> and <span className="font-semibold">2 others</span> have birthdays today.
                </p>
              </div>
            </div>

            <div className="h-px ap-divider" />

            {/* Contacts */}
            <div>
              <div className="flex justify-between items-center mb-3 px-1">
                <h3 className="font-semibold ap-muted text-sm uppercase tracking-wider">Contacts</h3>
                <div className="flex gap-3 ap-muted">
                  <Search size={16} className="cursor-pointer hover:opacity-70" />
                  <MoreHorizontal size={16} className="cursor-pointer hover:opacity-70" />
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {[
                  { name: "Chidi Anagonye", img: 33 },
                  { name: "Tahani Al-Jamil", img: 47 },
                  { name: "Jason Mendoza", img: 68 },
                  { name: "Janet", img: 5 },
                  { name: "Mindy St. Claire", img: 9 },
                  { name: "Derek", img: 11 },
                  { name: "Shawn", img: 14 },
                ].map((contact, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 rounded-xl ap-hover transition-colors cursor-pointer relative group">
                    <div className="relative">
                      <img src={`https://i.pravatar.cc/100?img=${contact.img}`} alt={contact.name} className="w-9 h-9 rounded-full border ap-bd" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 ap-ring" />
                    </div>
                    <span className="font-medium text-[15px]">{contact.name}</span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}

export default Aurora;

function MenuIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
      <circle cx="5" cy="12" r="1" />
      <circle cx="5" cy="5" r="1" />
      <circle cx="5" cy="19" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="19" cy="5" r="1" />
      <circle cx="19" cy="19" r="1" />
    </svg>
  );
}

function SidebarItem({ icon: Icon, label, color = "ap-text" }: { icon: any, label: string, color?: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl ap-hover cursor-pointer transition-colors group">
      <Icon size={24} className={`${color} group-hover:scale-110 transition-transform`} />
      <span className="font-medium text-[15px]">{label}</span>
    </div>
  );
}

function PostCard({ avatar, name, time, content, image, likes, comments, shares }: any) {
  return (
    <div className="aurora-glass-card rounded-2xl overflow-hidden relative z-10 group">
      <div className="p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-3">
            <img src={avatar} alt={name} className="w-10 h-10 rounded-full border ap-bd-strong" />
            <div>
              <div className="flex items-center gap-1">
                <h3 className="font-semibold text-[15px] hover:underline cursor-pointer">{name}</h3>
                <Check size={14} className="bg-teal-500 text-white rounded-full p-[2px]" />
              </div>
              <div className="flex items-center gap-1 text-xs ap-muted">
                <span className="hover:underline cursor-pointer">{time}</span>
                <span>·</span>
                <Globe2 size={12} />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="w-8 h-8 rounded-full ap-hover flex items-center justify-center ap-muted transition-colors">
              <MoreHorizontal size={20} />
            </button>
            <button className="w-8 h-8 rounded-full ap-hover flex items-center justify-center ap-muted transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <p className="text-[15px] ap-text mb-3">{content}</p>
      </div>

      {image && (
        <div className="w-full border-y ap-bd">
          <img src={image} alt="Post content" className="w-full max-h-[500px] object-cover" />
        </div>
      )}

      <div className="px-4 py-2">
        <div className="flex justify-between items-center text-sm ap-muted py-2 border-b ap-bd">
          <div className="flex items-center gap-1">
            <div className="flex -space-x-1">
              <div className="w-5 h-5 rounded-full bg-teal-500 flex items-center justify-center border ap-ring z-20">
                <ThumbsUp size={10} className="text-white fill-white" />
              </div>
              <div className="w-5 h-5 rounded-full bg-pink-500 flex items-center justify-center border ap-ring z-10">
                <Heart size={10} className="text-white fill-white" />
              </div>
              <div className="w-5 h-5 rounded-full bg-yellow-500 flex items-center justify-center border ap-ring z-0">
                <Laugh size={12} className="text-white" />
              </div>
            </div>
            <span className="ml-1 hover:underline cursor-pointer">{likes}</span>
          </div>
          <div className="flex gap-3">
            <span className="hover:underline cursor-pointer">{comments} comments</span>
            <span className="hover:underline cursor-pointer">{shares} shares</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-1 mt-1">
          <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl ap-hover ap-text font-medium transition-colors">
            <ThumbsUp size={20} /> Like
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl ap-hover ap-text font-medium transition-colors">
            <MessageSquare size={20} /> Comment
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl ap-hover ap-text font-medium transition-colors">
            <Share2 size={20} /> Share
          </button>
        </div>
      </div>
    </div>
  );
}

function SponsoredCard() {
  return (
    <div className="aurora-glass-card rounded-2xl overflow-hidden relative z-10 p-[1px] group">
      <div className="absolute inset-0 bg-gradient-to-br from-teal-400/20 via-purple-400/20 to-pink-400/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      <div className="aurora-glass-card rounded-2xl h-full relative z-10 p-4">
        <div className="flex justify-between items-start mb-3">
          <div className="flex gap-3">
            <img src="https://picsum.photos/seed/brand/100" alt="Brand" className="w-10 h-10 rounded-xl border ap-bd-strong" />
            <div>
              <h3 className="font-semibold text-[15px] hover:underline cursor-pointer flex items-center gap-1">
                Lumina Audio <Check size={14} className="bg-teal-500 text-white rounded-full p-[2px]" />
              </h3>
              <div className="flex items-center gap-1 text-xs ap-muted">
                <span>Sponsored</span>
                <span>·</span>
                <Globe2 size={12} />
              </div>
            </div>
          </div>
          <button className="w-8 h-8 rounded-full ap-hover flex items-center justify-center ap-muted transition-colors">
            <MoreHorizontal size={20} />
          </button>
        </div>

        <p className="text-[15px] ap-text mb-3">Experience sound like never before. The new Lumina A1 spatial audio headphones are here. Pre-order now and get ৳2,000 off.</p>

        <div className="w-[calc(100%+32px)] -mx-4 border-y ap-bd relative">
          <img src="https://picsum.photos/seed/headphones/600/400" alt="Ad content" className="w-full max-h-[400px] object-cover" />
          <div className="absolute bottom-4 right-4 aurora-glass px-3 py-1 rounded-lg text-sm font-semibold ap-text">
            ৳14,990
          </div>
        </div>

        <div className="ap-fill -mx-4 -mb-4 p-3 px-4 flex justify-between items-center">
          <div>
            <h4 className="text-xs ap-muted uppercase tracking-wider font-semibold">lumina-audio.com</h4>
            <h3 className="font-bold ap-text">Lumina A1 Spatial Audio</h3>
          </div>
          <button className="aurora-button text-white font-bold px-4 py-2 rounded-xl text-sm shadow-lg">
            Shop Now
          </button>
        </div>
      </div>
    </div>
  );
}
