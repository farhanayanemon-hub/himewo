import { useState } from "react";
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
  const active = viewerReaction ? reactionConfig[viewerReaction] : null;
  const isSm = size === "sm";

  return (
    <div
      className="relative inline-flex"
      onMouseEnter={() => setShowPicker(true)}
      onMouseLeave={() => setShowPicker(false)}
    >
      {showPicker && (
        <div className="absolute -top-12 left-0 bg-card border border-border rounded-full shadow-lg flex gap-1 p-1 animate-in slide-in-from-bottom-2 z-20">
          {Object.entries(reactionConfig).map(([type, config]) => (
            <button
              key={type}
              type="button"
              onClick={() => {
                setShowPicker(false);
                onReact(type as ReactionType);
              }}
              className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center hover:scale-125 transition-transform text-xl leading-none"
              title={config.label}
            >
              {config.emoji}
            </button>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={() => onReact(viewerReaction || ReactionType.like)}
        className={`flex items-center gap-1 font-medium hover:underline ${
          isSm ? "text-xs" : ""
        } ${active ? active.color : "text-muted-foreground"}`}
      >
        {active ? (
          <span className="leading-none">{active.emoji}</span>
        ) : (
          <ThumbsUp className={isSm ? "w-3.5 h-3.5" : "w-5 h-5"} />
        )}
        <span>{active ? active.label : "Like"}</span>
        {typeof count === "number" && count > 0 && <span>· {count}</span>}
      </button>
    </div>
  );
}
