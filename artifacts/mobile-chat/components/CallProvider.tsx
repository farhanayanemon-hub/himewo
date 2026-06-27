import type { ReactNode } from "react";
import CallEngine from "./CallEngine";

export { useCall } from "./callContext";

/**
 * Public entry point for calls. The real implementation is platform-split:
 * `CallEngine.native.tsx` uses Stream Video (real WebRTC calls, requires a
 * native dev build), while `CallEngine.tsx` is a web/Expo Go fallback that
 * shows a calling overlay without live media.
 */
export function CallProvider({ children }: { children: ReactNode }) {
  return <CallEngine>{children}</CallEngine>;
}
