import { useRef, useState } from "react";
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
  const active = viewerReaction ? reactionConfig[viewerReaction] : null;
  const isSm = size === "sm";

  const fire = (type: ReactionType) => {
    setShowPicker(false);
    setBurst(true);
    window.setTimeout(() => setBurst(false), 450);
    onReact(type);
  };

  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const heldOpen = useRef(false);
  const open = () => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    setShowPicker(true);
  };
  const close = () => {
    hideTimer.current = setTimeout(() => setShowPicker(false), 120);
  };

  const startHold = () => {
    heldOpen.current = false;
    holdTimer.current = setTimeout(() => {
      heldOpen.current = true;
      open();
    }, 300);
  };
  const cancelHold = () => {
    if (holdTimer.current) clearTimeout(holdTimer.current);
  };

  return (
    <div className="relative inline-flex" onMouseEnter={open} onMouseLeave={close}>
      {showPicker && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-popover border border-popover-border rounded-full flex gap-0.5 p-1.5 z-30 animate-in fade-in zoom-in-90 slide-in-from-bottom-2 duration-150" style={{ boxShadow: "var(--shadow-pop)" }}>
          {Object.entries(reactionConfig).map(([type, config], i) => (
            <button
              key={type}
              type="button"
              onClick={() => fire(type as ReactionType)}
              className="reaction-emoji group/emoji relative w-10 h-10 rounded-full flex items-center justify-center text-2xl leading-none origin-bottom transition-transform duration-150 hover:scale-[1.45] hover:-translate-y-2"
              style={{ animationDelay: `${i * 35}ms` }}
              title={config.label}
            >
              <span className="absolute -top-7 px-2 py-0.5 rounded-full bg-foreground text-background text-[10px] font-semibold opacity-0 group-hover/emoji:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                {config.label}
              </span>
              <span className="reaction-idle" style={{ animationDelay: `${i * 120}ms` }}>{config.emoji}</span>
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          if (heldOpen.current) {
            heldOpen.current = false;
            return;
          }
          fire(viewerReaction || ReactionType.like);
        }}
        onPointerDown={startHold}
        onPointerUp={cancelHold}
        onPointerLeave={cancelHold}
        onContextMenu={(e) => e.preventDefault()}
        className={`flex items-center gap-1.5 font-semibold press transition-colors ${
          isSm ? "text-xs" : ""
        } ${active ? active.color : "text-muted-foreground hover:text-foreground"}`}
      >
        {active ? (
          <span className={`leading-none ${burst ? "reaction-burst" : ""} ${isSm ? "text-sm" : "text-lg"}`}>{active.emoji}</span>
        ) : (
          <ThumbsUp className={isSm ? "w-3.5 h-3.5" : "w-5 h-5"} />
        )}
        <span>{active ? active.label : "Like"}</span>
        {typeof count === "number" && count > 0 && <span>· {count}</span>}
      </button>
    </div>
  );
}
