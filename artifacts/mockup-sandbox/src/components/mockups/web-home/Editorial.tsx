import React, { useState } from 'react';
import './_editorial.css';
import { 
  Search, Home, Users, Clapperboard, UsersRound, Store, 
  MessageCircle, Bell, Plus, Image as ImageIcon, Video, 
  BarChart2, Smile, MapPin, MoreHorizontal, ThumbsUp, 
  MessageSquare, Share2, Globe, Heart, CheckCircle2,
  Tv, Calendar, Clock, Bookmark, Coins
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../../ui/avatar';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';

export function Editorial() {
  return (
    <div className="editorial-theme flex flex-col w-full h-screen overflow-hidden">
      <Header />
      <main className="flex-1 overflow-y-auto flex justify-center w-full px-4 lg:px-8 py-6">
        <div className="max-w-[1400px] w-full flex justify-between gap-8">
          <LeftSidebar />
          <CenterFeed />
          <RightSidebar />
        </div>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 bg-surface border-b border-hairline px-6 h-16 flex items-center justify-between">
      <div className="flex items-center gap-4 w-1/4">
        <div className="font-serif font-bold text-2xl tracking-tight text-primary">HiMewo</div>
        <div className="relative group hidden lg:block w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-secondary" />
          <input 
            type="text" 
            placeholder="Search HiMewo" 
            className="w-full h-10 pl-10 pr-4 bg-transparent border-hairline rounded-full focus:outline-none focus:border-accent-color text-sm text-primary placeholder:text-secondary font-sans transition-colors"
          />
        </div>
      </div>
      
      <div className="flex items-center justify-center gap-2 lg:gap-8 w-2/4">
        {[
          { icon: Home, active: true },
          { icon: Users, active: false },
          { icon: Clapperboard, active: false },
          { icon: UsersRound, active: false },
          { icon: Store, active: false }
        ].map((item, i) => (
          <button 
            key={i} 
            className={`p-3 rounded-xl transition-all ${
              item.active 
                ? 'text-accent border-b-2 border-accent-color -mb-[2px]' 
                : 'text-secondary hover:bg-gray-50'
            }`}
          >
            <item.icon className="w-5 h-5 stroke-[1.5]" />
          </button>
        ))}
      </div>
      
      <div className="flex items-center justify-end gap-3 w-1/4">
        <button className="p-2.5 rounded-full bg-gray-50 hover:bg-gray-100 text-primary transition-colors">
          <MessageCircle className="w-5 h-5 stroke-[1.5]" />
        </button>
        <button className="p-2.5 rounded-full bg-gray-50 hover:bg-gray-100 text-primary transition-colors relative">
          <Bell className="w-5 h-5 stroke-[1.5]" />
          <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
        </button>
        <Avatar className="w-9 h-9 border border-hairline cursor-pointer ml-2">
          <AvatarImage src="https://i.pravatar.cc/100?img=12" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}

function LeftSidebar() {
  const mainNav = [
    { icon: Users, label: 'Friends' },
    { icon: Clapperboard, label: 'Reels' },
    { icon: UsersRound, label: 'Groups' },
    { icon: Bookmark, label: 'Pages' },
    { icon: Store, label: 'Marketplace' },
    { icon: Coins, label: 'Earnings' },
  ];

  const shortcuts = [
    { icon: Tv, label: 'Live' },
    { icon: Clapperboard, label: 'Watch' },
    { icon: Calendar, label: 'Events' },
    { icon: Clock, label: 'Memories' },
    { icon: Bookmark, label: 'Saved' },
  ];

  return (
    <aside className="w-[280px] hidden xl:block flex-shrink-0 pt-2 pb-8 h-[calc(100vh-4rem)] sticky top-20 overflow-y-auto no-scrollbar">
      <div className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors mb-4">
        <Avatar className="w-10 h-10 border border-hairline">
          <AvatarImage src="https://i.pravatar.cc/100?img=12" />
          <AvatarFallback>JD</AvatarFallback>
        </Avatar>
        <span className="font-serif font-medium text-[15px] text-primary">Julianna Davies</span>
      </div>

      <div className="space-y-1 mb-8">
        {mainNav.map((item, i) => (
          <button key={i} className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors text-primary group">
            <item.icon className="w-5 h-5 text-secondary group-hover:text-accent stroke-[1.5] transition-colors" />
            <span className="font-sans text-[14px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>

      <div className="h-px bg-border-color w-full my-4"></div>

      <div className="space-y-1">
        <h3 className="font-serif font-medium text-lg text-secondary px-3 py-2 mb-2">Shortcuts</h3>
        {shortcuts.map((item, i) => (
          <button key={i} className="w-full flex items-center gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors text-primary group">
            <item.icon className="w-5 h-5 text-secondary group-hover:text-accent stroke-[1.5] transition-colors" />
            <span className="font-sans text-[14px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </aside>
  );
}

function CenterFeed() {
  return (
    <div className="w-full max-w-[640px] flex-shrink-0 flex flex-col gap-8 pb-20">
      {/* Stories */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 pt-2">
        <div className="relative w-32 h-48 rounded-2xl border border-hairline overflow-hidden cursor-pointer group flex-shrink-0 bg-surface flex flex-col">
          <img src="https://i.pravatar.cc/100?img=12" className="w-full h-32 object-cover" alt="Create Story" />
          <div className="absolute top-[110px] left-1/2 -translate-x-1/2 w-10 h-10 bg-accent rounded-full border-4 border-white flex items-center justify-center group-hover:scale-105 transition-transform">
            <Plus className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 bg-surface flex items-end justify-center pb-3">
            <span className="font-sans text-xs font-medium text-primary">Create Story</span>
          </div>
        </div>
        
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="relative w-32 h-48 rounded-2xl border border-hairline overflow-hidden cursor-pointer group flex-shrink-0">
            <img src={`https://picsum.photos/seed/${i + 10}/200/300`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt="Story" />
            <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors"></div>
            <Avatar className="absolute top-3 left-3 w-8 h-8 border-2 border-accent">
              <AvatarImage src={`https://i.pravatar.cc/100?img=${i + 20}`} />
            </Avatar>
            <span className="absolute bottom-3 left-3 right-3 font-sans text-xs font-medium text-white line-clamp-1 drop-shadow-md">
              {['Eleanor', 'Marcus', 'Sophia', 'James'][i-1]}
            </span>
          </div>
        ))}
      </div>

      {/* Composer */}
      <div className="bg-surface rounded-2xl border border-hairline p-5">
        <div className="flex gap-4 items-start mb-4">
          <Avatar className="w-10 h-10 border border-hairline flex-shrink-0">
            <AvatarImage src="https://i.pravatar.cc/100?img=12" />
          </Avatar>
          <div className="flex-1">
            <textarea 
              placeholder="What's on your mind, Julianna?" 
              className="w-full bg-transparent resize-none outline-none font-serif text-lg text-primary placeholder:text-secondary/70 h-14 pt-2"
            />
          </div>
        </div>
        <div className="h-px bg-border-color w-full mb-4"></div>
        <div className="flex items-center justify-between">
          <div className="flex gap-1 sm:gap-2">
            <button className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-50 transition-colors text-secondary text-sm font-medium">
              <ImageIcon className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Photo</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-50 transition-colors text-secondary text-sm font-medium">
              <Video className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">Video</span>
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-full hover:bg-gray-50 transition-colors text-secondary text-sm font-medium">
              <BarChart2 className="w-4 h-4 text-sky-600" />
              <span className="hidden sm:inline">Poll</span>
            </button>
          </div>
          <button className="bg-accent text-white px-5 py-2 rounded-full font-sans text-sm font-medium hover:bg-accent-hover transition-colors">
            Post
          </button>
        </div>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        <PostCard 
          author="Alexander Wright"
          avatar="https://i.pravatar.cc/100?img=33"
          verified={true}
          time="2 hours ago"
          text="Just finished reading 'The Overstory'. It's remarkable how trees communicate and support each other through vast underground networks. A profound reminder of our interconnectedness. Highly recommend it to anyone looking for a change in perspective. 🌲"
          likes={124}
          comments={18}
          shares={5}
        />
        
        <PostCard 
          author="Studio Nordic"
          avatar="https://i.pravatar.cc/100?img=44"
          verified={false}
          time="Sponsored"
          text="Elevate your workspace with our new collection of minimalist oak desks. Designed in Copenhagen, built to last a lifetime. Explore the collection at ৳25,000."
          image="https://picsum.photos/seed/desk/600/400"
          likes={892}
          comments={45}
          shares={12}
          sponsored={true}
        />

        <PostCard 
          author="Clara Bennet"
          avatar="https://i.pravatar.cc/100?img=55"
          verified={false}
          time="5 hours ago"
          text="Morning coffee and weekend sketching. The light in the studio today is absolutely perfect. ☕️✏️"
          image="https://picsum.photos/seed/coffee/600/600"
          likes={342}
          comments={28}
          shares={2}
        />
      </div>
    </div>
  );
}

function PostCard({ author, avatar, verified, time, text, image, likes, comments, shares, sponsored = false }: any) {
  return (
    <div className="bg-surface rounded-2xl border border-hairline overflow-hidden">
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border border-hairline">
              <AvatarImage src={avatar} />
            </Avatar>
            <div>
              <div className="flex items-center gap-1">
                <h4 className="font-serif font-bold text-[16px] text-primary tracking-tight">{author}</h4>
                {verified && <CheckCircle2 className="w-4 h-4 text-accent fill-white" />}
              </div>
              <div className="flex items-center gap-1.5 text-[12px] text-secondary font-sans mt-0.5">
                <span>{time}</span>
                {!sponsored && (
                  <>
                    <span>·</span>
                    <Globe className="w-3 h-3" />
                  </>
                )}
              </div>
            </div>
          </div>
          <button className="text-secondary hover:text-primary p-2 rounded-full hover:bg-gray-50 transition-colors">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
        
        <p className="font-sans text-[15px] leading-relaxed text-primary whitespace-pre-wrap">
          {text}
        </p>
      </div>

      {image && (
        <div className="w-full border-y border-hairline mt-2">
          <img src={image} alt="Post content" className="w-full h-auto object-cover max-h-[500px]" />
        </div>
      )}

      <div className="px-5 py-3">
        <div className="flex items-center justify-between text-[13px] text-secondary font-sans pb-3 border-b border-hairline mb-1">
          <div className="flex items-center gap-1.5">
            <div className="flex -space-x-1">
              <div className="w-5 h-5 rounded-full bg-accent flex items-center justify-center border border-white z-10">
                <ThumbsUp className="w-2.5 h-2.5 text-white" />
              </div>
              <div className="w-5 h-5 rounded-full bg-rose-500 flex items-center justify-center border border-white z-0">
                <Heart className="w-2.5 h-2.5 text-white" />
              </div>
            </div>
            <span className="ml-1">{likes}</span>
          </div>
          <div className="flex gap-3">
            <span>{comments} comments</span>
            <span>{shares} shares</span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-secondary hover:text-primary transition-colors font-sans text-[14px] font-medium">
            <ThumbsUp className="w-4 h-4 stroke-[1.5]" />
            <span>Like</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-secondary hover:text-primary transition-colors font-sans text-[14px] font-medium">
            <MessageSquare className="w-4 h-4 stroke-[1.5]" />
            <span>Comment</span>
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg hover:bg-gray-50 text-secondary hover:text-primary transition-colors font-sans text-[14px] font-medium">
            <Share2 className="w-4 h-4 stroke-[1.5]" />
            <span>Share</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function RightSidebar() {
  const requests = [
    { name: 'Thomas Reid', avatar: 'https://i.pravatar.cc/100?img=66', mutual: 4 },
  ];

  const contacts = [
    { name: 'Arthur Pendleton', avatar: 'https://i.pravatar.cc/100?img=11', online: true },
    { name: 'Beatrice Ward', avatar: 'https://i.pravatar.cc/100?img=15', online: true },
    { name: 'Charles Mingus', avatar: 'https://i.pravatar.cc/100?img=32', online: false },
    { name: 'Diana Ross', avatar: 'https://i.pravatar.cc/100?img=41', online: true },
    { name: 'Edward Hopper', avatar: 'https://i.pravatar.cc/100?img=52', online: true },
    { name: 'Fiona Apple', avatar: 'https://i.pravatar.cc/100?img=61', online: false },
  ];

  return (
    <aside className="w-[300px] hidden lg:block flex-shrink-0 pt-2 pb-8 h-[calc(100vh-4rem)] sticky top-20 overflow-y-auto no-scrollbar">
      {/* Friend Requests */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4 px-2">
          <h3 className="font-serif font-medium text-lg text-secondary">Friend Requests</h3>
          <button className="text-accent text-sm font-sans hover:underline">See All</button>
        </div>
        
        <div className="space-y-4">
          {requests.map((req, i) => (
            <div key={i} className="flex gap-3 bg-surface p-3 rounded-2xl border border-hairline">
              <Avatar className="w-12 h-12 border border-hairline">
                <AvatarImage src={req.avatar} />
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-serif font-bold text-[15px] text-primary">{req.name}</h4>
                  <span className="text-[12px] text-secondary font-sans">2d</span>
                </div>
                <p className="text-[12px] text-secondary font-sans mb-2">{req.mutual} mutual friends</p>
                <div className="flex gap-2">
                  <button className="flex-1 bg-accent hover:bg-accent-hover text-white text-[13px] font-sans font-medium py-1.5 rounded-lg transition-colors">
                    Confirm
                  </button>
                  <button className="flex-1 bg-gray-100 hover:bg-gray-200 text-primary text-[13px] font-sans font-medium py-1.5 rounded-lg transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="h-px bg-border-color w-full my-6"></div>

      {/* Birthdays */}
      <div className="mb-8 px-2">
        <h3 className="font-serif font-medium text-lg text-secondary mb-4">Birthdays</h3>
        <div className="flex items-start gap-3">
          <div className="mt-1">
            <span className="text-2xl">🎁</span>
          </div>
          <p className="font-sans text-[14px] text-primary leading-snug">
            <span className="font-bold">Eleanor Vance</span> and <span className="font-bold">2 others</span> have birthdays today.
          </p>
        </div>
      </div>

      <div className="h-px bg-border-color w-full my-6"></div>

      {/* Contacts */}
      <div className="px-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-serif font-medium text-lg text-secondary">Contacts</h3>
          <div className="flex gap-2 text-secondary">
            <Search className="w-4 h-4 cursor-pointer hover:text-primary" />
            <MoreHorizontal className="w-4 h-4 cursor-pointer hover:text-primary" />
          </div>
        </div>
        
        <div className="space-y-1">
          {contacts.map((contact, i) => (
            <button key={i} className="w-full flex items-center gap-3 p-2 hover:bg-gray-50 rounded-xl transition-colors group">
              <div className="relative">
                <Avatar className="w-8 h-8 border border-hairline">
                  <AvatarImage src={contact.avatar} />
                </Avatar>
                {contact.online && (
                  <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-surface"></div>
                )}
              </div>
              <span className="font-serif font-medium text-[15px] text-primary group-hover:text-accent transition-colors">
                {contact.name}
              </span>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
