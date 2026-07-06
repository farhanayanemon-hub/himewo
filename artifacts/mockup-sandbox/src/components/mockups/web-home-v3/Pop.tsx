import {
  Search,
  Home,
  Clapperboard,
  Users,
  Bell,
  Menu,
  MessageCircle,
  User,
  UserRound,
  Bookmark,
  CalendarDays,
  Flag,
  Clapperboard as ReelsIcon,
  MonitorPlay,
  Plus,
  Image as ImageIcon,
  Smile,
  MapPin,
  ThumbsUp,
  Heart,
  Laugh,
  MessageSquare,
  Share2,
  Globe,
  MoreHorizontal,
  Video,
  Sparkles,
} from "lucide-react";
import "./pop.css";

export function Pop() {
  const shortcuts = [
    { icon: UserRound, label: "Profile", color: "#ff5a8c" },
    { icon: Users, label: "Friends", color: "#4dabf7" },
    { icon: Users, label: "Groups", color: "#20c997" },
    { icon: Flag, label: "Pages", color: "#ff922b" },
    { icon: ReelsIcon, label: "Reels", color: "#845ef7" },
    { icon: MonitorPlay, label: "Watch", color: "#f06595" },
    { icon: Bookmark, label: "Saved", color: "#ffd43b" },
    { icon: CalendarDays, label: "Events", color: "#38d9a9" },
  ];

  const stories = [
    { name: "Your Story", img: 12, isYou: true, bg: "#ff5a8c" },
    { name: "Aisha Rahman", img: 5, bg: "#845ef7" },
    { name: "Diego Martins", img: 15, bg: "#4dabf7" },
    { name: "Mei Tanaka", img: 32, bg: "#20c997" },
    { name: "Leo Bennett", img: 51, bg: "#ff922b" },
    { name: "Priya Nair", img: 44, bg: "#f06595" },
  ];

  const posts = [
    {
      name: "Aisha Rahman",
      avatar: 5,
      time: "2h",
      color: "#ff5a8c",
      text: "Finally finished my first pottery class! 🏺 Nothing beats getting your hands dirty and making something totally lopsided but 100% yours. Who's joining me next week?",
      photo: null,
      likes: 214,
      comments: 38,
      shares: 6,
    },
    {
      name: "Diego Martins",
      avatar: 15,
      time: "4h",
      color: "#4dabf7",
      text: "Sunrise hike up Table Mountain was absolutely unreal this morning. Left the house at 4am and it was worth every yawn. 🥾🌄",
      photo: "mountainsunrise",
      likes: 892,
      comments: 121,
      shares: 44,
    },
    {
      name: "Mei Tanaka",
      avatar: 32,
      time: "6h",
      color: "#20c997",
      text: "New recipe unlocked: spicy miso ramen from scratch. My kitchen looks like a disaster zone but my stomach is thrilled. 🍜 Recipe in the comments!",
      photo: "ramenbowl",
      likes: 476,
      comments: 87,
      shares: 19,
    },
    {
      name: "Leo Bennett",
      avatar: 51,
      time: "9h",
      color: "#ff922b",
      text: "Big news 🎉 We just adopted this little goofball from the shelter. Meet Waffles — professional nap enthusiast and shoe thief. Swipe for maximum cuteness.",
      photo: "puppywaffles",
      likes: 1543,
      comments: 264,
      shares: 78,
    },
  ];

  const contacts = [
    { name: "Priya Nair", img: 44 },
    { name: "Sofia Alvarez", img: 47 },
    { name: "Kwame Mensah", img: 13 },
    { name: "Hana Kim", img: 26 },
    { name: "Marcus Cole", img: 60 },
    { name: "Zoe Laurent", img: 49 },
    { name: "Omar Farooq", img: 33 },
    { name: "Nadia Petrova", img: 45 },
  ];

  return (
    <div
      className="min-h-screen w-full font-['Nunito',_system-ui,_sans-serif] text-slate-800"
      style={{
        background:
          "linear-gradient(135deg, #fff5f8 0%, #f3f0ff 45%, #eefcf7 100%)",
      }}
    >
      {/* ===== TOP NAV ===== */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b-4 border-slate-900/5 shadow-[0_6px_0_0_rgba(255,90,140,0.10)]">
        <div className="mx-auto flex h-16 max-w-[1400px] items-center gap-3 px-4">
          {/* Logo */}
          <div className="flex items-center gap-2 shrink-0">
            <div
              className="grid h-11 w-11 place-items-center rounded-2xl text-white shadow-[0_4px_0_0_#c2255c] pop-wiggle-hover"
              style={{ background: "linear-gradient(135deg,#ff5a8c,#ff922b)" }}
            >
              <Sparkles className="h-6 w-6" strokeWidth={2.6} />
            </div>
            <span
              className="hidden text-2xl font-extrabold tracking-tight sm:block"
              style={{ color: "#e63969" }}
            >
              HiMewo
            </span>
          </div>

          {/* Search */}
          <div className="relative ml-1 hidden md:block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              readOnly
              placeholder="Search HiMewo"
              className="h-11 w-56 rounded-full border-2 border-slate-100 bg-slate-100/70 pl-9 pr-4 text-sm font-semibold text-slate-600 placeholder:text-slate-400 focus:outline-none lg:w-72"
            />
          </div>

          {/* Center nav */}
          <nav className="mx-auto flex items-center gap-1 sm:gap-2">
            {[
              { icon: Home, active: true, color: "#ff5a8c" },
              { icon: Clapperboard, color: "#845ef7" },
              { icon: Users, color: "#20c997" },
              { icon: Bell, color: "#ff922b", badge: 5 },
            ].map((item, i) => (
              <button
                key={i}
                className="relative grid h-12 w-14 place-items-center rounded-2xl transition-transform hover:-translate-y-0.5 sm:w-20"
                style={
                  item.active
                    ? { background: item.color + "22" }
                    : undefined
                }
              >
                <item.icon
                  className="h-6 w-6"
                  strokeWidth={2.4}
                  style={{ color: item.active ? item.color : "#64748b" }}
                />
                {item.badge && (
                  <span className="absolute right-2 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[#ff5a8c] text-[11px] font-black text-white ring-2 ring-white">
                    {item.badge}
                  </span>
                )}
                {item.active && (
                  <span
                    className="absolute bottom-0 h-1.5 w-8 rounded-full"
                    style={{ background: item.color }}
                  />
                )}
              </button>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex shrink-0 items-center gap-2">
            <button className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-700 transition-transform hover:-translate-y-0.5">
              <Menu className="h-5 w-5" strokeWidth={2.6} />
            </button>
            <button className="grid h-11 w-11 place-items-center rounded-full bg-slate-100 text-slate-700 transition-transform hover:-translate-y-0.5">
              <MessageCircle className="h-5 w-5" strokeWidth={2.6} />
            </button>
            <button className="rounded-full ring-4 ring-[#ffd43b] transition-transform hover:-translate-y-0.5">
              <img
                src="https://i.pravatar.cc/150?img=12"
                alt="You"
                className="h-11 w-11 rounded-full object-cover"
              />
            </button>
          </div>
        </div>
      </header>

      {/* ===== BODY ===== */}
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-[260px_minmax(0,1fr)_300px]">
        {/* ===== LEFT SIDEBAR ===== */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-2">
            <div className="mb-3 flex items-center gap-3 rounded-3xl bg-white p-3 shadow-[0_5px_0_0_rgba(15,23,42,0.06)]">
              <img
                src="https://i.pravatar.cc/150?img=12"
                alt="You"
                className="h-11 w-11 rounded-2xl object-cover ring-2 ring-[#ff5a8c]"
              />
              <span className="text-base font-extrabold text-slate-800">
                Jordan Blake
              </span>
            </div>

            {shortcuts.map((s) => (
              <button
                key={s.label}
                className="group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all hover:bg-white hover:shadow-[0_4px_0_0_rgba(15,23,42,0.06)]"
              >
                <span
                  className="grid h-10 w-10 place-items-center rounded-xl text-white shadow-sm transition-transform group-hover:-rotate-6"
                  style={{ background: s.color }}
                >
                  <s.icon className="h-5 w-5" strokeWidth={2.6} />
                </span>
                <span className="text-[15px] font-bold text-slate-700">
                  {s.label}
                </span>
              </button>
            ))}

            <p className="px-3 pt-4 text-xs font-bold uppercase tracking-wider text-slate-400">
              HiMewo · Privacy · Terms · © 2025
            </p>
          </div>
        </aside>

        {/* ===== CENTER COLUMN ===== */}
        <main className="min-w-0 space-y-5">
          {/* Stories row */}
          <section className="pop-scroll flex gap-3 overflow-x-auto pb-2">
            {stories.map((story, i) => (
              <div
                key={i}
                className="relative h-52 w-32 shrink-0 overflow-hidden rounded-3xl shadow-[0_6px_0_0_rgba(15,23,42,0.08)] transition-transform hover:-translate-y-1"
                style={{ background: story.bg }}
              >
                <img
                  src={`https://i.pravatar.cc/150?img=${story.img}`}
                  alt={story.name}
                  className="h-full w-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                {story.isYou ? (
                  <div className="absolute left-1/2 top-32 -translate-x-1/2">
                    <span className="grid h-10 w-10 place-items-center rounded-full border-4 border-white bg-[#ff5a8c] text-white shadow-lg">
                      <Plus className="h-5 w-5" strokeWidth={3} />
                    </span>
                  </div>
                ) : (
                  <div className="absolute left-3 top-3">
                    <img
                      src={`https://i.pravatar.cc/150?img=${story.img}`}
                      alt=""
                      className="h-10 w-10 rounded-full border-4 object-cover"
                      style={{ borderColor: story.bg }}
                    />
                  </div>
                )}
                <span className="absolute bottom-2 left-2 right-2 truncate text-[13px] font-extrabold text-white drop-shadow">
                  {story.isYou ? "Create Story" : story.name}
                </span>
              </div>
            ))}
          </section>

          {/* Create post composer */}
          <section className="rounded-3xl bg-white p-4 shadow-[0_6px_0_0_rgba(15,23,42,0.06)]">
            <div className="flex items-center gap-3">
              <img
                src="https://i.pravatar.cc/150?img=12"
                alt="You"
                className="h-11 w-11 rounded-full object-cover ring-2 ring-[#ffd43b]"
              />
              <button className="h-12 flex-1 rounded-full bg-slate-100 px-5 text-left text-[15px] font-bold text-slate-500 transition-colors hover:bg-slate-200">
                What's popping, Jordan? ✨
              </button>
            </div>
            <div className="mt-3 flex items-center gap-2 border-t-2 border-slate-100 pt-3">
              {[
                { icon: Video, label: "Live", color: "#ff5a8c" },
                { icon: ImageIcon, label: "Photo", color: "#20c997" },
                { icon: Smile, label: "Feeling", color: "#ff922b" },
              ].map((b) => (
                <button
                  key={b.label}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-extrabold text-slate-600 transition-colors hover:bg-slate-100"
                >
                  <b.icon
                    className="h-5 w-5"
                    strokeWidth={2.6}
                    style={{ color: b.color }}
                  />
                  <span className="hidden sm:inline">{b.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Feed posts */}
          {posts.map((post, i) => (
            <article
              key={i}
              className="overflow-hidden rounded-3xl bg-white shadow-[0_6px_0_0_rgba(15,23,42,0.06)]"
            >
              {/* header */}
              <div className="flex items-center gap-3 p-4">
                <img
                  src={`https://i.pravatar.cc/150?img=${post.avatar}`}
                  alt={post.name}
                  className="h-12 w-12 rounded-2xl object-cover ring-2"
                  style={{ ["--tw-ring-color" as any]: post.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-extrabold text-slate-800">
                    {post.name}
                  </p>
                  <p className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    {post.time} · <Globe className="h-3 w-3" />
                  </p>
                </div>
                <button className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100">
                  <MoreHorizontal className="h-5 w-5" strokeWidth={2.6} />
                </button>
              </div>

              {/* text */}
              <p className="px-4 pb-3 text-[15px] font-semibold leading-relaxed text-slate-700">
                {post.text}
              </p>

              {/* photo */}
              {post.photo && (
                <div className="relative">
                  <img
                    src={`https://picsum.photos/seed/${post.photo}/600/400`}
                    alt="post"
                    className="max-h-[420px] w-full object-cover"
                  />
                </div>
              )}

              {/* counts */}
              <div className="flex items-center justify-between px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-1.5">
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#4dabf7] text-white ring-2 ring-white">
                      <ThumbsUp className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#ff5a8c] text-white ring-2 ring-white">
                      <Heart className="h-3 w-3" strokeWidth={3} />
                    </span>
                    <span className="grid h-6 w-6 place-items-center rounded-full bg-[#ffd43b] text-white ring-2 ring-white">
                      <Laugh className="h-3 w-3" strokeWidth={3} />
                    </span>
                  </div>
                  <span className="text-sm font-bold text-slate-500">
                    {post.likes.toLocaleString()}
                  </span>
                </div>
                <span className="text-sm font-bold text-slate-500">
                  {post.comments} comments · {post.shares} shares
                </span>
              </div>

              {/* action bar */}
              <div className="mx-3 mb-3 grid grid-cols-3 gap-2 border-t-2 border-slate-100 pt-2">
                <button className="flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-extrabold text-slate-600 transition-colors hover:bg-[#ff5a8c]/10 hover:text-[#ff5a8c]">
                  <ThumbsUp className="h-5 w-5" strokeWidth={2.6} />
                  Like
                </button>
                <button className="flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-extrabold text-slate-600 transition-colors hover:bg-[#4dabf7]/10 hover:text-[#4dabf7]">
                  <MessageSquare className="h-5 w-5" strokeWidth={2.6} />
                  Comment
                </button>
                <button className="flex items-center justify-center gap-2 rounded-2xl py-2.5 text-sm font-extrabold text-slate-600 transition-colors hover:bg-[#20c997]/10 hover:text-[#20c997]">
                  <Share2 className="h-5 w-5" strokeWidth={2.6} />
                  Share
                </button>
              </div>
            </article>
          ))}
        </main>

        {/* ===== RIGHT SIDEBAR ===== */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-5">
            {/* Sponsored */}
            <section className="overflow-hidden rounded-3xl bg-white p-4 shadow-[0_6px_0_0_rgba(15,23,42,0.06)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-extrabold uppercase tracking-wide text-slate-400">
                  Sponsored
                </span>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-black text-white"
                  style={{ background: "#845ef7" }}
                >
                  AD
                </span>
              </div>
              <div className="group cursor-pointer">
                <img
                  src="https://picsum.photos/seed/sneakerdrop/600/400"
                  alt="Sponsored"
                  className="h-32 w-full rounded-2xl object-cover transition-transform group-hover:scale-[1.02]"
                />
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-extrabold text-slate-800">
                      NovaKicks Sale
                    </p>
                    <p className="text-xs font-bold text-slate-400">
                      novakicks.shop
                    </p>
                  </div>
                  <span className="rounded-full bg-[#ff922b] px-3 py-1.5 text-xs font-black text-white">
                    ৳2,499
                  </span>
                </div>
              </div>
            </section>

            {/* Contacts */}
            <section className="rounded-3xl bg-white p-4 shadow-[0_6px_0_0_rgba(15,23,42,0.06)]">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-base font-extrabold text-slate-700">
                  Contacts
                </span>
                <div className="flex items-center gap-1 text-slate-400">
                  <Video className="h-4 w-4" strokeWidth={2.6} />
                  <Search className="h-4 w-4" strokeWidth={2.6} />
                </div>
              </div>
              <ul className="space-y-1">
                {contacts.map((c) => (
                  <li key={c.name}>
                    <button className="flex w-full items-center gap-3 rounded-2xl px-2 py-2 text-left transition-colors hover:bg-slate-100">
                      <span className="relative">
                        <img
                          src={`https://i.pravatar.cc/150?img=${c.img}`}
                          alt={c.name}
                          className="h-10 w-10 rounded-full object-cover"
                        />
                        <span className="pop-online-ring absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-[#20c997]" />
                      </span>
                      <span className="text-[15px] font-bold text-slate-700">
                        {c.name}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
