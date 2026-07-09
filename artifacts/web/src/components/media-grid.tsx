import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

export type MediaItem = { url: string; type: string };

/**
 * Fullscreen viewer with prev/next arrows and keyboard navigation.
 * Used by the feed media grid and the profile Photos section.
 */
export function MediaLightbox({
  items,
  index,
  onClose,
  onIndexChange,
}: {
  items: MediaItem[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}) {
  const prev = useCallback(
    () => onIndexChange((index - 1 + items.length) % items.length),
    [index, items.length, onIndexChange],
  );
  const next = useCallback(
    () => onIndexChange((index + 1) % items.length),
    [index, items.length, onIndexChange],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, prev, next]);

  const item = items[index];
  if (!item) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
      >
        <X className="w-5 h-5" />
      </button>
      {items.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            aria-label="Previous"
            className="absolute left-3 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              next();
            }}
            aria-label="Next"
            className="absolute right-3 z-10 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <span className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80 text-sm">
            {index + 1} / {items.length}
          </span>
        </>
      )}
      <div
        className="max-w-[92vw] max-h-[88vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {item.type === "video" ? (
          <video
            src={item.url}
            controls
            autoPlay
            className="max-w-[92vw] max-h-[88vh] rounded-lg"
          />
        ) : (
          <img
            src={item.url}
            alt=""
            className="max-w-[92vw] max-h-[88vh] object-contain rounded-lg"
          />
        )}
      </div>
    </div>
  );
}

/**
 * Facebook-style media grid: 1 item full width, 2 side-by-side, 3 = one big +
 * two stacked, 4+ = 2x2 with a "+N" overlay. Clicking opens the lightbox.
 */
export function MediaGrid({ media }: { media: MediaItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  if (media.length === 0) return null;

  const shown = media.slice(0, 4);
  const extra = media.length - shown.length;

  const tile = (m: MediaItem, i: number, cls: string, overlay?: number) => (
    <button
      key={i}
      onClick={() => setOpen(i)}
      className={`relative block w-full h-full overflow-hidden ${cls}`}
    >
      {m.type === "video" ? (
        <video src={m.url} className="w-full h-full object-cover" muted />
      ) : (
        <img src={m.url} alt="" className="w-full h-full object-cover" />
      )}
      {overlay ? (
        <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-2xl font-bold">
          +{overlay}
        </span>
      ) : null}
    </button>
  );

  return (
    <>
      <div className="rounded-lg overflow-hidden border border-border mb-3">
        {shown.length === 1 &&
          (shown[0].type === "video" ? (
            <video
              src={shown[0].url}
              controls
              className="w-full object-cover max-h-[500px]"
            />
          ) : (
            <button onClick={() => setOpen(0)} className="block w-full">
              <img
                src={shown[0].url}
                alt=""
                className="w-full object-cover max-h-[500px]"
              />
            </button>
          ))}
        {shown.length === 2 && (
          <div className="grid grid-cols-2 gap-0.5 aspect-[2/1]">
            {shown.map((m, i) => tile(m, i, ""))}
          </div>
        )}
        {shown.length === 3 && (
          <div className="grid grid-cols-2 gap-0.5 aspect-[2/1]">
            {tile(shown[0], 0, "row-span-2 h-full")}
            <div className="grid grid-rows-2 gap-0.5 h-full">
              {tile(shown[1], 1, "")}
              {tile(shown[2], 2, "")}
            </div>
          </div>
        )}
        {shown.length === 4 && (
          <div className="grid grid-cols-2 grid-rows-2 gap-0.5 aspect-square max-h-[500px]">
            {shown.map((m, i) =>
              tile(m, i, "", i === 3 && extra > 0 ? extra : undefined),
            )}
          </div>
        )}
      </div>
      {open != null && (
        <MediaLightbox
          items={media}
          index={open}
          onClose={() => setOpen(null)}
          onIndexChange={setOpen}
        />
      )}
    </>
  );
}
