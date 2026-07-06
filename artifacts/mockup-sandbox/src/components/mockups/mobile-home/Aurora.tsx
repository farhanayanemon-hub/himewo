import React from "react";
import { Search, MessageCircle, Image as ImageIcon, Heart, MessageSquare, Share2, MoreHorizontal, Home, Users, PlaySquare, Bell, Menu, Plus, BadgeCheck, Globe } from "lucide-react";
import "./mobile-aurora.css";

export function Aurora() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black p-4">
      {/* Phone container */}
      <div className="w-[390px] h-[844px] aurora-mobile-wrapper relative overflow-hidden rounded-[40px] shadow-2xl ring-[10px] ring-zinc-900 flex flex-col">
        
        {/* Status Bar Mock (Visual only) */}
        <div className="h-12 w-full flex items-center justify-between px-6 pt-2 z-50 text-[15px] font-medium">
          <span>9:41</span>
          <div className="flex items-center gap-2">
            <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 8.5C1 8.5 2 7 4.5 7C7 7 8 8.5 8 8.5M10 5.5C10 5.5 12 3.5 14.5 3.5C17 3.5 18 5.5 18 5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M1 11H15V3C15 1.89543 14.1046 1 13 1H3C1.89543 1 1 1.89543 1 3V11Z" stroke="currentColor" strokeWidth="1.5"/></svg>
          </div>
        </div>

        {/* Header */}
        <div className="aurora-glass-header absolute top-0 left-0 right-0 z-40 pt-12 pb-3 px-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight aurora-text-gradient">HiMewo</h1>
          <div className="flex items-center gap-3">
            <button className="w-9 h-9 rounded-full aurora-icon-button flex items-center justify-center">
              <Search className="w-5 h-5 text-zinc-200" />
            </button>
            <button className="w-9 h-9 rounded-full aurora-icon-button flex items-center justify-center relative">
              <MessageCircle className="w-5 h-5 text-zinc-200" />
              <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-pink-500 rounded-full border-2 border-zinc-900"></div>
            </button>
          </div>
        </div>

        {/* Main Scrollable Content */}
        <div className="flex-1 overflow-y-auto hide-scrollbar pt-[92px] pb-[84px]">
          
          {/* Post Composer Entry */}
          <div className="px-4 py-4 mb-2">
            <div className="aurora-glass-card rounded-2xl p-3 flex items-center gap-3">
              <img src="https://i.pravatar.cc/100?img=33" alt="Me" className="w-10 h-10 rounded-full object-cover border border-white/10" />
              <div className="flex-1 h-10 rounded-full bg-white/5 border border-white/5 flex items-center px-4">
                <span className="text-zinc-400 text-sm">What's on your mind?</span>
              </div>
              <button className="w-10 h-10 rounded-full aurora-glass flex items-center justify-center text-teal-400">
                <ImageIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Stories Row */}
          <div className="px-4 mb-6">
            <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
              {/* Create Story */}
              <div className="w-[100px] h-[150px] shrink-0 rounded-[20px] relative overflow-hidden aurora-glass-card group">
                <img src="https://i.pravatar.cc/100?img=33" alt="Me" className="w-full h-full object-cover opacity-60" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
                <div className="absolute bottom-3 left-0 right-0 flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full aurora-bg-gradient flex items-center justify-center mb-1 border-2 border-zinc-900 shadow-lg">
                    <Plus className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-semibold text-white">Create</span>
                </div>
              </div>

              {/* Friend Story 1 */}
              <div className="w-[100px] h-[150px] shrink-0 rounded-[20px] relative overflow-hidden group border border-white/10 shadow-lg">
                <img src="https://picsum.photos/seed/s1/200/300" alt="Story" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
                <div className="absolute top-3 left-3 aurora-story-ring">
                  <img src="https://i.pravatar.cc/100?img=12" alt="Avatar" className="w-8 h-8 rounded-full border-2 border-zinc-900" />
                </div>
                <span className="absolute bottom-3 left-3 right-3 text-xs font-medium text-white line-clamp-1 drop-shadow-md">Sarah J.</span>
              </div>

              {/* Friend Story 2 */}
              <div className="w-[100px] h-[150px] shrink-0 rounded-[20px] relative overflow-hidden group border border-white/10 shadow-lg">
                <img src="https://picsum.photos/seed/s2/200/300" alt="Story" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
                <div className="absolute top-3 left-3 aurora-story-ring">
                  <img src="https://i.pravatar.cc/100?img=45" alt="Avatar" className="w-8 h-8 rounded-full border-2 border-zinc-900" />
                </div>
                <span className="absolute bottom-3 left-3 right-3 text-xs font-medium text-white line-clamp-1 drop-shadow-md">Mike T.</span>
              </div>

              {/* Friend Story 3 */}
              <div className="w-[100px] h-[150px] shrink-0 rounded-[20px] relative overflow-hidden group border border-white/10 shadow-lg">
                <img src="https://picsum.photos/seed/s3/200/300" alt="Story" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30"></div>
                <div className="absolute top-3 left-3 aurora-story-ring">
                  <img src="https://i.pravatar.cc/100?img=28" alt="Avatar" className="w-8 h-8 rounded-full border-2 border-zinc-900" />
                </div>
                <span className="absolute bottom-3 left-3 right-3 text-xs font-medium text-white line-clamp-1 drop-shadow-md">Emma W.</span>
              </div>
            </div>
          </div>

          {/* Feed */}
          <div className="flex flex-col gap-5 px-4 pb-6">
            
            {/* Post 1 (With Image) */}
            <div className="aurora-glass-card rounded-[24px] overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img src="https://i.pravatar.cc/100?img=47" alt="User" className="w-10 h-10 rounded-full border border-white/10 object-cover" />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[15px] text-white">Alex Chen</span>
                        <BadgeCheck className="w-4 h-4 text-blue-400" />
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <span>2h ago</span>
                        <span>•</span>
                        <Globe className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                  <button className="text-zinc-400 hover:text-white">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[15px] leading-relaxed text-zinc-200 mb-3">
                  Just wrapped up the new design system! 🎨 The aurora vibes are looking absolutely unreal. Can't wait to share more.
                </p>
              </div>
              
              <div className="w-full h-[280px] bg-zinc-800 relative">
                <img src="https://picsum.photos/seed/p1/600/400" alt="Post media" className="w-full h-full object-cover" />
              </div>

              <div className="p-4 pt-3">
                <div className="flex items-center justify-between mb-4 text-sm text-zinc-400 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-1">
                    <div className="flex -space-x-1">
                      <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] border border-zinc-900 z-10">👍</div>
                      <div className="w-5 h-5 rounded-full bg-red-500 flex items-center justify-center text-[10px] border border-zinc-900 z-0">❤️</div>
                    </div>
                    <span className="ml-1">1.2K</span>
                  </div>
                  <div className="flex gap-3">
                    <span>148 comments</span>
                    <span>24 shares</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 transition-colors">
                    <Heart className="w-5 h-5" />
                    <span className="font-medium text-sm">Like</span>
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 transition-colors">
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-medium text-sm">Comment</span>
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 transition-colors">
                    <Share2 className="w-5 h-5" />
                    <span className="font-medium text-sm">Share</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Post 2 (Text Only) */}
            <div className="aurora-glass-card rounded-[24px] overflow-hidden">
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <img src="https://i.pravatar.cc/100?img=16" alt="User" className="w-10 h-10 rounded-full border border-white/10 object-cover" />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-semibold text-[15px] text-white">Diana Prince</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <span>5h ago</span>
                        <span>•</span>
                        <Globe className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                  <button className="text-zinc-400 hover:text-white">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-[15px] leading-relaxed text-zinc-200">
                  Reminder: Take breaks. Step away from the screen. Drink water. Your code will still be there when you get back, and you might just solve that bug faster. 💧✨
                </p>
              </div>

              <div className="p-4 pt-0">
                <div className="flex items-center justify-between mb-4 text-sm text-zinc-400 border-b border-white/5 pb-3">
                  <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-[10px] border border-zinc-900">👍</div>
                    <span className="ml-1">842</span>
                  </div>
                  <div className="flex gap-3">
                    <span>95 comments</span>
                    <span>12 shares</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-blue-400 bg-blue-500/10 transition-colors">
                    <Heart className="w-5 h-5 fill-current" />
                    <span className="font-medium text-sm">Like</span>
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 transition-colors">
                    <MessageSquare className="w-5 h-5" />
                    <span className="font-medium text-sm">Comment</span>
                  </button>
                  <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-300 hover:bg-white/5 transition-colors">
                    <Share2 className="w-5 h-5" />
                    <span className="font-medium text-sm">Share</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Tab Bar */}
        <div className="aurora-glass-tabbar absolute bottom-0 left-0 right-0 h-[84px] px-6 pb-6 pt-3 flex justify-between items-center z-40">
          <button className="flex flex-col items-center gap-1 text-white">
            <Home className="w-[26px] h-[26px] fill-white" />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
            <Users className="w-[26px] h-[26px]" />
            <span className="text-[10px] font-medium">Friends</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
            <PlaySquare className="w-[26px] h-[26px]" />
            <span className="text-[10px] font-medium">Reels</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors relative">
            <Bell className="w-[26px] h-[26px]" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[9px] flex items-center justify-center text-white font-bold border-2 border-zinc-900">3</div>
            <span className="text-[10px] font-medium">Alerts</span>
          </button>
          <button className="flex flex-col items-center gap-1 text-zinc-500 hover:text-zinc-300 transition-colors">
            <Menu className="w-[26px] h-[26px]" />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </div>

        {/* Home Indicator */}
        <div className="absolute bottom-2 left-[50%] -translate-x-1/2 w-1/3 h-1 bg-white rounded-full z-50"></div>
      </div>
    </div>
  );
}
