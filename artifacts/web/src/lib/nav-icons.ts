import { useQuery } from "@tanstack/react-query";

// Same base-URL rule as lib/api.ts: relative in dev (proxy), VITE_API_URL in prod.
const raw = import.meta.env.DEV
  ? undefined
  : (import.meta.env.VITE_API_URL as string | undefined);
const apiBaseUrl = raw
  ? /^https?:\/\//.test(raw)
    ? raw
    : `https://${raw}`
  : "";

/**
 * Admin-uploaded custom nav icon URLs keyed by item key (home, friends,
 * reels, circles, hubs, shop, earnings, live, watch, events, stories,
 * memories, saved, verified). Empty object = use built-in icons.
 * Public endpoint — no auth needed.
 */
export function useNavIcons(): Record<string, string> {
  const { data } = useQuery({
    queryKey: ["site", "nav-icons"],
    queryFn: async (): Promise<Record<string, string>> => {
      const res = await fetch(`${apiBaseUrl}/api/site/nav-icons`);
      if (!res.ok) return {};
      const body = (await res.json()) as { icons?: Record<string, string> };
      const icons = body.icons ?? {};
      const out: Record<string, string> = {};
      for (const [k, v] of Object.entries(icons)) {
        if (typeof v === "string" && /^https?:\/\//i.test(v)) out[k] = v;
      }
      return out;
    },
    staleTime: 5 * 60_000,
    gcTime: 30 * 60_000,
  });
  return data ?? {};
}
