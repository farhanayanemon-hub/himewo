import { useState, useMemo } from "react";
import { avatarSrc } from "@/lib/avatar";
import { getUserProfileUrl } from "@/lib/user-link";
import { useParams, Link, useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import {
  useGetAlbum,
  getGetAlbumQueryKey,
  useAddAlbumPhotos,
  useDeleteAlbum,
  useDeleteAlbumPhoto,
  useTagPhoto,
  useUntagPhoto,
  useListFriends,
  getGetUserAlbumsQueryKey,
  customFetch,
  type AlbumPhoto,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Loader2,
  ImagePlus,
  ArrowLeft,
  Trash2,
  UserPlus,
  X,
  MoreHorizontal,
  Check,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

function AddPhotosToAlbumDialog({
  open,
  onOpenChange,
  albumId,
  userId,
  existingAlbumPhotoUrls,
  onPhotosAdded,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  albumId: number;
  userId: string;
  existingAlbumPhotoUrls: Set<string>;
  onPhotosAdded: () => void;
}) {
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const addPhotos = useAddAlbumPhotos();

  const { data: userPhotosData, isLoading } = useQuery<{
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
    return urls;
  }, [userPhotosData]);

  const toggle = (url: string) => {
    if (existingAlbumPhotoUrls.has(url)) return;
    setSelectedPhotos((prev) =>
      prev.includes(url) ? prev.filter((p) => p !== url) : [...prev, url]
    );
  };

  const handleAdd = async () => {
    if (selectedPhotos.length === 0) return;
    setAdding(true);
    setError(null);
    try {
      await addPhotos.mutateAsync({
        albumId,
        data: { photos: selectedPhotos.map((url) => ({ url })) },
      });
      setSelectedPhotos([]);
      onPhotosAdded();
      onOpenChange(false);
    } catch {
      setError("Failed to add photos to album. Please try again.");
    } finally {
      setAdding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col p-6 rounded-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <ImagePlus className="w-5 h-5 text-primary" />
            <span>Add Photos to Album</span>
          </DialogTitle>
        </DialogHeader>

        <div className="py-2 flex-1 overflow-y-auto space-y-3">
          <p className="text-xs text-muted-foreground">
            Select photos from your uploads to add to this album.
          </p>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Loading your photos...</span>
            </div>
          ) : availablePhotos.length === 0 ? (
            <div className="p-6 rounded-xl border border-dashed border-border text-center bg-muted/20 my-2">
              <p className="text-sm font-medium text-foreground">No uploaded photos available</p>
              <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
                Only photos already uploaded in your posts can be added to albums.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1 rounded-xl bg-muted/15 border border-border/40">
              {availablePhotos.map((url, i) => {
                const alreadyInAlbum = existingAlbumPhotoUrls.has(url);
                const isSelected = selectedPhotos.includes(url);
                return (
                  <button
                    key={`${url}-${i}`}
                    type="button"
                    disabled={alreadyInAlbum}
                    onClick={() => toggle(url)}
                    className={`relative aspect-square rounded-xl overflow-hidden group focus:outline-none border-2 transition-all ${
                      alreadyInAlbum
                        ? "opacity-40 cursor-not-allowed border-transparent"
                        : isSelected
                        ? "border-primary ring-2 ring-primary/40 scale-[0.98]"
                        : "border-transparent hover:border-border/80 opacity-85 hover:opacity-100"
                    }`}
                  >
                    <img src={url} className="w-full h-full object-cover bg-muted" alt="" />
                    {alreadyInAlbum ? (
                      <span className="absolute inset-x-1 bottom-1 bg-black/75 text-[10px] text-white font-medium py-0.5 rounded text-center">
                        In album
                      </span>
                    ) : (
                      <div
                        className={`absolute top-1.5 right-1.5 w-6 h-6 rounded-full flex items-center justify-center transition-all ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-md scale-100"
                            : "bg-black/40 border border-white/60 text-transparent opacity-0 group-hover:opacity-100 scale-90"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {error && <p className="text-sm text-destructive font-medium">{error}</p>}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-border/60">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={adding}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAdd}
            disabled={adding || selectedPhotos.length === 0}
            className="rounded-xl gap-2 font-semibold"
          >
            {adding && <Loader2 className="w-4 h-4 animate-spin" />}
            <span>Add Selected ({selectedPhotos.length})</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const albumId = Number(id);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [addPhotosDialogOpen, setAddPhotosDialogOpen] = useState(false);
  const [openPhoto, setOpenPhoto] = useState<AlbumPhoto | null>(null);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const { data, isLoading } = useGetAlbum(albumId, {
    query: {
      enabled: Number.isFinite(albumId),
      queryKey: getGetAlbumQueryKey(albumId),
    },
  });

  const deleteAlbum = useDeleteAlbum();
  const deletePhoto = useDeleteAlbumPhoto();
  const tagPhoto = useTagPhoto();
  const untagPhoto = useUntagPhoto();

  const isOwner = !!user && data?.album.ownerId === user.id;
  const { data: friends } = useListFriends({
    query: { enabled: isOwner && tagPickerOpen },
  } as never);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetAlbumQueryKey(albumId) });
    if (data) {
      queryClient.invalidateQueries({
        queryKey: getGetUserAlbumsQueryKey(data.album.ownerId),
      });
    }
  };

  // Keep the lightbox photo in sync after tags/deletes refetch.
  const currentPhoto = openPhoto
    ? (data?.photos.find((p) => p.id === openPhoto.id) ?? null)
    : null;

  const handleDeleteAlbum = () => {
    deleteAlbum.mutate(
      { albumId },
      {
        onSuccess: () => {
          if (data) {
            queryClient.invalidateQueries({
              queryKey: getGetUserAlbumsQueryKey(data.album.ownerId),
            });
            navigate(getUserProfileUrl({ id: data.album.ownerId }));
          } else {
            navigate("/");
          }
        },
      },
    );
  };

  const handleDeletePhoto = (photoId: number) => {
    deletePhoto.mutate(
      { albumId, photoId },
      {
        onSuccess: () => {
          setOpenPhoto(null);
          invalidate();
        },
      },
    );
  };

  const handleTag = (userId: string) => {
    if (!currentPhoto) return;
    tagPhoto.mutate(
      { albumId, photoId: currentPhoto.id, data: { userId } },
      {
        onSuccess: () => {
          setTagPickerOpen(false);
          invalidate();
        },
      },
    );
  };

  const handleUntag = (userId: string) => {
    if (!currentPhoto) return;
    untagPhoto.mutate(
      { albumId, photoId: currentPhoto.id, userId },
      { onSuccess: invalidate },
    );
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="py-10 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <div className="py-10 text-center text-muted-foreground">
          Album not found
        </div>
      </MainLayout>
    );
  }

  const { album, owner, photos } = data;
  const isSpecialAlbum =
    album.kind === "profile" ||
    album.kind === "cover" ||
    album.name.toLowerCase().includes("profile") ||
    album.name.toLowerCase().includes("cover");
  const taggedIds = new Set((currentPhoto?.tags ?? []).map((t) => t.userId));
  const taggableFriends = (friends ?? []).filter((f) => !taggedIds.has(f.id));

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={getUserProfileUrl(owner ? { ...owner, id: album.ownerId } : { id: album.ownerId })}>
              <span className="text-muted-foreground hover:text-foreground cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </span>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{album.name}</h1>
              <p className="text-sm text-muted-foreground">
                By{" "}
                <Link href={getUserProfileUrl(owner ? { ...owner, id: album.ownerId } : { id: album.ownerId })}>
                  <span className="hover:underline cursor-pointer font-medium text-foreground">
                    {owner.displayName}
                  </span>
                </Link>{" "}
                · {album.photoCount} photo{album.photoCount === 1 ? "" : "s"} ·{" "}
                {formatDistanceToNow(new Date(album.createdAt), {
                  addSuffix: true,
                })}
              </p>
              {album.description && (
                <p className="text-sm mt-1 whitespace-pre-wrap">
                  {album.description}
                </p>
              )}
            </div>
          </div>
          {isOwner && !isSpecialAlbum && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddPhotosDialogOpen(true)}
              >
                <ImagePlus className="w-4 h-4 mr-1.5" />
                Add photos
              </Button>
              <AlertDialog>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Album options">
                      <MoreHorizontal className="w-5 h-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <AlertDialogTrigger asChild>
                      <DropdownMenuItem className="text-destructive focus:text-destructive">
                        <Trash2 className="w-4 h-4" /> Delete album
                      </DropdownMenuItem>
                    </AlertDialogTrigger>
                  </DropdownMenuContent>
                </DropdownMenu>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this album?</AlertDialogTitle>
                    <AlertDialogDescription>
                      All photos in "{album.name}" will be removed. This can't
                      be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAlbum}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </div>
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-14 bg-card border border-border rounded-xl text-muted-foreground">
          {isOwner && !isSpecialAlbum ? "Add photos to this album." : "No photos yet."}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {photos.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setOpenPhoto(p)}
              className="relative group focus:outline-none"
            >
              <img
                src={p.url}
                className="w-full aspect-square rounded-lg object-cover bg-muted group-hover:opacity-90 transition-opacity"
                alt={p.caption ?? ""}
              />
              {p.tags.length > 0 && (
                <span className="absolute bottom-1.5 left-1.5 bg-black/60 text-white text-xs rounded-full px-2 py-0.5">
                  {p.tags.length} tagged
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Photo lightbox */}
      <Dialog
        open={!!currentPhoto}
        onOpenChange={(v) => {
          if (!v) {
            setOpenPhoto(null);
            setTagPickerOpen(false);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          {currentPhoto && (
            <>
              <DialogHeader>
                <DialogTitle className="text-base">
                  Photo in {album.name}
                </DialogTitle>
              </DialogHeader>
              <img
                src={currentPhoto.url}
                className="w-full max-h-[60vh] rounded-lg object-contain bg-muted"
                alt={currentPhoto.caption ?? ""}
              />
              {currentPhoto.caption && (
                <p className="text-sm">{currentPhoto.caption}</p>
              )}
              <div className="flex flex-wrap items-center gap-2">
                {currentPhoto.tags.map((t) => (
                  <span
                    key={t.userId}
                    className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm"
                  >
                    <Link href={getUserProfileUrl({ id: t.userId, displayName: t.displayName })}>
                      <span className="hover:underline cursor-pointer">
                        {t.displayName}
                      </span>
                    </Link>
                    {(isOwner || t.userId === user?.id) && (
                      <button
                        type="button"
                        onClick={() => handleUntag(t.userId)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label={`Remove tag ${t.displayName}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </span>
                ))}
                {isOwner && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setTagPickerOpen((v) => !v)}
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" /> Tag friend
                  </Button>
                )}
                {isOwner && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive ml-auto"
                    disabled={deletePhoto.isPending}
                    onClick={() => handleDeletePhoto(currentPhoto.id)}
                  >
                    {deletePhoto.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-1.5" />
                    )}
                    Delete photo
                  </Button>
                )}
              </div>
              {isOwner && tagPickerOpen && (
                <div className="border border-border rounded-lg p-2 max-h-44 overflow-y-auto">
                  {taggableFriends.length === 0 ? (
                    <p className="text-sm text-muted-foreground px-2 py-1">
                      No more friends to tag.
                    </p>
                  ) : (
                    taggableFriends.map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        disabled={tagPhoto.isPending}
                        onClick={() => handleTag(f.id)}
                        className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-left hover:bg-muted transition-colors disabled:opacity-60"
                      >
                        <img
                          src={avatarSrc(f.avatarUrl)}
                          className="w-7 h-7 rounded-full object-cover bg-muted"
                          alt=""
                        />
                        <span>{f.displayName}</span>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
      {isOwner && user && !isSpecialAlbum && (
        <AddPhotosToAlbumDialog
          open={addPhotosDialogOpen}
          onOpenChange={setAddPhotosDialogOpen}
          albumId={albumId}
          userId={user.id}
          existingAlbumPhotoUrls={new Set(photos.map((p) => p.url))}
          onPhotosAdded={invalidate}
        />
      )}
    </MainLayout>
  );
}
