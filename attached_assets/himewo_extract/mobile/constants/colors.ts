/**
 * Semantic design tokens for the HiMewo mobile app.
 *
 * These values are synced from the sibling web artifact (artifacts/web/src/index.css)
 * so both apps share a cohesive visual identity. HSL values from the web theme are
 * converted to hex here. The brand primary is a warm Facebook-style orange.
 *
 * The useColors() hook automatically picks the light/dark variant based on the
 * device color scheme.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#1f1814",
    tint: "#ff751a",

    // Core surfaces
    background: "#fcfaf8",
    foreground: "#1f1814",

    // Cards / elevated surfaces
    card: "#ffffff",
    cardForeground: "#1f1814",
    cardBorder: "#ebe7e0",

    // Primary action color (buttons, links, active states)
    primary: "#ff751a",
    primaryForeground: "#ffffff",

    // Secondary / less-emphasis interactive surfaces
    secondary: "#ebe7e0",
    secondaryForeground: "#1f1814",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#ebe7e0",
    mutedForeground: "#7e7167",

    // Accent highlights (badges, selected items, focus rings)
    accent: "#ffcc33",
    accentForeground: "#1f1814",

    // Destructive actions (delete, error states)
    destructive: "#ef4343",
    destructiveForeground: "#ffffff",

    // Borders and input outlines
    border: "#ebe7e0",
    input: "#ebe7e0",
  },

  dark: {
    text: "#fcfaf8",
    tint: "#ff751a",

    background: "#181310",
    foreground: "#fcfaf8",

    card: "#251d18",
    cardForeground: "#fcfaf8",
    cardBorder: "#3b302b",

    primary: "#ff751a",
    primaryForeground: "#ffffff",

    secondary: "#3b302b",
    secondaryForeground: "#fcfaf8",

    muted: "#3b302b",
    mutedForeground: "#a39c8f",

    accent: "#ffcc33",
    accentForeground: "#1f1814",

    destructive: "#7c1d1d",
    destructiveForeground: "#ffffff",

    border: "#3b302b",
    input: "#3b302b",
  },

  // Border radius (in px). Synced from the web artifact's --radius (1rem = 16px).
  radius: 16,
};

export default colors;
