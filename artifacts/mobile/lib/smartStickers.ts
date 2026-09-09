export interface MobileOverlayItem {
  id: string;
  type:
    | "text"
    | "emoji"
    | "smart_time"
    | "smart_location"
    | "smart_music"
    | "smart_feeling"
    | "smart_poll";
  content: string;
  subContent?: string;
  x: number; // percentage 0 - 100
  y: number; // percentage 0 - 100
  fontSize?: number;
  color?: string;
  bgStyle?: "none" | "pill" | "glass" | "neon";
  fontStyle?: "modern" | "serif" | "neon" | "script" | "impact";
}

export interface SmartStickerOption {
  id: string;
  type: MobileOverlayItem["type"];
  title: string;
  subtitle: string;
  icon: string;
  previewColor: string;
  defaultContent: string;
  defaultSubContent?: string;
}

export const SMART_STICKER_PRESETS: SmartStickerOption[] = [
  {
    id: "time",
    type: "smart_time",
    title: "Current Time",
    subtitle: "Digital live clock badge",
    icon: "time",
    previewColor: "#f59e0b",
    defaultContent: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  },
  {
    id: "location",
    type: "smart_location",
    title: "Location",
    subtitle: "City or place tag",
    icon: "location",
    previewColor: "#ef4444",
    defaultContent: "Dhaka, Bangladesh",
  },
  {
    id: "music",
    type: "smart_music",
    title: "Music Track",
    subtitle: "Soundtrack badge",
    icon: "musical-notes",
    previewColor: "#a855f7",
    defaultContent: "Original Soundtrack",
    defaultSubContent: "Artist",
  },
  {
    id: "feeling_blessed",
    type: "smart_feeling",
    title: "Feeling Blessed",
    subtitle: "Status sticker",
    icon: "sparkles",
    previewColor: "#10b981",
    defaultContent: "Feeling Blessed ✨",
  },
  {
    id: "feeling_vibes",
    type: "smart_feeling",
    title: "Good Vibes",
    subtitle: "Status sticker",
    icon: "happy",
    previewColor: "#06b6d4",
    defaultContent: "Good Vibes Only 🌈",
  },
  {
    id: "feeling_coffee",
    type: "smart_feeling",
    title: "Coffee Time",
    subtitle: "Status sticker",
    icon: "cafe",
    previewColor: "#854d0e",
    defaultContent: "Coffee Time ☕",
  },
  {
    id: "feeling_party",
    type: "smart_feeling",
    title: "Party Mood",
    subtitle: "Status sticker",
    icon: "wine",
    previewColor: "#ec4899",
    defaultContent: "Party Mode On 🎉",
  },
  {
    id: "poll",
    type: "smart_poll",
    title: "Yes / No Poll",
    subtitle: "Ask a question",
    icon: "help-circle",
    previewColor: "#3b82f6",
    defaultContent: "What do you think?",
    defaultSubContent: "YES 👍 | NO 👎",
  },
];

export const CURATED_STICKER_PACKS = {
  trending: {
    label: "🔥 Trending",
    emojis: ["🔥", "💯", "❤️", "✨", "👑", "⚡", "🎉", "😍", "🥳", "🙌", "💎", "🚀"],
  },
  desi_bangla: {
    label: "🇧🇩 Desi Bangla",
    emojis: ["🇧🇩", "☕", "🛺", "🏏", "🐯", "🍛", "🪁", "🚤", "🌸", "🥭", "🎋", "🕌"],
  },
  moods: {
    label: "😊 Moods & Vibes",
    emojis: ["🥰", "😎", "🤩", "😇", "🤪", "🥺", "😴", "🤯", "🥶", "😻", "🤙", "💀"],
  },
  love: {
    label: "💖 Love & Hearts",
    emojis: ["❤️", "💖", "💕", "💘", "💝", "💞", "💓", "💗", "💌", "🌹", "💋", "✨"],
  },
  party: {
    label: "🎊 Party & Fun",
    emojis: ["🎉", "🎊", "🥂", "🍾", "🍻", "🍕", "🍔", "🍦", "🎂", "🎸", "🎧", "🕺"],
  },
};
