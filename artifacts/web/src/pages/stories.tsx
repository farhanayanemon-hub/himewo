import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import {
  useListStories,
  useCreateStory,
  getListStoriesQueryKey,
  type StoryInputMediaType,
} from "@workspace/api-client-react";
import { Image as ImageIcon, Loader2, Music, Plus, Type, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { uploadMedia, UploadUnavailableError, type UploadedMedia } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";
import { GifPickerButton } from "@/components/gif-picker";
import { MusicPickerButton, type SelectedMusic } from "@/components/music-picker";
import {
  MentionSuggestions,
  RenderWithMentions,
  activeMentionQuery,
  applyMentionTokens,
  pickMention,
  type MentionTarget,
} from "@/components/mention";

// Facebook-style text-story backgrounds. Stored by key so all clients can map
// the same key to their own gradient rendering.
export const STORY_BACKGROUNDS: Record<string, string> = {
  sunset: "linear-gradient(135deg, #f97316, #db2777)",
  ocean: "linear-gradient(135deg, #0ea5e9, #6366f1)",
  forest: "linear-gradient(135deg, #22c55e, #0d9488)",
  berry: "linear-gradient(135deg, #a855f7, #ec4899)",
  night: "linear-gradient(135deg, #1e293b, #4338ca)",
  fire: "linear-gradient(135deg, #ef4444, #f59e0b)",
};
const DEFAULT_BG = "sunset";

export function storyBackground(key: string | null | undefined): string {
  return STORY_BACKGROUNDS[key ?? ""] ?? STORY_BACKGROUNDS[DEFAULT_BG];
}

function CreateStoryDialog() {
  const queryClient = useQueryClient();
  const createStory = useCreateStory();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"media" | "text">("media");
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [caption, setCaption] = useState("");
  const [textContent, setTextContent] = useState("");
  const [background, setBackground] = useState(DEFAULT_BG);
  const [music, setMusic] = useState<SelectedMusic | null>(null);
  const [mentionTargets, setMentionTargets] = useState<MentionTarget[]>([]);
  const [uploading, setUploading] = useState(false);

  const activeText = mode === "media" ? caption : textContent;
  const mentionQuery = activeMentionQuery(activeText);

  const reset = () => {
    setMedia(null);
    setCaption("");
    setTextContent("");
    setBackground(DEFAULT_BG);
    setMusic(null);
    setMentionTargets([]);
    setMode("media");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const uploaded = await uploadMedia(file);
      setMedia(uploaded);
    } catch (err) {
      if (err instanceof UploadUnavailableError) {
        const url = window.prompt(
          "Direct upload isn't available in this environment. Paste an image or video URL instead:",
        );
        if (url) {
          setMedia({ url, type: file.type.startsWith("video") ? "video" : "image" });
        }
      } else {
        toast({ title: "Upload failed", description: "Please try again." });
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const canSubmit =
    mode === "media" ? media != null : textContent.trim().length > 0;

  const submit = () => {
    if (!canSubmit) return;
    createStory.mutate(
      {
        data:
          mode === "media"
            ? {
                storyType: "media",
                mediaUrl: media!.url,
                mediaType: media!.type as StoryInputMediaType,
                caption:
                  applyMentionTokens(caption, mentionTargets).trim() || undefined,
                ...(music
                  ? {
                      musicUrl: music.url,
                      musicTitle: music.title,
                      musicArtist: music.artist ?? undefined,
                    }
                  : {}),
              }
            : {
                storyType: "text",
                textContent: applyMentionTokens(textContent, mentionTargets).trim(),
                backgroundStyle: background,
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
          queryClient.invalidateQueries({ queryKey: getListStoriesQueryKey() });
          reset();
          setOpen(false);
          toast({ title: "Story shared!" });
        },
        onError: () => toast({ title: "Could not create story", description: "Please try again." }),
      },
    );
  };

  const onPickMention = (p: MentionTarget) => {
    if (mode === "media") {
      const picked = pickMention(caption, mentionTargets, p);
      setCaption(picked.text);
      setMentionTargets(picked.targets);
    } else {
      const picked = pickMention(textContent, mentionTargets, p);
      setTextContent(picked.text);
      setMentionTargets(picked.targets);
    }
    captionRef.current?.focus();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <Button onClick={() => setOpen(true)} className="rounded-full gap-2">
        <Plus className="w-4 h-4" /> Create Story
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        {/* Mode tabs */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode("media")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium border transition-colors ${mode === "media" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"}`}
          >
            <ImageIcon className="w-4 h-4" /> Photo / Video / GIF
          </button>
          <button
            type="button"
            onClick={() => setMode("text")}
            className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-medium border transition-colors ${mode === "text" ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"}`}
          >
            <Type className="w-4 h-4" /> Text Story
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files)}
        />

        {mode === "media" ? (
          media ? (
            <div className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-[9/16] max-h-[45vh] mx-auto">
              {media.type === "video" ? (
                <video src={media.url} className="w-full h-full object-cover" autoPlay loop muted />
              ) : (
                <img src={media.url} className="w-full h-full object-cover" alt="" />
              )}
              <button
                onClick={() => setMedia(null)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="w-full py-8 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:bg-muted/50 transition-colors flex flex-col items-center gap-2"
              >
                {uploading ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : (
                  <>
                    <Plus className="w-6 h-6" />
                    <span>Add photo or video</span>
                  </>
                )}
              </button>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>or pick a GIF:</span>
                <GifPickerButton
                  onSelect={(url) => setMedia({ url, type: "image" })}
                />
              </div>
            </div>
          )
        ) : (
          <div className="space-y-3">
            <div
              className="rounded-xl aspect-[9/16] max-h-[40vh] mx-auto w-full flex items-center justify-center p-6"
              style={{ background: storyBackground(background) }}
            >
              <span className="text-white text-xl font-bold text-center whitespace-pre-wrap break-words drop-shadow-md">
                {textContent || "Start typing..."}
              </span>
            </div>
            <div className="flex justify-center gap-2">
              {Object.entries(STORY_BACKGROUNDS).map(([key, bg]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setBackground(key)}
                  className={`w-7 h-7 rounded-full border-2 ${background === key ? "border-primary scale-110" : "border-transparent"} transition-transform`}
                  style={{ background: bg }}
                  aria-label={key}
                />
              ))}
            </div>
          </div>
        )}

        <div className="relative">
          {mentionQuery !== null && (
            <MentionSuggestions query={mentionQuery} onSelect={onPickMention} />
          )}
          <textarea
            ref={captionRef}
            value={activeText}
            onChange={(e) =>
              mode === "media"
                ? setCaption(e.target.value)
                : setTextContent(e.target.value)
            }
            rows={2}
            maxLength={700}
            placeholder={
              mode === "media"
                ? "Add a caption (@ to mention)"
                : "What's on your mind? (@ to mention)"
            }
            className="w-full bg-muted/50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground resize-none"
          />
        </div>

        <div className="flex items-center justify-between gap-2">
          <MusicPickerButton selected={music} onSelect={setMusic} />
        </div>

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={!canSubmit || createStory.isPending}
            className="rounded-lg"
          >
            {createStory.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Share Story"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StoriesPage() {
  const { data: storyGroups, isLoading } = useListStories();
  const [activeIndex, setActiveIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeGroup = storyGroups?.[activeIndex];
  const activeStory = activeGroup?.stories[Math.min(storyIndex, (activeGroup?.stories.length ?? 1) - 1)];

  const goPrev = () => {
    if (storyIndex > 0) {
      setStoryIndex(storyIndex - 1);
    } else if (activeIndex > 0) {
      const prevGroup = storyGroups?.[activeIndex - 1];
      setActiveIndex(activeIndex - 1);
      setStoryIndex(Math.max(0, (prevGroup?.stories.length ?? 1) - 1));
    }
  };

  const goNext = () => {
    if (activeGroup && storyIndex < activeGroup.stories.length - 1) {
      setStoryIndex(storyIndex + 1);
    } else if (storyGroups && activeIndex < storyGroups.length - 1) {
      setActiveIndex(activeIndex + 1);
      setStoryIndex(0);
    }
  };

  // Play the story's music while it is on screen.
  useEffect(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (activeStory?.musicUrl) {
      const audio = new Audio(activeStory.musicUrl);
      audio.loop = true;
      audio.play().catch(() => {
        // Autoplay may be blocked until the user interacts — that's fine.
      });
      audioRef.current = audio;
    }
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, [activeStory?.id, activeStory?.musicUrl]);

  if (isLoading) {
    return <MainLayout><div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
  }

  if (!storyGroups || storyGroups.length === 0 || !activeGroup || !activeStory) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
          <p className="text-muted-foreground">No stories to show right now.</p>
          <div className="flex gap-2">
            <CreateStoryDialog />
            <Link href="/">
              <Button variant="outline">Go Back Home</Button>
            </Link>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex justify-end mb-4">
        <CreateStoryDialog />
      </div>
      <div className="h-[80vh] flex items-center justify-center bg-black/5 rounded-2xl relative animate-in fade-in">
        <div className="relative w-full max-w-sm h-full max-h-[800px] bg-black rounded-2xl overflow-hidden shadow-2xl flex flex-col">
          {/* Progress bar */}
          <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
            {activeGroup.stories.map((s, i) => (
              <div key={s.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden">
                <div className={`h-full bg-white ${i <= Math.min(storyIndex, activeGroup.stories.length - 1) ? 'w-full' : 'w-0'}`} />
              </div>
            ))}
          </div>

          {/* Author Header */}
          <div className="absolute top-6 left-4 right-4 flex items-center gap-3 z-20">
            <img src={avatarSrc(activeGroup.author.avatarUrl)} className="w-10 h-10 rounded-full border border-white/20 object-cover" alt="" />
            <div className="min-w-0">
              <div className="font-bold text-white text-sm drop-shadow-md">{activeGroup.author.displayName}</div>
              {activeStory.musicUrl && (
                <div className="flex items-center gap-1 text-white/90 text-xs drop-shadow-md truncate">
                  <Music className="w-3 h-3 shrink-0" />
                  <span className="truncate">
                    {activeStory.musicTitle ?? "Music"}
                    {activeStory.musicArtist ? ` · ${activeStory.musicArtist}` : ""}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          {activeStory.storyType === "text" ? (
            <div
              className="w-full h-full flex items-center justify-center p-8"
              style={{ background: storyBackground(activeStory.backgroundStyle) }}
            >
              <span className="text-white text-2xl font-bold text-center whitespace-pre-wrap break-words drop-shadow-md">
                <RenderWithMentions content={activeStory.textContent ?? ""} />
              </span>
            </div>
          ) : activeStory.mediaType === "video" ? (
            <video src={activeStory.mediaUrl ?? undefined} className="w-full h-full object-cover" autoPlay loop muted />
          ) : (
            <img src={activeStory.mediaUrl ?? undefined} className="w-full h-full object-cover" alt="" />
          )}

          {/* Caption */}
          {activeStory.storyType !== "text" && activeStory.caption && (
            <div className="absolute bottom-6 left-4 right-4 text-white font-medium drop-shadow-md z-20 text-center bg-black/30 backdrop-blur-sm p-3 rounded-xl">
              <RenderWithMentions content={activeStory.caption} />
            </div>
          )}

          {/* Navigation Overlay */}
          <div className="absolute inset-0 flex z-10">
            <div className="w-1/2 h-full cursor-pointer" onClick={goPrev} />
            <div className="w-1/2 h-full cursor-pointer" onClick={goNext} />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
