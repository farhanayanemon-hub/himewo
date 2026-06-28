/**
 * Semantic design tokens for the HiMewo Chat (Messenger) mobile app.
 *
 * HiMewo Chat is the dedicated Messenger-style app, so it uses a distinct
 * Messenger-blue identity (cool neutral surfaces + vivid blue primary) to set it
 * apart from the warm Facebook-orange HiMewo social app. Both apps still share
 * the same structure/components; only the palette differs.
 *
 * The useColors() hook automatically picks the light/dark variant based on the
 * device color scheme.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#050505",
    tint: "#0084ff",

    // Core surfaces (Messenger cool neutrals)
    background: "#ffffff",
    foreground: "#050505",

    // Cards / elevated surfaces
    card: "#ffffff",
    cardForeground: "#050505",
    cardBorder: "#e4e6eb",

    // Primary action color (Messenger blue)
    primary: "#0084ff",
    primaryForeground: "#ffffff",

    // Secondary / less-emphasis interactive surfaces
    secondary: "#f0f2f5",
    secondaryForeground: "#050505",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#f0f2f5",
    mutedForeground: "#65676b",

    // Accent highlights (Messenger gradient purple)
    accent: "#a033ff",
    accentForeground: "#ffffff",

    // Destructive actions (delete, error states)
    destructive: "#ef4343",
    destructiveForeground: "#ffffff",

    // Borders and input outlines
    border: "#e4e6eb",
    input: "#e4e6eb",
  },

  dark: {
    text: "#e4e6eb",
    tint: "#2e9bff",

    background: "#18191a",
    foreground: "#e4e6eb",

    card: "#242526",
    cardForeground: "#e4e6eb",
    cardBorder: "#3a3b3c",

    primary: "#2e9bff",
    primaryForeground: "#ffffff",

    secondary: "#3a3b3c",
    secondaryForeground: "#e4e6eb",

    muted: "#3a3b3c",
    mutedForeground: "#b0b3b8",

    accent: "#b16cff",
    accentForeground: "#ffffff",

    destructive: "#7c1d1d",
    destructiveForeground: "#ffffff",

    border: "#3a3b3c",
    input: "#3a3b3c",
  },

  // Border radius (in px). Messenger uses fully rounded bubbles/controls.
  radius: 18,
};

export default colors;
