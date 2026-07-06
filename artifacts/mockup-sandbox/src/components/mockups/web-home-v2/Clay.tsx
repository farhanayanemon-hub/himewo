import React from 'react';
import { Search, Home, Users, MonitorPlay, Store, Bookmark, Bell, MessageCircle, MoreHorizontal, Globe, ThumbsUp, MessageSquare, Share2, Image as ImageIcon, Smile, Video, CheckCircle2 } from 'lucide-react';
import './clay_styles.css';

const MOCK_DATA = {
  stories: [
    { id: 1, name: 'Create Story', avatar: 'https://i.pravatar.cc/100?img=12', bg: '', isCreate: true },
    { id: 2, name: 'Alice Cooper', avatar: 'https://i.pravatar.cc/100?img=5', bg: 'https://picsum.photos/seed/s1/300/500' },
    { id: 3, name: 'Bob Marley', avatar: 'https://i.pravatar.cc/100?img=8', bg: 'https://picsum.photos/seed/s2/300/500' },
    { id: 4, name: 'Charlie Day', avatar: 'https://i.pravatar.cc/100?img=15', bg: 'https://picsum.photos/seed/s3/300/500' },
    { id: 5, name: 'Diana Ross', avatar: 'https://i.pravatar.cc/100?img=20', bg: 'https://picsum.photos/seed/s4/300/500' },
  ],
  posts: [
    {
      id: 1,
      author: 'Sarah Jenkins',
      avatar: 'https://i.pravatar.cc/100?img=22',
      verified: true,
      time: '2 hours ago',
      content: 'Just finished setting up my new home office! The natural light in here is incredible. Ready to crush some code this week! 💻✨',
      image: 'https://picsum.photos/seed/desk/600/400',
      likes: 245,
      comments: 42,
      shares: 12
    },
    {
      id: 2,
      author: 'Design Masters',
      avatar: 'https://i.pravatar.cc/100?img=11',
      verified: false,
      time: '5 hours ago',
      content: 'What are your thoughts on claymorphism? Is it just a passing trend or will we see more 3D interfaces in the coming years? We wrote a full breakdown on our blog.',
      image: null,
      likes: 89,
      comments: 156,
      shares: 34
    }
  ],
  contacts: [
    { id: 1, name: 'Tom Hardy', avatar: 'https://i.pravatar.cc/100?img=33', online: true },
    { id: 2, name: 'Emma Stone', avatar: 'https://i.pravatar.cc/100?img=44', online: true },
    { id: 3, name: 'Chris Pratt', avatar: 'https://i.pravatar.cc/100?img=55', online: false },
    { id: 4, name: 'Zendaya', avatar: 'https://i.pravatar.cc/100?img=41', online: true },
    { id: 5, name: 'Ryan Reynolds', avatar: 'https://i.pravatar.cc/100?img=60', online: true },
  ]
};

function TopNav() {
  return (
    <div className="h-16 md:h-20 flex items-center justify-between px-4 md:px-6 sticky top-0 z-50 clay-panel" style={{ borderBottom: '1px solid transparent' }}>
      <div className="flex items-center gap-4 w-1/4">
        <div className="clay-card w-12 h-12 flex items-center justify-center text-xl font-black shrink-0" style={{ color: 'var(--primary)' }}>
          H
        </div>
        <div className="relative hidden xl:block w-64">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
          <input type="text" placeholder="Search HiMewo..." className="clay-input pl-12 h-12" />
        </div>
      </div>
      
      <div className="flex items-center gap-2 md:gap-6 justify-center flex-1 lg:w-2/4">
        <button className="clay-nav-icon active w-12 h-12 md:w-14 md:h-14">
          <Home className="w-6 h-6 md:w-7 md:h-7" />
        </button>
        <button className="clay-nav-icon w-12 h-12 md:w-14 md:h-14">
          <Users className="w-6 h-6 md:w-7 md:h-7" />
        </button>
        <button className="clay-nav-icon w-12 h-12 md:w-14 md:h-14 hidden sm:flex">
          <MonitorPlay className="w-6 h-6 md:w-7 md:h-7" />
        </button>
        <button className="clay-nav-icon w-12 h-12 md:w-14 md:h-14 hidden md:flex">
          <Store className="w-6 h-6 md:w-7 md:h-7" />
        </button>
      </div>
      
      <div className="flex items-center justify-end gap-3 md:gap-4 w-1/4">
        <button className="clay-nav-icon relative w-10 h-10 md:w-12 md:h-12 shrink-0">
          <Bell className="w-5 h-5 md:w-6 md:h-6" />
          <span className="clay-badge">3</span>
        </button>
        <button className="clay-nav-icon relative w-10 h-10 md:w-12 md:h-12 shrink-0">
          <MessageCircle className="w-5 h-5 md:w-6 md:h-6" />
          <span className="clay-badge">5</span>
        </button>
        <img src="https://i.pravatar.cc/100?img=12" alt="Profile" className="w-10 h-10 md:w-12 md:h-12 clay-avatar ml-1 md:ml-2 shrink-0" />
      </div>
    </div>
  );
}

function LeftSidebar() {
  const items = [
    { icon: <img src="https://i.pravatar.cc/100?img=12" className="w-8 h-8 rounded-lg" />, label: 'Jessica Doe' },
    { icon: <Users className="w-6 h-6" style={{ color: 'var(--mint)' }} />, label: 'Friends' },
    { icon: <Store className="w-6 h-6" style={{ color: 'var(--peach)' }} />, label: 'Marketplace' },
    { icon: <MonitorPlay className="w-6 h-6" style={{ color: 'var(--sky)' }} />, label: 'Reels' },
    { icon: <Bookmark className="w-6 h-6" style={{ color: 'var(--primary)' }} />, label: 'Saved' },
  ];

  return (
    <div className="w-[280px] flex-col gap-2 sticky top-24 shrink-0 h-[calc(100vh-120px)] overflow-y-auto hide-scrollbar hidden lg:flex">
      {items.map((item, i) => (
        <button key={i} className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[var(--bg-card)] transition-colors text-[var(--text-main)] font-bold text-lg text-left">
          <div className="w-12 h-12 clay-button shrink-0">
            {item.icon}
          </div>
          {item.label}
        </button>
      ))}
      <div className="my-4 mx-4 h-[2px] rounded-full" style={{ backgroundColor: 'var(--shadow-dark)', opacity: 0.1 }} />
      <h3 className="px-4 text-[var(--text-muted)] font-bold text-lg mb-2">Your Shortcuts</h3>
      <button className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[var(--bg-card)] transition-colors text-[var(--text-main)] font-bold text-lg">
        <div className="w-12 h-12 clay-button shrink-0 overflow-hidden">
          <img src="https://picsum.photos/seed/g1/100/100" className="w-full h-full object-cover" />
        </div>
        Design Thinkers
      </button>
      <button className="flex items-center gap-4 p-3 rounded-2xl hover:bg-[var(--bg-card)] transition-colors text-[var(--text-main)] font-bold text-lg">
        <div className="w-12 h-12 clay-button shrink-0 overflow-hidden">
          <img src="https://picsum.photos/seed/g2/100/100" className="w-full h-full object-cover" />
        </div>
        UI/UX Inspiration
      </button>
    </div>
  );
}

function CenterFeed() {
  return (
    <div className="flex-1 max-w-[680px] w-full mx-auto flex flex-col gap-6 lg:gap-8 pb-20">
      
      {/* Stories */}
      <div className="flex gap-4 overflow-x-auto pb-4 pt-2 px-2 -mx-2 hide-scrollbar">
        {MOCK_DATA.stories.map((story) => (
          <div key={story.id} className="clay-story-card flex flex-col cursor-pointer group">
            {story.isCreate ? (
              <>
                <img src={story.avatar} className="w-full h-[65%] object-cover" />
                <div className="absolute top-[55%] left-1/2 -translate-x-1/2 w-10 h-10 clay-button-primary border-4 border-[var(--bg-card)]">
                  <span className="text-2xl font-black mt-[-2px]">+</span>
                </div>
                <div className="flex-1 bg-[var(--bg-card)] flex items-end justify-center pb-3 font-bold text-sm text-[var(--text-main)]">
                  Create Story
                </div>
              </>
            ) : (
              <>
                <img src={story.bg} className="clay-story-img group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute top-4 left-4 w-10 h-10 clay-avatar p-[2px] bg-[var(--primary)] shrink-0">
                  <img src={story.avatar} className="w-full h-full rounded-xl object-cover" />
                </div>
                <div className="absolute bottom-4 left-4 right-4 font-bold text-white text-sm drop-shadow-md z-10 leading-tight">
                  {story.name}
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent pointer-events-none" />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="clay-card-raised p-4 md:p-6 flex flex-col gap-4">
        <div className="flex gap-4 items-center">
          <img src="https://i.pravatar.cc/100?img=12" className="w-12 h-12 clay-avatar shrink-0" />
          <input type="text" placeholder="What's on your soft, puffy mind, Jessica?" className="clay-input flex-1" />
        </div>
        <div className="h-[2px] rounded-full mx-2" style={{ backgroundColor: 'var(--shadow-dark)', opacity: 0.1 }} />
        <div className="flex justify-between items-center px-2">
          <button className="flex items-center gap-2 text-[var(--text-muted)] font-bold hover:bg-[var(--bg-card)] rounded-xl transition-colors p-2 flex-1 justify-center">
            <Video className="w-6 h-6 text-red-400" />
            <span className="hidden sm:inline">Live Video</span>
          </button>
          <button className="flex items-center gap-2 text-[var(--text-muted)] font-bold hover:bg-[var(--bg-card)] rounded-xl transition-colors p-2 flex-1 justify-center">
            <ImageIcon className="w-6 h-6 text-green-400" />
            <span className="hidden sm:inline">Photo/Video</span>
          </button>
          <button className="flex items-center gap-2 text-[var(--text-muted)] font-bold hover:bg-[var(--bg-card)] rounded-xl transition-colors p-2 flex-1 justify-center">
            <Smile className="w-6 h-6 text-yellow-400" />
            <span className="hidden sm:inline">Feeling/Activity</span>
          </button>
        </div>
      </div>

      {/* Posts */}
      {MOCK_DATA.posts.map((post) => (
        <div key={post.id} className="clay-card-raised p-4 md:p-6 flex flex-col gap-4 md:gap-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <img src={post.avatar} className="w-10 h-10 md:w-12 md:h-12 clay-avatar shrink-0" />
              <div>
                <div className="flex items-center gap-1">
                  <h4 className="font-bold text-base md:text-lg text-[var(--text-main)]">{post.author}</h4>
                  {post.verified && <CheckCircle2 className="w-4 h-4 text-[var(--primary)]" />}
                </div>
                <div className="flex items-center gap-2 text-[var(--text-muted)] text-xs md:text-sm font-semibold">
                  <span>{post.time}</span>
                  <span>•</span>
                  <Globe className="w-3 h-3" />
                </div>
              </div>
            </div>
            <button className="w-8 h-8 md:w-10 md:h-10 clay-button text-[var(--text-muted)] shrink-0">
              <MoreHorizontal className="w-4 h-4 md:w-5 md:h-5" />
            </button>
          </div>

          <p className="text-[var(--text-main)] text-base md:text-lg leading-relaxed">{post.content}</p>

          {post.image && (
            <div className="rounded-2xl overflow-hidden -mx-2 md:mx-0 my-2 shadow-[inset_4px_4px_8px_var(--shadow-dark),inset_-4px_-4px_8px_var(--shadow-light)]" style={{ boxShadow: 'inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light)' }}>
              <img src={post.image} className="w-full h-auto object-cover max-h-[400px]" />
            </div>
          )}

          <div className="flex items-center justify-between text-[var(--text-muted)] font-bold text-xs md:text-sm px-2 mt-2">
            <div className="flex items-center gap-2">
              <div className="flex -space-x-1">
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-blue-500 flex items-center justify-center text-white text-[10px] z-20 border border-white">👍</div>
                <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-red-500 flex items-center justify-center text-white text-[10px] z-10 border border-white">❤️</div>
              </div>
              <span>{post.likes}</span>
            </div>
            <div className="flex gap-3 md:gap-4">
              <span>{post.comments} Comments</span>
              <span>{post.shares} Shares</span>
            </div>
          </div>

          <div className="h-[2px] rounded-full mx-2" style={{ backgroundColor: 'var(--shadow-dark)', opacity: 0.1 }} />

          <div className="flex justify-between items-center px-2 md:px-4">
            <button className="flex items-center justify-center gap-1 md:gap-2 text-[var(--text-muted)] font-bold hover:text-[var(--primary)] flex-1 p-2 rounded-xl hover:bg-[var(--bg-card)] transition-colors">
              <ThumbsUp className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Like</span>
            </button>
            <button className="flex items-center justify-center gap-1 md:gap-2 text-[var(--text-muted)] font-bold hover:text-[var(--primary)] flex-1 p-2 rounded-xl hover:bg-[var(--bg-card)] transition-colors">
              <MessageSquare className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Comment</span>
            </button>
            <button className="flex items-center justify-center gap-1 md:gap-2 text-[var(--text-muted)] font-bold hover:text-[var(--primary)] flex-1 p-2 rounded-xl hover:bg-[var(--bg-card)] transition-colors">
              <Share2 className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-sm md:text-base">Share</span>
            </button>
          </div>
        </div>
      ))}

    </div>
  );
}

function RightSidebar() {
  return (
    <div className="w-[320px] flex-col gap-8 sticky top-24 shrink-0 h-[calc(100vh-120px)] overflow-y-auto hide-scrollbar hidden xl:flex">
      
      {/* Sponsored */}
      <div className="flex flex-col gap-4">
        <h3 className="text-[var(--text-muted)] font-bold text-lg px-2">Sponsored</h3>
        <div className="clay-card p-4 flex flex-col gap-3 group cursor-pointer hover:-translate-y-1 transition-transform">
          <div className="rounded-xl overflow-hidden" style={{ boxShadow: 'inset 3px 3px 6px var(--shadow-dark), inset -3px -3px 6px var(--shadow-light)' }}>
            <img src="https://picsum.photos/seed/ad1/300/150" className="w-full h-[140px] object-cover group-hover:scale-105 transition-transform duration-500" />
          </div>
          <div className="mt-1">
            <h4 className="font-bold text-[var(--text-main)] text-lg">Clay UI Kit Pro</h4>
            <p className="text-sm text-[var(--text-muted)] font-semibold mt-1">ui-masters.com</p>
          </div>
          <div className="flex items-center justify-between mt-2">
            <span className="font-black text-[var(--primary)] text-xl">৳ 1,450</span>
            <button className="clay-button-primary px-5 py-2 text-sm">Shop Now</button>
          </div>
        </div>
      </div>

      <div className="my-2 mx-4 h-[2px] rounded-full" style={{ backgroundColor: 'var(--shadow-dark)', opacity: 0.1 }} />

      {/* Contacts */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <h3 className="text-[var(--text-muted)] font-bold text-lg">Contacts</h3>
          <div className="flex gap-2">
            <button className="w-8 h-8 clay-button text-[var(--text-muted)]">
              <Search className="w-4 h-4" />
            </button>
            <button className="w-8 h-8 clay-button text-[var(--text-muted)]">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          {MOCK_DATA.contacts.map((contact) => (
            <button key={contact.id} className="flex items-center gap-4 p-2 rounded-2xl hover:bg-[var(--bg-card)] transition-colors text-left w-full group">
              <div className="relative shrink-0">
                <img src={contact.avatar} className="w-12 h-12 clay-avatar group-hover:scale-105 transition-transform" />
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white" style={{ borderColor: 'var(--bg-app)' }} />
                )}
              </div>
              <span className="font-bold text-[var(--text-main)] text-lg">{contact.name}</span>
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}

export function Clay() {
  return (
    <div className="clay-theme flex w-[2560px] h-screen bg-[#111] overflow-hidden">

      {/* LIGHT MODE PANEL */}
      <div className="clay-light relative w-[1280px] h-full shrink-0 overflow-y-auto overflow-x-hidden">
        <div className="absolute top-6 left-6 z-[60] pointer-events-none">
          <div className="clay-pill">LIGHT MODE</div>
        </div>
        <div className="clay-panel w-full">
          <TopNav />
          <div className="flex justify-center max-w-[1280px] mx-auto pt-6 px-4 md:px-6 gap-6 lg:gap-8">
            <LeftSidebar />
            <CenterFeed />
            <RightSidebar />
          </div>
        </div>
      </div>

      {/* DARK MODE PANEL */}
      <div className="clay-dark relative w-[1280px] h-full shrink-0 overflow-y-auto overflow-x-hidden border-l border-white/5">
        <div className="absolute top-6 left-6 z-[60] pointer-events-none">
          <div className="clay-pill">DARK MODE</div>
        </div>
        <div className="clay-panel w-full">
          <TopNav />
          <div className="flex justify-center max-w-[1280px] mx-auto pt-6 px-4 md:px-6 gap-6 lg:gap-8">
            <LeftSidebar />
            <CenterFeed />
            <RightSidebar />
          </div>
        </div>
      </div>

    </div>
  );
}
