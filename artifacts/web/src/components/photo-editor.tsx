import { useCallback, useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Loader2, Eye, Camera, ZoomIn, ZoomOut, Pencil, X } from "lucide-react";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";
import { toast } from "sonner";

export type PhotoKind = "avatar" | "cover";

/* ---------- Fullscreen viewer ---------- */

export function PhotoViewer({
  url,
  alt,
  onClose,
}: {
  url: string;
  alt: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <button
        className="absolute top-4 right-4 text-white/80 hover:text-white p-2"
        onClick={onClose}
        aria-label="Close"
      >
        <X className="w-7 h-7" />
      </button>
      <img
        src={url}
        alt={alt}
        className="max-w-full max-h-full object-contain rounded-lg"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}

/* ---------- Photo action menu (View / Change) ---------- */

export function PhotoActionMenu({
  children,
  photoUrl,
  kind,
  canChange,
  onView,
  onPickFile,
}: {
  children: React.ReactNode;
  photoUrl: string | null | undefined;
  kind: PhotoKind;
  canChange: boolean;
  onView: () => void;
  onPickFile: (file: File) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const label = kind === "avatar" ? "profile picture" : "cover photo";

  if (!canChange) {
    // Viewer only: click to view (if there's a photo)
    return (
      <div
        className={photoUrl ? "cursor-pointer" : undefined}
        onClick={() => photoUrl && onView()}
      >
        {children}
      </div>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="cursor-pointer">{children}</div>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={kind === "avatar" ? "start" : "end"}>
          {photoUrl && (
            <DropdownMenuItem onClick={onView}>
              <Eye className="w-4 h-4 mr-2" />
              View {label}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => fileRef.current?.click()}>
            <Camera className="w-4 h-4 mr-2" />
            Change {label}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPickFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

/* ---------- Crop / preview dialog ---------- */

const OUTPUT_SIZE: Record<PhotoKind, { w: number; h: number }> = {
  avatar: { w: 512, h: 512 },
  cover: { w: 1440, h: 480 },
};

export function PhotoCropDialog({
  file,
  kind,
  saving,
  onSave,
  onCancel,
}: {
  file: File;
  kind: PhotoKind;
  saving: boolean;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [editing, setEditing] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; ox: number; oy: number } | null>(null);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = url;
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setEditing(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const aspect = kind === "avatar" ? 1 : 3;

  // Base "cover" scale: image scaled so it fills the frame at zoom=1
  const getLayout = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || !img) return null;
    const fw = frame.clientWidth;
    const fh = frame.clientHeight;
    const baseScale = Math.max(fw / img.naturalWidth, fh / img.naturalHeight);
    const scale = baseScale * zoom;
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    // clamp offset so image always covers frame
    const maxX = Math.max(0, (dw - fw) / 2);
    const maxY = Math.max(0, (dh - fh) / 2);
    return { fw, fh, scale, dw, dh, maxX, maxY };
  }, [img, zoom]);

  const clampOffset = useCallback(
    (o: { x: number; y: number }) => {
      const l = getLayout();
      if (!l) return o;
      return {
        x: Math.min(l.maxX, Math.max(-l.maxX, o.x)),
        y: Math.min(l.maxY, Math.max(-l.maxY, o.y)),
      };
    },
    [getLayout],
  );

  useEffect(() => {
    setOffset((o) => clampOffset(o));
  }, [zoom, clampOffset]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!editing) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!editing || !dragRef.current) return;
    const d = dragRef.current;
    setOffset(clampOffset({ x: d.ox + (e.clientX - d.startX), y: d.oy + (e.clientY - d.startY) }));
  };
  const onPointerUp = () => {
    dragRef.current = null;
  };

  const handleSave = () => {
    const l = getLayout();
    if (!img || !l) return;
    const out = OUTPUT_SIZE[kind];
    const canvas = document.createElement("canvas");
    canvas.width = out.w;
    canvas.height = out.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    // Frame center in image coordinates
    const cx = img.naturalWidth / 2 - offset.x / l.scale;
    const cy = img.naturalHeight / 2 - offset.y / l.scale;
    const srcW = l.fw / l.scale;
    const srcH = l.fh / l.scale;
    ctx.drawImage(
      img,
      cx - srcW / 2,
      cy - srcH / 2,
      srcW,
      srcH,
      0,
      0,
      out.w,
      out.h,
    );
    canvas.toBlob(
      (blob) => {
        if (blob) onSave(blob);
      },
      "image/jpeg",
      0.9,
    );
  };

  const label = kind === "avatar" ? "profile picture" : "cover photo";

  return (
    <Dialog open onOpenChange={(v) => !v && !saving && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Update {label}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex justify-center">
            <div
              ref={frameRef}
              className={`relative overflow-hidden bg-black/80 select-none ${
                kind === "avatar" ? "w-64 h-64 rounded-full" : "w-full rounded-lg"
              } ${editing ? "cursor-grab active:cursor-grabbing ring-2 ring-primary" : ""}`}
              style={kind === "cover" ? { aspectRatio: `${aspect}` } : undefined}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
            >
              {objectUrl && (
                <img
                  src={objectUrl}
                  alt="Preview"
                  draggable={false}
                  className="absolute top-1/2 left-1/2 max-w-none pointer-events-none"
                  style={{
                    transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
                    width: img
                      ? (() => {
                          const frame = frameRef.current;
                          if (!frame) return undefined;
                          const fw = frame.clientWidth;
                          const fh = frame.clientHeight;
                          const baseScale = Math.max(
                            fw / img.naturalWidth,
                            fh / img.naturalHeight,
                          );
                          return `${img.naturalWidth * baseScale * zoom}px`;
                        })()
                      : undefined,
                  }}
                />
              )}
            </div>
          </div>
          {editing ? (
            <div className="flex items-center gap-3 px-2">
              <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.01}
                onValueChange={(v) => setZoom(v[0] ?? 1)}
              />
              <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
            </div>
          ) : (
            <p className="text-center text-sm text-muted-foreground">
              This is how your {label} will look.
            </p>
          )}
        </div>
        <DialogFooter className="gap-2">
          {!editing && (
            <Button variant="outline" onClick={() => setEditing(true)} disabled={saving}>
              <Pencil className="w-4 h-4 mr-1.5" /> Edit
            </Button>
          )}
          <Button variant="secondary" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !img}>
            {saving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- All-in-one controller hook ---------- */

export function usePhotoEditor({
  kind,
  photoUrl,
  onSaved,
}: {
  kind: PhotoKind;
  photoUrl: string | null | undefined;
  onSaved: (url: string) => Promise<void> | void;
}) {
  const [viewing, setViewing] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSave = async (blob: Blob) => {
    setSaving(true);
    try {
      const fileName = kind === "avatar" ? "avatar.jpg" : "cover.jpg";
      const file = new File([blob], fileName, { type: "image/jpeg" });
      const media = await uploadMedia(file);
      await onSaved(media.url);
      setPendingFile(null);
      toast.success(
        kind === "avatar" ? "Profile picture updated" : "Cover photo updated",
      );
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        // Fallback: direct upload unavailable (e.g. storage not configured) — allow pasting a URL
        const pasted = window.prompt(
          "Direct upload isn't available right now. Paste an image URL instead:",
        );
        const trimmed = pasted?.trim();
        if (trimmed && /^https?:\/\//i.test(trimmed)) {
          try {
            await onSaved(trimmed);
            setPendingFile(null);
            toast.success(
              kind === "avatar" ? "Profile picture updated" : "Cover photo updated",
            );
          } catch {
            toast.error("Couldn't update photo. Please try again.");
          }
        } else if (trimmed) {
          toast.error("That doesn't look like a valid image URL (must start with http).");
        }
      } else {
        toast.error("Couldn't update photo. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const dialogs = (
    <>
      {viewing && photoUrl && (
        <PhotoViewer
          url={photoUrl}
          alt={kind === "avatar" ? "Profile picture" : "Cover photo"}
          onClose={() => setViewing(false)}
        />
      )}
      {pendingFile && (
        <PhotoCropDialog
          file={pendingFile}
          kind={kind}
          saving={saving}
          onSave={handleSave}
          onCancel={() => setPendingFile(null)}
        />
      )}
    </>
  );

  return {
    dialogs,
    onView: () => setViewing(true),
    onPickFile: (f: File) => setPendingFile(f),
  };
}
