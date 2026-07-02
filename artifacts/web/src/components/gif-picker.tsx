import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// Tenor v1 public demo key — anonymous, rate-limited, good enough for GIF search.
const TENOR_KEY = "LIVDSRZULELA";

type TenorGif = {
  id: string;
  media: Array<{
    tinygif?: { url: string };
    gif?: { url: string };
  }>;
};

async function searchGifs(query: string): Promise<TenorGif[]> {
  const url = query.trim()
    ? `https://g.tenor.com/v1/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=24&media_filter=minimal`
    : `https://g.tenor.com/v1/trending?key=${TENOR_KEY}&limit=24&media_filter=minimal`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("GIF search failed");
  const data = await res.json();
  return data.results ?? [];
}

export function GifPickerButton({
  onSelect,
}: {
  onSelect: (url: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(false);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchGifs(query)
        .then((results) => setGifs(results))
        .catch(() => setError(true))
        .finally(() => setLoading(false));
    }, query ? 350 : 0);
    return () => clearTimeout(debounceRef.current);
  }, [open, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="px-1.5 py-0.5 rounded-md text-[11px] font-bold text-muted-foreground hover:bg-muted border border-border"
          aria-label="Add a GIF"
        >
          GIF
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="end">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          className="w-full bg-muted/50 rounded-md px-3 py-1.5 text-sm mb-2 focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <div className="h-64 overflow-y-auto">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Couldn't load GIFs. Try again.
            </div>
          ) : gifs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No GIFs found.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-1.5">
              {gifs.map((gif) => {
                const media = gif.media[0];
                const preview = media?.tinygif?.url ?? media?.gif?.url;
                const full = media?.gif?.url ?? media?.tinygif?.url;
                if (!preview || !full) return null;
                return (
                  <button
                    key={gif.id}
                    type="button"
                    className="rounded-md overflow-hidden hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-primary"
                    onClick={() => {
                      onSelect(full);
                      setOpen(false);
                    }}
                  >
                    <img src={preview} alt="" className="w-full h-24 object-cover" loading="lazy" />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
