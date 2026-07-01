import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  useCreateAlbum,
  useAddAlbumPhotos,
  getGetUserAlbumsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";
import { Loader2, ImagePlus, X } from "lucide-react";

export function CreateAlbumDialog({
  open,
  onOpenChange,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const createAlbum = useCreateAlbum();
  const addPhotos = useAddAlbumPhotos();

  const reset = () => {
    setName("");
    setDescription("");
    setPhotos([]);
    setError(null);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image")) continue;
        const uploaded = await uploadMedia(file);
        setPhotos((prev) => [...prev, uploaded.url]);
      }
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        const url = window.prompt(
          "Direct upload isn't available here. Paste an image URL instead:",
        );
        if (url && /^https?:\/\//i.test(url.trim())) {
          setPhotos((prev) => [...prev, url.trim()]);
        }
      } else {
        setError("Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Please give your album a name.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const album = await createAlbum.mutateAsync({
        data: { name: trimmed, description: description.trim() || undefined },
      });
      if (photos.length > 0) {
        await addPhotos.mutateAsync({
          albumId: album.id,
          data: { photos: photos.map((url) => ({ url })) },
        });
      }
      queryClient.invalidateQueries({
        queryKey: getGetUserAlbumsQueryKey(userId),
      });
      reset();
      onOpenChange(false);
    } catch {
      setError("Couldn't create the album. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create album</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Album name"
            maxLength={100}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            maxLength={500}
            rows={2}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {photos.map((url, i) => (
                <div key={`${url}-${i}`} className="relative group">
                  <img
                    src={url}
                    className="w-full aspect-square rounded-lg object-cover bg-muted"
                    alt=""
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setPhotos((prev) => prev.filter((_, idx) => idx !== i))
                    }
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Remove photo"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <ImagePlus className="w-4 h-4 mr-2" />
            )}
            Add photos
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button
            onClick={handleCreate}
            disabled={saving || uploading || !name.trim()}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create album
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
