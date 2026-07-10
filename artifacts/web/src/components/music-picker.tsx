import { useRef, useState } from "react";
import { Loader2, Music, Play, Pause, Upload, X, AlertTriangle } from "lucide-react";
import {
  useListMusicTracks,
  getListMusicTracksQueryKey,
  useUploadMusicTrack,
  type MusicTrack,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";

export type SelectedMusic = Pick<MusicTrack, "title" | "artist" | "url">;

export function MusicPickerButton({
  selected,
  onSelect,
}: {
  selected: SelectedMusic | null;
  onSelect: (track: SelectedMusic | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [uploadMode, setUploadMode] = useState(false);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadArtist, setUploadArtist] = useState("");
  const [uploading, setUploading] = useState(false);
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();

  const { data: tracks, isLoading } = useListMusicTracks(
    { q: query || undefined },
    { query: { enabled: open, queryKey: getListMusicTracksQueryKey({ q: query || undefined }) } },
  );
  const uploadTrack = useUploadMusicTrack();

  const stopPreview = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingUrl(null);
  };

  const togglePreview = (url: string) => {
    if (playingUrl === url) {
      stopPreview();
      return;
    }
    stopPreview();
    const audio = new Audio(url);
    audio.play().catch(() => setPlayingUrl(null));
    audio.onended = () => setPlayingUrl(null);
    audioRef.current = audio;
    setPlayingUrl(url);
  };

  const close = (o: boolean) => {
    setOpen(o);
    if (!o) {
      stopPreview();
      setUploadMode(false);
      setQuery("");
    }
  };

  const handleUploadFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!uploadTitle.trim()) {
      toast({ title: "Add a song title first" });
      return;
    }
    setUploading(true);
    try {
      const uploaded = await uploadMedia(file);
      uploadTrack.mutate(
        {
          data: {
            title: uploadTitle.trim(),
            artist: uploadArtist.trim() || undefined,
            url: uploaded.url,
          },
        },
        {
          onSuccess: (track) => {
            queryClient.invalidateQueries({ queryKey: getListMusicTracksQueryKey() });
            onSelect({ title: track.title, artist: track.artist, url: track.url });
            setUploadMode(false);
            setUploadTitle("");
            setUploadArtist("");
            close(false);
            toast({ title: "Music added to your story" });
          },
          onError: () => toast({ title: "Could not save track" }),
        },
      );
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        toast({
          title: "Upload not available",
          description: "Direct upload isn't configured in this environment.",
        });
      } else {
        toast({ title: "Upload failed", description: "Please try again." });
      }
    }
    setUploading(false);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <>
      {selected ? (
        <div className="flex items-center gap-2 bg-muted/60 rounded-full px-3 py-1.5 text-sm">
          <Music className="w-4 h-4 text-primary shrink-0" />
          <span className="truncate max-w-[180px] font-medium">
            {selected.title}
            {selected.artist ? ` · ${selected.artist}` : ""}
          </span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Remove music"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full gap-1.5"
          onClick={() => setOpen(true)}
        >
          <Music className="w-4 h-4" /> Add music
        </Button>
      )}

      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add music to your story</DialogTitle>
          </DialogHeader>

          {!uploadMode ? (
            <>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search songs, artists, moods..."
                className="w-full bg-muted/50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <div className="max-h-72 overflow-y-auto space-y-1">
                {isLoading ? (
                  <div className="py-8 flex justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  </div>
                ) : (tracks ?? []).length === 0 ? (
                  <p className="py-8 text-center text-sm text-muted-foreground">
                    No tracks found.
                  </p>
                ) : (
                  tracks!.map((t) => (
                    <div
                      key={t.id}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/60"
                    >
                      <button
                        type="button"
                        onClick={() => togglePreview(t.url)}
                        className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0"
                        aria-label="Preview"
                      >
                        {playingUrl === t.url ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        className="flex-1 min-w-0 text-left"
                        onClick={() => {
                          stopPreview();
                          onSelect({ title: t.title, artist: t.artist, url: t.url });
                          close(false);
                        }}
                      >
                        <div className="text-sm font-medium truncate">{t.title}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {t.artist ?? "Unknown artist"}
                          {t.mood ? ` · ${t.mood}` : ""}
                          {t.source === "upload" ? " · your upload" : ""}
                        </div>
                      </button>
                    </div>
                  ))
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                className="gap-2 justify-start"
                onClick={() => setUploadMode(true)}
              >
                <Upload className="w-4 h-4" /> Upload your own audio
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <p>
                  Only upload audio you own or have permission to use.
                  Uploading copyrighted music without permission may lead to
                  your story or account being removed.
                </p>
              </div>
              <input
                value={uploadTitle}
                onChange={(e) => setUploadTitle(e.target.value)}
                placeholder="Song title (required)"
                className="w-full bg-muted/50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <input
                value={uploadArtist}
                onChange={(e) => setUploadArtist(e.target.value)}
                placeholder="Artist (optional)"
                className="w-full bg-muted/50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none"
              />
              <input
                ref={fileRef}
                type="file"
                accept="audio/*"
                className="hidden"
                onChange={(e) => handleUploadFile(e.target.files)}
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading || uploadTrack.isPending || !uploadTitle.trim()}
                  className="gap-2"
                >
                  {uploading || uploadTrack.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  Choose audio file
                </Button>
                <Button type="button" variant="ghost" onClick={() => setUploadMode(false)}>
                  Back
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
