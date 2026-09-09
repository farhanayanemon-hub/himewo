/** 100+ curated CSS filters organized into 10 categories. */

export interface CameraFilter {
  id: string;
  name: string;
  category: string;
  cssFilter: string;
  /** accent colour for the swatch label */
  color: string;
}

export const FILTER_CATEGORIES = [
  "Normal",
  "Vintage & Film",
  "Golden Hour",
  "Cyberpunk & Neon",
  "B&W Noir",
  "Beauty & Glow",
  "Duotone & Pop",
  "Pastel & Fantasy",
  "Cinematic",
  "VHS & Glitch",
] as const;

export type FilterCategory = (typeof FILTER_CATEGORIES)[number];

export const ALL_FILTERS: CameraFilter[] = [
  // ─── Normal ────────────────────────────────────────────────────────────────
  { id: "normal", name: "Normal", category: "Normal", cssFilter: "none", color: "#a855f7" },

  // ─── Vintage & Film ────────────────────────────────────────────────────────
  { id: "kodak_gold", name: "Kodak Gold", category: "Vintage & Film", cssFilter: "sepia(0.3) saturate(1.5) contrast(1.1) brightness(1.05) hue-rotate(-5deg)", color: "#d97706" },
  { id: "portra_400", name: "Portra 400", category: "Vintage & Film", cssFilter: "sepia(0.15) saturate(1.25) contrast(1.05) brightness(1.08)", color: "#92400e" },
  { id: "fujifilm", name: "Fujifilm Pro", category: "Vintage & Film", cssFilter: "saturate(1.3) contrast(1.1) brightness(0.97) hue-rotate(5deg)", color: "#15803d" },
  { id: "cam_1998", name: "1998 Cam", category: "Vintage & Film", cssFilter: "sepia(0.5) contrast(1.2) brightness(0.9) saturate(1.1) hue-rotate(10deg)", color: "#b45309" },
  { id: "sepia_warmth", name: "Sepia Warmth", category: "Vintage & Film", cssFilter: "sepia(0.65) contrast(1.1) brightness(1.02)", color: "#a16207" },
  { id: "retro_dust", name: "Retro Dust", category: "Vintage & Film", cssFilter: "sepia(0.2) saturate(0.9) contrast(1.15) brightness(0.92) grayscale(0.1)", color: "#78716c" },
  { id: "lomo", name: "Lomography", category: "Vintage & Film", cssFilter: "saturate(1.6) contrast(1.3) brightness(0.88) hue-rotate(-8deg)", color: "#dc2626" },
  { id: "brownie", name: "Brownie Box", category: "Vintage & Film", cssFilter: "sepia(0.8) contrast(1.25) brightness(0.85) saturate(0.8)", color: "#78350f" },
  { id: "analog_fade", name: "Analog Fade", category: "Vintage & Film", cssFilter: "sepia(0.25) saturate(0.85) contrast(0.9) brightness(1.1)", color: "#a8a29e" },
  { id: "polaroid", name: "Polaroid", category: "Vintage & Film", cssFilter: "sepia(0.1) saturate(1.15) contrast(1.0) brightness(1.12) hue-rotate(-3deg)", color: "#fbbf24" },
  { id: "cross_process", name: "Cross Process", category: "Vintage & Film", cssFilter: "saturate(1.8) contrast(1.4) hue-rotate(15deg) brightness(0.95)", color: "#16a34a" },

  // ─── Golden Hour ───────────────────────────────────────────────────────────
  { id: "golden_hour", name: "Golden Hour", category: "Golden Hour", cssFilter: "sepia(0.25) saturate(1.45) contrast(1.05) brightness(1.08) hue-rotate(-5deg)", color: "#f59e0b" },
  { id: "california_sun", name: "California Sun", category: "Golden Hour", cssFilter: "saturate(1.5) brightness(1.1) contrast(1.08) hue-rotate(-10deg) sepia(0.1)", color: "#ea580c" },
  { id: "amber_glow", name: "Amber Glow", category: "Golden Hour", cssFilter: "sepia(0.35) saturate(1.6) brightness(1.06) contrast(1.1)", color: "#d97706" },
  { id: "sunset_kiss", name: "Sunset Kiss", category: "Golden Hour", cssFilter: "saturate(1.4) hue-rotate(-15deg) brightness(1.05) contrast(1.1) sepia(0.2)", color: "#f97316" },
  { id: "warm_summer", name: "Warm Summer", category: "Golden Hour", cssFilter: "saturate(1.35) brightness(1.08) sepia(0.18) contrast(1.06)", color: "#fbbf24" },
  { id: "tuscany", name: "Tuscany", category: "Golden Hour", cssFilter: "sepia(0.4) saturate(1.3) contrast(1.15) brightness(1.02) hue-rotate(-8deg)", color: "#b45309" },
  { id: "desert_sand", name: "Desert Sand", category: "Golden Hour", cssFilter: "sepia(0.55) saturate(1.2) contrast(1.1) brightness(1.05)", color: "#ca8a04" },
  { id: "dawn_rose", name: "Dawn Rose", category: "Golden Hour", cssFilter: "saturate(1.25) hue-rotate(-20deg) brightness(1.12) contrast(0.98) sepia(0.1)", color: "#f43f5e" },

  // ─── Cyberpunk & Neon ──────────────────────────────────────────────────────
  { id: "synthwave", name: "Synthwave", category: "Cyberpunk & Neon", cssFilter: "contrast(1.3) saturate(1.9) hue-rotate(175deg) brightness(1.05)", color: "#7c3aed" },
  { id: "tokyo_night", name: "Tokyo Night", category: "Cyberpunk & Neon", cssFilter: "contrast(1.4) saturate(2.0) hue-rotate(200deg) brightness(0.95)", color: "#4f46e5" },
  { id: "acid_cyan", name: "Acid Cyan", category: "Cyberpunk & Neon", cssFilter: "contrast(1.3) saturate(1.8) hue-rotate(185deg) brightness(1.1)", color: "#06b6d4" },
  { id: "electric_purple", name: "Electric Purple", category: "Cyberpunk & Neon", cssFilter: "contrast(1.25) saturate(1.9) hue-rotate(270deg) brightness(1.0)", color: "#a855f7" },
  { id: "matrix_green", name: "Matrix Green", category: "Cyberpunk & Neon", cssFilter: "contrast(1.35) saturate(1.7) hue-rotate(100deg) brightness(0.95)", color: "#22c55e" },
  { id: "neon_pink", name: "Neon Pink", category: "Cyberpunk & Neon", cssFilter: "contrast(1.3) saturate(2.0) hue-rotate(300deg) brightness(1.0)", color: "#ec4899" },
  { id: "cyber_orange", name: "Cyber Orange", category: "Cyberpunk & Neon", cssFilter: "contrast(1.25) saturate(1.8) hue-rotate(-30deg) brightness(1.05)", color: "#f97316" },
  { id: "ultraviolet", name: "Ultraviolet", category: "Cyberpunk & Neon", cssFilter: "contrast(1.4) saturate(2.2) hue-rotate(250deg) brightness(0.9)", color: "#8b5cf6" },

  // ─── B&W Noir ──────────────────────────────────────────────────────────────
  { id: "mono_noir", name: "B&W Noir", category: "B&W Noir", cssFilter: "grayscale(1) contrast(1.35) brightness(1.05)", color: "#71717a" },
  { id: "silver_film", name: "Silver Film", category: "B&W Noir", cssFilter: "grayscale(1) contrast(1.15) brightness(1.1) sepia(0.05)", color: "#a1a1aa" },
  { id: "matte_slate", name: "Matte Slate", category: "B&W Noir", cssFilter: "grayscale(0.9) contrast(1.2) brightness(0.9) saturate(0.1)", color: "#64748b" },
  { id: "dark_shadows", name: "Dark Shadows", category: "B&W Noir", cssFilter: "grayscale(1) contrast(1.5) brightness(0.85)", color: "#3f3f46" },
  { id: "high_key", name: "High Key", category: "B&W Noir", cssFilter: "grayscale(1) contrast(0.85) brightness(1.3)", color: "#d4d4d8" },
  { id: "tin_type", name: "Tin Type", category: "B&W Noir", cssFilter: "grayscale(0.9) contrast(1.3) brightness(0.88) sepia(0.15)", color: "#52525b" },
  { id: "urban_noir", name: "Urban Noir", category: "B&W Noir", cssFilter: "grayscale(1) contrast(1.4) brightness(0.92) saturate(0)", color: "#27272a" },
  { id: "warm_mono", name: "Warm Mono", category: "B&W Noir", cssFilter: "grayscale(1) sepia(0.3) contrast(1.1) brightness(1.0)", color: "#a16207" },

  // ─── Beauty & Glow ─────────────────────────────────────────────────────────
  { id: "beauty_glow", name: "Beauty Glow", category: "Beauty & Glow", cssFilter: "brightness(1.1) contrast(0.95) saturate(1.2) blur(0)", color: "#ec4899" },
  { id: "porcelain", name: "Porcelain", category: "Beauty & Glow", cssFilter: "brightness(1.15) contrast(0.9) saturate(0.9)", color: "#fce7f3" },
  { id: "angelic", name: "Angelic Light", category: "Beauty & Glow", cssFilter: "brightness(1.2) contrast(0.85) saturate(0.95)", color: "#fdf4ff" },
  { id: "velvet_rose", name: "Velvet Rose", category: "Beauty & Glow", cssFilter: "brightness(1.08) saturate(1.3) contrast(0.98) hue-rotate(-10deg)", color: "#f43f5e" },
  { id: "dewy_skin", name: "Dewy Skin", category: "Beauty & Glow", cssFilter: "brightness(1.12) contrast(0.92) saturate(1.1)", color: "#fbcfe8" },
  { id: "honey_glow", name: "Honey Glow", category: "Beauty & Glow", cssFilter: "brightness(1.1) saturate(1.4) contrast(0.97) sepia(0.1)", color: "#fbbf24" },
  { id: "selfie_soft", name: "Selfie Soft", category: "Beauty & Glow", cssFilter: "brightness(1.08) contrast(0.93) saturate(1.05)", color: "#e879f9" },
  { id: "golden_skin", name: "Golden Skin", category: "Beauty & Glow", cssFilter: "brightness(1.06) saturate(1.5) contrast(1.02) sepia(0.15) hue-rotate(-5deg)", color: "#d97706" },

  // ─── Duotone & Pop ─────────────────────────────────────────────────────────
  { id: "duotone_pink_cyan", name: "Pink/Cyan", category: "Duotone & Pop", cssFilter: "saturate(2.5) contrast(1.4) hue-rotate(290deg)", color: "#ec4899" },
  { id: "duotone_lime_black", name: "Lime/Black", category: "Duotone & Pop", cssFilter: "saturate(2.2) contrast(1.6) hue-rotate(90deg)", color: "#84cc16" },
  { id: "duotone_crimson_navy", name: "Crimson/Navy", category: "Duotone & Pop", cssFilter: "saturate(2.0) contrast(1.5) hue-rotate(220deg)", color: "#dc2626" },
  { id: "pop_yellow", name: "Yellow Pop", category: "Duotone & Pop", cssFilter: "saturate(2.4) contrast(1.45) hue-rotate(40deg)", color: "#fbbf24" },
  { id: "pop_art", name: "Pop Art", category: "Duotone & Pop", cssFilter: "saturate(2.8) contrast(1.5) hue-rotate(0deg)", color: "#f97316" },
  { id: "duotone_gold_purple", name: "Gold/Purple", category: "Duotone & Pop", cssFilter: "saturate(2.0) contrast(1.4) hue-rotate(260deg)", color: "#a855f7" },
  { id: "fire_ice", name: "Fire & Ice", category: "Duotone & Pop", cssFilter: "saturate(2.3) contrast(1.35) hue-rotate(155deg)", color: "#06b6d4" },

  // ─── Pastel & Fantasy ──────────────────────────────────────────────────────
  { id: "fairy_dust", name: "Fairy Dust", category: "Pastel & Fantasy", cssFilter: "saturate(0.75) brightness(1.2) contrast(0.88) hue-rotate(280deg)", color: "#d946ef" },
  { id: "lilac_mist", name: "Lilac Mist", category: "Pastel & Fantasy", cssFilter: "saturate(0.8) brightness(1.18) contrast(0.85) hue-rotate(260deg)", color: "#a855f7" },
  { id: "bubblegum", name: "Bubblegum", category: "Pastel & Fantasy", cssFilter: "saturate(1.1) brightness(1.15) contrast(0.88) hue-rotate(-15deg)", color: "#fb7185" },
  { id: "honey_sky", name: "Honey Sky", category: "Pastel & Fantasy", cssFilter: "saturate(0.9) brightness(1.2) contrast(0.85) hue-rotate(25deg)", color: "#fbbf24" },
  { id: "cotton_candy", name: "Cotton Candy", category: "Pastel & Fantasy", cssFilter: "saturate(0.7) brightness(1.25) contrast(0.82) hue-rotate(-10deg)", color: "#f9a8d4" },
  { id: "mint_dream", name: "Mint Dream", category: "Pastel & Fantasy", cssFilter: "saturate(0.75) brightness(1.2) contrast(0.85) hue-rotate(150deg)", color: "#34d399" },
  { id: "cloud_nine", name: "Cloud Nine", category: "Pastel & Fantasy", cssFilter: "saturate(0.6) brightness(1.3) contrast(0.8)", color: "#bfdbfe" },
  { id: "dreamy_lavender", name: "Dreamy Lavender", category: "Pastel & Fantasy", cssFilter: "saturate(0.7) brightness(1.22) contrast(0.83) hue-rotate(245deg)", color: "#c4b5fd" },

  // ─── Cinematic ─────────────────────────────────────────────────────────────
  { id: "hollywood", name: "Hollywood", category: "Cinematic", cssFilter: "saturate(1.2) contrast(1.35) brightness(0.9) hue-rotate(185deg)", color: "#0891b2" },
  { id: "moody_teal", name: "Moody Teal", category: "Cinematic", cssFilter: "saturate(1.15) contrast(1.3) brightness(0.88) hue-rotate(175deg)", color: "#0d9488" },
  { id: "warm_tangerine", name: "Warm Tangerine", category: "Cinematic", cssFilter: "saturate(1.3) contrast(1.25) brightness(0.95) hue-rotate(-5deg) sepia(0.1)", color: "#f97316" },
  { id: "film_teal_orange", name: "Teal & Orange", category: "Cinematic", cssFilter: "saturate(1.25) contrast(1.3) brightness(0.92) hue-rotate(180deg)", color: "#2dd4bf" },
  { id: "prestige", name: "Prestige", category: "Cinematic", cssFilter: "saturate(1.1) contrast(1.4) brightness(0.85) sepia(0.12)", color: "#1e3a5f" },
  { id: "epic_drama", name: "Epic Drama", category: "Cinematic", cssFilter: "contrast(1.5) saturate(0.85) brightness(0.82) sepia(0.08)", color: "#374151" },
  { id: "blockbuster", name: "Blockbuster", category: "Cinematic", cssFilter: "saturate(1.3) contrast(1.35) brightness(0.9) hue-rotate(170deg)", color: "#0369a1" },
  { id: "indie_film", name: "Indie Film", category: "Cinematic", cssFilter: "saturate(0.9) contrast(1.2) brightness(0.95) sepia(0.2)", color: "#78716c" },
  { id: "sci_fi", name: "Sci-Fi", category: "Cinematic", cssFilter: "saturate(1.4) contrast(1.3) brightness(0.9) hue-rotate(200deg)", color: "#06b6d4" },

  // ─── VHS & Glitch ──────────────────────────────────────────────────────────
  { id: "vhs", name: "VHS Tape", category: "VHS & Glitch", cssFilter: "contrast(1.3) hue-rotate(90deg) saturate(1.5) brightness(0.95)", color: "#10b981" },
  { id: "crt_glow", name: "CRT Glow", category: "VHS & Glitch", cssFilter: "contrast(1.25) saturate(1.6) brightness(0.9) hue-rotate(120deg)", color: "#22c55e" },
  { id: "rgb_shift", name: "RGB Shift", category: "VHS & Glitch", cssFilter: "contrast(1.4) saturate(1.8) hue-rotate(60deg) brightness(0.92)", color: "#ef4444" },
  { id: "tape_distort", name: "Tape Distort", category: "VHS & Glitch", cssFilter: "contrast(1.2) saturate(1.4) hue-rotate(30deg) brightness(0.88)", color: "#7c3aed" },
  { id: "scanlines", name: "Scanlines", category: "VHS & Glitch", cssFilter: "contrast(1.3) grayscale(0.2) brightness(0.9) saturate(1.2)", color: "#52525b" },
  { id: "80s_dream", name: "80s Dream", category: "VHS & Glitch", cssFilter: "contrast(1.2) saturate(2.0) hue-rotate(315deg) brightness(0.95)", color: "#d946ef" },
  { id: "betamax", name: "Betamax", category: "VHS & Glitch", cssFilter: "contrast(1.35) saturate(1.3) hue-rotate(10deg) brightness(0.9) sepia(0.1)", color: "#64748b" },
  { id: "pixel_burn", name: "Pixel Burn", category: "VHS & Glitch", cssFilter: "contrast(1.5) saturate(2.2) hue-rotate(45deg) brightness(0.85)", color: "#f97316" },
];

/** Helper: get filters by category */
export function filtersByCategory(cat: FilterCategory | "All"): CameraFilter[] {
  if (cat === "All") return ALL_FILTERS;
  return ALL_FILTERS.filter((f) => f.category === cat);
}

/** Helper: find a filter by ID */
export function findFilter(id: string): CameraFilter {
  return ALL_FILTERS.find((f) => f.id === id) ?? ALL_FILTERS[0];
}
