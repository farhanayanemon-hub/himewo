/**
 * Semantic design tokens for the HiMewo mobile app.
 *
 * "Aurora Glass" palette: solid black (dark) / solid white (light) backgrounds
 * with translucent "glass" surfaces, and a teal -> purple -> pink aurora accent
 * identity. This is the unified HiMewo brand accent, shared across the web, ads
 * dashboard, and mobile apps. The primary accent is purple (#c084fc) with teal
 * (#5eead4) as the secondary accent.
 *
 * RN has no backdrop-filter, so glass surfaces are approximated with the
 * translucent fill values below plus a 1px border on cards.
 *
 * The useColors() hook automatically picks the light/dark variant based on the
 * device color scheme.
 */

// Aurora accent identity (same in both themes)
const AURORA_TEAL = "#5eead4";
const AURORA_PURPLE = "#c084fc";
const AURORA_PINK = "#f472b6";
const AURORA_GRADIENT = [AURORA_TEAL, AURORA_PURPLE, AURORA_PINK] as const;
const AURORA_BUTTON_GRADIENT = ["rgba(94,234,212,0.9)", "rgba(192,132,252,0.9)"] as const;

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#0f172a",
    tint: AURORA_PURPLE,

    // Core surface (soft clean background so white cards pop gracefully)
    background: "#F5F7FA",
    foreground: "#0f172a",

    // Cards / elevated surfaces (Solid pure white - prevents Android elevation shadow bleed-through)
    card: "#ffffff",
    cardForeground: "#0f172a",
    cardBorder: "#e2e8f0",

    // Opaque surface for modals / sheets / popovers (never translucent)
    surface: "#ffffff",

    // Primary action color (aurora purple)
    primary: AURORA_PURPLE,
    primaryForeground: "#ffffff",

    // Secondary / subtle interactive surfaces (composer input, search pill, comments pill)
    secondary: "#f1f5f9",
    secondaryForeground: "#0f172a",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#f8fafc",
    mutedForeground: "#64748b",

    // Accent highlights (badges, selected items, focus rings)
    accent: "rgba(192,132,252,0.12)",
    accentForeground: AURORA_PURPLE,

    // Destructive actions (delete, error states)
    destructive: "#ef4343",
    destructiveForeground: "#ffffff",

    // Borders and input outlines
    border: "#e2e8f0",
    borderStrong: "#cbd5e1",
    input: "#e2e8f0",

    // Aurora extras
    secondaryAccent: AURORA_TEAL,
    header: "rgba(255,255,255,0.85)",
  },

  dark: {
    text: "#e5e7eb",
    tint: AURORA_PURPLE,

    background: "#0D1117",
    foreground: "#e5e7eb",

    card: "#161B22",
    cardForeground: "#e5e7eb",
    cardBorder: "#30363D",

    // Opaque surface for modals / sheets / popovers (never translucent)
    surface: "#161B22",

    primary: AURORA_PURPLE,
    primaryForeground: "#ffffff",

    secondary: "#21262D",
    secondaryForeground: "#e5e7eb",

    muted: "#161B22",
    mutedForeground: "#94a3b8",

    accent: "rgba(192,132,252,0.15)",
    accentForeground: AURORA_PURPLE,

    destructive: "#ef4343",
    destructiveForeground: "#ffffff",

    border: "#30363D",
    borderStrong: "#484F58",
    input: "#30363D",

    // Aurora extras
    secondaryAccent: AURORA_TEAL,
    header: "#161B22",
  },

  // Aurora accent gradients (theme-independent)
  auroraGradient: AURORA_GRADIENT,
  auroraButtonGradient: AURORA_BUTTON_GRADIENT,

  // Border radius (in px). Rounded corners (~1rem).
  radius: 16,
};

export default colors;
