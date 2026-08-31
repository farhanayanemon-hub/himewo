import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import {
  useListReels,
  useLikeReel,
  useUnlikeReel,
  useSaveItem,
  useUnsaveItem,
  useCreateReel,
  useListReelComments,
  useCreateReelComment,
  getListReelsQueryKey,
  getListSavedItemsQueryKey,
  getListReelCommentsQueryKey,
  type Reel,
} from "@workspace/api-client-react";
import {
  Heart,
  MessageCircle,
  Share2,
  Loader2,
  Bookmark,
  Music,
  Plus,
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ChevronDown,
  ChevronUp,
  Send,
  Copy,
  Check,
  Type,
  Smile,
  Trash2,
  Sparkles,
  Move,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, useCallback } from "react";
import { uploadMedia, UploadUnavailableError, type UploadedMedia } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";
import { MusicPickerButton, type SelectedMusic } from "@/components/music-picker";
import { RenderWithMentions } from "@/components/mention";
import { Link } from "wouter";
import { useAuth } from "@/lib/auth";
import { formatDistanceToNow } from "date-fns";

/* -------------------------------------------------------------------------- */
/*                         REEL OVERLAY DATA TYPES                            */
/* -------------------------------------------------------------------------- */

export interface ReelOverlay {
  id: string;
  type: "text" | "emoji";
  content: string;
  x: number; // percentage (0 - 100)
  y: number; // percentage (0 - 100)
  color?: string;
  bgStyle?: "none" | "pill" | "glass" | "neon";
  fontSize?: number;
}

export function serializeReelCaption(caption: string, overlays: ReelOverlay[]): string {
  const trimmed = caption.trim();
  if (!overlays || overlays.length === 0) return trimmed;
  return `${trimmed}\n\n<!--REEL_OVERLAYS:${JSON.stringify(overlays)}-->`;
}

export function parseReelOverlays(rawCaption: string | null | undefined): {
  cleanCaption: string;
  overlays: ReelOverlay[];
} {
  if (!rawCaption) return { cleanCaption: "", overlays: [] };
  const match = /<!--REEL_OVERLAYS:(.*?)-->/s.exec(rawCaption);
  if (!match) return { cleanCaption: rawCaption, overlays: [] };
  try {
    const overlays = JSON.parse(match[1]) as ReelOverlay[];
    const cleanCaption = rawCaption.replace(/<!--REEL_OVERLAYS:.*?-->/s, "").trim();
    return { cleanCaption, overlays: Array.isArray(overlays) ? overlays : [] };
  } catch {
    return { cleanCaption: rawCaption, overlays: [] };
  }
}

function getOverlayStyleClass(bgStyle?: "none" | "pill" | "glass" | "neon"): string {
  switch (bgStyle) {
    case "pill":
      return "font-bold bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-xl inline-block";
    case "glass":
      return "font-bold bg-white/25 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/40 shadow-2xl text-white inline-block";
    case "neon":
      return "font-extrabold bg-black/85 px-3.5 py-1.5 rounded-xl border-2 border-purple-500 shadow-[0_0_16px_rgba(168,85,247,0.7)] text-purple-200 inline-block";
    case "none":
    default:
      return "font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] px-2 py-1 inline-block";
  }
}

const COLOR_PALETTE = [
  { name: "White", value: "#ffffff" },
  { name: "Black", value: "#000000" },
  { name: "Yellow", value: "#facc15" },
  { name: "Coral Red", value: "#ef4444" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Neon Green", value: "#10b981" },
  { name: "Hot Pink", value: "#ec4899" },
  { name: "Purple", value: "#a855f7" },
  { name: "Sunset Orange", value: "#f97316" },
];

const STICKER_CATEGORIES = {
  reactions: {
    label: "🔥 Reactions",
    emojis: ["🔥", "❤️", "😍", "😂", "🥳", "🤯", "💯", "👏", "🙌", "✨", "🤙", "💀"],
  },
  bangla: {
    label: "🇧🇩 Bangla",
    emojis: ["🇧🇩", "🏏", "☕", "🍛", "🛺", "🌸", "🥭", "🪁", "🐯", "🚤", "🕌", "🎋"],
  },
  music: {
    label: "🎵 Music & Party",
    emojis: ["🎵", "🎶", "🎧", "🎤", "🎸", "🕺", "💃", "🎊", "🎉", "🥂", "🕶️", "⚡"],
  },
  vibes: {
    label: "🌟 Aesthetics",
    emojis: ["✨", "⚡", "🌟", "👑", "💎", "💫", "💖", "🌈", "🚀", "🏝️", "🔥", "🦄"],
  },
};

function CreateReelDialog() {
  const queryClient = useQueryClient();
  const createReel = useCreateReel();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [video, setVideo] = useState<UploadedMedia | null>(null);
  const [caption, setCaption] = useState("");
  const [music, setMusic] = useState<SelectedMusic | null>(null);
  const [uploading, setUploading] = useState(false);

  // Overlay Editor States
  const [overlays, setOverlays] = useState<ReelOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"none" | "text" | "stickers">("none");
  const [stickerCat, setStickerCat] = useState<keyof typeof STICKER_CATEGORIES>("reactions");

  // Text Creator State
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textBgStyle, setTextBgStyle] = useState<"none" | "pill" | "glass" | "neon">("pill");
  const [textSize, setTextSize] = useState(18);

  // Dragging State
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const reset = () => {
    setVideo(null);
    setCaption("");
    setMusic(null);
    setOverlays([]);
    setSelectedOverlayId(null);
    setActiveTab("none");
    setTextInput("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadMedia(file);
      setVideo({ url: uploaded.url, type: "video" });
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        const url = window.prompt(
          "Direct upload isn't available in this environment. Paste a video URL instead:",
        );
        if (url) setVideo({ url, type: "video" });
      } else {
        toast({ title: "Upload failed", description: "Please try again." });
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAddText = () => {
    if (!textInput.trim()) return;
    const newOverlay: ReelOverlay = {
      id: "txt_" + Date.now(),
      type: "text",
      content: textInput.trim(),
      x: 50,
      y: 40,
      color: textColor,
      bgStyle: textBgStyle,
      fontSize: textSize,
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
    setTextInput("");
    setActiveTab("none");
  };

  const handleAddEmoji = (emoji: string) => {
    const newOverlay: ReelOverlay = {
      id: "emj_" + Date.now(),
      type: "emoji",
      content: emoji,
      x: 50,
      y: 50,
      fontSize: 42,
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
  };

  const deleteSelectedOverlay = () => {
    if (!selectedOverlayId) return;
    setOverlays((prev) => prev.filter((o) => o.id !== selectedOverlayId));
    setSelectedOverlayId(null);
  };

  const updateSelectedFontSize = (delta: number) => {
    if (!selectedOverlayId) return;
    setOverlays((prev) =>
      prev.map((o) =>
        o.id === selectedOverlayId
          ? { ...o, fontSize: Math.max(12, Math.min(64, (o.fontSize ?? (o.type === "emoji" ? 40 : 18)) + delta)) }
          : o,
      ),
    );
  };

  // Canvas Drag Handling
  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedOverlayId(id);
    setDraggingId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingId || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));

    setOverlays((prev) =>
      prev.map((o) => (o.id === draggingId ? { ...o, x: Math.round(x), y: Math.round(y) } : o)),
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingId) {
      setDraggingId(null);
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  const submit = () => {
    if (!video) return;
    const finalCaption = serializeReelCaption(caption, overlays);
    createReel.mutate(
      {
        data: {
          videoUrl: video.url,
          caption: finalCaption || undefined,
          ...(music
            ? {
                musicUrl: music.url,
                musicTitle: music.title,
                musicArtist: music.artist ?? undefined,
              }
            : {}),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
          reset();
          setOpen(false);
          toast({ title: "Reel shared with overlays!" });
        },
        onError: () => toast({ title: "Could not create reel", description: "Please try again." }),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <Button onClick={() => setOpen(true)} className="rounded-full gap-2 shadow-lg bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
        <Plus className="w-4 h-4" /> Create Reel
      </Button>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border border-border">
        <DialogHeader className="p-4 border-b border-border/60">
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-500" />
              Reel Studio Creator
            </span>
            {video && (
              <span className="text-xs font-normal text-muted-foreground">
                Tap or drag stickers & text on screen
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files)}
        />

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {video ? (
            <div className="flex flex-col md:flex-row gap-4 items-start">
              {/* Left Column: Interactive 9:16 Video Canvas */}
              <div className="flex flex-col items-center mx-auto w-full md:w-auto">
                <div
                  ref={canvasRef}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onClick={() => setSelectedOverlayId(null)}
                  className="relative rounded-2xl overflow-hidden border border-border/80 bg-black aspect-[9/16] h-[380px] sm:h-[420px] shadow-2xl select-none cursor-crosshair group touch-none"
                >
                  <video
                    src={video.url}
                    className="w-full h-full object-cover pointer-events-none"
                    autoPlay
                    loop
                    muted
                  />

                  {/* Gradient shadow for legibility */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

                  {/* Render Overlays on the Canvas */}
                  {overlays.map((ov) => {
                    const isSelected = selectedOverlayId === ov.id;
                    return (
                      <div
                        key={ov.id}
                        onPointerDown={(e) => handlePointerDown(ov.id, e)}
                        className={`absolute transform -translate-x-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing z-30 transition-shadow ${
                          isSelected ? "ring-2 ring-purple-500 ring-offset-2 ring-offset-black/50" : ""
                        }`}
                        style={{ left: `${ov.x}%`, top: `${ov.y}%` }}
                      >
                        {ov.type === "emoji" ? (
                          <span
                            style={{ fontSize: `${ov.fontSize ?? 42}px` }}
                            className="select-none filter drop-shadow-lg inline-block"
                          >
                            {ov.content}
                          </span>
                        ) : (
                          <span
                            style={{
                              color: ov.color || "#ffffff",
                              fontSize: `${ov.fontSize ?? 18}px`,
                            }}
                            className={getOverlayStyleClass(ov.bgStyle)}
                          >
                            {ov.content}
                          </span>
                        )}

                        {isSelected && (
                          <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/85 backdrop-blur-md rounded-full px-2 py-0.5 border border-white/20 shadow-lg text-[10px] text-white">
                            <Move className="w-3 h-3 text-purple-400" />
                            <span>Drag</span>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Top Canvas Action overlay icons */}
                  <div className="absolute top-2.5 right-2.5 flex flex-col gap-2 z-40">
                    <button
                      type="button"
                      onClick={() => setVideo(null)}
                      className="w-8 h-8 rounded-full bg-black/70 text-white flex items-center justify-center hover:bg-black/90 transition-colors shadow-md"
                      title="Remove video"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Music badge preview on video if selected */}
                  {music && (
                    <div className="absolute top-2.5 left-2.5 z-40 flex items-center gap-1.5 bg-black/60 backdrop-blur-md text-white text-xs px-2.5 py-1 rounded-full border border-white/20 max-w-[180px]">
                      <Music className="w-3 h-3 text-purple-400 animate-spin" style={{ animationDuration: "3s" }} />
                      <span className="truncate">{music.title}</span>
                    </div>
                  )}
                </div>

                {/* Overlay Selection Controls Bar */}
                {selectedOverlayId && (
                  <div className="mt-2 flex items-center gap-2 bg-muted/80 backdrop-blur-md border border-border p-1.5 rounded-xl text-xs">
                    <span className="font-semibold px-1 text-muted-foreground">Size:</span>
                    <button
                      type="button"
                      onClick={() => updateSelectedFontSize(-3)}
                      className="px-2 py-1 bg-background hover:bg-muted rounded-md font-bold"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSelectedFontSize(3)}
                      className="px-2 py-1 bg-background hover:bg-muted rounded-md font-bold"
                    >
                      +
                    </button>
                    <div className="h-4 w-px bg-border mx-1" />
                    <button
                      type="button"
                      onClick={deleteSelectedOverlay}
                      className="px-2 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md font-semibold flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>

              {/* Right Column: Studio Controls (Text, Stickers, Music, Caption) */}
              <div className="flex-1 space-y-3.5 w-full">
                {/* Tools Ribbon */}
                <div className="flex items-center gap-2 border-b border-border pb-3">
                  <Button
                    type="button"
                    variant={activeTab === "text" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab(activeTab === "text" ? "none" : "text")}
                    className="rounded-xl gap-1.5 font-semibold text-xs"
                  >
                    <Type className="w-4 h-4 text-purple-400" /> Aa Text
                  </Button>
                  <Button
                    type="button"
                    variant={activeTab === "stickers" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveTab(activeTab === "stickers" ? "none" : "stickers")}
                    className="rounded-xl gap-1.5 font-semibold text-xs"
                  >
                    <Smile className="w-4 h-4 text-amber-400" /> 😀 Stickers
                  </Button>
                  <MusicPickerButton selected={music} onSelect={setMusic} />
                  {overlays.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setOverlays([])}
                      className="text-muted-foreground hover:text-red-500 text-xs ml-auto"
                    >
                      Clear all
                    </Button>
                  )}
                </div>

                {/* Text Tool Drawer */}
                {activeTab === "text" && (
                  <div className="p-3 rounded-xl bg-muted/60 border border-purple-500/30 space-y-3 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        <Type className="w-4 h-4 text-purple-500" /> Add Text Overlay
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("none")}
                        className="text-muted-foreground hover:text-foreground text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => setTextInput(e.target.value)}
                      placeholder="Type text for video screen..."
                      className="w-full bg-background border border-border rounded-xl px-3.5 py-2 text-sm focus:ring-1 focus:ring-purple-500 focus:outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddText();
                      }}
                      autoFocus
                    />

                    {/* Color Swatches */}
                    <div>
                      <span className="text-[11px] text-muted-foreground block mb-1">Color:</span>
                      <div className="flex gap-1.5 overflow-x-auto pb-1">
                        {COLOR_PALETTE.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setTextColor(c.value)}
                            className={`w-6 h-6 rounded-full border-2 transition-transform ${
                              textColor === c.value ? "scale-110 border-primary shadow-md" : "border-border/60 hover:scale-105"
                            }`}
                            style={{ backgroundColor: c.value }}
                            title={c.name}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Badge Style Mode */}
                    <div className="flex items-center justify-between gap-1 text-xs">
                      <span className="text-[11px] text-muted-foreground">Badge:</span>
                      {(["none", "pill", "glass", "neon"] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setTextBgStyle(style)}
                          className={`px-2.5 py-1 rounded-lg capitalize transition-colors ${
                            textBgStyle === style
                              ? "bg-purple-600 text-white font-semibold shadow-sm"
                              : "bg-background/80 hover:bg-muted text-muted-foreground"
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAddText}
                      disabled={!textInput.trim()}
                      className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                    >
                      Place on Screen
                    </Button>
                  </div>
                )}

                {/* Stickers Drawer */}
                {activeTab === "stickers" && (
                  <div className="p-3 rounded-xl bg-muted/60 border border-amber-500/30 space-y-2.5 animate-in fade-in zoom-in-95 duration-150">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold flex items-center gap-1.5 text-foreground">
                        <Smile className="w-4 h-4 text-amber-500" /> Tap sticker to drop on screen
                      </span>
                      <button
                        type="button"
                        onClick={() => setActiveTab("none")}
                        className="text-muted-foreground hover:text-foreground text-xs"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Category tabs */}
                    <div className="flex gap-1 overflow-x-auto pb-1 text-xs">
                      {(Object.keys(STICKER_CATEGORIES) as Array<keyof typeof STICKER_CATEGORIES>).map((key) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setStickerCat(key)}
                          className={`px-2.5 py-1 rounded-lg shrink-0 transition-colors ${
                            stickerCat === key
                              ? "bg-amber-500/20 text-amber-500 font-bold border border-amber-500/40"
                              : "text-muted-foreground hover:bg-muted"
                          }`}
                        >
                          {STICKER_CATEGORIES[key].label}
                        </button>
                      ))}
                    </div>

                    {/* Emojis Grid */}
                    <div className="grid grid-cols-6 gap-2 pt-1">
                      {STICKER_CATEGORIES[stickerCat].emojis.map((em, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleAddEmoji(em)}
                          className="w-10 h-10 rounded-xl bg-background hover:bg-muted hover:scale-110 flex items-center justify-center text-2xl transition-all shadow-sm active:scale-95"
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Caption input */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Caption & Hashtags (e.g. #bangladesh #viral)</span>
                    <span>{caption.length}/700</span>
                  </div>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={3}
                    maxLength={700}
                    placeholder="Write a caption... (use #hashtags and @mentions)"
                    className="w-full bg-muted/50 border border-border/60 rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-purple-500 focus:outline-none placeholder:text-muted-foreground resize-none"
                  />
                </div>

                {/* Music Info Chip */}
                {music && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs">
                    <span className="flex items-center gap-1.5 font-medium text-purple-600 dark:text-purple-400 truncate">
                      <Music className="w-3.5 h-3.5 shrink-0" />
                      {music.title} {music.artist ? `· ${music.artist}` : ""}
                    </span>
                    <button
                      type="button"
                      onClick={() => setMusic(null)}
                      className="text-muted-foreground hover:text-foreground ml-2"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full py-16 rounded-2xl border-2 border-dashed border-border text-muted-foreground hover:bg-muted/40 transition-colors flex flex-col items-center gap-3 group"
            >
              {uploading ? (
                <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
              ) : (
                <>
                  <div className="w-14 h-14 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform shadow-md">
                    <Plus className="w-7 h-7" />
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-foreground">Upload Video Reel</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      MP4, WebM or QuickTime vertical video
                    </p>
                  </div>
                </>
              )}
            </button>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-border/60 bg-muted/20">
          <Button
            onClick={submit}
            disabled={!video || createReel.isPending}
            className="rounded-xl w-full sm:w-auto font-semibold bg-purple-600 hover:bg-purple-700 text-white shadow-lg"
          >
            {createReel.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              "Share Reel"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                            COMMENTS SHEET                                  */
/* -------------------------------------------------------------------------- */

function ReelCommentsSheet({
  reelId,
  open,
  onOpenChange,
  onCommentCountChange,
}: {
  reelId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCommentCountChange: (delta: number) => void;
}) {
  const { user } = useAuth();
  const { data: comments, isLoading } = useListReelComments(reelId, {
    query: { enabled: open } as any,
  });
  const createComment = useCreateReelComment();
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = content.trim();
    if (!text || createComment.isPending) return;

    setContent("");
    onCommentCountChange(1);

    createComment.mutate(
      {
        id: reelId,
        data: { content: text },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({
            queryKey: getListReelCommentsQueryKey(reelId),
          });
          queryClient.invalidateQueries({
            queryKey: getListReelsQueryKey(),
          });
        },
        onError: () => {
          onCommentCountChange(-1);
          toast({ title: "Failed to post comment", variant: "destructive" });
        },
      },
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col z-50">
        <SheetHeader className="p-4 border-b border-border">
          <SheetTitle className="text-base font-bold flex items-center justify-between">
            <span>Comments ({comments?.length ?? "..."})</span>
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : !comments || comments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p>No comments yet. Be the first to comment!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 items-start group">
                <Link href={`/profile/${c.author.username}`}>
                  <img
                    src={avatarSrc(c.author.avatarUrl)}
                    alt=""
                    className="w-8 h-8 rounded-full object-cover shrink-0 hover:opacity-90"
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <Link
                      href={`/profile/${c.author.username}`}
                      className="font-semibold text-xs text-foreground hover:underline"
                    >
                      {c.author.displayName}
                    </Link>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                  <div className="text-sm text-foreground/90 mt-0.5 whitespace-pre-wrap break-words">
                    <RenderWithMentions content={c.content} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-3 border-t border-border bg-background flex items-center gap-2"
        >
          {user && (
            <img
              src={avatarSrc(user.avatarUrl)}
              alt=""
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
          )}
          <input
            ref={inputRef}
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Add a comment..."
            className="flex-1 bg-muted/60 border border-border/50 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || createComment.isPending}
            className="rounded-full w-9 h-9 p-0 shrink-0"
          >
            {createComment.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </SheetContent>
    </Sheet>
  );
}

/* -------------------------------------------------------------------------- */
/*                              SHARE DIALOG                                  */
/* -------------------------------------------------------------------------- */

function ReelShareDialog({
  reel,
  open,
  onOpenChange,
}: {
  reel: Reel;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/reels?id=${reel.id}` : "";

  const handleCopy = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    toast({ title: "Link copied to clipboard!" });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Reel by ${reel.author.displayName}`,
          text: reel.caption || "Check out this reel on HiMewo!",
          url: shareUrl,
        });
        onOpenChange(false);
      } catch {
        // User dismissed
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share Reel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border border-border/50">
            <img
              src={avatarSrc(reel.author.avatarUrl)}
              alt=""
              className="w-10 h-10 rounded-full object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm truncate">{reel.author.displayName}</p>
              <p className="text-xs text-muted-foreground truncate">
                {reel.caption || "No caption"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-muted/60 rounded-xl p-2 border border-border/50">
            <input
              type="text"
              readOnly
              value={shareUrl}
              className="bg-transparent border-none text-xs text-muted-foreground flex-1 focus:outline-none px-2 truncate"
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={handleCopy}
              className="rounded-lg gap-1.5 h-8 text-xs font-semibold shrink-0"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          {typeof navigator !== "undefined" && typeof navigator.share === "function" && (
            <Button onClick={handleNativeShare} className="w-full rounded-xl gap-2 font-semibold">
              <Share2 className="w-4 h-4" /> Share via App
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* -------------------------------------------------------------------------- */
/*                                REEL CARD                                   */
/* -------------------------------------------------------------------------- */

function ReelCard({
  reel,
  isActive,
  isGlobalMuted,
  onToggleGlobalMute,
}: {
  reel: Reel;
  isActive: boolean;
  isGlobalMuted: boolean;
  onToggleGlobalMute: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Optimistic UI states
  const [liked, setLiked] = useState(reel.viewerHasLiked ?? false);
  const [likeCount, setLikeCount] = useState(reel.likeCount ?? 0);
  const [saved, setSaved] = useState(reel.viewerHasSaved ?? false);
  const [commentCount, setCommentCount] = useState(reel.commentCount ?? 0);

  // Video playback states
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [playFeedback, setPlayFeedback] = useState<{ visible: boolean; isPlaying: boolean; key: number }>({
    visible: false,
    isPlaying: true,
    key: 0,
  });
  const [showHeartBurst, setShowHeartBurst] = useState(false);

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const playIconTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Modal states
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const queryClient = useQueryClient();
  const likeMutation = useLikeReel();
  const unlikeMutation = useUnlikeReel();
  const saveMutation = useSaveItem();
  const unsaveMutation = useUnsaveItem();

  // Sync props when reel changes
  useEffect(() => {
    setLiked(reel.viewerHasLiked ?? false);
    setLikeCount(reel.likeCount ?? 0);
    setSaved(reel.viewerHasSaved ?? false);
    setCommentCount(reel.commentCount ?? 0);
  }, [reel]);

  // Handle Play/Pause when active state changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isActive) {
      video.muted = isGlobalMuted;
      video
        .play()
        .then(() => setIsPlaying(true))
        .catch(() => {
          video.muted = true;
          video.play().catch(() => {});
          setIsPlaying(true);
        });
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive, isGlobalMuted]);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (playIconTimeoutRef.current) clearTimeout(playIconTimeoutRef.current);
    };
  }, []);

  // Track playback progress
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video || !video.duration) return;
    setProgress((video.currentTime / video.duration) * 100);
  };

  // Optimistic Like Toggle
  const handleToggleLike = useCallback(() => {
    const newLiked = !liked;
    const newCount = newLiked ? likeCount + 1 : Math.max(0, likeCount - 1);

    // Instant UI update
    setLiked(newLiked);
    setLikeCount(newCount);

    if (newLiked) {
      likeMutation.mutate(
        { id: reel.id },
        {
          onError: () => {
            setLiked(false);
            setLikeCount(likeCount);
            toast({ title: "Failed to like reel", variant: "destructive" });
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
          },
        },
      );
    } else {
      unlikeMutation.mutate(
        { id: reel.id },
        {
          onError: () => {
            setLiked(true);
            setLikeCount(likeCount);
            toast({ title: "Failed to unlike reel", variant: "destructive" });
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
          },
        },
      );
    }
  }, [liked, likeCount, reel.id, likeMutation, unlikeMutation, queryClient]);

  // Single click vs double click handler (NO DOUBLE TRIGGER)
  const handleVideoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimeoutRef.current) {
      // It's a double click!
      clearTimeout(clickTimeoutRef.current);
      clickTimeoutRef.current = null;
      if (!liked) {
        handleToggleLike();
      }
      setShowHeartBurst(true);
      setTimeout(() => setShowHeartBurst(false), 900);
      return;
    }

    // Single click candidate: wait 220ms to distinguish from double click
    clickTimeoutRef.current = setTimeout(() => {
      clickTimeoutRef.current = null;
      const video = videoRef.current;
      if (!video) return;

      const nextPlaying = video.paused;
      if (nextPlaying) {
        video.play().catch(() => {});
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }

      if (playIconTimeoutRef.current) clearTimeout(playIconTimeoutRef.current);
      setPlayFeedback({ visible: true, isPlaying: nextPlaying, key: Date.now() });
      playIconTimeoutRef.current = setTimeout(() => {
        setPlayFeedback((prev) => ({ ...prev, visible: false }));
      }, 500);
    }, 220);
  };

  // Optimistic Save Toggle
  const handleToggleSave = useCallback(() => {
    const newSaved = !saved;
    setSaved(newSaved);

    toast({
      title: newSaved ? "Saved to your collection" : "Removed from saved",
    });

    if (newSaved) {
      saveMutation.mutate(
        { data: { entityType: "reel", entityId: reel.id } },
        {
          onError: () => {
            setSaved(false);
            toast({ title: "Failed to save reel", variant: "destructive" });
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
          },
        },
      );
    } else {
      unsaveMutation.mutate(
        { entityType: "reel", entityId: reel.id },
        {
          onError: () => {
            setSaved(true);
            toast({ title: "Failed to unsave reel", variant: "destructive" });
          },
          onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
            queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
          },
        },
      );
    }
  }, [saved, reel.id, saveMutation, unsaveMutation, queryClient]);

  return (
    <div
      ref={containerRef}
      className="snap-start snap-always shrink-0 h-[calc(100dvh-56px)] sm:h-[calc(100vh-70px)] w-full flex items-center justify-center p-0 sm:p-4"
    >
      {/* Responsive Full-Height Video Container (Edge-to-Edge on Mobile) */}
      <div className="relative h-full w-full sm:max-h-[820px] sm:aspect-[9/16] sm:w-auto bg-black sm:rounded-2xl overflow-hidden sm:shadow-2xl flex items-center justify-center select-none group sm:border sm:border-border/20">
        <video
          ref={videoRef}
          src={reel.videoUrl}
          className="w-full h-full object-cover cursor-pointer"
          loop
          muted={isGlobalMuted}
          playsInline
          onTimeUpdate={handleTimeUpdate}
          onClick={handleVideoClick}
        />

        {/* Interactive On-Screen Text & Emoji Overlays */}
        {parseReelOverlays(reel.caption).overlays.map((ov) => (
          <div
            key={ov.id}
            className="absolute pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-20 select-none animate-in zoom-in-75 duration-300"
            style={{ left: `${ov.x}%`, top: `${ov.y}%` }}
          >
            {ov.type === "emoji" ? (
              <span
                style={{ fontSize: `${ov.fontSize ?? 42}px` }}
                className="filter drop-shadow-xl select-none inline-block"
              >
                {ov.content}
              </span>
            ) : (
              <span
                style={{
                  color: ov.color || "#ffffff",
                  fontSize: `${ov.fontSize ?? 18}px`,
                }}
                className={getOverlayStyleClass(ov.bgStyle)}
              >
                {ov.content}
              </span>
            )}
          </div>
        ))}

        {/* Ambient Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30 pointer-events-none" />

        {/* Center Animated Play/Pause Indicator (Single Clean Pop) */}
        {playFeedback.visible && (
          <div
            key={playFeedback.key}
            className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-75 fade-in duration-200"
          >
            <div className="w-16 h-16 rounded-full bg-black/60 backdrop-blur-md flex items-center justify-center text-white shadow-2xl">
              {playFeedback.isPlaying ? (
                <Play className="w-8 h-8 ml-1 fill-white text-white" />
              ) : (
                <Pause className="w-8 h-8 fill-white text-white" />
              )}
            </div>
          </div>
        )}

        {/* Center Floating Heart Burst on Double Click */}
        {showHeartBurst && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-in zoom-in-50 duration-300">
            <Heart className="w-24 h-24 text-red-500 fill-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.8)] animate-pulse" />
          </div>
        )}

        {/* Top Floating Controls (Mute / Sound) */}
        <button
          type="button"
          onClick={onToggleGlobalMute}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md text-white flex items-center justify-center transition-transform active:scale-95 shadow-md"
          title={isGlobalMuted ? "Unmute (M)" : "Mute (M)"}
        >
          {isGlobalMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>

        {/* Bottom Left Info Area */}
        <div className="absolute bottom-4 left-3 right-16 sm:bottom-4 sm:left-4 sm:right-20 text-white z-10 space-y-2 pointer-events-auto">
          <div className="flex items-center gap-2.5">
            <Link href={`/profile/${reel.author.username}`} className="shrink-0 group/author">
              <img
                src={avatarSrc(reel.author.avatarUrl)}
                className="w-10 h-10 rounded-full object-cover border-2 border-white/40 group-hover/author:border-white transition-all shadow-md"
                alt=""
              />
            </Link>
            <div className="min-w-0">
              <Link
                href={`/profile/${reel.author.username}`}
                className="font-bold text-sm drop-shadow-md hover:underline truncate block"
              >
                {reel.author.displayName}
              </Link>
              <span className="text-[11px] text-white/80 drop-shadow">@{reel.author.username}</span>
            </div>
          </div>

          {parseReelOverlays(reel.caption).cleanCaption && (
            <div className="text-sm font-medium drop-shadow-md line-clamp-3 leading-snug text-white/95">
              <RenderWithMentions content={parseReelOverlays(reel.caption).cleanCaption} />
            </div>
          )}

          {reel.musicUrl && (
            <div className="flex items-center gap-1.5 text-white/90 text-xs drop-shadow-md bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full w-fit max-w-full">
              <Music className="w-3.5 h-3.5 shrink-0 animate-spin text-purple-400" style={{ animationDuration: "4s" }} />
              <span className="truncate">
                {reel.musicTitle ?? "Original Audio"}
                {reel.musicArtist ? ` · ${reel.musicArtist}` : ""}
              </span>
            </div>
          )}
        </div>

        {/* Right Floating Actions Bar */}
        <div className="absolute bottom-4 right-2 sm:right-3 flex flex-col items-center gap-3.5 z-20">
          {/* Like Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleToggleLike}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-75 shadow-lg group/btn"
              title="Like (L)"
            >
              <Heart
                className={`w-6 h-6 transition-all duration-200 ${
                  liked
                    ? "fill-red-500 text-red-500 scale-110"
                    : "text-white group-hover/btn:scale-110"
                }`}
              />
            </button>
            <span className="text-white text-xs font-bold mt-1 drop-shadow-md">
              {likeCount}
            </span>
          </div>

          {/* Comment Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setCommentsOpen(true)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-75 shadow-lg group/btn"
              title="Comments"
            >
              <MessageCircle className="w-6 h-6 text-white group-hover/btn:scale-110 transition-transform" />
            </button>
            <span className="text-white text-xs font-bold mt-1 drop-shadow-md">
              {commentCount}
            </span>
          </div>

          {/* Save Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={handleToggleSave}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-75 shadow-lg group/btn"
              title={saved ? "Unsave" : "Save"}
            >
              <Bookmark
                className={`w-6 h-6 transition-all duration-200 ${
                  saved
                    ? "fill-primary text-primary scale-110"
                    : "text-white group-hover/btn:scale-110"
                }`}
              />
            </button>
            <span className="text-white text-xs font-bold mt-1 drop-shadow-md">
              {saved ? "Saved" : "Save"}
            </span>
          </div>

          {/* Share Button */}
          <div className="flex flex-col items-center">
            <button
              onClick={() => setShareOpen(true)}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md flex items-center justify-center text-white transition-all active:scale-75 shadow-lg group/btn"
              title="Share"
            >
              <Share2 className="w-6 h-6 text-white group-hover/btn:scale-110 transition-transform" />
            </button>
            <span className="text-white text-xs font-bold mt-1 drop-shadow-md">
              Share
            </span>
          </div>
        </div>

        {/* Video Bottom Progress Bar */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20">
          <div
            className="h-full bg-primary transition-all duration-100 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Modals & Drawers */}
      <ReelCommentsSheet
        reelId={reel.id}
        open={commentsOpen}
        onOpenChange={setCommentsOpen}
        onCommentCountChange={(delta) => setCommentCount((c) => Math.max(0, c + delta))}
      />

      <ReelShareDialog
        reel={reel}
        open={shareOpen}
        onOpenChange={setShareOpen}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*                                MAIN PAGE                                   */
/* -------------------------------------------------------------------------- */

export default function ReelsPage() {
  const { data: reels, isLoading } = useListReels();
  const [activeIndex, setActiveIndex] = useState(0);
  const [globalMuted, setGlobalMuted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver to determine active reel on scroll
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const cards = container.querySelectorAll(".snap-start");
    if (!cards.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
            const index = Array.from(cards).indexOf(entry.target);
            if (index !== -1) {
              setActiveIndex(index);
            }
          }
        });
      },
      { root: container, threshold: [0.5] },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, [reels]);

  // Scroll to index
  const scrollToIndex = useCallback(
    (index: number) => {
      const container = containerRef.current;
      if (!container || !reels || index < 0 || index >= reels.length) return;
      const cards = container.querySelectorAll(".snap-start");
      if (cards[index]) {
        cards[index].scrollIntoView({ behavior: "smooth", block: "center" });
      }
    },
    [reels],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input/textarea
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement).tagName)) return;

      if (e.key === "ArrowDown" || e.key === "j") {
        e.preventDefault();
        scrollToIndex(activeIndex + 1);
      } else if (e.key === "ArrowUp" || e.key === "k") {
        e.preventDefault();
        scrollToIndex(activeIndex - 1);
      } else if (e.key === "m" || e.key === "M") {
        e.preventDefault();
        setGlobalMuted((m) => !m);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, scrollToIndex]);

  return (
    <MainLayout>
      <div className="relative h-[calc(100vh-70px)] w-full flex items-center justify-center overflow-hidden bg-background">
        {/* Top Right Create Button */}
        <div className="absolute top-4 right-4 z-30">
          <CreateReelDialog />
        </div>

        {/* Desktop Side Navigation Chevrons */}
        {reels && reels.length > 1 && (
          <div className="hidden lg:flex flex-col gap-3 absolute right-8 top-1/2 -translate-y-1/2 z-20">
            <Button
              variant="secondary"
              size="icon"
              disabled={activeIndex === 0}
              onClick={() => scrollToIndex(activeIndex - 1)}
              className="w-10 h-10 rounded-full shadow-lg bg-background/80 hover:bg-background backdrop-blur-md disabled:opacity-30 border border-border"
              title="Previous Reel (Up Arrow)"
            >
              <ChevronUp className="w-5 h-5" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              disabled={activeIndex === reels.length - 1}
              onClick={() => scrollToIndex(activeIndex + 1)}
              className="w-10 h-10 rounded-full shadow-lg bg-background/80 hover:bg-background backdrop-blur-md disabled:opacity-30 border border-border"
              title="Next Reel (Down Arrow)"
            >
              <ChevronDown className="w-5 h-5" />
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm font-medium">Loading reels...</p>
          </div>
        ) : !reels || reels.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-muted-foreground gap-4 max-w-sm text-center p-6 bg-card border border-border rounded-2xl shadow-sm">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary">
              <Play className="w-8 h-8 fill-primary" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-foreground">No Reels Yet</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Be the first to share an engaging short video with the community!
              </p>
            </div>
            <CreateReelDialog />
          </div>
        ) : (
          <div
            ref={containerRef}
            className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {reels.map((reel, idx) => (
              <ReelCard
                key={reel.id}
                reel={reel}
                isActive={idx === activeIndex}
                isGlobalMuted={globalMuted}
                onToggleGlobalMute={() => setGlobalMuted((m) => !m)}
              />
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
