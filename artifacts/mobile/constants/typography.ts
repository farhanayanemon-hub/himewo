/**
 * Global typography scale for the HiMewo mobile app.
 *
 * All inline `fontSize` values across the app are wrapped in `fs()` so the
 * whole app's text size can be tuned from a single knob. Lowering FONT_SCALE
 * makes every screen's text proportionally smaller while preserving the
 * relative hierarchy (titles stay bigger than body, etc.).
 */

export const FONT_SCALE = 0.88;

export function fs(size: number): number {
  return Math.round(size * FONT_SCALE);
}
