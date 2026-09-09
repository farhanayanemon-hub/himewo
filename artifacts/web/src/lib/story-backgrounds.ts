/**
 * 50+ premium text-story backgrounds (same keys as mobile storyBackgrounds.ts
 * so both platforms render identical colours).
 */
export const STORY_BACKGROUNDS: Record<string, [string, string]> = {
  // ── Vibrant Gradients ──────────────────────────────────────────────────────
  sunset: ["#f97316", "#db2777"],
  ocean: ["#0ea5e9", "#6366f1"],
  forest: ["#22c55e", "#0d9488"],
  berry: ["#a855f7", "#ec4899"],
  night: ["#1e293b", "#4338ca"],
  fire: ["#ef4444", "#f59e0b"],
  aurora: ["#a855f7", "#06b6d4"],
  cosmic: ["#7c3aed", "#1d4ed8"],
  neon_lime: ["#84cc16", "#22d3ee"],
  mango: ["#fb923c", "#fbbf24"],
  cotton_candy: ["#f9a8d4", "#c4b5fd"],
  watermelon: ["#f43f5e", "#fb923c"],
  tropical: ["#10b981", "#3b82f6"],
  royal: ["#6d28d9", "#1e3a8a"],
  flamingo: ["#fb7185", "#fcd34d"],
  ice_cold: ["#7dd3fc", "#a5f3fc"],
  lemon_lime: ["#a3e635", "#fde047"],
  grape: ["#7c3aed", "#db2777"],
  crimson: ["#dc2626", "#9b1c1c"],
  emerald_sea: ["#059669", "#0284c7"],
  hot_fuchsia: ["#d946ef", "#f43f5e"],
  lavender_sky: ["#818cf8", "#38bdf8"],
  peach: ["#fb923c", "#fda4af"],
  electric_blue: ["#2563eb", "#06b6d4"],
  sunset_gold: ["#f59e0b", "#ef4444"],
  // ── Modern Mesh / Pastels ──────────────────────────────────────────────────
  soft_mint: ["#6ee7b7", "#d1fae5"],
  lavender_fog: ["#ddd6fe", "#ede9fe"],
  rose_dust: ["#fecdd3", "#fda4af"],
  butter_cream: ["#fef08a", "#fde68a"],
  sky_blue: ["#bae6fd", "#e0f2fe"],
  lilac_morning: ["#e9d5ff", "#f5d0fe"],
  sage_breeze: ["#bbf7d0", "#d1fae5"],
  blush_pink: ["#fbcfe8", "#fce7f3"],
  powder_blue: ["#bfdbfe", "#dbeafe"],
  pale_gold: ["#fef3c7", "#fde68a"],
  // ── Dark Luxury ────────────────────────────────────────────────────────────
  oled_black: ["#0f0f0f", "#1c1c1e"],
  midnight_navy: ["#0f172a", "#1e293b"],
  dark_emerald: ["#022c22", "#064e3b"],
  wine_red: ["#450a0a", "#7f1d1d"],
  royal_gold: ["#451a03", "#78350f"],
  deep_purple: ["#2e1065", "#4c1d95"],
  charcoal: ["#18181b", "#27272a"],
  dark_teal: ["#042f2e", "#134e4a"],
  steel: ["#0f172a", "#1e3a5f"],
  obsidian: ["#09090b", "#18181b"],
  // ── Seasonal & Themed ─────────────────────────────────────────────────────
  christmas: ["#15803d", "#dc2626"],
  halloween: ["#ea580c", "#1c1917"],
  spring_blossom: ["#f9a8d4", "#bbf7d0"],
  summer_wave: ["#0ea5e9", "#34d399"],
  autumn_leaves: ["#b45309", "#dc2626"],
};

export const DEFAULT_STORY_BG = "sunset";
export const STORY_BG_KEYS = Object.keys(STORY_BACKGROUNDS);

export function storyBackground(key: string | null | undefined): [string, string] {
  return STORY_BACKGROUNDS[key ?? ""] ?? STORY_BACKGROUNDS[DEFAULT_STORY_BG];
}

/**
 * Human-readable display name for a background key.
 */
export function bgDisplayName(key: string): string {
  return key
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
