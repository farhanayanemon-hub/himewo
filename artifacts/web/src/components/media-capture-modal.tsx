import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import {
  Camera,
  FolderOpen,
  X,
  Sparkles,
  RotateCw,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

export interface LiveFilter {
  id: string;
  name: string;
  cssFilter: string;
  color: string;
}

export const SNAP_FILTERS: LiveFilter[] = [
  { id: "normal", name: "Normal", cssFilter: "none", color: "#a855f7" },
  {
    id: "golden",
    name: "Golden Sunset",
    cssFilter: "sepia(0.25) saturate(1.45) contrast(1.05) brightness(1.05)",
    color: "#f59e0b",
  },
  {
    id: "cyberpunk",
    name: "Cyber Neon",
    cssFilter: "contrast(1.25) saturate(1.8) hue-rotate(180deg) brightness(1.1)",
    color: "#06b6d4",
  },
  {
    id: "vintage",
    name: "Vintage 35mm",
    cssFilter: "sepia(0.4) contrast(1.15) brightness(0.95) saturate(1.2)",
    color: "#d97706",
  },
  {
    id: "noir",
    name: "B&W Noir",
    cssFilter: "grayscale(1) contrast(1.35) brightness(1.05)",
    color: "#71717a",
  },
  {
    id: "beauty",
    name: "Beauty Glow",
    cssFilter: "brightness(1.1) contrast(0.95) saturate(1.2)",
    color: "#ec4899",
  },
  {
    id: "vhs",
    name: "VHS Glitch",
    cssFilter: "contrast(1.3) hue-rotate(90deg) saturate(1.5)",
    color: "#10b981",
  },
  {
    id: "sunset",
    name: "Vivid Dream",
    cssFilter: "saturate(1.7) contrast(1.1) hue-rotate(-20deg)",
    color: "#8b5cf6",
  },
];

interface MediaCaptureModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mediaType?: "all" | "video" | "image";
  title?: string;
  onMediaSelected: (file: File, filterCss?: string) => void;
}

export function MediaCaptureModal({
  open,
  onOpenChange,
  mediaType = "all",
  title = "Create",
  onMediaSelected,
}: MediaCaptureModalProps) {
  const [view, setView] = useState<"choice" | "camera">("choice");
  const [activeFilter, setActiveFilter] = useState<LiveFilter>(SNAP_FILTERS[0]);
  const [captureMode, setCaptureMode] = useState<"photo" | "video">(
    mediaType === "video" ? "video" : "photo"
  );
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Stop camera helper
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordSeconds(0);
  };

  // Start camera
  const startCamera = async (facing: "user" | "environment" = facingMode) => {
    stopCamera();
    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: facing,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: captureMode === "video" || mediaType === "video",
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch {
      toast({
        title: "Camera access unavailable",
        description: "Please allow camera access or choose a file from your device.",
        variant: "destructive",
      });
      setView("choice");
    }
  };

  useEffect(() => {
    if (open && view === "camera") {
      startCamera(facingMode);
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, view, facingMode]);

  const handleFlipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
  };

  // Capture Photo
  const handleSnapPhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 720;
    canvas.height = video.videoHeight || 1280;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Apply live filter to canvas context
    if (activeFilter.cssFilter !== "none") {
      ctx.filter = activeFilter.cssFilter;
    }

    // Mirror image if front camera
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
        stopCamera();
        onOpenChange(false);
        onMediaSelected(file, activeFilter.cssFilter);
      },
      "image/jpeg",
      0.92
    );
  };

  // Record Video
  const handleStartRecording = () => {
    if (!streamRef.current) return;
    recordedChunksRef.current = [];

    try {
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const recorder = new MediaRecorder(streamRef.current, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mimeType });
        const file = new File([blob], `video_${Date.now()}.webm`, { type: mimeType });
        stopCamera();
        onOpenChange(false);
        onMediaSelected(file, activeFilter.cssFilter);
      };

      recorder.start(250);
      setIsRecording(true);
      setRecordSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordSeconds((s) => s + 1);
      }, 1000);
    } catch {
      toast({ title: "Failed to record video", variant: "destructive" });
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const handleChooseGallery = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      stopCamera();
      onOpenChange(false);
      onMediaSelected(file, "none");
    }
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept={mediaType === "video" ? "video/*" : mediaType === "image" ? "image/*" : "image/*,video/*"}
        className="hidden"
        onChange={handleFileChange}
      />

      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) {
            stopCamera();
            setView("choice");
          }
          onOpenChange(v);
        }}
      >
        <DialogContent className="p-0 overflow-hidden bg-background/95 backdrop-blur-2xl border-border/80 max-w-sm sm:max-w-md rounded-3xl shadow-2xl">
          {view === "choice" ? (
            <div className="p-6 space-y-6">
              <div className="text-center space-y-1.5">
                <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center mx-auto mb-2">
                  <Sparkles className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-extrabold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground">
                  Choose how you want to create your {mediaType === "video" ? "reel" : "story"}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3.5 pt-2">
                {/* Option A: Camera with Filters */}
                <button
                  type="button"
                  onClick={() => setView("camera")}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-indigo-500/10 border-2 border-purple-500/30 hover:border-purple-500 hover:scale-[1.02] transition-all group text-center gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-purple-600 text-white flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                    <Camera className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Open Camera</h4>
                    <p className="text-[11px] text-purple-500 font-medium mt-0.5">
                      Live Filters & Effects
                    </p>
                  </div>
                </button>

                {/* Option B: Device Gallery / Files */}
                <button
                  type="button"
                  onClick={handleChooseGallery}
                  className="flex flex-col items-center justify-center p-5 rounded-2xl bg-muted/40 border-2 border-border/60 hover:border-foreground/40 hover:scale-[1.02] transition-all group text-center gap-3"
                >
                  <div className="w-14 h-14 rounded-full bg-muted text-foreground flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform">
                    <FolderOpen className="w-7 h-7" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-foreground">Choose Files</h4>
                    <p className="text-[11px] text-muted-foreground font-medium mt-0.5">
                      From Your Device
                    </p>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Live Camera View with Snapchat-style filters */
            <div className="relative aspect-[9/16] max-h-[85vh] w-full bg-black overflow-hidden flex flex-col justify-between">
              {/* Camera Preview Video */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  filter: activeFilter.cssFilter,
                  transform: facingMode === "user" ? "scaleX(-1)" : "none",
                }}
                className="absolute inset-0 w-full h-full object-cover"
              />

              {/* Top Controls */}
              <div className="relative z-20 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
                <button
                  type="button"
                  onClick={() => {
                    stopCamera();
                    setView("choice");
                  }}
                  className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Recording indicator */}
                {isRecording && (
                  <div className="flex items-center gap-2 bg-red-600/90 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-white" />
                    <span>{recordSeconds}s</span>
                  </div>
                )}

                {/* Flip camera */}
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="w-9 h-9 rounded-full bg-black/40 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/60 transition-colors"
                >
                  <RotateCw className="w-5 h-5" />
                </button>
              </div>

              {/* Bottom Controls: Filter Carousel + Shutter */}
              <div className="relative z-20 pb-6 pt-12 bg-gradient-to-t from-black/80 via-black/40 to-transparent space-y-4">
                {/* Snapchat-style Filter Carousel */}
                <div className="flex items-center gap-2.5 overflow-x-auto px-4 py-1 no-scrollbar justify-center">
                  {SNAP_FILTERS.map((f) => {
                    const isSelected = activeFilter.id === f.id;
                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setActiveFilter(f)}
                        className={`flex flex-col items-center gap-1 shrink-0 transition-transform ${
                          isSelected ? "scale-110" : "opacity-70 hover:opacity-100"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-full border-2 p-0.5 flex items-center justify-center transition-all ${
                            isSelected
                              ? "border-white shadow-[0_0_12px_rgba(255,255,255,0.8)] scale-105"
                              : "border-white/40"
                          }`}
                        >
                          <div
                            className="w-full h-full rounded-full"
                            style={{ backgroundColor: f.color }}
                          />
                        </div>
                        <span className="text-[10px] text-white font-semibold shadow-black drop-shadow-md">
                          {f.name}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Mode toggle (Photo vs Video) */}
                {mediaType === "all" && (
                  <div className="flex justify-center gap-4 text-xs font-bold text-white">
                    <button
                      type="button"
                      onClick={() => setCaptureMode("photo")}
                      className={`px-3 py-1 rounded-full transition-colors ${
                        captureMode === "photo"
                          ? "bg-white/30 backdrop-blur-md text-white shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      PHOTO
                    </button>
                    <button
                      type="button"
                      onClick={() => setCaptureMode("video")}
                      className={`px-3 py-1 rounded-full transition-colors ${
                        captureMode === "video"
                          ? "bg-white/30 backdrop-blur-md text-white shadow-sm"
                          : "text-white/60 hover:text-white"
                      }`}
                    >
                      VIDEO
                    </button>
                  </div>
                )}

                {/* Shutter Button */}
                <div className="flex items-center justify-center">
                  {captureMode === "photo" ? (
                    <button
                      type="button"
                      onClick={handleSnapPhoto}
                      className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition-transform shadow-xl hover:opacity-95"
                    >
                      <div className="w-12 h-12 rounded-full bg-white" />
                    </button>
                  ) : isRecording ? (
                    <button
                      type="button"
                      onClick={handleStopRecording}
                      className="w-16 h-16 rounded-full border-4 border-red-500 flex items-center justify-center p-1 active:scale-95 transition-transform shadow-xl bg-black/40"
                    >
                      <div className="w-6 h-6 rounded-md bg-red-500" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleStartRecording}
                      className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition-transform shadow-xl hover:opacity-95"
                    >
                      <div className="w-12 h-12 rounded-full bg-red-600" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
