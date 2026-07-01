import { useRef, useState } from "react";
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
  type AlbumPhoto,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function AlbumPage() {
  const { id } = useParams<{ id: string }>();
  const albumId = Number(id);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [openPhoto, setOpenPhoto] = useState<AlbumPhoto | null>(null);
  const [tagPickerOpen, setTagPickerOpen] = useState(false);

  const { data, isLoading } = useGetAlbum(albumId, {
    query: {
      enabled: Number.isFinite(albumId),
      queryKey: getGetAlbumQueryKey(albumId),
    },
  });

  const addPhotos = useAddAlbumPhotos();
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

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    const urls: string[] = [];
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image")) continue;
        const uploaded = await uploadMedia(file);
        urls.push(uploaded.url);
      }
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        const url = window.prompt(
          "Direct upload isn't available here. Paste an image URL instead:",
        );
        if (url && /^https?:\/\//i.test(url.trim())) urls.push(url.trim());
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    if (urls.length > 0) {
      addPhotos.mutate(
        { albumId, data: { photos: urls.map((url) => ({ url })) } },
        { onSuccess: invalidate },
      );
    }
  };

  const handleDeleteAlbum = () => {
    deleteAlbum.mutate(
      { albumId },
      {
        onSuccess: () => {
          if (data) {
            queryClient.invalidateQueries({
              queryKey: getGetUserAlbumsQueryKey(data.album.ownerId),
            });
            navigate(`/profile/${data.album.ownerId}`);
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
  const taggedIds = new Set((currentPhoto?.tags ?? []).map((t) => t.userId));
  const taggableFriends = (friends ?? []).filter((f) => !taggedIds.has(f.id));

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl shadow-sm p-4 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Link href={`/profile/${album.ownerId}`}>
              <span className="text-muted-foreground hover:text-foreground cursor-pointer">
                <ArrowLeft className="w-5 h-5" />
              </span>
            </Link>
            <div className="min-w-0">
              <h1 className="text-xl font-bold truncate">{album.name}</h1>
              <p className="text-sm text-muted-foreground">
                By{" "}
                <Link href={`/profile/${album.ownerId}`}>
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
          {isOwner && (
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                disabled={uploading || addPhotos.isPending}
                onClick={() => fileInputRef.current?.click()}
              >
                {uploading || addPhotos.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4 mr-1.5" />
                )}
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
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {photos.length === 0 ? (
        <div className="text-center py-14 bg-card border border-border rounded-xl text-muted-foreground">
          {isOwner ? "Add your first photos to this album." : "No photos yet."}
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
                    <Link href={`/profile/${t.userId}`}>
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
                          src={f.avatarUrl || ""}
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
    </MainLayout>
  );
}
