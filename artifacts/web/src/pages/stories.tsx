import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import { useActingPage } from "@/lib/acting-page";
import { useAuth } from "@/lib/auth";
import {
  useListStories,
  useCreateStory,
  useSetStoryReaction,
  useRemoveStoryReaction,
  useReplyToStory,
  useDeleteStory,
  getListStoriesQueryKey,
  StoryInputAudience,
  type StoryInputMediaType,
  type ReactionType,
} from "@workspace/api-client-react";
import { Image as ImageIcon, Loader2, Music, Plus, Send, Trash2, Type, X } from "lucide-react";
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
  const { actingPage } = useActingPage();
  const pageFields = actingPage ? { pageId: actingPage.id } : {};
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captionRef = useRef<HTMLTextAreaElement>(null);

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"media" | "text">("media");
  const [audience, setAudience] = useState<StoryInputAudience>(
    StoryInputAudience.public,
  );
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
    setAudience(StoryInputAudience.public);
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
                audience,
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
                ...pageFields,
              }
            : {
                storyType: "text",
                audience,
                textContent: applyMentionTokens(textContent, mentionTargets).trim(),
                backgroundStyle: background,
                ...(music
                  ? {
                      musicUrl: music.url,
                      musicTitle: music.title,
                      musicArtist: music.artist ?? undefined,
                    }
                  : {}),
                ...pageFields,
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

        {/* Audience selector — who can see this story */}
        <div className="flex gap-2">
          {(
            [
              { value: StoryInputAudience.public, label: "Public" },
              { value: StoryInputAudience.friends, label: "Friends" },
              { value: StoryInputAudience.private, label: "Only me" },
            ] as const
          ).map((a) => (
            <button
              key={a.value}
              type="button"
              onClick={() => setAudience(a.value)}
              className={`flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors ${audience === a.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted/50"}`}
            >
              {a.label}
            </button>
          ))}
        </div>

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

const REPLY_CHIPS = ["too cute", "👏", "🔥🔥", "😍", "haha"];

// Full Facebook reaction set, shown in a tray so all seven are reachable.
const STORY_REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "like" as ReactionType, emoji: "👍", label: "Like" },
  { type: "love" as ReactionType, emoji: "❤️", label: "Love" },
  { type: "care" as ReactionType, emoji: "🥰", label: "Care" },
  { type: "haha" as ReactionType, emoji: "😆", label: "Haha" },
  { type: "wow" as ReactionType, emoji: "😮", label: "Wow" },
  { type: "sad" as ReactionType, emoji: "😢", label: "Sad" },
  { type: "angry" as ReactionType, emoji: "😡", label: "Angry" },
];

export default function StoriesPage() {
  const { data: storyGroups, isLoading } = useListStories();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeIndex, setActiveIndex] = useState(0);
  const [storyIndex, setStoryIndex] = useState(0);
  const [replyText, setReplyText] = useState("");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const setReaction = useSetStoryReaction();
  const removeReaction = useRemoveStoryReaction();
  const replyStory = useReplyToStory();
  const deleteStory = useDeleteStory();

  const activeGroup = storyGroups?.[activeIndex];
  const activeStory = activeGroup?.stories[Math.min(storyIndex, (activeGroup?.stories.length ?? 1) - 1)];
  const isOwnStory = !!activeStory && !!user && activeStory.author?.id === user.id;

  // Keep the selected group/story in range whenever the list changes (e.g. after
  // deleting a story, a whole group may disappear).
  useEffect(() => {
    if (!storyGroups || storyGroups.length === 0) return;
    setActiveIndex((ai) => Math.min(ai, storyGroups.length - 1));
  }, [storyGroups]);
  useEffect(() => {
    const len = activeGroup?.stories.length ?? 0;
    if (len > 0) setStoryIndex((si) => Math.min(si, len - 1));
  }, [activeGroup?.stories.length]);

  const handleDelete = () => {
    if (!activeStory) return;
    if (!window.confirm("Delete this story? This cannot be undone.")) return;
    deleteStory.mutate(
      { id: activeStory.id },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListStoriesQueryKey() });
          setStoryIndex(0);
          toast({ title: "Story deleted" });
        },
        onError: () => toast({ title: "Could not delete", description: "Please try again." }),
      },
    );
  };

  const react = (type: ReactionType) => {
    if (!activeStory) return;
    const onSuccess = () =>
      queryClient.invalidateQueries({ queryKey: getListStoriesQueryKey() });
    if (activeStory.viewerReaction === type) {
      removeReaction.mutate({ id: activeStory.id }, { onSuccess });
    } else {
      setReaction.mutate({ id: activeStory.id, data: { type } }, { onSuccess });
    }
  };

  const sendReply = (text: string) => {
    const trimmed = text.trim();
    if (!activeStory || !trimmed) return;
    replyStory.mutate(
      { id: activeStory.id, data: { text: trimmed } },
      {
        onSuccess: () => {
          setReplyText("");
          toast({ title: "Sent", description: "Your reply was sent as a message." });
        },
        onError: () => toast({ title: "Could not send", description: "Please try again." }),
      },
    );
  };

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
            <img src={avatarSrc(activeGroup.authorPage?.avatarUrl ?? activeGroup.author.avatarUrl)} className="w-10 h-10 rounded-full border border-white/20 object-cover" alt="" />
            <div className="min-w-0">
              <div className="font-bold text-white text-sm drop-shadow-md">{activeGroup.authorPage?.name ?? activeGroup.author.displayName}</div>
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
            <div className="absolute bottom-36 left-4 right-4 text-white font-medium drop-shadow-md z-20 text-center bg-black/30 backdrop-blur-sm p-3 rounded-xl">
              <RenderWithMentions content={activeStory.caption} />
            </div>
          )}

          {/* Navigation Overlay */}
          <div className="absolute inset-0 flex z-10">
            <div className="w-1/2 h-full cursor-pointer" onClick={goPrev} />
            <div className="w-1/2 h-full cursor-pointer" onClick={goNext} />
          </div>

          {/* Reactions + reply footer (Facebook-style) */}
          <div className="absolute bottom-0 left-0 right-0 z-30 p-3 space-y-2 bg-gradient-to-t from-black/70 via-black/30 to-transparent">
            {activeStory.reactionCount > 0 && (
              <div className="text-center text-white/80 text-xs">
                {activeStory.reactionCount} reaction{activeStory.reactionCount > 1 ? "s" : ""}
              </div>
            )}

            {isOwnStory ? (
              /* Your own story: no reply/react to yourself — offer delete. */
              <div className="flex items-center justify-between gap-3 rounded-full bg-white/10 backdrop-blur-md border border-white/25 px-4 py-2">
                <span className="text-white/90 text-sm">This is your story.</span>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteStory.isPending}
                  className="flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  {deleteStory.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Delete story
                </button>
              </div>
            ) : (
              <>
                {/* Full reaction tray — all seven reachable */}
                <div className="flex justify-center gap-1.5">
                  {STORY_REACTIONS.map((r) => (
                    <button
                      key={r.type}
                      type="button"
                      onClick={() => react(r.type)}
                      aria-label={`React ${r.label}`}
                      title={r.label}
                      className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-transform hover:scale-125 ${
                        activeStory.viewerReaction === r.type
                          ? "bg-white/30 scale-110"
                          : "bg-white/10"
                      }`}
                    >
                      {r.emoji}
                    </button>
                  ))}
                </div>

                {/* Quick reply chips */}
                <div className="flex flex-wrap justify-center gap-2">
                  {REPLY_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      type="button"
                      onClick={() => sendReply(chip)}
                      disabled={replyStory.isPending}
                      className="px-4 py-1.5 rounded-full bg-white/15 backdrop-blur-md text-white text-sm font-medium hover:bg-white/25 transition-colors disabled:opacity-50"
                    >
                      {chip}
                    </button>
                  ))}
                </div>

                {/* Reply box */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    sendReply(replyText);
                  }}
                >
                  <div className="flex items-center gap-2 rounded-full bg-white/10 backdrop-blur-md border border-white/30 px-3 py-1.5">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Send message..."
                      maxLength={5000}
                      className="flex-1 bg-transparent text-white text-sm placeholder:text-white/70 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={!replyText.trim() || replyStory.isPending}
                      aria-label="Send reply"
                      className="text-white disabled:opacity-40"
                    >
                      {replyStory.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
