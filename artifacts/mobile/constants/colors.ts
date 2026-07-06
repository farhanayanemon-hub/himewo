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

    // Core surface (pure white, no gradient)
    background: "#ffffff",
    foreground: "#0f172a",

    // Cards / elevated glass surfaces
    card: "rgba(15,23,42,0.03)",
    cardForeground: "#0f172a",
    cardBorder: "rgba(15,23,42,0.08)",

    // Primary action color (aurora purple)
    primary: AURORA_PURPLE,
    primaryForeground: "#ffffff",

    // Secondary / stronger glass interactive surfaces
    secondary: "rgba(15,23,42,0.05)",
    secondaryForeground: "#0f172a",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "rgba(15,23,42,0.03)",
    mutedForeground: "#64748b",

    // Accent highlights (badges, selected items, focus rings)
    accent: "rgba(192,132,252,0.12)",
    accentForeground: AURORA_PURPLE,

    // Destructive actions (delete, error states)
    destructive: "#ef4343",
    destructiveForeground: "#ffffff",

    // Borders and input outlines
    border: "rgba(15,23,42,0.08)",
    borderStrong: "rgba(15,23,42,0.14)",
    input: "rgba(15,23,42,0.08)",

    // Aurora extras
    secondaryAccent: AURORA_TEAL,
    header: "rgba(255,255,255,0.72)",
  },

  dark: {
    text: "#e5e7eb",
    tint: AURORA_PURPLE,

    background: "#000000",
    foreground: "#e5e7eb",

    card: "rgba(255,255,255,0.04)",
    cardForeground: "#e5e7eb",
    cardBorder: "rgba(255,255,255,0.10)",

    primary: AURORA_PURPLE,
    primaryForeground: "#ffffff",

    secondary: "rgba(255,255,255,0.07)",
    secondaryForeground: "#e5e7eb",

    muted: "rgba(255,255,255,0.04)",
    mutedForeground: "#94a3b8",

    accent: "rgba(192,132,252,0.15)",
    accentForeground: AURORA_PURPLE,

    destructive: "#ef4343",
    destructiveForeground: "#ffffff",

    border: "rgba(255,255,255,0.10)",
    borderStrong: "rgba(255,255,255,0.18)",
    input: "rgba(255,255,255,0.10)",

    // Aurora extras
    secondaryAccent: AURORA_TEAL,
    header: "rgba(10,10,12,0.65)",
  },

  // Aurora accent gradients (theme-independent)
  auroraGradient: AURORA_GRADIENT,
  auroraButtonGradient: AURORA_BUTTON_GRADIENT,

  // Border radius (in px). Rounded corners (~1rem).
  radius: 16,
};

export default colors;
