/**
 * Semantic design tokens for the HiMewo Chat (Messenger) mobile app.
 *
 * Aurora Glass theme. Solid pure-black (dark) / pure-white (light) backgrounds
 * with translucent "glass" surfaces (approximating backdrop blur with
 * translucent fills + 1px borders, since React Native has no backdrop-filter).
 *
 * The Chat app leans PURPLE/PINK within the aurora family (primary #c084fc,
 * secondary accent #f472b6) so it stays visually distinct from the main social
 * app (which leans teal/purple). The shared 3-color aurora gradient
 * (#5eead4 -> #c084fc -> #f472b6) is used for story/avatar rings, brand text,
 * and outgoing message bubbles.
 *
 * The useColors() hook automatically picks the light/dark variant based on the
 * device color scheme / user preference.
 */

// Shared accent identity (same in both themes).
export const auroraGradient = ["#5eead4", "#c084fc", "#f472b6"] as const;
export const auroraButtonGradient = ["#c084fc", "#f472b6"] as const;

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#0f172a",
    tint: "#c084fc",

    // Core surfaces (solid pure white)
    background: "#ffffff",
    foreground: "#0f172a",

    // Cards / elevated surfaces (glass)
    card: "#ffffff",
    cardForeground: "#0f172a",
    cardBorder: "rgba(15,23,42,0.08)",

    // Primary action color (aurora purple)
    primary: "#c084fc",
    primaryForeground: "#ffffff",

    // Secondary accent (aurora pink)
    accentSecondary: "#f472b6",

    // Secondary / less-emphasis interactive surfaces (stronger glass)
    secondary: "rgba(15,23,42,0.05)",
    secondaryForeground: "#0f172a",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "rgba(15,23,42,0.03)",
    mutedForeground: "#64748b",

    // Accent highlights
    accent: "rgba(192,132,252,0.12)",
    accentForeground: "#c084fc",

    // Destructive actions (delete, error states)
    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    // Borders and input outlines
    border: "rgba(15,23,42,0.08)",
    borderStrong: "rgba(15,23,42,0.14)",
    input: "rgba(15,23,42,0.08)",
  },

  dark: {
    text: "#e5e7eb",
    tint: "#c084fc",

    background: "#000000",
    foreground: "#e5e7eb",

    card: "rgba(255,255,255,0.04)",
    cardForeground: "#e5e7eb",
    cardBorder: "rgba(255,255,255,0.10)",

    primary: "#c084fc",
    primaryForeground: "#ffffff",

    accentSecondary: "#f472b6",

    secondary: "rgba(255,255,255,0.07)",
    secondaryForeground: "#e5e7eb",

    muted: "rgba(255,255,255,0.04)",
    mutedForeground: "#94a3b8",

    accent: "rgba(192,132,252,0.16)",
    accentForeground: "#c084fc",

    destructive: "#ef4444",
    destructiveForeground: "#ffffff",

    border: "rgba(255,255,255,0.10)",
    borderStrong: "rgba(255,255,255,0.18)",
    input: "rgba(255,255,255,0.10)",
  },

  // Border radius (in px). Messenger uses fully rounded bubbles/controls.
  radius: 18,
};

export default colors;
