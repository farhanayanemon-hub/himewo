/**
 * Semantic design tokens for the HiMewo mobile app.
 *
 * Apple / iOS-inspired palette: clean neutral surfaces with a soft violet
 * primary (#7c5cff). This is the unified HiMewo brand accent, shared across the
 * web, ads dashboard, and both mobile apps. The Messenger app (mobile-chat)
 * uses a slightly deeper violet so the two apps stay visually distinct.
 *
 * The useColors() hook automatically picks the light/dark variant based on the
 * device color scheme.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#1d1d1f",
    tint: "#7c5cff",

    // Core surfaces (Apple light gray)
    background: "#f5f5f7",
    foreground: "#1d1d1f",

    // Cards / elevated surfaces
    card: "#ffffff",
    cardForeground: "#1d1d1f",
    cardBorder: "#e5e5ea",

    // Primary action color (soft violet)
    primary: "#7c5cff",
    primaryForeground: "#ffffff",

    // Secondary / less-emphasis interactive surfaces
    secondary: "#f2f2f7",
    secondaryForeground: "#1d1d1f",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#f2f2f7",
    mutedForeground: "#86868b",

    // Accent highlights (badges, selected items, focus rings)
    accent: "#efeaff",
    accentForeground: "#7c5cff",

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

  // Border radius (in px). Apple-style rounded corners.
  radius: 16,
};

export default colors;
