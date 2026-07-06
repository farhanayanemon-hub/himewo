import {
  Search,
  Home,
  Clapperboard,
  Users,
  Bell,
  Menu,
  MessageCircle,
  User,
  Bookmark,
  CalendarDays,
  Flag,
  Film,
  MonitorPlay,
  Image as ImageIcon,
  Smile,
  MapPin,
  Video,
  ThumbsUp,
  MessageSquare,
  Share2,
  Heart,
  Globe,
  MoreHorizontal,
  Crown,
  Plus,
} from "lucide-react";
import "./_group.css";

const HAIRLINE = "1px solid rgba(200,164,100,0.16)";

function GoldWordmark() {
  return (
    <div className="flex items-center gap-2.5 select-none">
      <div
        className="luxe-gold-gradient flex h-10 w-10 items-center justify-center rounded-full shadow-lg"
        style={{ boxShadow: "0 4px 14px rgba(200,164,100,0.28)" }}
      >
        <Crown className="h-5 w-5 text-[#1a1508]" strokeWidth={2.2} />
      </div>
      <span className="luxe-serif luxe-gold-text text-2xl font-semibold tracking-wide">
        HiMewo
      </span>
    </div>
  );
}

function NavIcon({
  icon: Icon,
  active,
  badge,
}: {
  icon: any;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      className="relative flex h-11 w-16 items-center justify-center rounded-lg transition-colors"
      style={{
        color: active ? "var(--luxe-gold-bright)" : "var(--luxe-muted)",
        background: active ? "rgba(200,164,100,0.08)" : "transparent",
      }}
    >
      <Icon className="h-6 w-6" strokeWidth={1.7} />
      {active && (
        <span
          className="luxe-gold-gradient absolute bottom-0 left-1/2 h-[2px] w-9 -translate-x-1/2 rounded-full"
        />
      )}
      {badge ? (
        <span className="luxe-gold-gradient absolute right-3 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-[#1a1508]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function TopBar() {
  return (
    <header
      className="sticky top-0 z-30 flex items-center justify-between px-5 py-2.5"
      style={{
        background: "rgba(17,17,20,0.92)",
        backdropFilter: "blur(12px)",
        borderBottom: HAIRLINE,
      }}
    >
      <div className="flex flex-1 items-center gap-4">
        <GoldWordmark />
        <div
          className="hidden items-center gap-2.5 rounded-full px-4 py-2.5 md:flex"
          style={{ background: "var(--luxe-panel-2)", border: HAIRLINE, minWidth: 260 }}
        >
          <Search className="h-4 w-4" style={{ color: "var(--luxe-gold)" }} />
          <input
            placeholder="Search HiMewo"
            className="w-full bg-transparent text-sm outline-none placeholder:text-[#6f6a60]"
            style={{ color: "var(--luxe-text)" }}
          />
        </div>
      </div>

      <nav className="hidden items-center gap-1 lg:flex">
        <NavIcon icon={Home} active />
        <NavIcon icon={MonitorPlay} />
        <NavIcon icon={Users} />
        <NavIcon icon={Bell} badge={5} />
      </nav>

      <div className="flex flex-1 items-center justify-end gap-2.5">
        <IconChip icon={Menu} />
        <IconChip icon={MessageCircle} badge={3} />
        <IconChip icon={Bell} />
        <button className="ml-1">
          <img
            src="https://i.pravatar.cc/150?img=12"
            alt="You"
            className="h-10 w-10 rounded-full object-cover"
            style={{ border: "2px solid var(--luxe-gold)" }}
          />
        </button>
      </div>
    </header>
  );
}

function IconChip({ icon: Icon, badge }: { icon: any; badge?: number }) {
  return (
    <button
      className="relative flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:brightness-125"
      style={{ background: "var(--luxe-panel-2)", border: HAIRLINE, color: "var(--luxe-text)" }}
    >
      <Icon className="h-5 w-5" strokeWidth={1.7} />
      {badge ? (
        <span className="luxe-gold-gradient absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-[#1a1508]">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function ShortcutItem({
  icon: Icon,
  label,
  active,
}: {
  icon: any;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className="group flex w-full items-center gap-3.5 rounded-xl px-3 py-2.5 text-left transition-colors"
      style={{ background: active ? "rgba(200,164,100,0.08)" : "transparent" }}
    >
      <span
        className="flex h-9 w-9 items-center justify-center rounded-lg"
        style={{
          background: active ? "var(--luxe-gold-gradient)" : "var(--luxe-panel-2)",
          border: HAIRLINE,
        }}
      >
        <Icon
          className="h-[18px] w-[18px]"
          strokeWidth={1.8}
          style={{ color: active ? "#1a1508" : "var(--luxe-gold)" }}
        />
      </span>
      <span
        className="text-[15px]"
        style={{ color: active ? "var(--luxe-gold-bright)" : "var(--luxe-text)" }}
      >
        {label}
      </span>
    </button>
  );
}

function LeftSidebar() {
  const items = [
    { icon: User, label: "Profile", active: true },
    { icon: Users, label: "Friends" },
    { icon: Users, label: "Groups" },
    { icon: Flag, label: "Pages" },
    { icon: Film, label: "Reels" },
    { icon: MonitorPlay, label: "Watch" },
    { icon: Bookmark, label: "Saved" },
    { icon: CalendarDays, label: "Events" },
  ];
  return (
    <aside className="sticky top-[68px] hidden h-fit w-[270px] shrink-0 lg:block">
      <div
        className="flex items-center gap-3 rounded-xl px-3 py-2.5"
      >
        <img
          src="https://i.pravatar.cc/150?img=12"
          alt="You"
          className="h-11 w-11 rounded-full object-cover"
          style={{ border: "2px solid var(--luxe-gold)" }}
        />
        <div>
          <p className="text-[15px] font-medium" style={{ color: "var(--luxe-text)" }}>
            Ava Richmond
          </p>
          <p className="text-xs" style={{ color: "var(--luxe-muted)" }}>
            View your profile
          </p>
        </div>
      </div>

      <div className="my-3" style={{ borderTop: HAIRLINE }} />

      <nav className="space-y-1">
        {items.map((it) => (
          <ShortcutItem key={it.label} icon={it.icon} label={it.label} active={it.active} />
        ))}
      </nav>

      <div className="my-3" style={{ borderTop: HAIRLINE }} />
      <p className="px-3 text-xs" style={{ color: "var(--luxe-muted)" }}>
        HiMewo Club · Privacy · Terms · © 2025
      </p>
    </aside>
  );
}

function StoriesRow() {
  const stories = [
    { name: "Your Story", img: 22, create: true },
    { name: "Julian Vega", img: 33, bg: "atelier" },
    { name: "Sofia Marchetti", img: 45, bg: "marble" },
    { name: "Rowan Blake", img: 51, bg: "yacht" },
    { name: "Delphine Roy", img: 5, bg: "gala" },
    { name: "Kenji Arata", img: 60, bg: "villa" },
  ];
  return (
    <div
      className="luxe-scrollbar flex gap-3 overflow-x-auto rounded-2xl p-3"
      style={{ background: "var(--luxe-panel)", border: HAIRLINE }}
    >
      {stories.map((s) => (
        <div
          key={s.name}
          className="relative h-48 w-28 shrink-0 overflow-hidden rounded-xl"
          style={{ border: HAIRLINE }}
        >
          <img
            src={
              s.create
                ? `https://i.pravatar.cc/150?img=${s.img}`
                : `https://picsum.photos/seed/${s.bg}/300/500`
            }
            alt={s.name}
            className="h-full w-full object-cover"
          />
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(to top, rgba(10,10,12,0.9), transparent 55%)" }}
          />
          {s.create ? (
            <>
              <div className="absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2">
                <div className="luxe-gold-gradient flex h-9 w-9 items-center justify-center rounded-full ring-4 ring-[#141417]">
                  <Plus className="h-5 w-5 text-[#1a1508]" strokeWidth={2.5} />
                </div>
              </div>
              <p className="absolute bottom-2 left-0 w-full text-center text-[11px] font-medium" style={{ color: "var(--luxe-text)" }}>
                Create Story
              </p>
            </>
          ) : (
            <>
              <img
                src={`https://i.pravatar.cc/150?img=${s.img}`}
                alt={s.name}
                className="luxe-gold-gradient absolute left-2.5 top-2.5 h-9 w-9 rounded-full object-cover p-[2px]"
              />
              <p className="absolute bottom-2 left-2 right-2 text-[11px] font-medium leading-tight" style={{ color: "#fff" }}>
                {s.name}
              </p>
            </>
          )}
        </div>
      ))}
    </div>
  );
}

function Composer() {
  const actions = [
    { icon: Video, label: "Live Video", color: "#e0655a" },
    { icon: ImageIcon, label: "Photo / Video", color: "#7bb87e" },
    { icon: Smile, label: "Feeling", color: "#e3c589" },
    { icon: MapPin, label: "Check In", color: "#8fb4e0" },
  ];
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: "var(--luxe-panel)", border: HAIRLINE }}
    >
      <div className="flex items-center gap-3">
        <img
          src="https://i.pravatar.cc/150?img=12"
          alt="You"
          className="h-11 w-11 rounded-full object-cover"
          style={{ border: "2px solid var(--luxe-gold)" }}
        />
        <button
          className="flex-1 rounded-full px-5 py-3 text-left text-sm"
          style={{ background: "var(--luxe-panel-2)", border: HAIRLINE, color: "var(--luxe-muted)" }}
        >
          Share something refined, Ava…
        </button>
      </div>
      <div className="my-3.5" style={{ borderTop: HAIRLINE }} />
      <div className="flex items-center justify-between gap-1">
        {actions.map((a) => (
          <button
            key={a.label}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2 text-sm transition-colors hover:bg-[rgba(200,164,100,0.06)]"
            style={{ color: "var(--luxe-text)" }}
          >
            <a.icon className="h-5 w-5" strokeWidth={1.8} style={{ color: a.color }} />
            <span className="hidden sm:inline">{a.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ReactStack() {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex -space-x-1.5">
        <span className="luxe-gold-gradient flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-[#141417]">
          <ThumbsUp className="h-2.5 w-2.5 text-[#1a1508]" strokeWidth={2.5} />
        </span>
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#c95a52] ring-2 ring-[#141417]">
          <Heart className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
        </span>
      </div>
    </div>
  );
}

function PostActionBar() {
  const acts = [
    { icon: ThumbsUp, label: "Like" },
    { icon: MessageSquare, label: "Comment" },
    { icon: Share2, label: "Share" },
  ];
  return (
    <div className="flex items-center justify-between" style={{ borderTop: HAIRLINE, paddingTop: 6 }}>
      {acts.map((a) => (
        <button
          key={a.label}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium transition-colors hover:bg-[rgba(200,164,100,0.06)]"
          style={{ color: "var(--luxe-muted)" }}
        >
          <a.icon className="h-5 w-5" strokeWidth={1.8} />
          {a.label}
        </button>
      ))}
    </div>
  );
}

function Post({
  name,
  avatar,
  time,
  text,
  photo,
  likes,
  comments,
  shares,
  verified,
}: {
  name: string;
  avatar: number;
  time: string;
  text: string;
  photo?: string;
  likes: string;
  comments: string;
  shares: string;
  verified?: boolean;
}) {
  return (
    <article
      className="overflow-hidden rounded-2xl"
      style={{ background: "var(--luxe-panel)", border: HAIRLINE }}
    >
      <div className="flex items-center gap-3 px-4 pt-4">
        <img
          src={`https://i.pravatar.cc/150?img=${avatar}`}
          alt={name}
          className="h-11 w-11 rounded-full object-cover"
          style={{ border: HAIRLINE }}
        />
        <div className="flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] font-semibold" style={{ color: "var(--luxe-text)" }}>
              {name}
            </p>
            {verified && (
              <span className="luxe-gold-gradient flex h-4 w-4 items-center justify-center rounded-full">
                <Crown className="h-2.5 w-2.5 text-[#1a1508]" strokeWidth={2.5} />
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--luxe-muted)" }}>
            <span>{time}</span>
            <span>·</span>
            <Globe className="h-3 w-3" />
          </div>
        </div>
        <button style={{ color: "var(--luxe-muted)" }}>
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      <p className="px-4 py-3 text-[15px] leading-relaxed" style={{ color: "var(--luxe-text)" }}>
        {text}
      </p>

      {photo && (
        <div className="w-full" style={{ borderTop: HAIRLINE, borderBottom: HAIRLINE }}>
          <img src={photo} alt="post" className="max-h-[420px] w-full object-cover" />
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ReactStack />
          <span className="text-sm" style={{ color: "var(--luxe-muted)" }}>
            {likes}
          </span>
        </div>
        <div className="flex items-center gap-3 text-sm" style={{ color: "var(--luxe-muted)" }}>
          <span>{comments} comments</span>
          <span>{shares} shares</span>
        </div>
      </div>

      <div className="px-2 pb-2">
        <PostActionBar />
      </div>
    </article>
  );
}

function ContactRow({ name, img }: { name: string; img: number }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-[rgba(200,164,100,0.06)]">
      <div className="relative">
        <img
          src={`https://i.pravatar.cc/150?img=${img}`}
          alt={name}
          className="h-9 w-9 rounded-full object-cover"
        />
        <span className="luxe-online-dot absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-[#141417] bg-[#7bb87e]" />
      </div>
      <span className="text-sm" style={{ color: "var(--luxe-text)" }}>
        {name}
      </span>
    </button>
  );
}

function RightSidebar() {
  const contacts = [
    { name: "Isabella Fontaine", img: 47 },
    { name: "Marcus Alderton", img: 15 },
    { name: "Priya Nair", img: 44 },
    { name: "Theo Lindqvist", img: 68 },
    { name: "Camille Dubois", img: 20 },
    { name: "Hassan Rahman", img: 53 },
    { name: "Noor Haddad", img: 41 },
  ];
  return (
    <aside className="sticky top-[68px] hidden h-fit w-[300px] shrink-0 xl:block">
      <div
        className="rounded-2xl p-3"
        style={{ background: "var(--luxe-panel)", border: HAIRLINE }}
      >
        <p className="luxe-serif mb-1 px-3 pt-1 text-xs uppercase tracking-[0.2em]" style={{ color: "var(--luxe-gold)" }}>
          Sponsored
        </p>
        <button className="flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors hover:bg-[rgba(200,164,100,0.06)]">
          <img
            src="https://picsum.photos/seed/goldwatch/200/200"
            alt="Aurelle Timepieces"
            className="h-16 w-16 rounded-lg object-cover"
            style={{ border: HAIRLINE }}
          />
          <div>
            <p className="text-sm font-medium" style={{ color: "var(--luxe-text)" }}>
              Aurelle Timepieces
            </p>
            <p className="text-xs" style={{ color: "var(--luxe-muted)" }}>
              Handcrafted gold watches — from ৳148,000
            </p>
            <p className="mt-0.5 text-[11px]" style={{ color: "var(--luxe-gold)" }}>
              aurelle.club
            </p>
          </div>
        </button>
      </div>

      <div
        className="mt-4 rounded-2xl p-3"
        style={{ background: "var(--luxe-panel)", border: HAIRLINE }}
      >
        <div className="mb-1 flex items-center justify-between px-3 pt-1">
          <p className="luxe-serif text-lg" style={{ color: "var(--luxe-text)" }}>
            Contacts
          </p>
          <Search className="h-4 w-4" style={{ color: "var(--luxe-muted)" }} />
        </div>
        <div className="space-y-0.5">
          {contacts.map((c) => (
            <ContactRow key={c.name} name={c.name} img={c.img} />
          ))}
        </div>
      </div>
    </aside>
  );
}

export function Luxe() {
  return (
    <div
      className="luxe-scope min-h-screen w-full"
      style={{ background: "var(--luxe-bg)", color: "var(--luxe-text)" }}
    >
      <TopBar />
      <div className="mx-auto flex max-w-[1400px] gap-6 px-5 py-6">
        <LeftSidebar />

        <main className="mx-auto w-full max-w-[640px] space-y-5">
          <StoriesRow />
          <Composer />

          <Post
            name="Sofia Marchetti"
            avatar={45}
            time="2 h"
            verified
            text="An evening at the Maison Aurelle members' gala. Champagne, quiet conversation, and a view of the skyline you simply cannot buy. Grateful for this circle. ✨"
            photo="https://picsum.photos/seed/galanight/700/460"
            likes="1.2K"
            comments="184"
            shares="46"
          />

          <Post
            name="Julian Vega"
            avatar={33}
            time="5 h"
            text="Reminder: the best investment is still a slow morning, good coffee, and no notifications. Took the week off the feed — highly recommend it."
            likes="642"
            comments="97"
            shares="12"
          />

          <Post
            name="Delphine Roy"
            avatar={5}
            time="8 h"
            verified
            text="Studio dispatch — the new collection is finally photographed. Warm brass, deep charcoal, a little restraint. Previewing to the HiMewo Club first, of course."
            photo="https://picsum.photos/seed/atelierbrass/700/460"
            likes="928"
            comments="132"
            shares="58"
          />

          <Post
            name="Kenji Arata"
            avatar={60}
            time="Yesterday"
            text="Closed on the villa in Kyoto. Minimal walls, maximal silence. Anyone else find that true luxury is mostly the absence of noise?"
            likes="2.4K"
            comments="311"
            shares="88"
          />
        </main>

        <RightSidebar />
      </div>
    </div>
  );
}
