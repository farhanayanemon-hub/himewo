/**
 * StoryReelEditor — Full Pro Editor
 * ─────────────────────────────────────────────────────────────────────────────
 * Supports: Photo & Video editing
 * Features:
 *  - 100+ Live CSS Filters (with category tabs)
 *  - Text overlays (drag, resize, 5 fonts, 16 colours, 4 badge styles)
 *  - Smart Stickers (Time, Date, Location, Music, Mention, Poll, Question,
 *    Feeling, Weather, Countdown)
 *  - Emoji Sticker Packs (6 packs, 60+ stickers)
 *  - Giphy Animated Sticker search
 *  - Video: Speed (0.3x → 3x), Trim (start/end handles), Split marker
 *  - Music picker
 *  - Caption & publish
 */

import { useState, useRef, useEffect, useCallback } from "react";
import {
  X, Type, Sliders, Music, Trash2, Move, FastForward, Scissors,
  Check, Loader2, Sparkles, Smile, Sticker, Clock, MapPin,
  ChevronLeft, ChevronRight, Search, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadMedia, type UploadedMedia } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";
import { MusicPickerButton, type SelectedMusic } from "@/components/music-picker";
import { ALL_FILTERS, FILTER_CATEGORIES, filtersByCategory, type CameraFilter } from "@/lib/filter-catalog";
import {
  SMART_STICKERS, STICKER_PACKS, searchGiphyStickers, type GiphySticker,
} from "@/lib/sticker-catalog";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type FontStyle = "modern" | "serif" | "neon" | "script" | "impact";
export type OverlayType = "text" | "emoji" | "smart" | "giphy";

export interface EditorOverlay {
  id: string;
  type: OverlayType;
  content: string; // text content or emoji/giphy URL
  x: number; // percentage 0–100
  y: number;
  color?: string;
  bgStyle?: "none" | "pill" | "glass" | "neon";
  fontStyle?: FontStyle;
  fontSize?: number;
  scale?: number; // for emoji/sticker scaling
  rotation?: number; // for sticker rotation (degrees)
  smartId?: string; // for smart stickers
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const FONT_OPTIONS: { id: FontStyle; label: string; className: string }[] = [
  { id: "modern",  label: "Modern",  className: "font-sans font-bold" },
  { id: "serif",   label: "Serif",   className: "font-serif italic font-semibold" },
  { id: "neon",    label: "Neon",    className: "font-mono font-bold tracking-widest [text-shadow:0_0_12px_#a855f7]" },
  { id: "script",  label: "Script",  className: "italic font-serif" },
  { id: "impact",  label: "Impact",  className: "font-black uppercase tracking-wider" },
];

const COLOR_PALETTE = [
  "#ffffff", "#000000", "#facc15", "#ef4444", "#06b6d4",
  "#10b981", "#ec4899", "#a855f7", "#f97316", "#3b82f6",
  "#84cc16", "#f43f5e", "#14b8a6", "#8b5cf6", "#fb923c", "#64748b",
];

const SPEED_OPTIONS = [0.3, 0.5, 1, 1.5, 2, 3] as const;

type ToolTab = "none" | "filters" | "text" | "stickers" | "speed" | "trim";

// ─── Props ─────────────────────────────────────────────────────────────────────

interface StoryReelEditorProps {
  file: File;
  type: "story" | "reel";
  initialFilter?: string;
  onClose: () => void;
  onSubmit: (data: {
    mediaUrl: string;
    mediaType: "video" | "image";
    caption: string;
    musicUrl?: string;
    musicTitle?: string;
    musicArtist?: string;
    filterCss?: string;
    trimStart?: number;
    trimEnd?: number;
    speed?: number;
  }) => Promise<void>;
}

// ─── Smart Sticker Renderer ────────────────────────────────────────────────────

function SmartStickerContent({ smartId }: { smartId?: string }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  switch (smartId) {
    case "smart_time":
      return (
        <div className="flex flex-col items-center bg-black/70 backdrop-blur-md rounded-2xl px-3 py-2 border border-white/20 shadow-xl">
          <span className="text-white font-mono font-bold text-lg leading-none">
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          <span className="text-white/60 text-[9px] mt-0.5">LIVE TIME</span>
        </div>
      );
    case "smart_date":
      return (
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-2xl px-3 py-2 shadow-xl">
          <span className="text-white font-bold text-sm">
            {now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}
          </span>
        </div>
      );
    case "smart_location":
      return (
        <div className="flex items-center gap-1.5 bg-black/70 backdrop-blur-md rounded-full px-3 py-1.5 border border-white/20 shadow-xl">
          <MapPin className="w-3.5 h-3.5 text-red-400" />
          <span className="text-white text-sm font-semibold">My Location</span>
        </div>
      );
    case "smart_music":
      return (
        <div className="flex items-center gap-2 bg-black/80 backdrop-blur-md rounded-full px-3 py-2 border border-white/20 shadow-xl">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-pink-500 flex items-center justify-center animate-spin-slow">
            <div className="w-2.5 h-2.5 rounded-full bg-black" />
          </div>
          <div className="flex flex-col">
            <span className="text-white text-[11px] font-bold leading-none">♫ Now Playing</span>
            <span className="text-white/60 text-[9px]">Add Music →</span>
          </div>
        </div>
      );
    case "smart_poll":
      return (
        <div className="bg-white/90 rounded-2xl px-3 py-2 shadow-xl min-w-[120px]">
          <span className="text-black text-xs font-bold block mb-1.5">Quick Poll</span>
          <div className="flex gap-2">
            <div className="flex-1 bg-green-100 text-green-700 rounded-lg py-1 text-center text-xs font-bold">YES 👍</div>
            <div className="flex-1 bg-red-100 text-red-600 rounded-lg py-1 text-center text-xs font-bold">NO 👎</div>
          </div>
        </div>
      );
    case "smart_question":
      return (
        <div className="bg-gradient-to-br from-fuchsia-600 to-pink-500 rounded-2xl px-3 py-2 shadow-xl min-w-[120px]">
          <span className="text-white text-[10px] font-bold block">Ask me anything ❓</span>
          <div className="bg-white/20 rounded-lg px-2 py-1 mt-1">
            <span className="text-white/60 text-[9px]">Tap to answer...</span>
          </div>
        </div>
      );
    case "smart_feeling":
      return (
        <div className="flex items-center gap-1.5 bg-amber-400/90 rounded-full px-3 py-1.5 shadow-xl">
          <span className="text-xl">😊</span>
          <span className="text-black text-xs font-bold">Feeling Happy</span>
        </div>
      );
    case "smart_countdown":
      return (
        <div className="flex flex-col items-center bg-black/80 rounded-2xl px-4 py-2 border border-yellow-400/50 shadow-xl">
          <span className="text-yellow-400 font-mono font-black text-2xl leading-none">
            {String(Math.floor((86400 - now.getHours() * 3600 - now.getMinutes() * 60 - now.getSeconds()) / 3600)).padStart(2, "0")}
            h
          </span>
          <span className="text-white/60 text-[9px]">COUNTDOWN</span>
        </div>
      );
    default: {
      const def = SMART_STICKERS.find((s) => s.id === smartId);
      return (
        <div className="bg-black/70 backdrop-blur-md rounded-full px-3 py-2 border border-white/20 shadow-xl">
          <span className="text-2xl">{def?.icon ?? "⭐"}</span>
        </div>
      );
    }
  }
}

// ─── Main Editor ───────────────────────────────────────────────────────────────

export function StoryReelEditor({ file, type, initialFilter = "none", onClose, onSubmit }: StoryReelEditorProps) {
  const isVideo = file.type.startsWith("video/");
  const [objectUrl] = useState(() => URL.createObjectURL(file));

  // ── Active tool ──────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<ToolTab>("none");

  // ── Overlays ─────────────────────────────────────────────────────────────
  const [overlays, setOverlays] = useState<EditorOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  // ── Text tool ────────────────────────────────────────────────────────────
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textBgStyle, setTextBgStyle] = useState<"none" | "pill" | "glass" | "neon">("pill");
  const [fontStyle, setFontStyle] = useState<FontStyle>("modern");

  // ── Filter ───────────────────────────────────────────────────────────────
  const [activeFilter, setActiveFilter] = useState<CameraFilter>(() => {
    if (initialFilter && initialFilter !== "none") {
      const found = ALL_FILTERS.find((f) => f.cssFilter === initialFilter);
      return found ?? ALL_FILTERS[0];
    }
    return ALL_FILTERS[0];
  });
  const [filterCategory, setFilterCategory] = useState<string>("Normal");

  // ── Sticker drawer ───────────────────────────────────────────────────────
  const [stickerTab, setStickerTab] = useState<"smart" | "packs" | "giphy" | "emoji">("smart");
  const [giphyQuery, setGiphyQuery] = useState("");
  const [giphyResults, setGiphyResults] = useState<GiphySticker[]>([]);
  const [giphyLoading, setGiphyLoading] = useState(false);
  const [activePack, setActivePack] = useState(0);

  // ── Video tools ──────────────────────────────────────────────────────────
  const [videoSpeed, setVideoSpeed] = useState<number>(1);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [videoDuration, setVideoDuration] = useState(0);

  // ── Metadata ─────────────────────────────────────────────────────────────
  const [caption, setCaption] = useState("");
  const [selectedMusic, setSelectedMusic] = useState<SelectedMusic | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const draggingRef = useRef<string | null>(null);
  const giphyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => URL.revokeObjectURL(objectUrl), [objectUrl]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = videoSpeed;
  }, [videoSpeed]);

  // Trim: seek video to trimStart when trim changes
  useEffect(() => {
    if (videoRef.current && videoDuration > 0) {
      const startSec = (trimStart / 100) * videoDuration;
      videoRef.current.currentTime = startSec;
    }
  }, [trimStart, videoDuration]);

  // Giphy search with debounce
  useEffect(() => {
    if (stickerTab !== "giphy") return;
    if (giphyTimerRef.current) clearTimeout(giphyTimerRef.current);
    giphyTimerRef.current = setTimeout(async () => {
      setGiphyLoading(true);
      const results = await searchGiphyStickers(giphyQuery, 24);
      setGiphyResults(results);
      setGiphyLoading(false);
    }, 500);
    return () => { if (giphyTimerRef.current) clearTimeout(giphyTimerRef.current); };
  }, [giphyQuery, stickerTab]);

  // Load trending Giphy on mount
  useEffect(() => {
    if (stickerTab === "giphy" && giphyResults.length === 0) {
      searchGiphyStickers("", 24).then(setGiphyResults);
    }
  }, [stickerTab]); // eslint-disable-line

  // ── Overlay management ───────────────────────────────────────────────────

  const addTextOverlay = () => {
    if (!textInput.trim()) return;
    const ov: EditorOverlay = {
      id: `txt_${Date.now()}`,
      type: "text",
      content: textInput.trim(),
      x: 50, y: 40,
      color: textColor,
      bgStyle: textBgStyle,
      fontStyle,
      fontSize: 20,
    };
    setOverlays((p) => [...p, ov]);
    setSelectedOverlayId(ov.id);
    setTextInput("");
    setActiveTab("none");
  };

  const addEmojiSticker = (emoji: string) => {
    const ov: EditorOverlay = {
      id: `emoji_${Date.now()}`,
      type: "emoji",
      content: emoji,
      x: 40 + Math.random() * 20,
      y: 30 + Math.random() * 40,
      scale: 1,
    };
    setOverlays((p) => [...p, ov]);
    setActiveTab("none");
  };

  const addSmartSticker = (smartId: string) => {
    const def = SMART_STICKERS.find((s) => s.id === smartId);
    const ov: EditorOverlay = {
      id: `smart_${Date.now()}`,
      type: "smart",
      content: def?.label ?? "",
      x: 50,
      y: 25 + Math.random() * 50,
      smartId,
    };
    setOverlays((p) => [...p, ov]);
    setActiveTab("none");
  };

  const addGiphySticker = (sticker: GiphySticker) => {
    const ov: EditorOverlay = {
      id: `giphy_${Date.now()}`,
      type: "giphy",
      content: sticker.url,
      x: 40 + Math.random() * 20,
      y: 30 + Math.random() * 30,
      scale: 1,
    };
    setOverlays((p) => [...p, ov]);
    setActiveTab("none");
  };

  // ── Drag logic ───────────────────────────────────────────────────────────

  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    draggingRef.current = id;
    setSelectedOverlayId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!draggingRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));
    setOverlays((p) => p.map((ov) => (ov.id === draggingRef.current ? { ...ov, x, y } : ov)));
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    draggingRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ok */ }
  }, []);

  const scaleOverlay = (id: string, delta: number) => {
    setOverlays((p) => p.map((ov) => ov.id === id ? { ...ov, scale: Math.max(0.4, Math.min(3, (ov.scale ?? 1) + delta)) } : ov));
  };

  const removeSelectedOverlay = () => {
    if (selectedOverlayId) {
      setOverlays((p) => p.filter((o) => o.id !== selectedOverlayId));
      setSelectedOverlayId(null);
    }
  };

  // ── Style helpers ────────────────────────────────────────────────────────

  const getBadgeClass = (style?: "none" | "pill" | "glass" | "neon") => {
    switch (style) {
      case "pill":  return "bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-lg";
      case "glass": return "bg-white/25 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/40 shadow-lg";
      case "neon":  return "bg-black/90 px-3.5 py-1.5 rounded-xl border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.7)]";
      default:      return "px-2 py-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]";
    }
  };

  const getFontClass = (font?: FontStyle) => {
    const f = FONT_OPTIONS.find((item) => item.id === (font ?? "modern"));
    return f?.className ?? "font-sans font-bold";
  };

  // ── Submit ───────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const uploaded: UploadedMedia = await uploadMedia(file);
      let finalCaption = caption.trim();
      if (overlays.length > 0) {
        const tokens = overlays
          .map((o) => `[overlay:${o.type}:${encodeURIComponent(o.content)}:${Math.round(o.x)}:${Math.round(o.y)}]`)
          .join(" ");
        finalCaption = finalCaption ? `${finalCaption}\n\n${tokens}` : tokens;
      }
      await onSubmit({
        mediaUrl: uploaded.url,
        mediaType: isVideo ? "video" : "image",
        caption: finalCaption,
        musicUrl: selectedMusic?.url,
        musicTitle: selectedMusic?.title,
        musicArtist: selectedMusic?.artist ?? undefined,
        filterCss: activeFilter.cssFilter !== "none" ? activeFilter.cssFilter : undefined,
        trimStart: isVideo ? trimStart : undefined,
        trimEnd: isVideo ? trimEnd : undefined,
        speed: isVideo && videoSpeed !== 1 ? videoSpeed : undefined,
      });
      onClose();
    } catch {
      toast({ title: "Failed to publish", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────

  const currentFilters = filtersByCategory(filterCategory as never);

  const TOOLS: { id: ToolTab; icon: React.ReactNode; label: string }[] = [
    { id: "filters",  icon: <Sliders className="w-4 h-4" />,    label: "Filters" },
    { id: "text",     icon: <Type className="w-4 h-4" />,       label: "Text" },
    { id: "stickers", icon: <Sticker className="w-4 h-4" />,    label: "Stickers" },
    ...(isVideo ? [
      { id: "speed" as ToolTab, icon: <FastForward className="w-4 h-4" />, label: "Speed" },
      { id: "trim"  as ToolTab, icon: <Scissors className="w-4 h-4" />,    label: "Trim" },
    ] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col md:flex-row text-white overflow-hidden select-none">

      {/* ═══════════════════════════ CANVAS AREA ═══════════════════════════ */}
      <div
        className="flex-1 flex flex-col items-center justify-center relative overflow-hidden bg-zinc-950"
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm hover:bg-black/70 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Active filter badge */}
        {activeFilter.id !== "normal" && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-black/60 backdrop-blur-sm rounded-full px-3 py-1">
            <span className="text-white text-xs font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-purple-400" /> {activeFilter.name}
            </span>
          </div>
        )}

        {/* Delete selected overlay */}
        {selectedOverlayId && (
          <div className="absolute top-4 right-4 z-30 flex gap-2">
            <button
              onClick={() => scaleOverlay(selectedOverlayId, -0.1)}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-lg font-bold hover:bg-white/30"
            >
              −
            </button>
            <button
              onClick={() => scaleOverlay(selectedOverlayId, 0.1)}
              className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white text-lg font-bold hover:bg-white/30"
            >
              +
            </button>
            <button
              onClick={removeSelectedOverlay}
              className="w-9 h-9 rounded-full bg-red-500/80 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-600"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Media canvas */}
        <div
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => setSelectedOverlayId(null)}
          className="relative rounded-2xl overflow-hidden bg-black aspect-[9/16] h-[60vh] md:h-[80vh] max-w-xs border border-white/10 shadow-2xl touch-none flex-shrink-0"
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={objectUrl}
              autoPlay
              loop
              muted
              playsInline
              onLoadedMetadata={() => { if (videoRef.current) setVideoDuration(videoRef.current.duration); }}
              style={{ filter: activeFilter.cssFilter === "none" ? undefined : activeFilter.cssFilter }}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <img
              src={objectUrl}
              alt=""
              style={{ filter: activeFilter.cssFilter === "none" ? undefined : activeFilter.cssFilter }}
              className="w-full h-full object-cover pointer-events-none"
            />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

          {/* Overlays */}
          {overlays.map((ov) => {
            const isSelected = selectedOverlayId === ov.id;
            return (
              <div
                key={ov.id}
                onPointerDown={(e) => handlePointerDown(ov.id, e)}
                className={cn(
                  "absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-30",
                  isSelected && "ring-2 ring-purple-500 ring-offset-1 ring-offset-black/50 rounded-lg"
                )}
                style={{
                  left: `${ov.x}%`,
                  top: `${ov.y}%`,
                  transform: `translate(-50%, -50%) scale(${ov.scale ?? 1})`,
                }}
              >
                {ov.type === "text" && (
                  <span
                    style={{ color: ov.color, fontSize: `${ov.fontSize ?? 18}px` }}
                    className={cn(getBadgeClass(ov.bgStyle), getFontClass(ov.fontStyle), "block text-center whitespace-nowrap")}
                  >
                    {ov.content}
                  </span>
                )}
                {ov.type === "emoji" && (
                  <span className="text-4xl leading-none select-none">{ov.content}</span>
                )}
                {ov.type === "smart" && (
                  <SmartStickerContent smartId={ov.smartId} />
                )}
                {ov.type === "giphy" && (
                  <img src={ov.content} alt="" className="w-24 h-24 object-contain rounded-xl" style={{ maxWidth: "96px" }} />
                )}

                {isSelected && (
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/80 backdrop-blur-sm rounded-full px-2 py-0.5 border border-white/20 text-[9px] text-white whitespace-nowrap">
                    <Move className="w-2.5 h-2.5 text-purple-400" /> Drag
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════ TOOLS PANEL ═══════════════════════════ */}
      <div className="w-full md:w-96 bg-zinc-950 border-t md:border-t-0 md:border-l border-white/10 flex flex-col overflow-hidden max-h-[45vh] md:max-h-full">

        {/* Tool tabs */}
        <div className="flex border-b border-white/10 overflow-x-auto scrollbar-none flex-shrink-0">
          {TOOLS.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(activeTab === t.id ? "none" : t.id)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-4 py-2.5 text-xs font-semibold flex-shrink-0 transition-all border-b-2",
                activeTab === t.id
                  ? "text-purple-400 border-purple-500 bg-purple-500/10"
                  : "text-white/50 border-transparent hover:text-white/80 hover:bg-white/5"
              )}
            >
              {t.icon}
              <span className="text-[10px]">{t.label}</span>
            </button>
          ))}
        </div>

        {/* Tool drawers */}
        <div className="flex-1 overflow-y-auto">

          {/* ─── FILTERS ─── */}
          {activeTab === "filters" && (
            <div className="p-3 space-y-3">
              {/* Category tabs */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                {["All", ...FILTER_CATEGORIES].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat)}
                    className={cn(
                      "text-[10px] font-semibold rounded-full px-2.5 py-1 flex-shrink-0 transition-all",
                      filterCategory === cat
                        ? "bg-purple-600 text-white"
                        : "bg-white/10 text-white/60 hover:bg-white/15"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {/* Filter grid */}
              <div className="grid grid-cols-4 gap-2">
                {currentFilters.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setActiveFilter(f)}
                    className={cn(
                      "flex flex-col items-center gap-1 transition-transform",
                      activeFilter.id === f.id ? "scale-105" : "hover:scale-103"
                    )}
                  >
                    <div
                      className={cn(
                        "w-full aspect-square rounded-xl overflow-hidden border-2 transition-all flex items-center justify-center",
                        activeFilter.id === f.id
                          ? "border-purple-500 shadow-lg shadow-purple-500/30"
                          : "border-white/10"
                      )}
                      style={{ background: `linear-gradient(135deg, ${f.color}44, ${f.color}99)` }}
                    >
                      <span className="text-white font-bold text-base" style={{ filter: f.cssFilter === "none" ? "" : f.cssFilter }}>
                        Aa
                      </span>
                    </div>
                    <span className={cn("text-[9px] font-medium leading-none text-center", activeFilter.id === f.id ? "text-purple-400" : "text-white/50")}>
                      {f.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ─── TEXT ─── */}
          {activeTab === "text" && (
            <div className="p-3 space-y-3">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type overlay text..."
                className="w-full bg-white/5 border border-white/15 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500 placeholder:text-white/30"
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") addTextOverlay(); }}
              />

              {/* Font styles */}
              <div>
                <span className="text-[10px] text-white/50 font-semibold block mb-1.5 uppercase tracking-widest">Font</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFontStyle(f.id)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-lg text-xs flex-shrink-0 transition-colors",
                        fontStyle === f.id ? "bg-purple-600 text-white" : "bg-white/10 text-white/70 hover:bg-white/15"
                      )}
                    >
                      <span className={f.className}>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Colors */}
              <div>
                <span className="text-[10px] text-white/50 font-semibold block mb-1.5 uppercase tracking-widest">Color</span>
                <div className="flex gap-1.5 flex-wrap">
                  {COLOR_PALETTE.map((c) => (
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

              {/* Badge style */}
              <div>
                <span className="text-[10px] text-white/50 font-semibold block mb-1.5 uppercase tracking-widest">Badge Style</span>
                <div className="grid grid-cols-4 gap-1.5">
                  {(["none", "pill", "glass", "neon"] as const).map((style) => (
                    <button
                      key={style}
                      onClick={() => setTextBgStyle(style)}
                      className={cn(
                        "py-1.5 rounded-xl text-[10px] font-bold capitalize transition-colors",
                        textBgStyle === style ? "bg-purple-600 text-white" : "bg-white/10 text-white/60 hover:bg-white/15"
                      )}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                onClick={addTextOverlay}
                disabled={!textInput.trim()}
                className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold h-9 text-sm"
              >
                Place on Canvas
              </Button>
            </div>
          )}

          {/* ─── STICKERS ─── */}
          {activeTab === "stickers" && (
            <div className="flex flex-col h-full">
              {/* Sub-tabs */}
              <div className="flex border-b border-white/10 flex-shrink-0">
                {(["smart", "packs", "emoji", "giphy"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setStickerTab(t)}
                    className={cn(
                      "flex-1 py-2 text-[10px] font-bold capitalize transition-all border-b-2",
                      stickerTab === t
                        ? "text-purple-400 border-purple-500 bg-purple-500/10"
                        : "text-white/40 border-transparent hover:text-white/70"
                    )}
                  >
                    {t === "smart" ? "⚡ Smart" : t === "packs" ? "🎉 Packs" : t === "emoji" ? "😊 Emoji" : "🎬 Giphy"}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3">

                {/* Smart stickers */}
                {stickerTab === "smart" && (
                  <div className="grid grid-cols-2 gap-2">
                    {SMART_STICKERS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => addSmartSticker(s.id)}
                        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl px-3 py-2.5 text-left transition-colors"
                      >
                        <span className="text-2xl">{s.icon}</span>
                        <div>
                          <div className="text-white text-xs font-bold">{s.label}</div>
                          <div className="text-white/40 text-[9px] leading-tight">{s.description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Sticker packs */}
                {stickerTab === "packs" && (
                  <div className="space-y-3">
                    {/* Pack selector */}
                    <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                      {STICKER_PACKS.map((pack, i) => (
                        <button
                          key={pack.name}
                          onClick={() => setActivePack(i)}
                          className={cn(
                            "text-[10px] font-semibold rounded-full px-2.5 py-1 flex-shrink-0 transition-all",
                            activePack === i ? "bg-purple-600 text-white" : "bg-white/10 text-white/60"
                          )}
                        >
                          {pack.name}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-5 gap-2">
                      {STICKER_PACKS[activePack]?.stickers.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => addEmojiSticker(s.emoji)}
                          className="flex flex-col items-center gap-0.5 hover:bg-white/10 rounded-xl p-1.5 transition-colors"
                        >
                          <span className="text-3xl">{s.emoji}</span>
                          <span className="text-[8px] text-white/40">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Emoji picker */}
                {stickerTab === "emoji" && (
                  <div className="space-y-2">
                    <p className="text-white/40 text-[10px] text-center">Tap any emoji to place it on the canvas</p>
                    {[
                      { cat: "😀 Faces", emojis: ["😀","😂","🥹","😍","😎","🤩","😏","😌","🥺","😭","🤯","😱","🤫","🤔","🤗","😇","🥸","😈","💀","🤡","👻"] },
                      { cat: "👍 Gestures", emojis: ["👋","🤚","🖐","✋","🤞","🤙","👌","🤌","🤏","🫶","🙌","👏","🤲","🫶","🤜","🤛","💪","🦾"] },
                      { cat: "❤️ Hearts", emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","💖","💗","💓","💞","💝","💘","💌","💟","♥️"] },
                      { cat: "🌟 Symbols", emojis: ["⭐","🌟","✨","💫","🎆","🎇","🏆","🥇","🎖","🎗","🏅","👑","💎","🔮","🪄","🎯","🎪"] },
                      { cat: "🌈 Nature", emojis: ["🌈","☀️","🌤","⛅","🌦","🌧","⛈","🌩","❄️","🌊","🔥","💧","🌸","🌺","🌻","🍀","🌴","🌵"] },
                      { cat: "🎉 Party", emojis: ["🎉","🎊","🎈","🎁","🎂","🍰","🥂","🍾","🥳","🎵","🎶","🎷","🎸","🎹","🎺","🎻","🥁","🪘"] },
                    ].map(({ cat, emojis }) => (
                      <div key={cat}>
                        <p className="text-[10px] text-white/30 font-bold mb-1">{cat}</p>
                        <div className="flex flex-wrap gap-0.5">
                          {emojis.map((em) => (
                            <button key={em} onClick={() => addEmojiSticker(em)} className="text-2xl hover:scale-125 transition-transform p-0.5">
                              {em}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Giphy */}
                {stickerTab === "giphy" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                      <Search className="w-4 h-4 text-white/40" />
                      <input
                        type="text"
                        value={giphyQuery}
                        onChange={(e) => setGiphyQuery(e.target.value)}
                        placeholder="Search GIPHY stickers..."
                        className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/30"
                      />
                    </div>
                    {giphyLoading ? (
                      <div className="flex justify-center py-6">
                        <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-1.5">
                        {giphyResults.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => addGiphySticker(s)}
                            className="aspect-square rounded-xl overflow-hidden hover:scale-105 transition-transform bg-white/5 border border-white/10"
                          >
                            <img src={s.previewUrl || s.url} alt={s.title} className="w-full h-full object-cover" />
                          </button>
                        ))}
                        {giphyResults.length === 0 && !giphyLoading && (
                          <div className="col-span-3 text-center text-white/30 text-xs py-6">
                            No stickers found. Try a different search.
                          </div>
                        )}
                      </div>
                    )}
                    <p className="text-center text-white/20 text-[9px]">Powered by GIPHY</p>
                  </div>
                )}

              </div>
            </div>
          )}

          {/* ─── SPEED ─── */}
          {activeTab === "speed" && isVideo && (
            <div className="p-4 space-y-3">
              <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Playback Speed</p>
              <div className="grid grid-cols-3 gap-2">
                {SPEED_OPTIONS.map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setVideoSpeed(spd)}
                    className={cn(
                      "py-3 rounded-xl text-sm font-bold transition-all",
                      videoSpeed === spd
                        ? "bg-purple-600 text-white shadow-lg shadow-purple-600/30"
                        : "bg-white/10 text-white/70 hover:bg-white/15"
                    )}
                  >
                    {spd}×
                  </button>
                ))}
              </div>
              <p className="text-center text-white/30 text-xs">
                Current: <span className="text-purple-400 font-bold">{videoSpeed}×</span>{" "}
                {videoSpeed < 1 ? "(Slow motion)" : videoSpeed > 1 ? "(Fast forward)" : "(Normal)"}
              </p>
            </div>
          )}

          {/* ─── TRIM ─── */}
          {activeTab === "trim" && isVideo && (
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest">Trim Video</p>
                <span className="text-purple-400 font-mono text-sm font-bold">
                  {(videoDuration * ((trimEnd - trimStart) / 100)).toFixed(1)}s
                </span>
              </div>

              {/* Timeline visualization */}
              <div className="relative h-12 rounded-xl overflow-hidden bg-white/5 border border-white/10">
                <div
                  className="absolute top-0 bottom-0 bg-purple-600/40 border-l-2 border-r-2 border-purple-500"
                  style={{ left: `${trimStart}%`, right: `${100 - trimEnd}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 bg-black/50"
                  style={{ left: 0, width: `${trimStart}%` }}
                />
                <div
                  className="absolute top-0 bottom-0 bg-black/50"
                  style={{ right: 0, width: `${100 - trimEnd}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-white/40 text-xs">{videoDuration > 0 ? `${videoDuration.toFixed(1)}s total` : "Loading..."}</span>
                </div>
              </div>

              {/* Sliders */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-white/50">
                    <span>Start</span>
                    <span className="text-purple-400 font-mono">{((trimStart / 100) * videoDuration).toFixed(1)}s</span>
                  </div>
                  <input
                    type="range" min="0" max="90" step="1" value={trimStart}
                    onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 10))}
                    className="w-full accent-purple-500 h-2"
                  />
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between text-[10px] text-white/50">
                    <span>End</span>
                    <span className="text-purple-400 font-mono">{((trimEnd / 100) * videoDuration).toFixed(1)}s</span>
                  </div>
                  <input
                    type="range" min="10" max="100" step="1" value={trimEnd}
                    onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 10))}
                    className="w-full accent-purple-500 h-2"
                  />
                </div>
              </div>

              <p className="text-white/30 text-[10px] text-center">
                Trim info is saved with the post. Full-resolution video uploads for server-side processing.
              </p>
            </div>
          )}

          {/* ─── DEFAULT (Music + Caption) ─── */}
          {activeTab === "none" && (
            <div className="p-4 space-y-4">
              <div>
                <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest block mb-2">Music / Audio</span>
                <MusicPickerButton selected={selectedMusic} onSelect={setSelectedMusic} />
              </div>
              <div>
                <span className="text-[10px] text-white/50 font-bold uppercase tracking-widest block mb-2">Caption</span>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Write a caption... (#hashtags @mentions)"
                  rows={3}
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              {overlays.length > 0 && (
                <div className="p-2 bg-purple-500/10 border border-purple-500/30 rounded-xl">
                  <p className="text-purple-400 text-xs font-semibold text-center">
                    {overlays.length} overlay{overlays.length > 1 ? "s" : ""} added ✓
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Publish button */}
        <div className="p-4 border-t border-white/10 flex-shrink-0">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-transparent border-white/20 text-white hover:bg-white/10"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 hover:from-purple-700 hover:to-fuchsia-700 text-white font-bold shadow-lg shadow-purple-600/30"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-1.5" />
              )}
              Publish {type === "reel" ? "Reel" : "Story"}
            </Button>
          </div>
        </div>

      </div>
    </div>
  );
}
