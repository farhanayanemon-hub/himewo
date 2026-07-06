import React from 'react';
import { Search, MessageCircle, Plus, Image as ImageIcon, Heart, MessageSquare, Share, Home, Users, Clapperboard, Bell, Menu, BadgeCheck, Globe, MoreHorizontal } from 'lucide-react';
import './_editorial.css';

export function Editorial() {
  return (
    <div className="editorial-mobile-mockup flex justify-center bg-neutral-200 p-8 min-h-screen">
      <div className="w-[390px] h-[844px] bg-[var(--paper)] relative overflow-hidden shadow-2xl flex flex-col border border-[var(--border)]">
        
        {/* Header */}
        <header className="flex items-center justify-between px-4 pt-12 pb-4 bg-[var(--paper)] border-b border-[var(--border)] z-10 sticky top-0">
          <h1 className="font-serif text-2xl font-medium tracking-tight text-[var(--accent)]">HiMewo</h1>
          <div className="flex items-center gap-3">
            <button className="w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center bg-[var(--surface)] text-[var(--ink)]">
              <Search size={20} strokeWidth={1.5} />
            </button>
            <button className="w-10 h-10 rounded-full border border-[var(--border)] flex items-center justify-center bg-[var(--surface)] text-[var(--ink)] relative">
              <MessageCircle size={20} strokeWidth={1.5} />
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-600 border-2 border-[var(--surface)]"></span>
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto pb-20 hide-scrollbar">
          
          {/* Stories */}
          <div className="py-4 border-b border-[var(--border)] bg-[var(--surface)]">
            <div className="flex gap-3 px-4 overflow-x-auto hide-scrollbar">
              {/* Create Story */}
              <div className="w-[100px] h-[150px] flex-shrink-0 relative rounded border border-[var(--border)] overflow-hidden flex flex-col items-center">
                <img src="https://i.pravatar.cc/100?img=32" alt="Me" className="w-full h-[100px] object-cover" />
                <div className="flex-1 bg-[var(--paper)] w-full flex flex-col items-center justify-end pb-2 relative">
                  <div className="absolute -top-4 w-8 h-8 rounded-full bg-[var(--accent)] border-2 border-[var(--paper)] flex items-center justify-center text-white">
                    <Plus size={16} />
                  </div>
                  <span className="text-xs font-medium mt-1">Create Story</span>
                </div>
              </div>

              {/* Friend Stories */}
              {[
                { name: "Eleanor", img: "https://picsum.photos/seed/story1/200/300", avatar: "https://i.pravatar.cc/100?img=5" },
                { name: "Arthur", img: "https://picsum.photos/seed/story2/200/300", avatar: "https://i.pravatar.cc/100?img=11" },
                { name: "Beatrice", img: "https://picsum.photos/seed/story3/200/300", avatar: "https://i.pravatar.cc/100?img=20" },
                { name: "Julian", img: "https://picsum.photos/seed/story4/200/300", avatar: "https://i.pravatar.cc/100?img=3" },
              ].map((story, i) => (
                <div key={i} className="w-[100px] h-[150px] flex-shrink-0 relative rounded overflow-hidden border border-[var(--border)]">
                  <img src={story.img} alt="Story" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-black/60"></div>
                  <div className="absolute top-2 left-2 w-8 h-8 rounded-full p-[2px] border-2 border-[var(--accent)] bg-transparent">
                    <img src={story.avatar} className="w-full h-full rounded-full object-cover" alt={story.name} />
                  </div>
                  <span className="absolute bottom-2 left-2 right-2 text-xs font-medium text-white font-serif">{story.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Composer */}
          <div className="p-4 bg-[var(--surface)] border-b border-[var(--border)] mb-2 flex items-center gap-3">
            <img src="https://i.pravatar.cc/100?img=32" alt="Me" className="w-10 h-10 rounded-full border border-[var(--border)]" />
            <div className="flex-1 h-10 px-4 rounded-full border border-[var(--border)] bg-[var(--paper)] flex items-center text-[var(--ink-light)] text-sm">
              What's on your mind?
            </div>
            <button className="text-[var(--accent)] p-2">
              <ImageIcon size={24} strokeWidth={1.5} />
            </button>
          </div>

          {/* Posts */}
          
          {/* Post 1 */}
          <article className="bg-[var(--surface)] border-y border-[var(--border)] mb-2">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img src="https://i.pravatar.cc/100?img=44" alt="Avatar" className="w-10 h-10 rounded-full border border-[var(--border)]" />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-serif font-medium">Clara Bow</span>
                      <BadgeCheck size={14} className="text-[var(--accent)]" />
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[var(--ink-light)]">
                      <span>2 hrs ago</span>
                      <span>·</span>
                      <Globe size={10} />
                    </div>
                  </div>
                </div>
                <button className="text-[var(--ink-light)]">
                  <MoreHorizontal size={20} />
                </button>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                Spent the morning at the botanical gardens. The quiet symmetry of nature is always the best remedy for a loud week. Highly recommend the new greenhouse exhibit.
              </p>
            </div>
            <div className="w-full h-[280px] border-y border-[var(--border)]">
              <img src="https://picsum.photos/seed/botanical/600/400" alt="Botanical" className="w-full h-full object-cover" />
            </div>
            <div className="px-4 py-3 flex items-center justify-between text-xs text-[var(--ink-light)] border-b border-[var(--border)]">
              <div className="flex items-center gap-1">
                <span className="text-base">🌿🤍</span>
                <span>244</span>
              </div>
              <div className="flex gap-3">
                <span>42 comments</span>
                <span>12 shares</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 py-1">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-[var(--ink)] font-medium text-sm rounded hover:bg-[var(--paper)]">
                <Heart size={18} strokeWidth={1.5} />
                <span>Like</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-[var(--ink)] font-medium text-sm rounded hover:bg-[var(--paper)]">
                <MessageSquare size={18} strokeWidth={1.5} />
                <span>Comment</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-[var(--ink)] font-medium text-sm rounded hover:bg-[var(--paper)]">
                <Share size={18} strokeWidth={1.5} />
                <span>Share</span>
              </button>
            </div>
          </article>

          {/* Post 2 */}
          <article className="bg-[var(--surface)] border-y border-[var(--border)] mb-2">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <img src="https://i.pravatar.cc/100?img=12" alt="Avatar" className="w-10 h-10 rounded-full border border-[var(--border)]" />
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="font-serif font-medium">Elias Thorne</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-[var(--ink-light)]">
                      <span>5 hrs ago</span>
                      <span>·</span>
                      <Globe size={10} />
                    </div>
                  </div>
                </div>
                <button className="text-[var(--ink-light)]">
                  <MoreHorizontal size={20} />
                </button>
              </div>
              <p className="text-sm leading-relaxed mb-4">
                "The only way to make sense out of change is to plunge into it, move with it, and join the dance." — Alan Watts
                <br/><br/>
                Just thinking about this quote today. Hope everyone is having a peaceful Thursday.
              </p>
            </div>
            <div className="px-4 py-3 flex items-center justify-between text-xs text-[var(--ink-light)] border-y border-[var(--border)]">
              <div className="flex items-center gap-1">
                <span className="text-base">💡👍</span>
                <span>89</span>
              </div>
              <div className="flex gap-3">
                <span>14 comments</span>
              </div>
            </div>
            <div className="flex items-center justify-between px-2 py-1">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-[var(--ink)] font-medium text-sm rounded hover:bg-[var(--paper)]">
                <Heart size={18} strokeWidth={1.5} />
                <span>Like</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-[var(--ink)] font-medium text-sm rounded hover:bg-[var(--paper)]">
                <MessageSquare size={18} strokeWidth={1.5} />
                <span>Comment</span>
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 text-[var(--ink)] font-medium text-sm rounded hover:bg-[var(--paper)]">
                <Share size={18} strokeWidth={1.5} />
                <span>Share</span>
              </button>
            </div>
          </article>

        </div>

        {/* Bottom Tab Bar */}
        <nav className="absolute bottom-0 w-full bg-[var(--surface)] border-t border-[var(--border)] px-2 py-2 pb-6 flex items-center justify-around z-20">
          <button className="flex flex-col items-center gap-1 p-2 text-[var(--accent)] w-16">
            <Home size={22} strokeWidth={2} />
            <span className="text-[10px] font-medium">Home</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-[var(--ink-light)] w-16 hover:text-[var(--ink)]">
            <Users size={22} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Friends</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-[var(--ink-light)] w-16 hover:text-[var(--ink)]">
            <Clapperboard size={22} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Reels</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-[var(--ink-light)] w-16 hover:text-[var(--ink)] relative">
            <Bell size={22} strokeWidth={1.5} />
            <span className="absolute top-2 right-4 w-2 h-2 rounded-full bg-red-600"></span>
            <span className="text-[10px] font-medium">Alerts</span>
          </button>
          <button className="flex flex-col items-center gap-1 p-2 text-[var(--ink-light)] w-16 hover:text-[var(--ink)]">
            <Menu size={22} strokeWidth={1.5} />
            <span className="text-[10px] font-medium">Menu</span>
          </button>
        </nav>
        
      </div>
    </div>
  );
}
