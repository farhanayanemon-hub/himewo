import { useState, useMemo } from "react";
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
  customFetch,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check, Images, Info } from "lucide-react";

export function CreateAlbumDialog({
  open,
  onOpenChange,
  userId,
  existingPhotos,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  existingPhotos?: string[];
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const createAlbum = useCreateAlbum();
  const addPhotos = useAddAlbumPhotos();

  // Fetch already uploaded photos by this user using authenticated customFetch
  const { data: userPhotosData, isLoading: loadingPhotos } = useQuery<{
    photos: { url: string; createdAt: string }[];
  }>({
    queryKey: ["user-uploaded-photos", userId],
    queryFn: async () => {
      return customFetch<{ photos: { url: string; createdAt: string }[] }>(
        `/api/users/${encodeURIComponent(userId)}/photos`,
      ).catch(() => ({ photos: [] }));
    },
    enabled: open && !!userId,
  });

  const availablePhotos = useMemo(() => {
    const urls: string[] = [];
    const seen = new Set<string>();

    for (const p of userPhotosData?.photos ?? []) {
      if (p.url && !seen.has(p.url)) {
        seen.add(p.url);
        urls.push(p.url);
      }
    }
    for (const url of existingPhotos ?? []) {
      if (url && !seen.has(url)) {
        seen.add(url);
        urls.push(url);
      }
    }
    return urls;
  }, [userPhotosData, existingPhotos]);

  const reset = () => {
    setName("");
    setDescription("");
    setSelectedPhotos([]);
    setError(null);
  };

  const togglePhoto = (url: string) => {
    setSelectedPhotos((prev) =>
      prev.includes(url) ? prev.filter((p) => p !== url) : [...prev, url]
    );
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
      if (selectedPhotos.length > 0) {
        await addPhotos.mutateAsync({
          albumId: album.id,
          data: { photos: selectedPhotos.map((url) => ({ url })) },
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
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <Images className="w-5 h-5 text-primary" />
            <span>Create Album</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-1 flex-1 overflow-y-auto pr-1">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Album Name *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Summer Vacation, My Photography"
              maxLength={100}
              className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this album about?"
              maxLength={500}
              rows={2}
              className="w-full bg-muted/40 border border-border rounded-xl px-3.5 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </div>

          {/* Select from existing uploaded photos */}
          <div className="pt-2 border-t border-border/60">
            <div className="flex items-center justify-between mb-2">
              <div>
                <span className="text-sm font-bold text-foreground">Select Photos</span>
                <p className="text-xs text-muted-foreground">
                  Choose from your previously uploaded photos
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                {selectedPhotos.length} selected
              </span>
            </div>

            {loadingPhotos ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="text-xs">Loading your uploaded photos...</span>
              </div>
            ) : availablePhotos.length === 0 ? (
              <div className="p-6 rounded-xl border border-dashed border-border text-center bg-muted/20 my-2">
                <Info className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-60" />
                <p className="text-sm font-medium text-foreground">No uploaded photos found</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                  Only photos you have already uploaded in posts or existing albums can be added.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-64 overflow-y-auto p-1 rounded-xl bg-muted/15 border border-border/40">
                {availablePhotos.map((photoUrl, i) => {
                  const isSelected = selectedPhotos.includes(photoUrl);
                  return (
                    <button
                      key={`${photoUrl}-${i}`}
                      type="button"
                      onClick={() => togglePhoto(photoUrl)}
                      className={`relative aspect-square rounded-xl overflow-hidden group focus:outline-none border-2 transition-all ${
                        isSelected
                          ? "border-primary ring-2 ring-primary/40 scale-[0.98]"
                          : "border-transparent hover:border-border/80 opacity-80 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={photoUrl}
                        className="w-full h-full object-cover bg-muted"
                        alt=""
                      />
                      {/* Checkmark indicator badge */}
                      <div
                        className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-md scale-100"
                            : "bg-black/40 border border-white/60 text-transparent opacity-0 group-hover:opacity-100 scale-90"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={saving || !name.trim()}
            className="rounded-xl gap-2 font-semibold"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Create Album {selectedPhotos.length > 0 && `(${selectedPhotos.length})`}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
