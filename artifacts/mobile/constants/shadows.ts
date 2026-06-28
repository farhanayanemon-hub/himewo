/**
 * Soft-3D elevation tokens for the HiMewo mobile app.
 *
 * Gives elevated surfaces (cards, FABs, badges) a gentle, clean depth —
 * warm-tinted to sit naturally on the orange palette. Returns a
 * platform-correct style: a `boxShadow` string on web (the live preview) and
 * native `shadow*` + `elevation` on iOS/Android.
 */
import { Platform, type ViewStyle } from "react-native";

export type ShadowLevel = "sm" | "md" | "lg" | "xl";

const NATIVE: Record<ShadowLevel, ViewStyle> = {
  sm: {
    shadowColor: "#3a281a",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: "#3a281a",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
  },
  lg: {
    shadowColor: "#3a281a",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 24,
    elevation: 10,
  },
  xl: {
    shadowColor: "#3a281a",
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.2,
    shadowRadius: 36,
    elevation: 18,
  },
};

const WEB: Record<ShadowLevel, ViewStyle> = {
  sm: { boxShadow: "0 1px 3px rgba(58,40,26,0.12)" } as ViewStyle,
  md: { boxShadow: "0 4px 16px rgba(58,40,26,0.14)" } as ViewStyle,
  lg: { boxShadow: "0 10px 28px rgba(58,40,26,0.18)" } as ViewStyle,
  xl: { boxShadow: "0 18px 44px rgba(58,40,26,0.22)" } as ViewStyle,
};

/** A colored soft glow, e.g. under a primary button — `glow(c.primary)`. */
export function glow(color: string): ViewStyle {
  if (Platform.OS === "web") {
    return { boxShadow: `0 8px 20px ${hexA(color, 0.4)}` } as ViewStyle;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 8,
  };
}

function hexA(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  if (h.length !== 6) return hex;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function shadow(level: ShadowLevel = "md"): ViewStyle {
  return Platform.OS === "web" ? WEB[level] : NATIVE[level];
}
