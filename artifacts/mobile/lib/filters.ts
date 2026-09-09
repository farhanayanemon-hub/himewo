export interface MobileFilter {
  id: string;
  name: string;
  category: string;
  overlayColor: string;
  contrast?: number;
  preview: [string, string];
  icon?: string;
}

export const MOBILE_FILTERS: MobileFilter[] = [
  { id: "normal", name: "Normal", category: "Standard", overlayColor: "transparent", preview: ["#333333", "#1f1f1f"] },
  { id: "kodak", name: "Kodak Gold", category: "Film", overlayColor: "rgba(245, 158, 11, 0.18)", preview: ["#f59e0b", "#d97706"] },
  { id: "portra", name: "Portra 400", category: "Film", overlayColor: "rgba(251, 191, 36, 0.14)", preview: ["#fbbf24", "#b45309"] },
  { id: "fuji_1998", name: "1998 Cam", category: "Film", overlayColor: "rgba(234, 88, 12, 0.16)", preview: ["#ea580c", "#7c2d12"] },
  { id: "golden_sunset", name: "Golden Sunset", category: "Warm", overlayColor: "rgba(249, 115, 22, 0.22)", preview: ["#f97316", "#db2777"] },
  { id: "amber_glow", name: "Amber Glow", category: "Warm", overlayColor: "rgba(252, 211, 77, 0.2)", preview: ["#fcd34d", "#f59e0b"] },
  { id: "cyber_neon", name: "Cyber Neon", category: "Neon", overlayColor: "rgba(168, 85, 247, 0.25)", preview: ["#a855f7", "#06b6d4"] },
  { id: "tokyo_night", name: "Tokyo Night", category: "Neon", overlayColor: "rgba(236, 72, 153, 0.2)", preview: ["#ec4899", "#8b5cf6"] },
  { id: "acid_cyan", name: "Acid Cyan", category: "Neon", overlayColor: "rgba(6, 182, 212, 0.22)", preview: ["#06b6d4", "#3b82f6"] },
  { id: "noir_bw", name: "B&W Noir", category: "Monochrome", overlayColor: "rgba(0, 0, 0, 0.45)", preview: ["#000000", "#555555"] },
  { id: "silver_film", name: "Silver Film", category: "Monochrome", overlayColor: "rgba(255, 255, 255, 0.12)", preview: ["#e2e8f0", "#64748b"] },
  { id: "beauty_glow", name: "Beauty Glow", category: "Glow", overlayColor: "rgba(244, 114, 182, 0.18)", preview: ["#f472b6", "#fda4af"] },
  { id: "angelic_light", name: "Angelic Light", category: "Glow", overlayColor: "rgba(254, 240, 138, 0.18)", preview: ["#fef08a", "#fde047"] },
  { id: "teal_orange", name: "Teal & Orange", category: "Cinematic", overlayColor: "rgba(14, 165, 233, 0.18)", preview: ["#0ea5e9", "#f97316"] },
  { id: "emerald_sea", name: "Emerald Sea", category: "Cinematic", overlayColor: "rgba(16, 185, 129, 0.2)", preview: ["#10b981", "#047857"] },
  { id: "vhs_glitch", name: "VHS 90s", category: "Retro", overlayColor: "rgba(99, 102, 241, 0.22)", preview: ["#6366f1", "#ec4899"] },
  { id: "bubblegum", name: "Bubblegum", category: "Pastel", overlayColor: "rgba(249, 168, 212, 0.22)", preview: ["#f9a8d4", "#c084fc"] },
  { id: "honey_sky", name: "Honey Sky", category: "Pastel", overlayColor: "rgba(253, 230, 138, 0.2)", preview: ["#fde68a", "#fdba74"] },
  { id: "deep_crimson", name: "Deep Crimson", category: "Dramatic", overlayColor: "rgba(220, 38, 38, 0.22)", preview: ["#dc2626", "#7f1d1d"] },
  { id: "matrix_glow", name: "Matrix Green", category: "Sci-Fi", overlayColor: "rgba(34, 197, 94, 0.22)", preview: ["#22c55e", "#15803d"] },
];
