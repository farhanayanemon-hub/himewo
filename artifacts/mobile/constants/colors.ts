/**
 * Semantic design tokens for the HiMewo mobile app.
 *
 * These values are synced from the sibling web artifact (artifacts/web/src/index.css)
 * so both apps share a cohesive visual identity. The web theme's HSL values are
 * converted to hex here. The brand identity is Facebook-style: a #1877F2 brand blue,
 * a light neutral-gray feed background, and crisp white elevated cards.
 *
 * The useColors() hook automatically picks the light/dark variant based on the
 * device color scheme.
 */

const colors = {
  light: {
    // Legacy aliases (kept for backward compatibility)
    text: "#050505",
    tint: "#1877f2",

    // Core surfaces — Facebook light-gray feed background
    background: "#f0f2f5",
    foreground: "#050505",

    // Cards / elevated surfaces
    card: "#ffffff",
    cardForeground: "#050505",
    cardBorder: "#dadde1",

    // Primary action color (buttons, links, active states) — Facebook blue
    primary: "#1877f2",
    primaryForeground: "#ffffff",

    // Secondary / less-emphasis interactive surfaces (FB secondary button)
    secondary: "#e4e6eb",
    secondaryForeground: "#050505",

    // Muted / subdued elements (dividers, timestamps, placeholders)
    muted: "#f0f2f5",
    mutedForeground: "#65676b",

    // Accent highlights (selected items, liked surfaces, focus rings)
    accent: "#e7f3ff",
    accentForeground: "#1877f2",

    // Destructive actions (delete, error states)
    destructive: "#fa383e",
    destructiveForeground: "#ffffff",

    // Borders and input outlines
    border: "#dadde1",
    input: "#f0f2f5",

    // Positive / online accent (Facebook green)
    positive: "#31a24c",
  },

  dark: {
    text: "#e4e6eb",
    tint: "#2d88ff",

    background: "#18191a",
    foreground: "#e4e6eb",

    card: "#242526",
    cardForeground: "#e4e6eb",
    cardBorder: "#3e4042",

    primary: "#2d88ff",
    primaryForeground: "#ffffff",

    secondary: "#3a3b3c",
    secondaryForeground: "#e4e6eb",

    muted: "#3a3b3c",
    mutedForeground: "#b0b3b8",

    accent: "#263951",
    accentForeground: "#2d88ff",

    destructive: "#ff5c5c",
    destructiveForeground: "#ffffff",

    border: "#3e4042",
    input: "#3a3b3c",

    positive: "#45bd62",
  },

  // Border radius (in px). Synced from the web artifact's --radius (0.75rem = 12px).
  radius: 12,
};

export default colors;
