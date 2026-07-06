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
    { id: 1, name: 'Create Story', avatar: 'https://i.pravatar.cc/100?img=47', image: 'https://picsum.photos/seed/1/200/300', isCreate: true },
    { id: 2, name: 'Alice Chen', avatar: 'https://i.pravatar.cc/100?img=5', image: 'https://picsum.photos/seed/2/200/300' },
    { id: 3, name: 'David Park', avatar: 'https://i.pravatar.cc/100?img=8', image: 'https://picsum.photos/seed/3/200/300' },
    { id: 4, name: 'Sarah Jin', avatar: 'https://i.pravatar.cc/100?img=9', image: 'https://picsum.photos/seed/4/200/300' },
    { id: 5, name: 'Mike Ross', avatar: 'https://i.pravatar.cc/100?img=11', image: 'https://picsum.photos/seed/5/200/300' },
  ],
  posts: [
    {
      id: 1,
      author: 'Vercel',
      avatar: 'https://i.pravatar.cc/100?img=33',
      time: '2h',
      verified: true,
      content: 'Introducing Next.js 14. Performance improvements, Server Actions, and a brand new compiler architecture for the modern web.',
      image: 'https://picsum.photos/seed/14/600/400',
      likes: 1205,
      comments: 342,
      shares: 89,
    },
    {
      id: 2,
      author: 'Guillermo Rauch',
      avatar: 'https://i.pravatar.cc/100?img=12',
      time: '5h',
      verified: true,
      content: 'The future of the web is highly dynamic, personalized, and fast. Edge computing makes this possible without sacrificing developer experience.',
      image: null,
      likes: 892,
      comments: 156,
      shares: 45,
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
  
  // Apple / iOS aesthetic tokens
  const bgMain = isDark ? 'bg-black' : 'bg-[#f5f5f7]';
  const bgCard = isDark ? 'bg-[#1c1c1e]' : 'bg-white';
  const bgNav = isDark ? 'bg-black/70' : 'bg-white/70';
  const textPrimary = isDark ? 'text-white' : 'text-black';
  const textSecondary = isDark ? 'text-[#98989d]' : 'text-[#86868b]';
  const borderSubtle = isDark ? 'border-[#38383a]' : 'border-[#e5e5ea]';
  const hoverBg = isDark ? 'hover:bg-[#2c2c2e]' : 'hover:bg-[#f2f2f7]';
  const inputBg = isDark ? 'bg-[#2c2c2e]' : 'bg-[#f2f2f7]';
  
  // Purple accent
  const accentText = 'text-[#7c5cff]';
  const accentBg = 'bg-[#7c5cff]';
  const accentHover = 'hover:bg-[#6c4be0]';
  
  return (
    <div className={`min-h-full ${bgMain} ${textPrimary} ${isDark ? 'dark' : ''} flex flex-col font-[-apple-system,BlinkMacSystemFont,"Segoe_UI",Roboto,Helvetica,Arial,sans-serif]`}>
      {/* Top Navbar - Frosted Glass */}
      <nav className={`h-[60px] ${bgNav} backdrop-blur-xl border-b ${borderSubtle} flex items-center justify-between px-6 shrink-0 sticky top-0 z-40 transition-colors`}>
        <div className="flex items-center gap-4 w-1/3">
          <div className={`font-bold text-2xl tracking-tight ${accentText} flex items-center`}>
            HiMewo
          </div>
          <div className={`flex items-center gap-2 px-3 h-[36px] rounded-full ${inputBg} transition-colors w-64`}>
            <Search className={`w-[18px] h-[18px] ${textSecondary}`} />
            <input 
              type="text" 
              placeholder="Search HiMewo" 
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
            <button key={i} className={`w-[60px] h-[44px] flex flex-col items-center justify-center rounded-xl ${item.active ? '' : hoverBg} transition-colors relative`}>
              <item.icon className={`w-[22px] h-[22px] ${item.active ? accentText : textSecondary}`} strokeWidth={item.active ? 2.5 : 2} />
              {item.active && <div className={`absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-[3px] ${accentBg} rounded-t-full`} />}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 w-1/3">
          <button className={`w-[40px] h-[40px] rounded-full flex items-center justify-center ${inputBg} ${textPrimary} transition-colors relative`}>
            <Bell className="w-[20px] h-[20px]" />
            <div className={`absolute top-2 right-2 w-[10px] h-[10px] ${accentBg} rounded-full border-2 ${bgCard}`}></div>
          </button>
          <button className={`w-[40px] h-[40px] rounded-full flex items-center justify-center ${inputBg} ${textPrimary} transition-colors`}>
            <MessageSquare className="w-[20px] h-[20px]" />
          </button>
          <button className="ml-2 w-[40px] h-[40px] rounded-full overflow-hidden border border-[#e5e5ea] dark:border-[#38383a]">
            <img src="https://i.pravatar.cc/100?img=47" alt="Avatar" className="w-full h-full object-cover" />
          </button>
        </div>
      </nav>

      <div className="flex-1 max-w-[1240px] mx-auto w-full flex justify-between gap-8 pt-8 px-6 pb-12">
        {/* Left Sidebar */}
        <div className="w-[260px] shrink-0 flex flex-col gap-1 hidden lg:flex">
          {[
            { icon: Users, label: 'Profile' },
            { icon: Users, label: 'Friends' },
            { icon: Users, label: 'Groups' },
            { icon: PlaySquare, label: 'Reels' },
            { icon: Store, label: 'Marketplace' },
            { icon: Bookmark, label: 'Saved' },
          ].map((item, i) => (
            <button key={i} className={`flex items-center gap-4 w-full px-3 py-3 rounded-xl ${hoverBg} transition-colors text-[15px] font-medium`}>
              <item.icon className={`w-[22px] h-[22px] ${accentText}`} />
              {item.label}
            </button>
          ))}
          
          <div className={`mt-6 pt-6 border-t ${borderSubtle}`}>
            <div className={`text-[13px] font-semibold tracking-wide ${textSecondary} px-3 mb-3`}>Shortcuts</div>
            <button className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl ${hoverBg} transition-colors text-[15px] font-medium`}>
              <img src="https://picsum.photos/seed/grp1/100/100" className="w-8 h-8 rounded-lg object-cover" alt="Group" />
              Design Tools
            </button>
            <button className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-xl ${hoverBg} transition-colors text-[15px] font-medium`}>
              <img src="https://picsum.photos/seed/grp2/100/100" className="w-8 h-8 rounded-lg object-cover" alt="Group" />
              Frontend Devs
            </button>
          </div>
        </div>

        {/* Center Main Feed */}
        <div className="flex-1 max-w-[590px] flex flex-col gap-6">
          {/* Stories */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 hide-scrollbar">
            {MOCK_DATA.stories.map((story) => (
              <div key={story.id} className={`w-[120px] h-[200px] rounded-2xl shrink-0 relative overflow-hidden group cursor-pointer border ${borderSubtle} bg-[#f2f2f7] dark:bg-[#1c1c1e]`}>
                <img src={story.image} alt={story.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/60" />
                
                {story.isCreate ? (
                  <div className={`absolute bottom-4 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-white text-[#7c5cff] flex items-center justify-center shadow-md`}>
                    <Plus className="w-6 h-6" />
                  </div>
                ) : (
                  <img src={story.avatar} className="absolute top-4 left-4 w-10 h-10 rounded-full border-[2.5px] border-[#7c5cff] object-cover" alt={story.name} />
                )}
                
                <span className="absolute bottom-3 left-3 right-3 text-[13px] font-semibold text-white drop-shadow-sm truncate text-center">
                  {story.name}
                </span>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className={`${bgCard} rounded-2xl border ${borderSubtle} p-4 flex flex-col gap-3 shadow-sm`}>
            <div className="flex gap-3">
              <img src="https://i.pravatar.cc/100?img=47" alt="Avatar" className="w-10 h-10 rounded-full object-cover" />
              <div className={`flex-1 rounded-full px-5 py-2.5 ${inputBg} flex items-center cursor-text`}>
                <span className={`${textSecondary} text-[15px]`}>What's on your mind?</span>
              </div>
            </div>
            <div className={`h-px w-full ${borderSubtle} border-t mt-1`} />
            <div className="flex justify-between items-center px-1">
              <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl ${hoverBg} transition-colors text-[14px] font-medium ${textSecondary}`}>
                <Video className="w-5 h-5 text-red-500" /> Live
              </button>
              <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl ${hoverBg} transition-colors text-[14px] font-medium ${textSecondary}`}>
                <ImageIcon className="w-5 h-5 text-green-500" /> Photo
              </button>
              <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl ${hoverBg} transition-colors text-[14px] font-medium ${textSecondary}`}>
                <Smile className="w-5 h-5 text-yellow-500" /> Feeling
              </button>
            </div>
          </div>

          {/* Posts */}
          <div className="flex flex-col gap-6 pb-12">
            {MOCK_DATA.posts.map((post) => (
              <div key={post.id} className={`${bgCard} rounded-2xl border ${borderSubtle} flex flex-col overflow-hidden shadow-sm`}>
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={post.avatar} alt={post.author} className="w-10 h-10 rounded-full object-cover border border-[#e5e5ea] dark:border-[#38383a]" />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-[15px]">{post.author}</span>
                        {post.verified && <CheckCircle2 className="w-4 h-4 text-[#7c5cff]" />}
                      </div>
                      <div className={`flex items-center gap-1 text-[13px] ${textSecondary}`}>
                        <span>{post.time}</span>
                        <span>·</span>
                        <Globe2 className="w-[14px] h-[14px]" />
                      </div>
                    </div>
                  </div>
                  <button className={`w-9 h-9 rounded-full flex items-center justify-center ${hoverBg} ${textSecondary}`}>
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Post Content */}
                <div className="px-4 pb-3 text-[15px] leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>

                {post.image && (
                  <div className={`w-full aspect-[3/2] border-y ${borderSubtle} bg-zinc-100 dark:bg-zinc-900`}>
                    <img src={post.image} alt="Post content" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Reactions Summary */}
                <div className={`px-4 py-3 flex items-center justify-between text-[13px] ${textSecondary} border-b ${borderSubtle}`}>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-[22px] h-[22px] rounded-full ${accentBg} text-white flex items-center justify-center border-2 ${bgCard} z-10`}>
                      <ThumbsUp className="w-3 h-3 fill-current" />
                    </div>
                    <span className="ml-0.5">{post.likes.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>{post.comments} comments</span>
                    <span>{post.shares} shares</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="px-2 py-1 flex items-center justify-between">
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl ${hoverBg} transition-colors text-[14px] font-medium ${textSecondary}`}>
                    <ThumbsUp className="w-[18px] h-[18px]" /> Like
                  </button>
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl ${hoverBg} transition-colors text-[14px] font-medium ${textSecondary}`}>
                    <MessageCircle className="w-[18px] h-[18px]" /> Comment
                  </button>
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl ${hoverBg} transition-colors text-[14px] font-medium ${textSecondary}`}>
                    <Share2 className="w-[18px] h-[18px]" /> Share
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-[280px] shrink-0 flex flex-col gap-6 hidden xl:flex">
          {/* Sponsored */}
          <div className="flex flex-col gap-3">
            <h3 className={`text-[13px] font-semibold tracking-wide ${textSecondary} px-1`}>Sponsored</h3>
            <div className={`group rounded-2xl border ${borderSubtle} ${bgCard} p-3 flex flex-col gap-3 shadow-sm`}>
              <div className="w-full aspect-[16/9] rounded-xl bg-[#f2f2f7] dark:bg-[#2c2c2e] overflow-hidden shrink-0 border border-[#e5e5ea] dark:border-[#38383a]">
                <img src="https://picsum.photos/seed/sponsor1/400/225" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
              </div>
              <div className="flex flex-col">
                <h4 className="font-semibold text-[15px] leading-tight">Mastering Next.js</h4>
                <span className={`text-[13px] ${textSecondary} mt-0.5`}>nextjs.org/learn</span>
                <div className="flex items-center justify-between mt-3">
                  <span className={`text-[15px] font-bold ${textPrimary}`}>৳ 45,000</span>
                  <button className={`px-4 py-1.5 rounded-full ${inputBg} ${accentText} text-[13px] font-semibold hover:bg-opacity-80 transition-colors`}>
                    Learn More
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className={`h-px w-full ${borderSubtle} border-t`} />

          {/* Contacts */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-1 mb-2">
              <h3 className={`text-[13px] font-semibold tracking-wide ${textSecondary}`}>Contacts</h3>
              <div className="flex gap-2">
                <Search className={`w-4 h-4 ${textSecondary} cursor-pointer hover:text-black dark:hover:text-white transition-colors`} />
                <MoreHorizontal className={`w-4 h-4 ${textSecondary} cursor-pointer hover:text-black dark:hover:text-white transition-colors`} />
              </div>
            </div>
            
            {MOCK_DATA.contacts.map((contact) => (
              <button key={contact.id} className={`flex items-center gap-3 w-full px-2 py-2 rounded-xl ${hoverBg} transition-colors`}>
                <div className="relative">
                  <img src={contact.avatar} className="w-9 h-9 rounded-full object-cover border border-[#e5e5ea] dark:border-[#38383a]" alt={contact.name} />
                  <div className={`absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 ${isDark ? 'border-[#000]' : 'border-[#f5f5f7]'}`} />
                </div>
                <span className="text-[15px] font-medium">{contact.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ApplePurple() {
  return (
    <div className="flex flex-row font-sans h-screen w-full bg-[#e5e5ea] dark:bg-[#1c1c1e] overflow-x-auto overflow-y-hidden">
      <div className="relative w-[1280px] h-full shrink-0 border-r border-[#d1d1d6] dark:border-[#38383a]">
        <div className="absolute top-4 left-4 z-50 px-3 py-1.5 bg-white border border-[#e5e5ea] text-[10px] font-bold tracking-wider rounded-md shadow-sm text-black flex items-center gap-2 uppercase">
          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          Light Theme
        </div>
        <div className="h-full overflow-y-auto">
          <AppContent theme="light" />
        </div>
      </div>
      
      <div className="relative w-[1280px] h-full shrink-0">
        <div className="absolute top-4 left-4 z-50 px-3 py-1.5 bg-[#2c2c2e] border border-[#38383a] text-[10px] font-bold tracking-wider rounded-md shadow-sm text-white flex items-center gap-2 uppercase">
           <div className="w-2 h-2 rounded-full bg-[#7c5cff]"></div>
           Dark Theme
        </div>
        <div className="h-full overflow-y-auto bg-black">
          <AppContent theme="dark" />
        </div>
      </div>
    </div>
  );
}
