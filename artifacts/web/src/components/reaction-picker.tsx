import { useEffect, useRef, useState } from "react";
import { ThumbsUp } from "lucide-react";
import { ReactionType } from "@workspace/api-client-react";

export const reactionConfig: Record<ReactionType, { emoji: string; color: string; label: string }> = {
  [ReactionType.like]: { emoji: "👍", color: "text-blue-500", label: "Like" },
  [ReactionType.love]: { emoji: "❤️", color: "text-red-500", label: "Love" },
  [ReactionType.care]: { emoji: "🥰", color: "text-yellow-500", label: "Care" },
  [ReactionType.haha]: { emoji: "😆", color: "text-yellow-500", label: "Haha" },
  [ReactionType.wow]: { emoji: "😮", color: "text-yellow-500", label: "Wow" },
  [ReactionType.sad]: { emoji: "😢", color: "text-yellow-500", label: "Sad" },
  [ReactionType.angry]: { emoji: "😡", color: "text-orange-600", label: "Angry" },
};

interface ReactionControlProps {
  viewerReaction?: ReactionType | null;
  onReact: (type: ReactionType) => void;
  count?: number;
  size?: "default" | "sm";
}

export function ReactionControl({ viewerReaction, onReact, count, size = "default" }: ReactionControlProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [burst, setBurst] = useState(false);
  const [floatEmoji, setFloatEmoji] = useState<string | null>(null);
  const active = viewerReaction ? reactionConfig[viewerReaction] : null;
  const isSm = size === "sm";

  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const burstTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const floatTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Long-press (press-and-hold) support for touch devices, which have no hover.
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFired = useRef(false);
  const pressStart = useRef<{ x: number; y: number } | null>(null);

  const fire = (type: ReactionType) => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowPicker(false);
    setBurst(true);
    setFloatEmoji(reactionConfig[type].emoji);
    if (burstTimer.current) clearTimeout(burstTimer.current);
    if (floatTimer.current) clearTimeout(floatTimer.current);
    burstTimer.current = setTimeout(() => setBurst(false), 500);
    floatTimer.current = setTimeout(() => setFloatEmoji(null), 700);
    onReact(type);
  };

  const open = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowPicker(true);
  };
  const close = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setShowPicker(false), 220);
  };

  const cancelLongPress = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    pressStart.current = null;
  };

  const startLongPress = (e: React.PointerEvent) => {
    longPressFired.current = false;
    pressStart.current = { x: e.clientX, y: e.clientY };
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => {
      longPressFired.current = true;
      open();
    }, 450);
  };

  // If the finger/pointer moves too far (i.e. the user is scrolling), abort the
  // long-press so scrolling never accidentally opens the picker.
  const onPressMove = (e: React.PointerEvent) => {
    if (!pressStart.current) return;
    const dx = Math.abs(e.clientX - pressStart.current.x);
    const dy = Math.abs(e.clientY - pressStart.current.y);
    if (dx > 10 || dy > 10) cancelLongPress();
  };

  // Close the picker when tapping/clicking anywhere outside of it (needed on
  // touch, where there is no mouseleave to dismiss it).
  useEffect(() => {
    if (!showPicker) return;
    const onDocPointerDown = (e: PointerEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [showPicker]);

  useEffect(
    () => () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
      if (burstTimer.current) clearTimeout(burstTimer.current);
      if (floatTimer.current) clearTimeout(floatTimer.current);
      if (longPressTimer.current) clearTimeout(longPressTimer.current);
    },
    [],
  );

  return (
    <div ref={containerRef} className="relative inline-flex" onMouseEnter={open} onMouseLeave={close}>
      {showPicker && (
        // Wrapper spans down to the button (pb-3) so there is NO empty gap between
        // the button and the pill — keeps hover continuous and clicks reliable.
        // Anchored to the button's left edge (not centered) so the pill never
        // spills off-screen when the Like button sits near the screen edge.
        <div
          className="absolute bottom-full left-0 pb-3 z-40"
          onMouseEnter={open}
          onMouseLeave={close}
        >
          <div
            className="reaction-bar flex items-end gap-1 rounded-full border border-popover-border bg-popover px-2 py-1.5"
            style={{ boxShadow: "var(--shadow-pop)" }}
          >
            {Object.entries(reactionConfig).map(([type, config], i) => (
              <button
                key={type}
                type="button"
                // Fire on pointer-down so the reaction registers instantly, before any
                // hover-close race can remove the picker. preventDefault avoids focus jump.
                onPointerDown={(e) => {
                  e.preventDefault();
                  fire(type as ReactionType);
                }}
                className="reaction-emoji group/emoji relative flex h-9 w-9 items-center justify-center rounded-full text-[26px] leading-none origin-bottom transition-transform duration-200 hover:scale-[1.5] hover:-translate-y-3"
                style={{ animationDelay: `${i * 40}ms` }}
                title={config.label}
                aria-label={config.label}
              >
                <span className="pointer-events-none absolute -top-8 whitespace-nowrap rounded-full bg-foreground px-2 py-0.5 text-[11px] font-semibold text-background opacity-0 scale-90 transition-all duration-150 group-hover/emoji:opacity-100 group-hover/emoji:scale-100">
                  {config.label}
                </span>
                <span className="reaction-idle inline-block">{config.emoji}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <button
        type="button"
        // Quick tap toggles Like as before; press-and-hold opens the picker on touch.
        onPointerDown={startLongPress}
        onPointerMove={onPressMove}
        onPointerUp={cancelLongPress}
        onPointerLeave={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onContextMenu={(e) => {
          // Suppress the native long-press context menu / text callout on mobile.
          if (showPicker || longPressFired.current) e.preventDefault();
        }}
        onClick={() => {
          // A long-press already opened the picker — swallow the trailing click so
          // it doesn't also toggle Like.
          if (longPressFired.current) {
            longPressFired.current = false;
            return;
          }
          fire(viewerReaction || ReactionType.like);
        }}
        className={`reaction-like-btn relative flex items-center gap-1.5 font-semibold press transition-colors ${
          isSm ? "text-xs" : ""
        } ${active ? active.color : "text-muted-foreground hover:text-foreground"}`}
      >
        {floatEmoji && (
          <span className="reaction-float pointer-events-none absolute left-0 -top-1 text-xl">
            {floatEmoji}
          </span>
        )}
        {active ? (
          <span className={`leading-none ${burst ? "reaction-burst" : ""} ${isSm ? "text-sm" : "text-lg"}`}>
            {active.emoji}
          </span>
        ) : (
          <ThumbsUp className={isSm ? "w-3.5 h-3.5" : "w-5 h-5"} />
        )}
        <span>{active ? active.label : "Like"}</span>
        {typeof count === "number" && count > 0 && <span>· {count}</span>}
      </button>
    </div>
  );
}
