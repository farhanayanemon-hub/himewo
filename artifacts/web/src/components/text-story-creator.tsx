/**
 * TextStoryCreator
 * ─────────────────────────────────────────────────────────────────────────────
 * Full-screen text-story canvas with:
 *  - 50+ gradient backgrounds (scrollable palette)
 *  - 6 font styles with live preview
 *  - 16-colour text palette
 *  - Drag-and-drop emoji + smart sticker overlays
 *  - Text alignment (left / center / right)
 *  - Audience selector
 *  - Direct publish to story API
 */

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  X, Check, Loader2, AlignLeft, AlignCenter, AlignRight,
  Smile, Sticker, Globe, Users, Lock,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useCreateStory,
  getListStoriesQueryKey,
  StoryInputAudience,
  StoryInputStoryType,
  type StoryInput,
} from "@workspace/api-client-react";
import { STORY_BACKGROUNDS, STORY_BG_KEYS, bgDisplayName } from "@/lib/story-backgrounds";
import { SMART_STICKERS, STICKER_PACKS } from "@/lib/sticker-catalog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

type FontStyle = "modern" | "serif" | "neon" | "script" | "impact" | "typewriter";
type TextAlign = "left" | "center" | "right";
type Audience = "public" | "friends" | "private";

interface CanvasSticker {
  id: string;
  type: "emoji" | "smart";
  content: string;
  smartId?: string;
  x: number; // percent
  y: number;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const FONT_OPTIONS: { id: FontStyle; label: string; style: React.CSSProperties }[] = [
  { id: "modern",     label: "Modern",     style: { fontFamily: "'Inter', sans-serif", fontWeight: 800 } },
  { id: "serif",      label: "Classic",    style: { fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 600 } },
  { id: "neon",       label: "Neon",       style: { fontFamily: "monospace", fontWeight: 900, letterSpacing: "0.1em", textShadow: "0 0 12px currentColor" } },
  { id: "script",     label: "Script",     style: { fontFamily: "Georgia, serif", fontStyle: "italic", fontWeight: 400 } },
  { id: "impact",     label: "Impact",     style: { fontFamily: "'Arial Black', sans-serif", fontWeight: 900, textTransform: "uppercase" } },
  { id: "typewriter", label: "Type",       style: { fontFamily: "'Courier New', monospace", fontWeight: 700 } },
];

const FONT_CLASS_MAP: Record<FontStyle, string> = {
  modern:     "font-sans font-extrabold",
  serif:      "font-serif italic font-semibold",
  neon:       "font-mono font-black tracking-widest",
  script:     "font-serif italic",
  impact:     "font-black uppercase tracking-wide",
  typewriter: "font-mono font-bold",
};

const TEXT_COLORS = [
  "#ffffff", "#000000", "#facc15", "#ef4444", "#06b6d4",
  "#10b981", "#ec4899", "#a855f7", "#f97316", "#3b82f6",
  "#84cc16", "#f43f5e", "#fbbf24", "#8b5cf6", "#fb923c", "#34d399",
];

const AUDIENCE_OPTIONS: { id: Audience; icon: React.ReactNode; label: string }[] = [
  { id: "public",  icon: <Globe className="w-3.5 h-3.5" />,  label: "Public" },
  { id: "friends", icon: <Users className="w-3.5 h-3.5" />,  label: "Friends" },
  { id: "private", icon: <Lock className="w-3.5 h-3.5" />,   label: "Only Me" },
];

// Quick emoji rows
const QUICK_EMOJIS = [
  "😀","😂","🥹","😍","🤩","😎","😭","🔥","💯","⭐","✨","❤️",
  "🎉","🎊","🥳","🙌","👑","💎","🚀","🌈","🌟","💫","🎵","🎶",
  "💪","🤞","👏","🫶","🤙","🙏","💀","🤯","😱","😏","🥺","🫠",
];

// ─── Smart Sticker mini preview ────────────────────────────────────────────────

function SmartStickerPreview({ smartId }: { smartId: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  if (smartId === "smart_time") {
    return <span className="text-xs font-mono font-bold text-white">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>;
  }
  const def = SMART_STICKERS.find((s) => s.id === smartId);
  return <span className="text-2xl">{def?.icon ?? "⭐"}</span>;
}

// ─── Component ─────────────────────────────────────────────────────────────────

interface TextStoryCreatorProps {
  onClose: () => void;
  onPublished?: () => void;
}

export function TextStoryCreator({ onClose, onPublished }: TextStoryCreatorProps) {
  const qc = useQueryClient();
  const createStory = useCreateStory();

  const [text, setText] = useState("");
  const [bgKey, setBgKey] = useState<string>("sunset");
  const [fontStyle, setFontStyle] = useState<FontStyle>("modern");
  const [textColor, setTextColor] = useState<string>("#ffffff");
  const [textAlign, setTextAlign] = useState<TextAlign>("center");
  const [audience, setAudience] = useState<Audience>("public");
  const [stickers, setStickers] = useState<CanvasSticker[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [stickerDrawer, setStickerDrawer] = useState<"none" | "emoji" | "smart">("none");
  const [activePalettePage, setActivePalettePage] = useState<"vibrant" | "pastel" | "dark" | "seasonal">("vibrant");
  const [isPublishing, setIsPublishing] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  const [bg0, bg1] = STORY_BACKGROUNDS[bgKey] ?? STORY_BACKGROUNDS.sunset;

  const fontOpt = FONT_OPTIONS.find((f) => f.id === fontStyle)!;

  // Categorize backgrounds
  const PALETTE_GROUPS: Record<string, string[]> = {
    vibrant: STORY_BG_KEYS.filter((k) => ["sunset","ocean","forest","berry","night","fire","aurora","cosmic","neon_lime","mango","cotton_candy","watermelon","tropical","royal","flamingo","ice_cold","lemon_lime","grape","crimson","emerald_sea","hot_fuchsia","lavender_sky","peach","electric_blue","sunset_gold"].includes(k)),
    pastel:  STORY_BG_KEYS.filter((k) => ["soft_mint","lavender_fog","rose_dust","butter_cream","sky_blue","lilac_morning","sage_breeze","blush_pink","powder_blue","pale_gold"].includes(k)),
    dark:    STORY_BG_KEYS.filter((k) => ["oled_black","midnight_navy","dark_emerald","wine_red","royal_gold","deep_purple","charcoal","dark_teal","steel","obsidian"].includes(k)),
    seasonal:STORY_BG_KEYS.filter((k) => ["christmas","halloween","spring_blossom","summer_wave","autumn_leaves"].includes(k)),
  };

  const addEmoji = (emoji: string) => {
    setStickers((p) => [
      ...p,
      { id: `e_${Date.now()}`, type: "emoji", content: emoji, x: 35 + Math.random() * 30, y: 20 + Math.random() * 60 },
    ]);
    setStickerDrawer("none");
  };

  const addSmart = (smartId: string) => {
    const def = SMART_STICKERS.find((s) => s.id === smartId)!;
    setStickers((p) => [
      ...p,
      { id: `s_${Date.now()}`, type: "smart", content: def.label, smartId, x: 50, y: 20 + Math.random() * 60 },
    ]);
    setStickerDrawer("none");
  };

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    setStickers((p) => p.map((s) => (s.id === draggingId ? { ...s, x, y } : s)));
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setDraggingId(null);
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ok */ }
  };

  const removeSticker = (id: string) => setStickers((p) => p.filter((s) => s.id !== id));

  const handlePublish = async () => {
    if (!text.trim()) {
      toast({ title: "Please write something", variant: "destructive" });
      return;
    }
    setIsPublishing(true);
    try {
      await createStory.mutateAsync({ data: {
        storyType: StoryInputStoryType.text,
        textContent: text.trim(),
        backgroundStyle: bgKey,
        audience: audience === "public"
          ? StoryInputAudience.public
          : audience === "friends"
          ? StoryInputAudience.friends
          : StoryInputAudience.private,
      } as StoryInput });
      qc.invalidateQueries({ queryKey: getListStoriesQueryKey() });
      toast({ title: "Story published! 🎉" });
      onPublished?.();
      onClose();
    } catch {
      toast({ title: "Failed to publish story", variant: "destructive" });
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row overflow-hidden select-none">

      {/* ═══════════════════════ CANVAS PREVIEW ═══════════════════════════ */}
      <div className="flex-1 flex items-center justify-center p-4 relative">

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Story card */}
        <div
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => setStickerDrawer("none")}
          className="relative rounded-3xl overflow-hidden aspect-[9/16] h-[62vh] md:h-[82vh] max-w-xs w-full touch-none shadow-2xl flex-shrink-0"
          style={{ background: `linear-gradient(135deg, ${bg0}, ${bg1})` }}
        >
          {/* Text on canvas */}
          <div
            className="absolute inset-0 flex items-center justify-center p-6 pointer-events-none"
            style={{ textAlign }}
          >
            <textarea
              ref={textRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Tap to write your story..."
              maxLength={500}
              rows={4}
              className="w-full bg-transparent text-white resize-none outline-none placeholder:text-white/50 pointer-events-auto text-2xl leading-snug text-center"
              style={{
                ...fontOpt.style,
                color: textColor,
                textAlign,
              }}
            />
          </div>

          {/* Stickers on canvas */}
          {stickers.map((s) => (
            <div
              key={s.id}
              onPointerDown={(e) => handlePointerDown(s.id, e)}
              onDoubleClick={() => removeSticker(s.id)}
              title="Double-tap to remove"
              className="absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-20"
              style={{ left: `${s.x}%`, top: `${s.y}%` }}
            >
              {s.type === "emoji" ? (
                <span className="text-4xl select-none">{s.content}</span>
              ) : (
                <div className="bg-black/50 backdrop-blur-md rounded-2xl px-2 py-1 border border-white/20">
                  <SmartStickerPreview smartId={s.smartId ?? ""} />
                </div>
              )}
            </div>
          ))}

          {/* Audience badge */}
          <div className="absolute top-4 right-4 flex items-center gap-1 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 border border-white/20 text-white">
            {AUDIENCE_OPTIONS.find((a) => a.id === audience)?.icon}
            <span className="text-[10px] font-semibold">{AUDIENCE_OPTIONS.find((a) => a.id === audience)?.label}</span>
          </div>

          {stickers.length > 0 && (
            <p className="absolute bottom-4 left-0 right-0 text-center text-white/30 text-[9px]">Double-tap a sticker to remove</p>
          )}
        </div>
      </div>

      {/* ═══════════════════════ CONTROLS PANEL ═══════════════════════════ */}
      <div className="w-full md:w-96 bg-zinc-950 border-t md:border-t-0 md:border-l border-white/10 flex flex-col overflow-hidden max-h-[45vh] md:max-h-full text-white">

        {/* Toolbar row */}
        <div className="flex items-center gap-1 px-3 py-2.5 border-b border-white/10 flex-shrink-0 overflow-x-auto scrollbar-none">
          {/* Text align */}
          {([["left", <AlignLeft className="w-4 h-4" />], ["center", <AlignCenter className="w-4 h-4" />], ["right", <AlignRight className="w-4 h-4" />]] as const).map(([a, icon]) => (
            <button
              key={a}
              onClick={() => setTextAlign(a as TextAlign)}
              className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
                textAlign === a ? "bg-purple-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/15"
              )}
            >
              {icon}
            </button>
          ))}

          <div className="w-px h-5 bg-white/10 mx-1 flex-shrink-0" />

          {/* Emojis */}
          <button
            onClick={() => setStickerDrawer(stickerDrawer === "emoji" ? "none" : "emoji")}
            className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all text-lg",
              stickerDrawer === "emoji" ? "bg-purple-600" : "bg-white/10 hover:bg-white/15"
            )}
          >
            😊
          </button>

          {/* Smart stickers */}
          <button
            onClick={() => setStickerDrawer(stickerDrawer === "smart" ? "none" : "smart")}
            className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all",
              stickerDrawer === "smart" ? "bg-purple-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/15"
            )}
          >
            <Sticker className="w-4 h-4" />
          </button>

          <div className="flex-1" />

          {/* Audience */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            {AUDIENCE_OPTIONS.map((a) => (
              <button
                key={a.id}
                onClick={() => setAudience(a.id)}
                className={cn("h-7 px-2 rounded-lg flex items-center gap-1 text-[10px] font-semibold flex-shrink-0 transition-all",
                  audience === a.id ? "bg-purple-600 text-white" : "bg-white/10 text-white/40"
                )}
              >
                {a.icon}
                <span className="hidden sm:inline">{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Emoji / Smart sticker drawers */}
        <AnimatePresence>
          {stickerDrawer === "emoji" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-white/10 flex-shrink-0"
            >
              <div className="p-3">
                <p className="text-[10px] text-white/40 mb-2">Quick Emoji — tap to place</p>
                <div className="flex flex-wrap gap-1">
                  {QUICK_EMOJIS.map((em) => (
                    <button key={em} onClick={() => addEmoji(em)} className="text-2xl hover:scale-125 transition-transform">
                      {em}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {stickerDrawer === "smart" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-white/10 flex-shrink-0"
            >
              <div className="p-3">
                <p className="text-[10px] text-white/40 mb-2">Smart Stickers — tap to place</p>
                <div className="grid grid-cols-3 gap-1.5">
                  {SMART_STICKERS.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => addSmart(s.id)}
                      className="flex flex-col items-center gap-0.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl py-2 px-1 transition-colors"
                    >
                      <span className="text-2xl">{s.icon}</span>
                      <span className="text-[9px] text-white/60">{s.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto">

          {/* Font styles */}
          <div className="p-3 border-b border-white/10">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2">Font Style</p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {FONT_OPTIONS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFontStyle(f.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs flex-shrink-0 transition-all",
                    fontStyle === f.id ? "bg-purple-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/15"
                  )}
                  style={f.style}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Text colours */}
          <div className="p-3 border-b border-white/10">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2">Text Color</p>
            <div className="flex flex-wrap gap-2">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setTextColor(c)}
                  className={cn(
                    "w-7 h-7 rounded-full border-2 transition-transform",
                    textColor === c ? "scale-110 border-white shadow-md" : "border-transparent hover:scale-105 border-white/20"
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Background palette */}
          <div className="p-3">
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-2">Background</p>

            {/* Category tabs */}
            <div className="flex gap-1.5 mb-2">
              {(["vibrant", "pastel", "dark", "seasonal"] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActivePalettePage(cat)}
                  className={cn(
                    "text-[9px] font-bold rounded-full px-2.5 py-1 capitalize flex-shrink-0 transition-all",
                    activePalettePage === cat ? "bg-purple-600 text-white" : "bg-white/10 text-white/50 hover:bg-white/15"
                  )}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-6 gap-1.5">
              {PALETTE_GROUPS[activePalettePage]?.map((key) => {
                const [c0, c1] = STORY_BACKGROUNDS[key];
                return (
                  <button
                    key={key}
                    onClick={() => setBgKey(key)}
                    title={bgDisplayName(key)}
                    className={cn(
                      "aspect-square rounded-xl transition-all border-2",
                      bgKey === key ? "scale-110 border-white shadow-md shadow-white/20" : "border-transparent hover:scale-105"
                    )}
                    style={{ background: `linear-gradient(135deg, ${c0}, ${c1})` }}
                  />
                );
              })}
            </div>
            <p className="text-center text-white/30 text-[10px] mt-2">
              Selected: <span className="text-purple-400 font-semibold">{bgDisplayName(bgKey)}</span>
            </p>
          </div>

        </div>

        {/* Character count + publish */}
        <div className="p-4 border-t border-white/10 flex-shrink-0 space-y-2">
          <div className="flex justify-between text-[10px] text-white/30">
            <span>{text.length}/500 characters</span>
            <span>{stickers.length > 0 ? `${stickers.length} sticker${stickers.length > 1 ? "s" : ""} added` : ""}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/70 font-semibold text-sm hover:bg-white/15 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handlePublish}
              disabled={isPublishing || !text.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-bold text-sm shadow-lg shadow-purple-600/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-1.5"
            >
              {isPublishing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Share Story
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
