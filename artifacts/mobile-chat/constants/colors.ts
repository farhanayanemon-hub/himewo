/**
 * Semantic design tokens for the HiMewo Chat (Messenger) mobile app.
 *
 * Apple / iOS-inspired palette shared with the rest of HiMewo, but the
 * Messenger app uses a slightly DEEPER violet primary (#6c4be0) plus clean
 * white surfaces and rounder bubbles so it stays visually distinct from the
 * main social app (which uses the lighter violet #7c5cff). Both apps share the
 * same structure/components; only the palette differs.
 *
 * The useColors() hook automatically picks the light/dark variant based on the
 * device color scheme.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#1d1d1f",
    tint: "#6c4be0",

    // Core surfaces (Messenger clean white)
    background: "#ffffff",
    foreground: "#1d1d1f",

    // Cards / elevated surfaces
    card: "#ffffff",
    cardForeground: "#1d1d1f",
    cardBorder: "#e5e5ea",

    // Primary action color (deep violet)
    primary: "#6c4be0",
    primaryForeground: "#ffffff",

    // Secondary / less-emphasis interactive surfaces
    secondary: "#f2f2f7",
    secondaryForeground: "#1d1d1f",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#f2f2f7",
    mutedForeground: "#86868b",

    // Accent highlights
    accent: "#ece5ff",
    accentForeground: "#6c4be0",

    // Destructive actions (delete, error states)
    destructive: "#ef4343",
    destructiveForeground: "#ffffff",

    // Borders and input outlines
    border: "#e5e5ea",
    input: "#e5e5ea",
  },

  dark: {
    text: "#f5f5f7",
    tint: "#8b6dff",

    background: "#000000",
    foreground: "#f5f5f7",

    card: "#1c1c1e",
    cardForeground: "#f5f5f7",
    cardBorder: "#38383a",

    primary: "#8b6dff",
    primaryForeground: "#ffffff",

    secondary: "#2c2c2e",
    secondaryForeground: "#f5f5f7",

    muted: "#2c2c2e",
    mutedForeground: "#98989d",

    accent: "#2a2140",
    accentForeground: "#b9a6ff",

    destructive: "#7c1d1d",
    destructiveForeground: "#ffffff",

    border: "#38383a",
    input: "#38383a",
  },

  // Border radius (in px). Messenger uses fully rounded bubbles/controls.
  radius: 18,
};

export default colors;
