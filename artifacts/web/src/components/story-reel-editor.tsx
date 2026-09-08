import { useState, useRef, useEffect } from "react";
import {
  X,
  Type,
  Sliders,
  Music,
  Trash2,
  Move,
  FastForward,
  Scissors,
  Check,
  Loader2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadMedia, type UploadedMedia } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";
import { MusicPickerButton, type SelectedMusic } from "@/components/music-picker";

export type FontStyle = "modern" | "serif" | "neon" | "script" | "impact";

export interface EditorOverlay {
  id: string;
  type: "text";
  content: string;
  x: number; // percentage
  y: number; // percentage
  color: string;
  bgStyle: "none" | "pill" | "glass" | "neon";
  fontStyle: FontStyle;
  fontSize: number;
}

const FONT_OPTIONS: { id: FontStyle; label: string; className: string }[] = [
  { id: "modern", label: "Modern", className: "font-sans font-bold" },
  { id: "serif", label: "Serif", className: "font-serif italic font-semibold" },
  { id: "neon", label: "Neon", className: "font-mono font-bold tracking-widest [text-shadow:0_0_12px_#a855f7]" },
  { id: "script", label: "Script", className: "italic font-serif" },
  { id: "impact", label: "Impact", className: "font-black uppercase tracking-wider" },
];

const COLOR_PALETTE = [
  { name: "White", value: "#ffffff" },
  { name: "Yellow", value: "#facc15" },
  { name: "Purple", value: "#a855f7" },
  { name: "Pink", value: "#ec4899" },
  { name: "Cyan", value: "#06b6d4" },
  { name: "Emerald", value: "#10b981" },
  { name: "Red", value: "#ef4444" },
  { name: "Black", value: "#000000" },
];

const SPEED_OPTIONS = [0.5, 1, 1.5, 2];

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
  }) => Promise<void>;
}

export function StoryReelEditor({
  file,
  type,
  initialFilter = "none",
  onClose,
  onSubmit,
}: StoryReelEditorProps) {
  const isVideo = file.type.startsWith("video/");
  const [objectUrl] = useState(() => URL.createObjectURL(file));

  // Editor states
  const [activeTab, setActiveTab] = useState<"none" | "text" | "trim" | "speed">("none");
  const [overlays, setOverlays] = useState<EditorOverlay[]>([]);
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);

  // Text tool state
  const [textInput, setTextInput] = useState("");
  const [textColor, setTextColor] = useState("#ffffff");
  const [textBgStyle, setTextBgStyle] = useState<"none" | "pill" | "glass" | "neon">("pill");
  const [fontStyle, setFontStyle] = useState<FontStyle>("modern");

  // Video tools state
  const [videoSpeed, setVideoSpeed] = useState<number>(1);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);
  const [videoDuration, setVideoDuration] = useState(0);

  // Metadata
  const [caption, setCaption] = useState("");
  const [selectedMusic, setSelectedMusic] = useState<SelectedMusic | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canvasRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const draggingOverlayId = useRef<string | null>(null);

  useEffect(() => {
    return () => URL.revokeObjectURL(objectUrl);
  }, [objectUrl]);

  // Adjust playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = videoSpeed;
    }
  }, [videoSpeed]);

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
    }
  };

  const handleAddText = () => {
    if (!textInput.trim()) return;
    const newOverlay: EditorOverlay = {
      id: "txt_" + Date.now(),
      type: "text",
      content: textInput.trim(),
      x: 50,
      y: 40,
      color: textColor,
      bgStyle: textBgStyle,
      fontStyle,
      fontSize: 20,
    };
    setOverlays((prev) => [...prev, newOverlay]);
    setSelectedOverlayId(newOverlay.id);
    setTextInput("");
    setActiveTab("none");
  };

  // Dragging logic
  const handlePointerDown = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    draggingOverlayId.current = id;
    setSelectedOverlayId(id);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingOverlayId.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100));

    setOverlays((prev) =>
      prev.map((ov) => (ov.id === draggingOverlayId.current ? { ...ov, x, y } : ov))
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingOverlayId.current) {
      draggingOverlayId.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  const removeSelectedOverlay = () => {
    if (selectedOverlayId) {
      setOverlays((prev) => prev.filter((o) => o.id !== selectedOverlayId));
      setSelectedOverlayId(null);
    }
  };

  // Helper classes for badge styles
  const getBadgeClass = (style: "none" | "pill" | "glass" | "neon") => {
    switch (style) {
      case "pill":
        return "bg-black/75 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-lg";
      case "glass":
        return "bg-white/25 backdrop-blur-md px-3.5 py-1.5 rounded-2xl border border-white/40 shadow-lg";
      case "neon":
        return "bg-black/90 px-3.5 py-1.5 rounded-xl border-2 border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.7)]";
      default:
        return "px-2 py-1 drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]";
    }
  };

  const getFontClass = (font: FontStyle) => {
    const f = FONT_OPTIONS.find((item) => item.id === font);
    return f ? f.className : "font-sans font-bold";
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      // 1. Upload the media file
      const uploaded: UploadedMedia = await uploadMedia(file);

      // 2. Encode overlays into caption if any
      let finalCaption = caption.trim();
      if (overlays.length > 0) {
        const overlayTokens = overlays
          .map(
            (o) =>
              `[overlay:text:${encodeURIComponent(o.content)}:${Math.round(o.x)}:${Math.round(o.y)}:${encodeURIComponent(o.color)}:${o.bgStyle}:${o.fontStyle}]`
          )
          .join(" ");
        finalCaption = finalCaption ? `${finalCaption}\n\n${overlayTokens}` : overlayTokens;
      }

      await onSubmit({
        mediaUrl: uploaded.url,
        mediaType: isVideo ? "video" : "image",
        caption: finalCaption,
        musicUrl: selectedMusic?.url,
        musicTitle: selectedMusic?.title,
        musicArtist: selectedMusic?.artist,
      });
      onClose();
    } catch {
      toast({ title: "Failed to publish", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex flex-col md:flex-row text-white overflow-hidden select-none">
      {/* Top / Left: Canvas Area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 z-30 w-10 h-10 rounded-full bg-white/15 backdrop-blur-md hover:bg-white/25 flex items-center justify-center transition-colors"
        >
          <X className="w-5 h-5 text-white" />
        </button>

        {/* 9:16 Video / Photo Canvas */}
        <div
          ref={canvasRef}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onClick={() => setSelectedOverlayId(null)}
          className="relative rounded-3xl overflow-hidden bg-black aspect-[9/16] h-[65vh] sm:h-[72vh] max-w-sm border border-white/15 shadow-2xl touch-none"
        >
          {isVideo ? (
            <video
              ref={videoRef}
              src={objectUrl}
              autoPlay
              loop
              muted
              playsInline
              onLoadedMetadata={handleVideoLoadedMetadata}
              style={{ filter: initialFilter }}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <img
              src={objectUrl}
              alt=""
              style={{ filter: initialFilter }}
              className="w-full h-full object-cover pointer-events-none"
            />
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30 pointer-events-none" />

          {/* Overlays on Screen */}
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
                <span
                  style={{ color: ov.color }}
                  className={`${getBadgeClass(ov.bgStyle)} ${getFontClass(ov.fontStyle)} text-center block`}
                >
                  {ov.content}
                </span>

                {isSelected && (
                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/85 backdrop-blur-md rounded-full px-2 py-0.5 border border-white/20 shadow-lg text-[10px] text-white">
                    <Move className="w-3 h-3 text-purple-400" />
                    <span>Drag</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Right: Controls & Tools Panel */}
      <div className="w-full md:w-96 bg-zinc-950/90 border-t md:border-t-0 md:border-l border-white/10 p-5 flex flex-col justify-between overflow-y-auto max-h-[40vh] md:max-h-full space-y-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Edit {type === "reel" ? "Reel" : "Story"}
            </h3>
            {selectedOverlayId && (
              <Button
                variant="destructive"
                size="sm"
                onClick={removeSelectedOverlay}
                className="h-7 text-xs gap-1 rounded-lg"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Text
              </Button>
            )}
          </div>

          {/* Quick Tools Row */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant={activeTab === "text" ? "default" : "secondary"}
              size="sm"
              onClick={() => setActiveTab(activeTab === "text" ? "none" : "text")}
              className="flex-1 gap-1.5 rounded-xl h-9 text-xs font-semibold"
            >
              <Type className="w-4 h-4" /> Add Text
            </Button>

            {isVideo && (
              <>
                <Button
                  type="button"
                  variant={activeTab === "speed" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setActiveTab(activeTab === "speed" ? "none" : "speed")}
                  className="flex-1 gap-1.5 rounded-xl h-9 text-xs font-semibold"
                >
                  <FastForward className="w-4 h-4" /> Speed ({videoSpeed}x)
                </Button>
                <Button
                  type="button"
                  variant={activeTab === "trim" ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setActiveTab(activeTab === "trim" ? "none" : "trim")}
                  className="flex-1 gap-1.5 rounded-xl h-9 text-xs font-semibold"
                >
                  <Scissors className="w-4 h-4" /> Trim
                </Button>
              </>
            )}
          </div>

          {/* Text Tool Drawer */}
          {activeTab === "text" && (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-purple-500/30 space-y-3 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400">Typography & Font</span>
                <button
                  type="button"
                  onClick={() => setActiveTab("none")}
                  className="text-white/60 hover:text-white text-xs"
                >
                  ✕
                </button>
              </div>

              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Type overlay text..."
                className="w-full bg-black/60 border border-white/20 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddText();
                }}
              />

              {/* Font Selector */}
              <div>
                <span className="text-[11px] text-white/60 block mb-1 font-semibold">Font Style:</span>
                <div className="flex gap-1 overflow-x-auto pb-1">
                  {FONT_OPTIONS.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFontStyle(f.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs shrink-0 transition-colors ${
                        fontStyle === f.id
                          ? "bg-purple-600 text-white font-bold"
                          : "bg-white/10 text-white/70 hover:bg-white/15"
                      }`}
                    >
                      <span className={f.className}>{f.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Palette */}
              <div>
                <span className="text-[11px] text-white/60 block mb-1 font-semibold">Color:</span>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setTextColor(c.value)}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        textColor === c.value
                          ? "scale-110 border-white shadow-md"
                          : "border-white/40 hover:scale-105"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Badge Style */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="text-[11px] text-white/60 font-semibold">Badge:</span>
                {(["none", "pill", "glass", "neon"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setTextBgStyle(style)}
                    className={`px-2 py-0.5 rounded-lg capitalize transition-colors ${
                      textBgStyle === style
                        ? "bg-purple-600 text-white font-semibold"
                        : "bg-white/10 text-white/70 hover:bg-white/15"
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
                className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold h-8 text-xs"
              >
                Place Text on Screen
              </Button>
            </div>
          )}

          {/* Speed Controls Drawer */}
          {activeTab === "speed" && isVideo && (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-purple-500/30 space-y-2 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-purple-400 block">Playback Speed</span>
              <div className="grid grid-cols-4 gap-2">
                {SPEED_OPTIONS.map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setVideoSpeed(spd)}
                    className={`py-1.5 rounded-xl text-xs font-bold transition-colors ${
                      videoSpeed === spd
                        ? "bg-purple-600 text-white"
                        : "bg-white/10 text-white/70 hover:bg-white/15"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Video Trimmer Drawer */}
          {activeTab === "trim" && isVideo && (
            <div className="p-3.5 rounded-2xl bg-white/5 border border-purple-500/30 space-y-2 animate-in fade-in duration-150">
              <div className="flex items-center justify-between text-xs font-bold text-purple-400">
                <span>Trim Video Duration</span>
                <span>{Math.round(videoDuration * ((trimEnd - trimStart) / 100))}s</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-10 text-white/60">Start</span>
                  <input
                    type="range"
                    min="0"
                    max="90"
                    value={trimStart}
                    onChange={(e) => setTrimStart(Math.min(Number(e.target.value), trimEnd - 10))}
                    className="flex-1 accent-purple-500"
                  />
                  <span>{trimStart}%</span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="w-10 text-white/60">End</span>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={trimEnd}
                    onChange={(e) => setTrimEnd(Math.max(Number(e.target.value), trimStart + 10))}
                    className="flex-1 accent-purple-500"
                  />
                  <span>{trimEnd}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Music Picker */}
          <div>
            <span className="text-xs font-semibold text-white/70 block mb-1">Add Music / Audio:</span>
            <MusicPickerButton
              value={selectedMusic}
              onChange={setSelectedMusic}
              className="w-full rounded-xl bg-white/10 hover:bg-white/15 text-white border-white/15 h-9 text-xs"
            />
          </div>

          {/* Caption */}
          <div>
            <span className="text-xs font-semibold text-white/70 block mb-1">Caption:</span>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Write a caption... (#hashtags, @mentions)"
              rows={2}
              className="w-full bg-black/50 border border-white/15 rounded-xl p-2.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-purple-500 resize-none"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-3 border-t border-white/10 flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-transparent border-white/20 text-white hover:bg-white/10"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold"
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
  );
}
