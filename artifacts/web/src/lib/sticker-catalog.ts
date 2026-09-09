/**
 * Sticker catalog — two kinds:
 *  1. "smart" – interactive widgets (Time, Location, Music, Mention, Poll, Feeling)
 *  2. "pack"  – curated emoji/icon sticker packs
 *
 * Giphy animated sticker search is handled separately via the GIPHY_API utility.
 */

export type StickerKind = "smart" | "pack" | "giphy";

export interface SmartStickerDef {
  id: string;
  kind: "smart";
  label: string;
  icon: string; // emoji or lucide icon name
  description: string;
}

export interface PackStickerDef {
  id: string;
  kind: "pack";
  packName: string;
  emoji: string;
  label: string;
}

export type StickerDef = SmartStickerDef | PackStickerDef;

// ─── Smart / Interactive Stickers ──────────────────────────────────────────────
export const SMART_STICKERS: SmartStickerDef[] = [
  {
    id: "smart_time",
    kind: "smart",
    label: "Time",
    icon: "🕐",
    description: "Live clock showing current time",
  },
  {
    id: "smart_date",
    kind: "smart",
    label: "Date",
    icon: "📅",
    description: "Today's date in a stylized badge",
  },
  {
    id: "smart_location",
    kind: "smart",
    label: "Location",
    icon: "📍",
    description: "City / place name with map-pin badge",
  },
  {
    id: "smart_music",
    kind: "smart",
    label: "Music",
    icon: "🎵",
    description: "Spinning vinyl disc with song & artist",
  },
  {
    id: "smart_mention",
    kind: "smart",
    label: "@Mention",
    icon: "👤",
    description: "Tag a friend on the canvas",
  },
  {
    id: "smart_poll",
    kind: "smart",
    label: "Poll",
    icon: "📊",
    description: "Yes / No interactive vote",
  },
  {
    id: "smart_question",
    kind: "smart",
    label: "Question",
    icon: "❓",
    description: "Ask your friends a question",
  },
  {
    id: "smart_feeling",
    kind: "smart",
    label: "Feeling",
    icon: "😊",
    description: "Express how you're feeling",
  },
  {
    id: "smart_weather",
    kind: "smart",
    label: "Weather",
    icon: "🌤",
    description: "Current weather at your location",
  },
  {
    id: "smart_countdown",
    kind: "smart",
    label: "Countdown",
    icon: "⏳",
    description: "Countdown to an event",
  },
];

// ─── Sticker Packs ─────────────────────────────────────────────────────────────
export const STICKER_PACKS: { name: string; stickers: PackStickerDef[] }[] = [
  {
    name: "🔥 Trending",
    stickers: [
      { id: "pk_fire", kind: "pack", packName: "Trending", emoji: "🔥", label: "Fire" },
      { id: "pk_100", kind: "pack", packName: "Trending", emoji: "💯", label: "100" },
      { id: "pk_rocket", kind: "pack", packName: "Trending", emoji: "🚀", label: "Rocket" },
      { id: "pk_crown", kind: "pack", packName: "Trending", emoji: "👑", label: "Crown" },
      { id: "pk_diamond", kind: "pack", packName: "Trending", emoji: "💎", label: "Diamond" },
      { id: "pk_star2", kind: "pack", packName: "Trending", emoji: "⭐", label: "Star" },
      { id: "pk_eyes", kind: "pack", packName: "Trending", emoji: "👀", label: "Eyes" },
      { id: "pk_clap", kind: "pack", packName: "Trending", emoji: "👏", label: "Clap" },
      { id: "pk_flex", kind: "pack", packName: "Trending", emoji: "💪", label: "Flex" },
      { id: "pk_boom", kind: "pack", packName: "Trending", emoji: "💥", label: "Boom" },
      { id: "pk_vip", kind: "pack", packName: "Trending", emoji: "🏆", label: "Trophy" },
      { id: "pk_lightning", kind: "pack", packName: "Trending", emoji: "⚡", label: "Lightning" },
    ],
  },
  {
    name: "❤️ Hearts & Love",
    stickers: [
      { id: "pk_heart_red", kind: "pack", packName: "Hearts", emoji: "❤️", label: "Heart" },
      { id: "pk_heart_pink", kind: "pack", packName: "Hearts", emoji: "🩷", label: "Pink Heart" },
      { id: "pk_heart_purple", kind: "pack", packName: "Hearts", emoji: "💜", label: "Purple Heart" },
      { id: "pk_heart_sparkling", kind: "pack", packName: "Hearts", emoji: "💖", label: "Sparkling Heart" },
      { id: "pk_heart_growing", kind: "pack", packName: "Hearts", emoji: "💗", label: "Growing Heart" },
      { id: "pk_heart_eyes", kind: "pack", packName: "Hearts", emoji: "😍", label: "Heart Eyes" },
      { id: "pk_kiss", kind: "pack", packName: "Hearts", emoji: "😘", label: "Kiss" },
      { id: "pk_love_letter", kind: "pack", packName: "Hearts", emoji: "💌", label: "Love Letter" },
      { id: "pk_roses", kind: "pack", packName: "Hearts", emoji: "🌹", label: "Rose" },
      { id: "pk_cupid", kind: "pack", packName: "Hearts", emoji: "💘", label: "Cupid" },
    ],
  },
  {
    name: "🎉 Party & Fun",
    stickers: [
      { id: "pk_party", kind: "pack", packName: "Party", emoji: "🎉", label: "Party" },
      { id: "pk_tada", kind: "pack", packName: "Party", emoji: "🎊", label: "Confetti" },
      { id: "pk_balloon", kind: "pack", packName: "Party", emoji: "🎈", label: "Balloon" },
      { id: "pk_cake", kind: "pack", packName: "Party", emoji: "🎂", label: "Cake" },
      { id: "pk_gift", kind: "pack", packName: "Party", emoji: "🎁", label: "Gift" },
      { id: "pk_dance", kind: "pack", packName: "Party", emoji: "🕺", label: "Dance" },
      { id: "pk_disco", kind: "pack", packName: "Party", emoji: "🪩", label: "Disco" },
      { id: "pk_champagne", kind: "pack", packName: "Party", emoji: "🥂", label: "Cheers" },
      { id: "pk_fireworks", kind: "pack", packName: "Party", emoji: "🎆", label: "Fireworks" },
      { id: "pk_saxophone", kind: "pack", packName: "Party", emoji: "🎷", label: "Sax" },
    ],
  },
  {
    name: "😂 Expressions",
    stickers: [
      { id: "pk_lol", kind: "pack", packName: "Expressions", emoji: "😂", label: "LOL" },
      { id: "pk_crying", kind: "pack", packName: "Expressions", emoji: "😭", label: "Crying" },
      { id: "pk_mind_blown", kind: "pack", packName: "Expressions", emoji: "🤯", label: "Mind Blown" },
      { id: "pk_cool", kind: "pack", packName: "Expressions", emoji: "😎", label: "Cool" },
      { id: "pk_nerd", kind: "pack", packName: "Expressions", emoji: "🤓", label: "Nerd" },
      { id: "pk_uwu", kind: "pack", packName: "Expressions", emoji: "🥺", label: "Uwu" },
      { id: "pk_pog", kind: "pack", packName: "Expressions", emoji: "😮", label: "Shocked" },
      { id: "pk_vibe", kind: "pack", packName: "Expressions", emoji: "😌", label: "Vibe" },
      { id: "pk_sassy", kind: "pack", packName: "Expressions", emoji: "💁", label: "Sassy" },
      { id: "pk_strong", kind: "pack", packName: "Expressions", emoji: "🦾", label: "Strong" },
    ],
  },
  {
    name: "🌈 Nature & Vibes",
    stickers: [
      { id: "pk_rainbow", kind: "pack", packName: "Nature", emoji: "🌈", label: "Rainbow" },
      { id: "pk_sun", kind: "pack", packName: "Nature", emoji: "☀️", label: "Sun" },
      { id: "pk_moon", kind: "pack", packName: "Nature", emoji: "🌙", label: "Moon" },
      { id: "pk_stars", kind: "pack", packName: "Nature", emoji: "✨", label: "Sparkles" },
      { id: "pk_cloud", kind: "pack", packName: "Nature", emoji: "☁️", label: "Cloud" },
      { id: "pk_snowflake", kind: "pack", packName: "Nature", emoji: "❄️", label: "Snow" },
      { id: "pk_wave", kind: "pack", packName: "Nature", emoji: "🌊", label: "Wave" },
      { id: "pk_flower", kind: "pack", packName: "Nature", emoji: "🌸", label: "Blossom" },
      { id: "pk_leaf", kind: "pack", packName: "Nature", emoji: "🍀", label: "Lucky" },
      { id: "pk_planet", kind: "pack", packName: "Nature", emoji: "🪐", label: "Planet" },
    ],
  },
  {
    name: "🍕 Food & Drink",
    stickers: [
      { id: "pk_pizza", kind: "pack", packName: "Food", emoji: "🍕", label: "Pizza" },
      { id: "pk_burger", kind: "pack", packName: "Food", emoji: "🍔", label: "Burger" },
      { id: "pk_coffee", kind: "pack", packName: "Food", emoji: "☕", label: "Coffee" },
      { id: "pk_boba", kind: "pack", packName: "Food", emoji: "🧋", label: "Boba" },
      { id: "pk_icecream", kind: "pack", packName: "Food", emoji: "🍦", label: "Ice Cream" },
      { id: "pk_donut", kind: "pack", packName: "Food", emoji: "🍩", label: "Donut" },
      { id: "pk_sushi", kind: "pack", packName: "Food", emoji: "🍣", label: "Sushi" },
      { id: "pk_cocktail", kind: "pack", packName: "Food", emoji: "🍹", label: "Cocktail" },
    ],
  },
];

// ─── Giphy API Helper ─────────────────────────────────────────────────────────
const GIPHY_API_KEY = "dc6zaTOxFJmzC"; // Giphy public beta key — replace with prod key
const GIPHY_BASE = "https://api.giphy.com/v1/stickers";

export interface GiphySticker {
  id: string;
  title: string;
  /** transparent WebP/GIF URL */
  url: string;
  previewUrl: string;
}

export async function searchGiphyStickers(query: string, limit = 24): Promise<GiphySticker[]> {
  try {
    const endpoint = query.trim()
      ? `${GIPHY_BASE}/search?api_key=${GIPHY_API_KEY}&q=${encodeURIComponent(query)}&limit=${limit}&rating=g`
      : `${GIPHY_BASE}/trending?api_key=${GIPHY_API_KEY}&limit=${limit}&rating=g`;
    const res = await fetch(endpoint);
    if (!res.ok) return [];
    const json = await res.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (json.data ?? []).map((item: any) => ({
      id: item.id,
      title: item.title,
      url: item.images?.original?.url ?? item.images?.downsized?.url ?? "",
      previewUrl: item.images?.fixed_width_small?.url ?? item.images?.preview_gif?.url ?? "",
    }));
  } catch {
    return [];
  }
}
