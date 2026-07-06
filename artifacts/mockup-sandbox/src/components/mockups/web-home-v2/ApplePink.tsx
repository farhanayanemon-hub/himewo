import React from 'react';
import { 
  Home, 
  Users, 
  PlaySquare, 
  Store, 
  Bookmark, 
  Bell, 
  MessageSquare, 
  Search,
  MoreHorizontal,
  ThumbsUp,
  MessageCircle,
  Share2,
  Image as ImageIcon,
  Smile,
  Video,
  CheckCircle2,
  Globe2,
  ExternalLink,
  Plus
} from 'lucide-react';

const MOCK_DATA = {
  stories: [
    { id: 1, name: 'Add Story', avatar: 'https://i.pravatar.cc/100?img=12', image: 'https://picsum.photos/seed/10/200/300', isCreate: true },
    { id: 2, name: 'Alice Chen', avatar: 'https://i.pravatar.cc/100?img=5', image: 'https://picsum.photos/seed/20/200/300' },
    { id: 3, name: 'David Park', avatar: 'https://i.pravatar.cc/100?img=8', image: 'https://picsum.photos/seed/30/200/300' },
    { id: 4, name: 'Sarah Jin', avatar: 'https://i.pravatar.cc/100?img=9', image: 'https://picsum.photos/seed/40/200/300' },
  ],
  posts: [
    {
      id: 1,
      author: 'Apple',
      avatar: 'https://i.pravatar.cc/100?img=33',
      time: '2h',
      verified: true,
      content: 'Introducing the new iPhone 15 Pro. Titanium design, A17 Pro chip, Action button, and USB-C.',
      image: 'https://picsum.photos/seed/apple1/600/400',
      likes: 12405,
      comments: 3422,
      shares: 891,
    },
    {
      id: 2,
      author: 'Craig Federighi',
      avatar: 'https://i.pravatar.cc/100?img=11',
      time: '5h',
      verified: true,
      content: 'Just wrapped up WWDC! So excited for everyone to get their hands on iOS 18 and macOS Sequoia. The new design language is going to change everything.',
      image: null,
      likes: 8921,
      comments: 1563,
      shares: 450,
    }
  ],
  contacts: [
    { id: 1, name: 'Elena Rostova', avatar: 'https://i.pravatar.cc/100?img=41' },
    { id: 2, name: 'Michael Chang', avatar: 'https://i.pravatar.cc/100?img=52' },
    { id: 3, name: 'Priya Sharma', avatar: 'https://i.pravatar.cc/100?img=43' },
    { id: 4, name: 'James Wilson', avatar: 'https://i.pravatar.cc/100?img=14' },
    { id: 5, name: 'Sofia Garcia', avatar: 'https://i.pravatar.cc/100?img=35' },
    { id: 6, name: 'Alex Thompson', avatar: 'https://i.pravatar.cc/100?img=68' },
  ]
};

function AppContent({ theme }: { theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  
  // iOS / Apple Color Palette
  const bgMain = isDark ? 'bg-black' : 'bg-[#F2F2F7]';
  const bgCard = isDark ? 'bg-[#1C1C1E]' : 'bg-white';
  const bgElevated = isDark ? 'bg-[#2C2C2E]' : 'bg-[#E5E5EA]';
  const bgGlass = isDark ? 'bg-black/60' : 'bg-[#F2F2F7]/70';
  
  const textPrimary = isDark ? 'text-white' : 'text-black';
  const textSecondary = isDark ? 'text-[#8E8E93]' : 'text-[#8E8E93]'; // System gray
  
  const borderSubtle = isDark ? 'border-[#38383A]' : 'border-[#E5E5EA]';
  const hoverBg = isDark ? 'hover:bg-[#2C2C2E]' : 'hover:bg-[#E5E5EA]';
  
  const accentColor = isDark ? 'text-[#FF375F]' : 'text-[#FF2D55]';
  const accentBg = isDark ? 'bg-[#FF375F]' : 'bg-[#FF2D55]';
  const accentLightBg = isDark ? 'bg-[#FF375F]/15' : 'bg-[#FF2D55]/10';

  return (
    <div style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }} className={`min-h-screen ${bgMain} ${textPrimary} flex flex-col overflow-hidden`}>
      {/* Top Navbar */}
      <nav className={`h-14 ${bgGlass} backdrop-blur-xl border-b ${borderSubtle} flex items-center justify-between px-4 shrink-0 sticky top-0 z-40`}>
        <div className="flex items-center gap-4 w-1/3">
          <div className="font-semibold text-xl tracking-tight flex items-center gap-2">
            HiMewo
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${bgElevated} transition-colors w-64`}>
            <Search className={`w-4 h-4 ${textSecondary}`} />
            <input 
              type="text" 
              placeholder="Search" 
              className={`bg-transparent outline-none text-[15px] w-full placeholder:${textSecondary}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 w-1/3">
          {[
            { icon: Home, active: true },
            { icon: Users, active: false },
            { icon: PlaySquare, active: false },
            { icon: Store, active: false }
          ].map((item, i) => (
            <button key={i} className={`px-6 py-2 rounded-xl flex items-center justify-center ${item.active ? `${accentLightBg} ${accentColor}` : `${textSecondary} hover:bg-black/5 dark:hover:bg-white/10`} transition-all relative`}>
              <item.icon className="w-[22px] h-[22px]" strokeWidth={item.active ? 2.5 : 1.5} />
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 w-1/3">
          <button className={`w-9 h-9 rounded-full flex items-center justify-center ${bgElevated} ${textPrimary} transition-colors relative`}>
            <Bell className="w-5 h-5" strokeWidth={1.5} />
            <div className={`absolute top-0 right-0 w-2.5 h-2.5 rounded-full ${accentBg} border-2 ${bgMain}`} />
          </button>
          <button className={`w-9 h-9 rounded-full flex items-center justify-center ${bgElevated} ${textPrimary} transition-colors`}>
            <MessageSquare className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <img src="https://i.pravatar.cc/100?img=12" alt="Avatar" className="w-8 h-8 rounded-full ml-1 object-cover shadow-sm" />
        </div>
      </nav>

      <div className="flex-1 max-w-[1100px] mx-auto w-full flex justify-between gap-8 pt-6 px-4">
        {/* Left Sidebar */}
        <div className="w-[220px] shrink-0 flex flex-col gap-1 hidden lg:flex">
          {[
            { icon: Users, label: 'Profile' },
            { icon: Users, label: 'Friends' },
            { icon: Users, label: 'Groups' },
            { icon: PlaySquare, label: 'Reels' },
            { icon: Store, label: 'Marketplace' },
            { icon: Bookmark, label: 'Saved' },
          ].map((item, i) => (
            <button key={i} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[15px] font-medium`}>
              <item.icon className={`w-5 h-5 ${accentColor}`} strokeWidth={1.5} />
              {item.label}
            </button>
          ))}
          
          <div className={`mt-4 pt-4 border-t ${borderSubtle}`}>
            <div className={`text-[13px] font-semibold ${textSecondary} px-3 mb-2`}>Shortcuts</div>
            <button className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[15px] font-medium`}>
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                <img src="https://picsum.photos/seed/short1/50/50" className="w-full h-full object-cover" />
              </div>
              iOS Developers
            </button>
            <button className={`flex items-center gap-3 w-full px-3 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[15px] font-medium`}>
              <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0">
                <img src="https://picsum.photos/seed/short2/50/50" className="w-full h-full object-cover" />
              </div>
              Design Systems
            </button>
          </div>
        </div>

        {/* Center Main Feed */}
        <div className="flex-1 max-w-[540px] flex flex-col gap-5">
          {/* Stories */}
          <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-2 px-2 hide-scrollbar">
            {MOCK_DATA.stories.map((story) => (
              <div key={story.id} className={`w-[110px] h-[170px] rounded-[18px] shrink-0 relative overflow-hidden group cursor-pointer border ${borderSubtle} shadow-sm`}>
                <img src={story.image} alt={story.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />
                
                {story.isCreate ? (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white flex items-center justify-center shadow-lg">
                    <Plus className={`w-5 h-5 text-black`} strokeWidth={2} />
                  </div>
                ) : (
                  <img src={story.avatar} className={`absolute top-3 left-3 w-9 h-9 rounded-full border-2 ${isDark ? 'border-[#FF375F]' : 'border-[#FF2D55]'} object-cover`} alt={story.name} />
                )}
                
                <span className="absolute bottom-3 left-2 right-2 text-[12px] font-semibold text-white drop-shadow-md truncate text-center">
                  {story.name}
                </span>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className={`${bgCard} rounded-[20px] shadow-sm border ${borderSubtle} p-4 flex flex-col gap-3`}>
            <div className="flex gap-3">
              <img src="https://i.pravatar.cc/100?img=12" alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
              <div className={`flex-1 rounded-full ${bgElevated} px-4 py-2.5 flex items-center cursor-text transition-colors hover:bg-black/5 dark:hover:bg-white/10`}>
                <span className={`${textSecondary} text-[15px]`}>What's on your mind?</span>
              </div>
            </div>
            <div className={`h-[1px] w-full ${isDark ? 'bg-white/5' : 'bg-black/5'} my-1`} />
            <div className="flex justify-between items-center px-2">
              <button className={`flex items-center justify-center gap-2 flex-1 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[14px] font-medium ${textSecondary}`}>
                <Video className="w-5 h-5 text-[#FF3B30]" strokeWidth={1.5} /> Live
              </button>
              <button className={`flex items-center justify-center gap-2 flex-1 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[14px] font-medium ${textSecondary}`}>
                <ImageIcon className="w-5 h-5 text-[#34C759]" strokeWidth={1.5} /> Photo
              </button>
              <button className={`flex items-center justify-center gap-2 flex-1 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[14px] font-medium ${textSecondary}`}>
                <Smile className="w-5 h-5 text-[#FFCC00]" strokeWidth={1.5} /> Feeling
              </button>
            </div>
          </div>

          {/* Posts */}
          <div className="flex flex-col gap-5 pb-12">
            {MOCK_DATA.posts.map((post) => (
              <div key={post.id} className={`${bgCard} rounded-[20px] shadow-sm border ${borderSubtle} flex flex-col overflow-hidden`}>
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={post.avatar} alt={post.author} className="w-10 h-10 rounded-full object-cover shadow-sm" />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[15px] leading-tight">{post.author}</span>
                        {post.verified && <CheckCircle2 className="w-4 h-4 text-[#007AFF]" strokeWidth={2} />}
                      </div>
                      <div className={`flex items-center gap-1.5 text-[13px] ${textSecondary}`}>
                        <span>{post.time}</span>
                        <span>•</span>
                        <Globe2 className="w-3.5 h-3.5" strokeWidth={1.5} />
                      </div>
                    </div>
                  </div>
                  <button className={`w-8 h-8 rounded-full flex items-center justify-center hover:bg-black/5 dark:hover:bg-white/10 ${textSecondary}`}>
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Post Content */}
                <div className="px-4 pb-3 text-[15px] leading-[1.4] whitespace-pre-wrap">
                  {post.content}
                </div>

                {post.image && (
                  <div className={`w-full aspect-[4/3] bg-black/5 dark:bg-white/5`}>
                    <img src={post.image} alt="Post content" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Reactions Summary */}
                <div className={`px-4 py-3 flex items-center justify-between text-[13px] ${textSecondary} border-b ${isDark ? 'border-white/5' : 'border-black/5'}`}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center p-0.5 shadow-sm border border-white dark:border-[#1C1C1E] z-10">
                      <ThumbsUp className="w-3 h-3 fill-current" />
                    </div>
                    <span className="ml-1">{post.likes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{post.comments} comments</span>
                    <span>{post.shares} shares</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-2 py-1 flex items-center justify-between">
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[14px] font-medium ${textSecondary}`}>
                    <ThumbsUp className="w-5 h-5" strokeWidth={1.5} /> Like
                  </button>
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[14px] font-medium ${textSecondary}`}>
                    <MessageCircle className="w-5 h-5" strokeWidth={1.5} /> Comment
                  </button>
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors text-[14px] font-medium ${textSecondary}`}>
                    <Share2 className="w-5 h-5" strokeWidth={1.5} /> Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[260px] shrink-0 flex flex-col gap-6 hidden xl:flex">
          {/* Sponsored */}
          <div className="flex flex-col gap-3">
            <h3 className={`text-[13px] font-semibold ${textSecondary} px-1`}>Sponsored</h3>
            <div className={`group rounded-[16px] border ${borderSubtle} p-3 flex gap-3 ${bgCard} shadow-sm hover:shadow transition-shadow cursor-pointer`}>
              <div className="w-16 h-16 rounded-[10px] overflow-hidden shrink-0 border border-black/5 dark:border-white/5">
                <img src="https://picsum.photos/seed/sponsorap/200/200" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="flex flex-col justify-center gap-1">
                <h4 className="font-semibold text-[14px] leading-tight">Magic Keyboard</h4>
                <div className={`text-[12px] ${textSecondary}`}>apple.com</div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-[13px] font-semibold ${accentColor}`}>
                    ৳ 35,000
                  </span>
                  <button className={`px-3 py-1 rounded-full text-[11px] font-bold ${accentBg} text-white`}>Shop</button>
                </div>
              </div>
            </div>
            
             <div className={`group rounded-[16px] border ${borderSubtle} p-3 flex gap-3 ${bgCard} shadow-sm hover:shadow transition-shadow cursor-pointer`}>
              <div className="w-16 h-16 rounded-[10px] overflow-hidden shrink-0 border border-black/5 dark:border-white/5">
                <img src="https://picsum.photos/seed/sponsorap2/200/200" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="flex flex-col justify-center gap-1">
                <h4 className="font-semibold text-[14px] leading-tight">AirPods Max</h4>
                <div className={`text-[12px] ${textSecondary}`}>apple.com</div>
                <div className="flex items-center justify-between mt-1">
                  <span className={`text-[13px] font-semibold ${accentColor}`}>
                    ৳ 65,000
                  </span>
                  <button className={`px-3 py-1 rounded-full text-[11px] font-bold ${accentBg} text-white`}>Shop</button>
                </div>
              </div>
            </div>
          </div>

          <div className={`h-[1px] w-full ${isDark ? 'bg-white/10' : 'bg-black/5'}`} />

          {/* Contacts */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className={`text-[13px] font-semibold ${textSecondary}`}>Contacts</h3>
              <div className="flex gap-2">
                <Search className={`w-4 h-4 ${textSecondary} cursor-pointer hover:text-black dark:hover:text-white transition-colors`} strokeWidth={1.5} />
                <MoreHorizontal className={`w-4 h-4 ${textSecondary} cursor-pointer hover:text-black dark:hover:text-white transition-colors`} strokeWidth={1.5} />
              </div>
            </div>
            
            {MOCK_DATA.contacts.map((contact) => (
              <button key={contact.id} className={`flex items-center gap-3 w-full px-2 py-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/10 transition-colors`}>
                <div className="relative">
                  <img src={contact.avatar} className="w-9 h-9 rounded-full object-cover shadow-sm" alt={contact.name} />
                  <div className={`absolute bottom-0 right-0 w-3 h-3 bg-[#34C759] rounded-full border-2 ${bgMain}`} />
                </div>
                <span className="text-[14px] font-medium">{contact.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ApplePink() {
  return (
    <div className="flex flex-row font-sans h-screen w-full bg-[#1c1c1e] overflow-x-auto overflow-y-hidden">
      <div className="relative w-[1280px] h-full shrink-0 border-r border-[#38383a]">
        <div className="absolute top-4 left-4 z-50 px-3 py-1.5 bg-white/90 backdrop-blur-md border border-[#E5E5EA] text-[11px] font-bold tracking-widest rounded-full shadow-sm text-black flex items-center gap-2 uppercase">
          <div className="w-2 h-2 rounded-full bg-[#FF2D55]"></div>
          Light Mode
        </div>
        <div className="h-full overflow-y-auto">
          <AppContent theme="light" />
        </div>
      </div>
      
      <div className="relative w-[1280px] h-full shrink-0">
        <div className="absolute top-4 left-4 z-50 px-3 py-1.5 bg-[#1C1C1E]/90 backdrop-blur-md border border-[#38383A] text-[11px] font-bold tracking-widest rounded-full shadow-sm text-white flex items-center gap-2 uppercase">
           <div className="w-2 h-2 rounded-full bg-[#FF375F]"></div>
           Dark Mode
        </div>
        <div className="h-full overflow-y-auto">
          <AppContent theme="dark" />
        </div>
      </div>
    </div>
  );
}
