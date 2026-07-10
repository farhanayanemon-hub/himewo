// Facebook-style text-story backgrounds, shared by key with the web app so
// every client renders the same story with the same colors.
export const STORY_BACKGROUNDS: Record<string, [string, string]> = {
  sunset: ["#f97316", "#db2777"],
  ocean: ["#0ea5e9", "#6366f1"],
  forest: ["#22c55e", "#0d9488"],
  berry: ["#a855f7", "#ec4899"],
  night: ["#1e293b", "#4338ca"],
  fire: ["#ef4444", "#f59e0b"],
};

export const DEFAULT_STORY_BG = "sunset";

export function storyBackground(key: string | null | undefined): [string, string] {
  return STORY_BACKGROUNDS[key ?? ""] ?? STORY_BACKGROUNDS[DEFAULT_STORY_BG];
}
