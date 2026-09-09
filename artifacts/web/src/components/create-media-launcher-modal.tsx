/**
 * CreateMediaLauncherModal
 * ─────────────────────────────────────────────────────────────────────────────
 * The single entry-point for "Create Story" and "Create Reel" on the web.
 * Clicking either button anywhere in the app opens this modal instead of
 * redirecting to another page.
 *
 * Flow:
 *  1. 3-option grid (Camera / Gallery / Text)
 *  2. Camera  → LiveCameraView (100+ filters) → capture → StoryReelEditor
 *  3. Gallery → <input type=file>              → pick   → StoryReelEditor
 *  4. Text    → TextStoryCreator
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, Camera, Images, Type, Sparkles, RotateCw, FlipHorizontal, Mic, MicOff } from "lucide-react";
import { ALL_FILTERS, FILTER_CATEGORIES, filtersByCategory, type CameraFilter } from "@/lib/filter-catalog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Step = "choice" | "camera" | "gallery-loading" | "editor" | "text";

export interface LauncherResult {
  file: File;
  filterCss: string;
}

interface CreateMediaLauncherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "story" | "reel";
  /** Called when the user has chosen a file + filter; open the actual editor */
  onFileReady: (result: LauncherResult) => void;
  /** Called when the user chose Text Story */
  onTextStory: () => void;
}

// ─── Helper: camera constraint ────────────────────────────────────────────────
const CAMERA_CONSTRAINTS: Record<"user" | "environment", MediaStreamConstraints> = {
  user: { video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true },
  environment: { video: { facingMode: "environment", width: { ideal: 1080 }, height: { ideal: 1920 } }, audio: true },
};

// ─── Mini filter swatch ───────────────────────────────────────────────────────
function FilterSwatch({ f, active, onClick }: { f: CameraFilter; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 flex-shrink-0 transition-transform",
        active ? "scale-110" : "hover:scale-105"
      )}
    >
      <div
        className={cn(
          "w-14 h-14 rounded-xl overflow-hidden border-2 transition-all",
          active ? "border-white shadow-lg shadow-white/30" : "border-white/20"
        )}
        style={{ background: f.color }}
      >
        {/* tiny colour preview – real preview is applied as CSS filter on the live feed */}
        <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs" style={{ filter: f.cssFilter === "none" ? "" : f.cssFilter }}>
          A
        </div>
      </div>
      <span className={cn("text-[10px] font-medium leading-none", active ? "text-white" : "text-white/60")}>
        {f.name}
      </span>
    </button>
  );
}

// ─── Live camera view ─────────────────────────────────────────────────────────
function LiveCameraView({ mode, onCapture, onBack }: {
  mode: "story" | "reel";
  onCapture: (file: File, filterCss: string) => void;
  onBack: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [facing, setFacing] = useState<"user" | "environment">("user");
  const [activeFilter, setActiveFilter] = useState<CameraFilter>(ALL_FILTERS[0]);
  const [activeCategory, setActiveCategory] = useState<string>("Normal");
  const [captureMode, setCaptureMode] = useState<"photo" | "video">(mode === "reel" ? "video" : "photo");
  const [isRecording, setIsRecording] = useState(false);
  const [recSeconds, setRecSeconds] = useState(0);
  const [micOn, setMicOn] = useState(true);
  const [cameraReady, setCameraReady] = useState(false);

  const startCamera = useCallback(async (facingMode: "user" | "environment") => {
    // stop existing stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia(
        micOn
          ? CAMERA_CONSTRAINTS[facingMode]
          : { ...CAMERA_CONSTRAINTS[facingMode], audio: false }
      );
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraReady(true);
        };
      }
    } catch {
      toast({ title: "Camera unavailable", description: "Could not access camera.", variant: "destructive" });
      onBack();
    }
  }, [micOn, onBack]);

  useEffect(() => {
    startCamera(facing);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [facing, startCamera]);

  const flipCamera = () => setFacing((f) => (f === "user" ? "environment" : "user"));

  // ── Photo capture ────────────────────────────────────────────────────────
  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video || !cameraReady) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Mirror if front-facing
    if (facing === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    if (activeFilter.cssFilter !== "none") {
      ctx.filter = activeFilter.cssFilter;
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
      onCapture(file, activeFilter.cssFilter);
    }, "image/jpeg", 0.92);
  };

  // ── Video recording ──────────────────────────────────────────────────────
  const startRecording = () => {
    if (!streamRef.current) return;
    chunksRef.current = [];
    const mr = new MediaRecorder(streamRef.current, { mimeType: "video/webm;codecs=vp9" });
    mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      const file = new File([blob], `recording-${Date.now()}.webm`, { type: "video/webm" });
      onCapture(file, activeFilter.cssFilter);
    };
    mr.start(250);
    mediaRecorderRef.current = mr;
    setIsRecording(true);
    setRecSeconds(0);
    timerRef.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleCaptureBtn = () => {
    if (captureMode === "photo") {
      capturePhoto();
    } else if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const filteredFilters = filtersByCategory(activeCategory as never);
  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  return (
    <div className="relative w-full h-full flex flex-col bg-black select-none overflow-hidden">
      {/* Live viewfinder */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{
            transform: facing === "user" ? "scaleX(-1)" : "none",
            filter: activeFilter.cssFilter === "none" ? undefined : activeFilter.cssFilter,
          }}
        />

        {/* Top controls */}
        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
          <button onClick={onBack} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
            <X className="w-5 h-5" />
          </button>

          {isRecording && (
            <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1.5">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-white text-sm font-mono font-bold">{fmt(recSeconds)}</span>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => setMicOn((m) => !m)} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
              {micOn ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4 text-red-400" />}
            </button>
            <button onClick={flipCamera} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white">
              <FlipHorizontal className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Active filter name */}
        {activeFilter.id !== "normal" && (
          <div className="absolute bottom-36 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm rounded-full px-3 py-1 z-10">
            <span className="text-white text-xs font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> {activeFilter.name}
            </span>
          </div>
        )}
      </div>

      {/* Bottom controls */}
      <div className="bg-black/90 backdrop-blur-md pb-safe">
        {/* Photo / Video toggle */}
        {mode === "story" && (
          <div className="flex justify-center gap-4 pt-3 pb-2">
            {(["photo", "video"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setCaptureMode(m)}
                className={cn(
                  "text-sm font-semibold capitalize transition-colors",
                  captureMode === m ? "text-white border-b-2 border-white pb-0.5" : "text-white/40"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        )}

        {/* Capture button row */}
        <div className="flex items-center justify-center py-4">
          <button
            onMouseDown={captureMode === "video" && !isRecording ? handleCaptureBtn : undefined}
            onClick={captureMode === "photo" || isRecording ? handleCaptureBtn : undefined}
            className={cn(
              "relative flex items-center justify-center rounded-full transition-all duration-200 shadow-xl",
              captureMode === "photo"
                ? "w-20 h-20 bg-white active:scale-90"
                : isRecording
                ? "w-20 h-20 bg-red-500 active:scale-95 animate-pulse"
                : "w-20 h-20 bg-white active:scale-90"
            )}
          >
            {captureMode === "video" && isRecording && (
              <div className="w-6 h-6 rounded bg-white" />
            )}
            {captureMode === "video" && !isRecording && (
              <div className="w-7 h-7 rounded-full bg-red-500" />
            )}
          </button>
        </div>

        {/* Category tabs */}
        <div className="px-3 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {["All", ...FILTER_CATEGORIES].map((cat) => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={cn(
                  "text-xs font-medium rounded-full px-3 py-1 flex-shrink-0 transition-all",
                  activeCategory === cat
                    ? "bg-white text-black"
                    : "bg-white/10 text-white/70 hover:bg-white/20"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Filter swatches */}
        <div className="flex gap-3 overflow-x-auto px-4 pb-4 scrollbar-none">
          {filteredFilters.map((f) => (
            <FilterSwatch
              key={f.id}
              f={f}
              active={activeFilter.id === f.id}
              onClick={() => setActiveFilter(f)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Launcher Modal ──────────────────────────────────────────────────────
export function CreateMediaLauncherModal({
  open,
  onOpenChange,
  mode,
  onFileReady,
  onTextStory,
}: CreateMediaLauncherModalProps) {
  const [step, setStep] = useState<Step>("choice");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset when closed
  useEffect(() => {
    if (!open) setTimeout(() => setStep("choice"), 300);
  }, [open]);

  const handleGalleryPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onFileReady({ file, filterCss: "none" });
    onOpenChange(false);
    e.target.value = "";
  };

  const handleCameraCapture = (file: File, filterCss: string) => {
    onFileReady({ file, filterCss });
    onOpenChange(false);
  };

  const handleText = () => {
    onTextStory();
    onOpenChange(false);
  };

  if (!open) return null;

  const CHOICES = [
    {
      id: "camera",
      icon: <Camera className="w-8 h-8" />,
      label: "Camera",
      sub: "Take photo or record video",
      gradient: "from-violet-600 to-purple-700",
      glow: "shadow-violet-500/40",
      onClick: () => setStep("camera"),
    },
    {
      id: "gallery",
      icon: <Images className="w-8 h-8" />,
      label: "Gallery",
      sub: "Choose from your device",
      gradient: "from-fuchsia-500 to-pink-600",
      glow: "shadow-pink-500/40",
      onClick: () => fileInputRef.current?.click(),
    },
    {
      id: "text",
      icon: <Type className="w-8 h-8" />,
      label: "Text",
      sub: "Create a text story",
      gradient: "from-amber-500 to-orange-600",
      glow: "shadow-orange-500/40",
      onClick: handleText,
      hide: mode === "reel",
    },
  ].filter((c) => !c.hide);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="launcher-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
          onClick={(e) => {
            if (e.target === e.currentTarget) onOpenChange(false);
          }}
        >
          {step === "choice" && (
            <motion.div
              key="choice"
              initial={{ y: 80, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 260 }}
              className="w-full sm:max-w-md bg-zinc-900 rounded-t-3xl sm:rounded-3xl border border-white/10 overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-5 pt-5 pb-3">
                <div>
                  <h2 className="text-white text-lg font-bold">
                    Create {mode === "story" ? "Story" : "Reel"}
                  </h2>
                  <p className="text-white/50 text-sm">Choose how to get started</p>
                </div>
                <button
                  onClick={() => onOpenChange(false)}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/20 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Choice cards */}
              <div className="grid grid-cols-3 gap-3 px-5 pb-6 pt-2">
                {CHOICES.map((c) => (
                  <button
                    key={c.id}
                    onClick={c.onClick}
                    className={cn(
                      "group flex flex-col items-center gap-3 p-4 rounded-2xl bg-gradient-to-br text-white transition-all active:scale-95 hover:scale-[1.03] shadow-lg",
                      c.gradient,
                      c.glow
                    )}
                  >
                    <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-colors">
                      {c.icon}
                    </div>
                    <div className="text-center">
                      <div className="font-bold text-sm">{c.label}</div>
                      <div className="text-[11px] text-white/70 leading-tight">{c.sub}</div>
                    </div>
                  </button>
                ))}
              </div>

              {/* Drag handle */}
              <div className="sm:hidden flex justify-center pb-3">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>
            </motion.div>
          )}

          {step === "camera" && (
            <motion.div
              key="camera"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50"
            >
              <LiveCameraView
                mode={mode}
                onCapture={handleCameraCapture}
                onBack={() => setStep("choice")}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ─── hidden file input — usage: render once at app level ──────────────────────
export function GalleryFileInput({
  inputRef,
  mode,
  onChange,
}: {
  inputRef: React.RefObject<HTMLInputElement>;
  mode: "story" | "reel";
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept={mode === "reel" ? "video/*" : "image/*,video/*"}
      className="hidden"
      onChange={onChange}
    />
  );
}
