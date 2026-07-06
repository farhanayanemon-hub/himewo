import React from 'react';
import { Search, MessageCircle, Plus, Heart, MessageSquare, Share2, Home, Users, PlaySquare, Bell, Menu, Image as ImageIcon, MoreHorizontal, BadgeCheck, Globe } from 'lucide-react';
import './sunset-mobile.css';

export function Sunset() {
  return (
    <div className="sunset-mobile-wrapper w-full min-h-[100dvh] relative overflow-hidden pb-20">
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      
      {/* Header */}
      <header className="px-4 pt-12 pb-3 bg-white/80 backdrop-blur-lg sticky top-0 z-50 flex items-center justify-between border-b border-orange-100/50">
        <h1 className="text-3xl font-extrabold tracking-tight text-gradient-sunset">
          HiMewo
        </h1>
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-[#FF7A1A] hover:bg-orange-100 transition-colors">
            <Search size={20} strokeWidth={2.5} />
          </button>
          <button className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center text-[#FF7A1A] hover:bg-orange-100 transition-colors relative">
            <MessageCircle size={20} strokeWidth={2.5} />
            <span className="absolute top-0 right-0 w-3 h-3 bg-[#D93673] rounded-full border-2 border-white"></span>
          </button>
        </div>
      </header>

      <main className="h-full overflow-y-auto no-scrollbar pb-24">
        {/* Stories Row */}
        <section className="py-4 pl-4 bg-white mb-2 shadow-sm shadow-orange-500/5">
          <div className="flex gap-3 overflow-x-auto no-scrollbar pr-4 pb-2">
            {/* Create Story */}
            <div className="relative w-[100px] h-[160px] rounded-3xl overflow-hidden flex-shrink-0 bg-orange-50 border border-orange-100 flex flex-col items-center justify-end pb-3 group">
              <img src="https://i.pravatar.cc/100?img=33" alt="You" className="absolute inset-0 w-full h-[70%] object-cover opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-t from-orange-100 via-transparent to-transparent"></div>
              <div className="w-10 h-10 rounded-full bg-gradient-sunset flex items-center justify-center text-white shadow-lg shadow-orange-500/30 z-10 -mt-5 mb-1 border-4 border-white">
                <Plus size={20} strokeWidth={3} />
              </div>
              <span className="text-xs font-bold text-orange-900 z-10">Add Story</span>
            </div>

            {/* Friend Story 1 */}
            <div className="relative w-[100px] h-[160px] rounded-3xl overflow-hidden flex-shrink-0 group cursor-pointer">
              <img src="https://picsum.photos/seed/story1/200/320" alt="Story" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
              <div className="absolute top-2 left-2 w-10 h-10 rounded-full border-gradient-sunset p-[2px]">
                <img src="https://i.pravatar.cc/100?img=47" alt="Sarah" className="w-full h-full rounded-full border-2 border-white object-cover" />
              </div>
              <span className="absolute bottom-3 left-3 text-xs font-bold text-white z-10">Sarah L.</span>
            </div>

            {/* Friend Story 2 */}
            <div className="relative w-[100px] h-[160px] rounded-3xl overflow-hidden flex-shrink-0 group cursor-pointer">
              <img src="https://picsum.photos/seed/story2/200/320" alt="Story" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
              <div className="absolute top-2 left-2 w-10 h-10 rounded-full border-gradient-sunset p-[2px]">
                <img src="https://i.pravatar.cc/100?img=12" alt="Mike" className="w-full h-full rounded-full border-2 border-white object-cover" />
              </div>
              <span className="absolute bottom-3 left-3 text-xs font-bold text-white z-10">Mike D.</span>
            </div>

            {/* Friend Story 3 */}
            <div className="relative w-[100px] h-[160px] rounded-3xl overflow-hidden flex-shrink-0 group cursor-pointer">
              <img src="https://picsum.photos/seed/story3/200/320" alt="Story" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
              <div className="absolute top-2 left-2 w-10 h-10 rounded-full border-gradient-sunset p-[2px]">
                <img src="https://i.pravatar.cc/100?img=25" alt="Emma" className="w-full h-full rounded-full border-2 border-white object-cover" />
              </div>
              <span className="absolute bottom-3 left-3 text-xs font-bold text-white z-10">Emma W.</span>
            </div>
          </div>
        </section>

        {/* Post Composer */}
        <section className="bg-white p-4 mb-2 shadow-sm shadow-orange-500/5 flex items-center gap-3">
          <img src="https://i.pravatar.cc/100?img=33" alt="You" className="w-12 h-12 rounded-full object-cover" />
          <div className="flex-1 bg-orange-50/80 rounded-full py-3 px-5 border border-orange-100">
            <span className="text-orange-800/60 font-medium">What's on your mind?</span>
          </div>
          <button className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center text-[#D93673]">
            <ImageIcon size={22} strokeWidth={2.5} />
          </button>
        </section>

        {/* Feed */}
        <div className="flex flex-col gap-2">
          {/* Post 1 */}
          <article className="bg-white p-4 shadow-sm shadow-orange-500/5">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img src="https://i.pravatar.cc/100?img=5" alt="Alex" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="font-bold text-gray-900 text-[15px]">Alex Chen</h3>
                    <BadgeCheck size={16} className="text-[#FF7A1A]" fill="#FFB347" strokeWidth={1.5} />
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <span>2 hrs ago</span>
                    <span>·</span>
                    <Globe size={12} />
                  </div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal size={20} />
              </button>
            </div>
            
            <p className="text-gray-800 leading-relaxed mb-4 font-medium">
              Just caught the most amazing sunset down at the pier! The colors were absolutely unreal today. Nature really showing off. 🌅✨
            </p>
            
            <div className="rounded-3xl overflow-hidden mb-4 border border-orange-50">
              <img src="https://picsum.photos/seed/sunset/600/400" alt="Sunset" className="w-full h-auto object-cover max-h-[300px]" />
            </div>
            
            <div className="flex justify-between items-center mb-4 px-1 text-sm font-medium text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1">
                  <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px]">🔥</div>
                  <div className="w-5 h-5 rounded-full bg-pink-100 flex items-center justify-center text-[10px]">❤️</div>
                </div>
                <span>245</span>
              </div>
              <div className="flex gap-3">
                <span>42 comments</span>
                <span>12 shares</span>
              </div>
            </div>
            
            <div className="flex justify-between border-t border-gray-100 pt-1">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 font-semibold hover:text-[#FF7A1A] hover:bg-orange-50 rounded-xl transition-colors">
                <Heart size={20} strokeWidth={2.5} />
                <span>Like</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 font-semibold hover:text-[#FF7A1A] hover:bg-orange-50 rounded-xl transition-colors">
                <MessageSquare size={20} strokeWidth={2.5} />
                <span>Comment</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 font-semibold hover:text-[#FF7A1A] hover:bg-orange-50 rounded-xl transition-colors">
                <Share2 size={20} strokeWidth={2.5} />
                <span>Share</span>
              </button>
            </div>
          </article>

          {/* Post 2 */}
          <article className="bg-white p-4 shadow-sm shadow-orange-500/5 mb-10">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden">
                  <img src="https://i.pravatar.cc/100?img=44" alt="Jessica" className="w-full h-full object-cover" />
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    <h3 className="font-bold text-gray-900 text-[15px]">Jessica Wong</h3>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                    <span>5 hrs ago</span>
                    <span>·</span>
                    <Globe size={12} />
                  </div>
                </div>
              </div>
              <button className="text-gray-400 hover:text-gray-600">
                <MoreHorizontal size={20} />
              </button>
            </div>
            
            <p className="text-gray-800 leading-relaxed mb-4 font-medium">
              Anyone have recommendations for a good coffee shop to work from in the downtown area? Looking for somewhere with strong wifi and good vibes. ☕️💻
            </p>
            
            <div className="flex justify-between items-center mb-4 px-1 text-sm font-medium text-gray-500">
              <div className="flex items-center gap-1.5">
                <div className="flex -space-x-1">
                  <div className="w-5 h-5 rounded-full bg-orange-100 flex items-center justify-center text-[10px]">👍</div>
                </div>
                <span>56</span>
              </div>
              <div className="flex gap-3">
                <span>18 comments</span>
              </div>
            </div>
            
            <div className="flex justify-between border-t border-gray-100 pt-1">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 font-semibold hover:text-[#FF7A1A] hover:bg-orange-50 rounded-xl transition-colors">
                <Heart size={20} strokeWidth={2.5} />
                <span>Like</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 font-semibold hover:text-[#FF7A1A] hover:bg-orange-50 rounded-xl transition-colors">
                <MessageSquare size={20} strokeWidth={2.5} />
                <span>Comment</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-gray-600 font-semibold hover:text-[#FF7A1A] hover:bg-orange-50 rounded-xl transition-colors">
                <Share2 size={20} strokeWidth={2.5} />
                <span>Share</span>
              </button>
            </div>
          </article>
        </div>
      </main>

      {/* Bottom Tab Bar */}
      <nav className="absolute bottom-0 left-0 right-0 bg-white border-t border-orange-100 px-6 py-3 pb-8 flex justify-between items-center shadow-[0_-10px_40px_-15px_rgba(255,122,26,0.15)] z-50">
        <button className="flex flex-col items-center gap-1 text-[#FF7A1A]">
          <div className="relative">
            <Home size={26} strokeWidth={2.5} />
            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#FF7A1A] rounded-full"></div>
          </div>
          <span className="text-[10px] font-bold mt-1">Home</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
          <Users size={26} strokeWidth={2.5} />
          <span className="text-[10px] font-bold mt-1">Friends</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
          <PlaySquare size={26} strokeWidth={2.5} />
          <span className="text-[10px] font-bold mt-1">Reels</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors relative">
          <Bell size={26} strokeWidth={2.5} />
          <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-[#D93673] rounded-full border-2 border-white"></span>
          <span className="text-[10px] font-bold mt-1">Notifs</span>
        </button>
        <button className="flex flex-col items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors">
          <Menu size={26} strokeWidth={2.5} />
          <span className="text-[10px] font-bold mt-1">Menu</span>
        </button>
      </nav>
    </div>
  );
}
