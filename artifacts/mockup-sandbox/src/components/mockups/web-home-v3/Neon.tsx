import './_group.css';
import {
  Home,
  Clapperboard,
  Users,
  Bell,
  Search,
  MessageCircle,
  Menu,
  User,
  Bookmark,
  Flag,
  CalendarDays,
  PlaySquare,
  Video,
  Image as ImageIcon,
  Smile,
  ThumbsUp,
  MessageSquare,
  Share2,
  MoreHorizontal,
  Globe,
  Plus,
  Zap,
} from 'lucide-react';

const shortcuts = [
  { label: 'Profile', icon: User, color: '#22d3ee' },
  { label: 'Friends', icon: Users, color: '#d946ef' },
  { label: 'Groups', icon: Users, color: '#a3e635' },
  { label: 'Pages', icon: Flag, color: '#22d3ee' },
  { label: 'Reels', icon: Clapperboard, color: '#d946ef' },
  { label: 'Watch', icon: PlaySquare, color: '#a3e635' },
  { label: 'Saved', icon: Bookmark, color: '#22d3ee' },
  { label: 'Events', icon: CalendarDays, color: '#d946ef' },
];

const stories = [
  { name: 'Nadia Rahman', img: 33, seed: 'aurora' },
  { name: 'Kenji Watanabe', img: 12, seed: 'circuit' },
  { name: 'Lena Volkova', img: 45, seed: 'synthwave' },
  { name: 'Tariq Hasan', img: 68, seed: 'neonrain' },
  { name: 'Mara Silva', img: 24, seed: 'skyline' },
  { name: 'Omar Farooq', img: 15, seed: 'glowcity' },
];

const posts = [
  {
    author: 'HiMewo Labs',
    img: 51,
    time: '2h',
    audience: 'Public',
    verified: true,
    content:
      'We just shipped Pulse — real-time reactions that light up your feed the instant friends respond. Tap, glow, repeat. Rolling out to everyone this week. ⚡',
    photo: 'https://picsum.photos/seed/neonpulse/600/400',
    likes: 4820,
    comments: 612,
    shares: 218,
  },
  {
    author: 'Elena Rostova',
    img: 41,
    time: '4h',
    audience: 'Friends',
    verified: false,
    content:
      'Late night at the studio finishing the album artwork. The city never sleeps and neither do the deadlines. Which cover do you think hits harder? 💜',
    photo: 'https://picsum.photos/seed/nightcity/600/400',
    likes: 1276,
    comments: 184,
    shares: 42,
  },
  {
    author: 'Daniel Osei',
    img: 60,
    time: '7h',
    audience: 'Public',
    verified: true,
    content:
      'Hot take: the best productivity hack is a good pair of headphones and absolutely no notifications for two hours. Deep work > busy work. Who is with me?',
    photo: null,
    likes: 903,
    comments: 271,
    shares: 37,
  },
];

const contacts = [
  { name: 'Sofia Marchetti', img: 47 },
  { name: 'Michael Chang', img: 52 },
  { name: 'Aisha Kamara', img: 44 },
  { name: 'Lucas Meyer', img: 13 },
  { name: 'Priya Nair', img: 26 },
  { name: 'Noah Bennett', img: 59 },
  { name: 'Yuki Tanaka', img: 32 },
  { name: 'Zara Ahmed', img: 20 },
];

function Avatar({ img, size = 40, ring }: { img: number; size?: number; ring?: string }) {
  return (
    <img
      src={`https://i.pravatar.cc/150?img=${img}`}
      alt=""
      className="rounded-full object-cover"
      style={{
        width: size,
        height: size,
        boxShadow: ring ? `0 0 0 2px #05060a, 0 0 0 3.5px ${ring}, 0 0 12px ${ring}66` : undefined,
      }}
    />
  );
}

function NavIcon({
  icon: Icon,
  active,
}: {
  icon: any;
  active?: boolean;
}) {
  return (
    <button
      className="relative flex h-11 w-16 items-center justify-center rounded-xl transition-colors"
      style={{
        color: active ? '#22d3ee' : '#94a3b8',
        background: active ? 'rgba(34,211,238,0.08)' : 'transparent',
      }}
    >
      <Icon className="h-6 w-6" strokeWidth={active ? 2.4 : 2} />
      {active && (
        <span
          className="absolute bottom-0 h-[3px] w-9 rounded-full"
          style={{ background: '#22d3ee', boxShadow: '0 0 10px #22d3ee' }}
        />
      )}
    </button>
  );
}

export function Neon() {
  const panel =
    'rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl';
  const glowPanel = {
    boxShadow:
      '0 0 0 1px rgba(34,211,238,0.10), 0 8px 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
  };

  return (
    <div className="neon-grid-bg min-h-screen w-full font-sans text-slate-200">
      {/* Top nav */}
      <header
        className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/10 px-4"
        style={{
          background: 'rgba(5,6,10,0.82)',
          backdropFilter: 'blur(20px)',
          boxShadow: '0 1px 0 rgba(34,211,238,0.12)',
        }}
      >
        {/* left */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{
                background: 'linear-gradient(135deg, #22d3ee, #d946ef)',
                boxShadow: '0 0 18px rgba(34,211,238,0.55)',
              }}
            >
              <Zap className="h-6 w-6 text-slate-950" strokeWidth={2.6} fill="#05060a" />
            </div>
            <span
              className="hidden text-2xl font-extrabold tracking-tight sm:block"
              style={{
                background: 'linear-gradient(90deg, #22d3ee, #d946ef)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 0 24px rgba(217,70,239,0.35)',
              }}
            >
              HiMewo
            </span>
          </div>
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              readOnly
              placeholder="Search HiMewo"
              className="h-10 w-56 rounded-full border border-white/10 bg-white/[0.04] pl-9 pr-4 text-sm text-slate-300 placeholder-slate-500 outline-none focus:border-cyan-400/50"
            />
          </div>
        </div>

        {/* center */}
        <nav className="hidden items-center gap-1 lg:flex">
          <NavIcon icon={Home} active />
          <NavIcon icon={Clapperboard} />
          <NavIcon icon={Users} />
          <NavIcon icon={Bell} />
        </nav>

        {/* right */}
        <div className="flex items-center gap-2">
          {[Menu, MessageCircle, Bell].map((Icon, i) => (
            <button
              key={i}
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] text-slate-300 transition-colors hover:text-cyan-300"
            >
              <Icon className="h-5 w-5" />
              {i === 2 && (
                <span
                  className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-slate-950"
                  style={{ background: '#d946ef', boxShadow: '0 0 8px #d946ef' }}
                >
                  7
                </span>
              )}
            </button>
          ))}
          <Avatar img={65} size={40} ring="#22d3ee" />
        </div>
      </header>

      {/* Body */}
      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-5 px-4 py-5 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* Left sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-1">
            <div className="mb-2 flex items-center gap-3 rounded-xl px-2 py-2">
              <Avatar img={65} size={38} ring="#d946ef" />
              <span className="font-semibold text-slate-100">Ava Sterling</span>
            </div>
            {shortcuts.map((s) => (
              <button
                key={s.label}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.05]"
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10"
                  style={{ background: `${s.color}14` }}
                >
                  <s.icon className="h-4 w-4" style={{ color: s.color }} />
                </span>
                {s.label}
              </button>
            ))}
            <div className="mt-4 border-t border-white/10 pt-3 px-3 text-xs text-slate-500">
              HiMewo © 2026 · Privacy · Terms
            </div>
          </div>
        </aside>

        {/* Center column */}
        <main className="space-y-5">
          {/* Stories */}
          <section
            className={`${panel} neon-scrollbar flex gap-3 overflow-x-auto p-3`}
            style={glowPanel}
          >
            {/* create story */}
            <div className="relative h-48 w-28 shrink-0 overflow-hidden rounded-xl border border-white/10">
              <img
                src="https://picsum.photos/seed/mystory/200/300"
                alt=""
                className="h-32 w-full object-cover opacity-90"
              />
              <div className="absolute inset-x-0 bottom-0 flex h-16 flex-col items-center justify-end bg-slate-950/90 pb-2">
                <span className="text-xs font-semibold text-slate-200">Create Story</span>
              </div>
              <div
                className="absolute left-1/2 top-[104px] flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-full border-4 border-slate-950"
                style={{ background: '#22d3ee', boxShadow: '0 0 12px #22d3ee' }}
              >
                <Plus className="h-5 w-5 text-slate-950" strokeWidth={3} />
              </div>
            </div>
            {stories.map((st, i) => (
              <div
                key={st.name}
                className="relative h-48 w-28 shrink-0 overflow-hidden rounded-xl border border-white/10"
              >
                <img
                  src={`https://picsum.photos/seed/${st.seed}/200/300`}
                  alt=""
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/85 via-transparent to-transparent" />
                <div className="absolute left-2 top-2">
                  <div
                    className="rounded-full p-[2px]"
                    style={{
                      background:
                        i % 2 === 0
                          ? 'linear-gradient(135deg,#22d3ee,#a3e635)'
                          : 'linear-gradient(135deg,#d946ef,#22d3ee)',
                      boxShadow: '0 0 10px rgba(34,211,238,0.5)',
                    }}
                  >
                    <img
                      src={`https://i.pravatar.cc/150?img=${st.img}`}
                      alt=""
                      className="h-9 w-9 rounded-full border-2 border-slate-950 object-cover"
                    />
                  </div>
                </div>
                <span className="absolute inset-x-2 bottom-2 truncate text-xs font-semibold text-white">
                  {st.name}
                </span>
              </div>
            ))}
          </section>

          {/* Composer */}
          <section className={`${panel} p-4`} style={glowPanel}>
            <div className="flex items-center gap-3">
              <Avatar img={65} size={40} ring="#22d3ee" />
              <button className="flex-1 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-left text-sm text-slate-400 transition-colors hover:border-cyan-400/40">
                What's sparking your mind, Ava?
              </button>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
              {[
                { label: 'Live Video', icon: Video, color: '#d946ef' },
                { label: 'Photo/Video', icon: ImageIcon, color: '#a3e635' },
                { label: 'Feeling', icon: Smile, color: '#22d3ee' },
              ].map((a) => (
                <button
                  key={a.label}
                  className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/[0.05]"
                >
                  <a.icon className="h-5 w-5" style={{ color: a.color }} />
                  <span className="hidden sm:inline">{a.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Posts */}
          {posts.map((p) => (
            <article key={p.author} className={`${panel} overflow-hidden`} style={glowPanel}>
              {/* header */}
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Avatar img={p.img} size={44} ring={p.verified ? '#d946ef' : '#334155'} />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-slate-100">{p.author}</span>
                      {p.verified && (
                        <span
                          className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-slate-950"
                          style={{ background: '#22d3ee', boxShadow: '0 0 8px #22d3ee' }}
                        >
                          ✓
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-slate-500">
                      <span>{p.time}</span>
                      <span>·</span>
                      <Globe className="h-3 w-3" />
                      <span>{p.audience}</span>
                    </div>
                  </div>
                </div>
                <button className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 hover:bg-white/[0.06]">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>

              {/* content */}
              <p className="px-4 pb-3 text-[15px] leading-relaxed text-slate-200">{p.content}</p>

              {p.photo && (
                <div className="border-y border-white/10">
                  <img src={p.photo} alt="" className="max-h-[420px] w-full object-cover" />
                </div>
              )}

              {/* counts */}
              <div className="flex items-center justify-between px-4 py-2.5 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span
                    className="flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: 'linear-gradient(135deg,#22d3ee,#d946ef)' }}
                  >
                    <ThumbsUp className="h-3 w-3 text-slate-950" fill="#05060a" />
                  </span>
                  <span>{p.likes.toLocaleString()}</span>
                </div>
                <div className="flex gap-3">
                  <span>{p.comments} comments</span>
                  <span>{p.shares} shares</span>
                </div>
              </div>

              {/* actions */}
              <div className="flex items-center justify-between border-t border-white/10 px-2 py-1">
                {[
                  { label: 'Like', icon: ThumbsUp, color: '#22d3ee' },
                  { label: 'Comment', icon: MessageSquare, color: '#d946ef' },
                  { label: 'Share', icon: Share2, color: '#a3e635' },
                ].map((a) => (
                  <button
                    key={a.label}
                    className="group flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-slate-400 transition-colors hover:bg-white/[0.05]"
                  >
                    <a.icon
                      className="h-5 w-5 transition-colors group-hover:[color:var(--c)]"
                      style={{ ['--c' as any]: a.color }}
                    />
                    <span className="transition-colors group-hover:text-slate-100">{a.label}</span>
                  </button>
                ))}
              </div>
            </article>
          ))}
        </main>

        {/* Right sidebar */}
        <aside className="hidden lg:block">
          <div className="sticky top-20 space-y-5">
            {/* Sponsored */}
            <section className={`${panel} p-4`} style={glowPanel}>
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold text-slate-400">Sponsored</span>
              </div>
              <div className="group cursor-pointer">
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <img
                    src="https://picsum.photos/seed/neongear/600/400"
                    alt=""
                    className="h-32 w-full object-cover"
                  />
                </div>
                <div className="mt-2">
                  <div className="text-sm font-semibold text-slate-100">Aurora RGB Mechanical Keyboard</div>
                  <div className="text-xs text-slate-500">auroragear.io</div>
                  <div className="mt-1 text-sm font-bold" style={{ color: '#a3e635' }}>
                    ৳ 8,990
                  </div>
                </div>
              </div>
            </section>

            {/* Contacts */}
            <section className={`${panel} p-3`} style={glowPanel}>
              <div className="mb-1 flex items-center justify-between px-2">
                <span className="text-sm font-semibold text-slate-400">Contacts</span>
                <div className="flex gap-1 text-slate-500">
                  <Video className="h-4 w-4" />
                  <Search className="h-4 w-4" />
                  <MoreHorizontal className="h-4 w-4" />
                </div>
              </div>
              <div className="space-y-0.5">
                {contacts.map((c, i) => (
                  <button
                    key={c.name}
                    className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.05]"
                  >
                    <div className="relative">
                      <Avatar img={c.img} size={36} />
                      {i % 3 !== 1 && (
                        <span
                          className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-slate-950"
                          style={{ background: '#a3e635', boxShadow: '0 0 6px #a3e635' }}
                        />
                      )}
                    </div>
                    <span className="text-sm font-medium text-slate-200">{c.name}</span>
                  </button>
                ))}
              </div>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
