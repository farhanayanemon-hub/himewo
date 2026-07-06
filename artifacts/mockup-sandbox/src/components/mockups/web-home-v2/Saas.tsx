import React from 'react';
import './_saas.css';
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
    { id: 1, name: 'Add Story', avatar: 'https://i.pravatar.cc/100?img=12', image: 'https://picsum.photos/seed/1/200/300', isCreate: true },
    { id: 2, name: 'Alice Chen', avatar: 'https://i.pravatar.cc/100?img=5', image: 'https://picsum.photos/seed/2/200/300' },
    { id: 3, name: 'David Park', avatar: 'https://i.pravatar.cc/100?img=8', image: 'https://picsum.photos/seed/3/200/300' },
    { id: 4, name: 'Sarah Jin', avatar: 'https://i.pravatar.cc/100?img=9', image: 'https://picsum.photos/seed/4/200/300' },
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
      avatar: 'https://i.pravatar.cc/100?img=11',
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
  const bgMain = isDark ? 'bg-[#0a0a0a]' : 'bg-[#fafafa]';
  const bgCard = isDark ? 'bg-[#111111]' : 'bg-white';
  const textPrimary = isDark ? 'text-zinc-100' : 'text-zinc-900';
  const textSecondary = isDark ? 'text-zinc-400' : 'text-zinc-500';
  const borderSubtle = isDark ? 'border-[#262626]' : 'border-[#e5e7eb]';
  const borderFocus = isDark ? 'border-[#333333]' : 'border-[#d1d5db]';
  const hoverBg = isDark ? 'hover:bg-[#1a1a1a]' : 'hover:bg-zinc-100';
  const accentText = 'text-indigo-500';
  const accentBg = 'bg-indigo-500';

  return (
    <div className={`saas-theme min-h-screen ${bgMain} ${textPrimary} ${isDark ? 'dark' : ''} flex flex-col overflow-hidden`}>
      {/* Top Navbar */}
      <nav className={`h-14 ${bgCard} border-b ${borderSubtle} flex items-center justify-between px-4 shrink-0 sticky top-0 z-40`}>
        <div className="flex items-center gap-4 w-1/3">
          <div className="font-bold text-xl tracking-tight flex items-center gap-2">
            <div className={`w-8 h-8 rounded-md ${accentBg} flex items-center justify-center text-white`}>
              <div className="w-3 h-3 bg-white rounded-sm" />
            </div>
            HiMewo
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border ${borderSubtle} ${bgMain} focus-within:${borderFocus} transition-colors w-64`}>
            <Search className={`w-4 h-4 ${textSecondary}`} />
            <input 
              type="text" 
              placeholder="Search..." 
              className={`bg-transparent outline-none text-sm w-full placeholder:${textSecondary}`}
            />
          </div>
        </div>

        <div className="flex items-center justify-center gap-1 w-1/3">
          {[
            { icon: Home, active: true },
            { icon: Users, active: false },
            { icon: PlaySquare, active: false },
            { icon: Store, active: false }
          ].map((item, i) => (
            <button key={i} className={`px-8 py-2 rounded-md ${item.active ? `${isDark ? 'bg-[#1a1a1a] text-zinc-100' : 'bg-zinc-100 text-zinc-900'}` : `${textSecondary} ${hoverBg}`} transition-colors relative`}>
              <item.icon className="w-5 h-5" strokeWidth={item.active ? 2.5 : 2} />
              {item.active && <div className={`absolute bottom-[-13px] left-1/2 -translate-x-1/2 w-8 h-[2px] ${accentBg} rounded-t-full`} />}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-end gap-3 w-1/3">
          <button className={`w-9 h-9 rounded-md flex items-center justify-center ${borderSubtle} border ${hoverBg} ${textSecondary} transition-colors`}>
            <Bell className="w-4 h-4" />
          </button>
          <button className={`w-9 h-9 rounded-md flex items-center justify-center ${borderSubtle} border ${hoverBg} ${textSecondary} transition-colors`}>
            <MessageSquare className="w-4 h-4" />
          </button>
          <img src="https://i.pravatar.cc/100?img=12" alt="Avatar" className="w-9 h-9 rounded-md ml-2 object-cover border border-zinc-200 dark:border-zinc-800" />
        </div>
      </nav>

      <div className="flex-1 max-w-[1200px] mx-auto w-full flex justify-between gap-6 pt-6 px-4">
        {/* Left Sidebar */}
        <div className="w-[240px] shrink-0 flex flex-col gap-1 hidden lg:flex">
          {[
            { icon: Users, label: 'Profile' },
            { icon: Users, label: 'Friends' },
            { icon: Users, label: 'Groups' },
            { icon: PlaySquare, label: 'Reels' },
            { icon: Store, label: 'Marketplace' },
            { icon: Bookmark, label: 'Saved' },
          ].map((item, i) => (
            <button key={i} className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md ${hoverBg} transition-colors text-sm font-medium`}>
              <item.icon className={`w-4 h-4 ${textSecondary}`} />
              {item.label}
            </button>
          ))}
          
          <div className={`mt-4 pt-4 border-t ${borderSubtle}`}>
            <div className={`text-xs font-medium uppercase tracking-wider ${textSecondary} px-3 mb-2`}>Your Shortcuts</div>
            <button className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md ${hoverBg} transition-colors text-sm font-medium`}>
              <div className="w-6 h-6 rounded bg-indigo-500/10 text-indigo-500 flex items-center justify-center"><Store className="w-3 h-3" /></div>
              Design Tools
            </button>
            <button className={`flex items-center gap-3 w-full px-3 py-2.5 rounded-md ${hoverBg} transition-colors text-sm font-medium`}>
              <div className="w-6 h-6 rounded bg-emerald-500/10 text-emerald-500 flex items-center justify-center"><Users className="w-3 h-3" /></div>
              Frontend Devs
            </button>
          </div>
        </div>

        {/* Center Main Feed */}
        <div className="flex-1 max-w-[580px] flex flex-col gap-6">
          {/* Stories */}
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 hide-scrollbar">
            {MOCK_DATA.stories.map((story) => (
              <div key={story.id} className={`w-[110px] h-[160px] rounded-xl shrink-0 relative overflow-hidden group cursor-pointer border ${borderSubtle}`}>
                <img src={story.image} alt={story.name} className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/60" />
                
                {story.isCreate ? (
                  <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white text-indigo-500 flex items-center justify-center shadow-lg border border-zinc-100">
                    <Plus className="w-5 h-5" />
                  </div>
                ) : (
                  <img src={story.avatar} className="absolute top-3 left-3 w-8 h-8 rounded-full border-2 border-indigo-500 object-cover" alt={story.name} />
                )}
                
                <span className="absolute bottom-2 left-2 right-2 text-[11px] font-medium text-white drop-shadow-md truncate">
                  {story.name}
                </span>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className={`${bgCard} rounded-xl border ${borderSubtle} p-4 flex flex-col gap-3`}>
            <div className="flex gap-3">
              <img src="https://i.pravatar.cc/100?img=12" alt="Avatar" className="w-9 h-9 rounded-md object-cover border border-zinc-200 dark:border-zinc-800" />
              <div className={`flex-1 rounded-md border ${borderSubtle} px-4 py-2 ${bgMain} flex items-center cursor-text`}>
                <span className={`${textSecondary} text-sm`}>What's on your mind?</span>
              </div>
            </div>
            <div className={`h-px w-full ${isDark ? 'bg-[#262626]' : 'bg-zinc-100'}`} />
            <div className="flex justify-between items-center px-2">
              <button className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${hoverBg} transition-colors text-sm font-medium ${textSecondary}`}>
                <Video className="w-4 h-4 text-red-500" /> Live Video
              </button>
              <button className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${hoverBg} transition-colors text-sm font-medium ${textSecondary}`}>
                <ImageIcon className="w-4 h-4 text-green-500" /> Photo/Video
              </button>
              <button className={`flex items-center gap-2 px-3 py-1.5 rounded-md ${hoverBg} transition-colors text-sm font-medium ${textSecondary}`}>
                <Smile className="w-4 h-4 text-yellow-500" /> Feeling/Activity
              </button>
            </div>
          </div>

          {/* Posts */}
          <div className="flex flex-col gap-4 pb-12">
            {MOCK_DATA.posts.map((post) => (
              <div key={post.id} className={`${bgCard} rounded-xl border ${borderSubtle} flex flex-col overflow-hidden`}>
                {/* Post Header */}
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img src={post.avatar} alt={post.author} className="w-10 h-10 rounded-md object-cover border border-zinc-200 dark:border-zinc-800" />
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-sm">{post.author}</span>
                        {post.verified && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500" />}
                      </div>
                      <div className={`flex items-center gap-1.5 text-xs ${textSecondary}`}>
                        <span>{post.time}</span>
                        <span>•</span>
                        <Globe2 className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                  <button className={`w-8 h-8 rounded-md flex items-center justify-center ${hoverBg} ${textSecondary}`}>
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </div>

                {/* Post Content */}
                <div className="px-4 pb-3 text-sm leading-relaxed whitespace-pre-wrap">
                  {post.content}
                </div>

                {post.image && (
                  <div className={`w-full aspect-[3/2] border-y ${borderSubtle} bg-zinc-100 dark:bg-zinc-900`}>
                    <img src={post.image} alt="Post content" className="w-full h-full object-cover" />
                  </div>
                )}

                {/* Reactions Summary */}
                <div className={`px-4 py-3 flex items-center justify-between text-xs ${textSecondary} border-b ${borderSubtle}`}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-500 flex items-center justify-center p-0.5 border border-white dark:border-black z-10">
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
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md ${hoverBg} transition-colors text-sm font-medium ${textSecondary}`}>
                    <ThumbsUp className="w-4 h-4" /> Like
                  </button>
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md ${hoverBg} transition-colors text-sm font-medium ${textSecondary}`}>
                    <MessageCircle className="w-4 h-4" /> Comment
                  </button>
                  <button className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md ${hoverBg} transition-colors text-sm font-medium ${textSecondary}`}>
                    <Share2 className="w-4 h-4" /> Share
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
            <h3 className={`text-xs font-semibold tracking-wider uppercase ${textSecondary} px-1`}>Sponsored</h3>
            <div className={`group rounded-xl border ${borderSubtle} p-3 flex gap-3 ${hoverBg} cursor-pointer transition-colors`}>
              <div className="w-20 h-20 rounded-md bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
                <img src="https://picsum.photos/seed/sponsor1/200/200" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="font-semibold text-sm line-clamp-2 leading-tight">Mastering Next.js Course</h4>
                <span className={`text-xs ${textSecondary} mt-1 flex items-center gap-1`}>
                  Learn more <ExternalLink className="w-3 h-3" />
                </span>
              </div>
            </div>
            
             <div className={`group rounded-xl border ${borderSubtle} p-3 flex gap-3 ${hoverBg} cursor-pointer transition-colors`}>
              <div className="w-20 h-20 rounded-md bg-zinc-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-zinc-200 dark:border-zinc-700">
                <img src="https://picsum.photos/seed/sponsor2/200/200" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              </div>
              <div className="flex flex-col justify-center">
                <h4 className="font-semibold text-sm line-clamp-2 leading-tight">Pro Desk Setup</h4>
                <span className={`text-xs font-medium text-indigo-500 mt-1`}>
                  ৳ 45,000
                </span>
              </div>
            </div>
          </div>

          <div className={`h-px w-full ${isDark ? 'bg-[#262626]' : 'bg-zinc-200'}`} />

          {/* Contacts */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between px-1 mb-1">
              <h3 className={`text-xs font-semibold tracking-wider uppercase ${textSecondary}`}>Contacts</h3>
              <div className="flex gap-2">
                <Search className={`w-3.5 h-3.5 ${textSecondary} cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100`} />
                <MoreHorizontal className={`w-3.5 h-3.5 ${textSecondary} cursor-pointer hover:text-zinc-900 dark:hover:text-zinc-100`} />
              </div>
            </div>
            
            {MOCK_DATA.contacts.map((contact) => (
              <button key={contact.id} className={`flex items-center gap-3 w-full px-2 py-2 rounded-md ${hoverBg} transition-colors`}>
                <div className="relative">
                  <img src={contact.avatar} className="w-8 h-8 rounded-md object-cover border border-zinc-200 dark:border-zinc-800" alt={contact.name} />
                  <div className={`absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full border-2 ${bgMain}`} />
                </div>
                <span className="text-sm font-medium">{contact.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function Saas() {
  return (
    <div className="flex flex-row font-sans h-screen w-full bg-zinc-900 overflow-x-auto overflow-y-hidden">
      <div className="relative w-[1280px] h-full shrink-0 border-r border-zinc-800">
        <div className="absolute top-4 left-4 z-50 px-3 py-1.5 bg-white border border-zinc-200 text-[10px] font-bold tracking-wider rounded-md shadow-sm text-zinc-900 flex items-center gap-2 uppercase">
          <div className="w-2 h-2 rounded-full bg-amber-400"></div>
          Light Theme
        </div>
        <div className="h-full overflow-y-auto">
          <AppContent theme="light" />
        </div>
      </div>
      
      <div className="relative w-[1280px] h-full shrink-0">
        <div className="absolute top-4 left-4 z-50 px-3 py-1.5 bg-[#1a1a1a] border border-[#333] text-[10px] font-bold tracking-wider rounded-md shadow-sm text-zinc-100 flex items-center gap-2 uppercase">
           <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
           Dark Theme
        </div>
        <div className="h-full overflow-y-auto">
          <AppContent theme="dark" />
        </div>
      </div>
    </div>
  );
}
