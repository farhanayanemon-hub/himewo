import { useEffect, useRef, useState } from "react";
import { avatarSrc } from "@/lib/avatar";
import { useActingPage } from "@/lib/acting-page";
import {
  useGetCurrentUser,
  useCreatePost,
  useGetMySettings,
  getGetFeedQueryKey,
  getGetGroupPostsQueryKey,
  getGetPagePostsQueryKey,
  PostInputPrivacy,
  type MediaItemInput,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Image as ImageIcon, Video, Loader2, X, Globe, Users, Lock, ChevronDown, BarChart3, Plus, Smile, MapPin, Search, MoreHorizontal, SmilePlus, AtSign, Megaphone } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadMedia, UploadUnavailableError, type UploadedMedia } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";
import EmojiPicker, { type EmojiClickData, Theme } from "emoji-picker-react";
import {
  MentionSuggestions,
  activeMentionQuery,
  pickMention,
  applyMentionTokens,
  HIGHLIGHT_ID,
  HIGHLIGHT_TOKEN,
  type MentionTarget,
} from "@/components/mention";

const PRIVACY_OPTIONS = [
  { value: PostInputPrivacy.public, label: "Public", icon: Globe },
  { value: PostInputPrivacy.friends, label: "Friends", icon: Users },
  { value: PostInputPrivacy.private, label: "Only me", icon: Lock },
] as const;

type FeelingItem = { verb: string; label: string; emoji: string };

const FEELINGS: FeelingItem[] = [
  { verb: "feeling", label: "happy", emoji: "😊" },
  { verb: "feeling", label: "blessed", emoji: "😇" },
  { verb: "feeling", label: "loved", emoji: "🥰" },
  { verb: "feeling", label: "excited", emoji: "🤩" },
  { verb: "feeling", label: "grateful", emoji: "🙏" },
  { verb: "feeling", label: "relaxed", emoji: "😌" },
  { verb: "feeling", label: "sad", emoji: "😢" },
  { verb: "feeling", label: "tired", emoji: "😴" },
  { verb: "feeling", label: "angry", emoji: "😠" },
  { verb: "feeling", label: "sick", emoji: "🤒" },
  { verb: "feeling", label: "proud", emoji: "🥲" },
  { verb: "feeling", label: "motivated", emoji: "💪" },
];

const ACTIVITIES: FeelingItem[] = [
  { verb: "celebrating", label: "a birthday", emoji: "🎉" },
  { verb: "watching", label: "a movie", emoji: "🎬" },
  { verb: "listening to", label: "music", emoji: "🎵" },
  { verb: "eating", label: "delicious food", emoji: "🍔" },
  { verb: "drinking", label: "coffee", emoji: "☕" },
  { verb: "traveling to", label: "a new place", emoji: "✈️" },
  { verb: "reading", label: "a book", emoji: "📖" },
  { verb: "playing", label: "games", emoji: "🎮" },
  { verb: "working out", label: "at the gym", emoji: "🏋️" },
  { verb: "studying", label: "hard", emoji: "📚" },
  { verb: "shopping", label: "for something nice", emoji: "🛍️" },
  { verb: "praying", label: "", emoji: "🤲" },
];

function settingToPrivacy(pv: string | undefined): PostInputPrivacy {
  if (pv === "only_me") return PostInputPrivacy.private;
  if (pv === "friends") return PostInputPrivacy.friends;
  return PostInputPrivacy.public;
}

export function PostComposer({
  onPosted,
  groupId,
  pageId,
}: {
  onPosted?: () => void;
  groupId?: number;
  pageId?: number;
} = {}) {
  // Group/page posts get their reach from membership / page ownership, not the
  // author's default audience — so we hide the privacy picker in that context.
  const inCommunity = groupId != null || pageId != null;
  const { actingPage } = useActingPage();
  // On the normal feed, honor the acting-page identity so posts appear from the
  // page. An explicit page/group timeline (pageId/groupId) always wins.
  const composePageId =
    pageId ?? (groupId == null ? (actingPage?.id ?? undefined) : undefined);
  const { data: user } = useGetCurrentUser();
  const { data: settings } = useGetMySettings();
  const createPost = useCreatePost();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  const [privacy, setPrivacy] = useState<PostInputPrivacy>(PostInputPrivacy.public);
  const [privacyTouched, setPrivacyTouched] = useState(false);
  const [showPoll, setShowPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [feeling, setFeeling] = useState<FeelingItem | null>(null);
  const [feelingOpen, setFeelingOpen] = useState(false);
  const [feelingTab, setFeelingTab] = useState<"feelings" | "activities">(
    "feelings",
  );
  const [feelingSearch, setFeelingSearch] = useState("");
  const [location, setLocation] = useState("");
  const [showLocation, setShowLocation] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const mentionQuery = activeMentionQuery(content);
  // Profiles picked from the mention dropdown. The textarea shows friendly
  // "@Name" text; these targets convert it to real tokens on submit.
  const [mentionTargets, setMentionTargets] = useState<MentionTarget[]>([]);

  // Append text to the composer (used by the Mention / Highlight actions),
  // making sure there's a space before the inserted token.
  const appendToContent = (text: string) => {
    setContent((prev) =>
      prev.length === 0 || prev.endsWith(" ") || prev.endsWith("\n")
        ? prev + text
        : `${prev} ${text}`,
    );
    // Radix returns focus to the trigger after the menu closes — refocus the
    // textarea afterwards so the user can keep typing.
    setTimeout(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    }, 50);
  };

  const filledOptions = pollOptions.map((o) => o.trim()).filter(Boolean);
  const pollValid =
    showPoll && pollQuestion.trim().length > 0 && filledOptions.length >= 2;
  const pollInvalid = showPoll && !pollValid;

  const resetPoll = () => {
    setShowPoll(false);
    setPollQuestion("");
    setPollOptions(["", ""]);
  };

  // Pre-fill the audience from the user's default post-visibility setting,
  // unless the user has already changed the picker for this post.
  useEffect(() => {
    if (!privacyTouched && settings) {
      setPrivacy(settingToPrivacy(settings.postVisibility));
    }
  }, [settings, privacyTouched]);

  const activePrivacy =
    PRIVACY_OPTIONS.find((o) => o.value === privacy) ?? PRIVACY_OPTIONS[0];

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const uploaded = await uploadMedia(file);
        setMedia((prev) => [...prev, uploaded]);
      } catch (err) {
        if (err instanceof UploadUnavailableError) {
          const url = window.prompt(
            "Direct upload isn't available in this environment. Paste an image or video URL instead:",
          );
          if (url) {
            setMedia((prev) => [
              ...prev,
              { url, type: file.type.startsWith("video") ? "video" : "image" },
            ]);
          }
        } else {
          toast({ title: "Upload failed", description: "Please try again." });
        }
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = () => {
    if (!content.trim() && media.length === 0 && !pollValid) return;
    if (pollInvalid) return;
    const mediaInput: MediaItemInput[] = media.map((m, i) => ({
      url: m.url,
      type: m.type,
      position: i,
    }));
    // Only send an explicit `privacy` when we can trust it: either the user
    // picked one, or their default setting has loaded so the picker reflects it.
    // Otherwise omit it and let the server apply the user's default — never
    // force `public` before settings resolve (would silently over-share).
    const privacyReady = privacyTouched || Boolean(settings);
    createPost.mutate(
      {
        data: {
          content: applyMentionTokens(content, mentionTargets),
          // Community posts don't carry an author-chosen audience.
          privacy: inCommunity ? undefined : privacyReady ? privacy : undefined,
          groupId,
          pageId: composePageId,
          media: mediaInput.length ? mediaInput : undefined,
          poll: pollValid
            ? { question: pollQuestion.trim(), options: filledOptions }
            : undefined,
          feelingVerb: feeling?.verb || undefined,
          feeling: feeling?.label || undefined,
          feelingEmoji: feeling?.emoji || undefined,
          location: location.trim() || undefined,
        },
      },
      {
        onSuccess: () => {
          setContent("");
          setMentionTargets([]);
          setMedia([]);
          setPrivacyTouched(false);
          resetPoll();
          setFeeling(null);
          setLocation("");
          setShowLocation(false);
          if (groupId != null) {
            queryClient.invalidateQueries({
              queryKey: getGetGroupPostsQueryKey(groupId),
            });
          } else if (pageId != null) {
            queryClient.invalidateQueries({
              queryKey: getGetPagePostsQueryKey(pageId),
            });
          } else {
            queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
          }
          onPosted?.();
        },
      },
    );
  };

  return (
    <div className="aurora-glass-card rounded-2xl p-4 mb-6">
      <div className="flex gap-3">
        <img src={avatarSrc(actingPage?.avatarUrl ?? user?.avatarUrl)} className="w-10 h-10 rounded-full object-cover" alt="" />
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {actingPage?.name ?? user?.displayName}
            </span>
            {!inCommunity && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted/70 transition-colors"
                >
                  <activePrivacy.icon className="w-3.5 h-3.5" />
                  {activePrivacy.label}
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-44">
                {PRIVACY_OPTIONS.map((opt) => (
                  <DropdownMenuItem
                    key={opt.value}
                    onSelect={() => {
                      setPrivacy(opt.value);
                      setPrivacyTouched(true);
                    }}
                    className="gap-2"
                  >
                    <opt.icon className="w-4 h-4" />
                    {opt.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            )}
          </div>
          <div className="relative">
            {mentionQuery !== null && (
              <MentionSuggestions
                query={mentionQuery}
                onSelect={(p) => {
                  const picked = pickMention(content, mentionTargets, p);
                  setContent(picked.text);
                  setMentionTargets(picked.targets);
                  textareaRef.current?.focus();
                }}
              />
            )}
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={content || media.length ? 3 : 1}
              className="w-full bg-muted/50 border-none rounded-2xl px-4 py-2.5 text-base focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground resize-none"
              placeholder={`What's on your mind, ${(actingPage?.name ?? user?.displayName)?.split(" ")[0] || ""}?`}
            />
          </div>
        </div>
      </div>

      {media.length > 0 && (
        <div className="mt-3 grid grid-cols-3 gap-2">
          {media.map((m, i) => (
            <div key={i} className="relative rounded-lg overflow-hidden border border-border aspect-square bg-muted">
              {m.type === "video" ? (
                <video src={m.url} className="w-full h-full object-cover" />
              ) : (
                <img src={m.url} className="w-full h-full object-cover" alt="" />
              )}
              <button
                onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showPoll && (
        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3 space-y-2 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-foreground">Poll</span>
            <button
              type="button"
              onClick={resetPoll}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Remove poll"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <input
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            placeholder="Ask a question..."
            maxLength={200}
            className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {pollOptions.map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                value={opt}
                onChange={(e) =>
                  setPollOptions((prev) =>
                    prev.map((o, idx) => (idx === i ? e.target.value : o)),
                  )
                }
                placeholder={`Option ${i + 1}`}
                maxLength={100}
                className="flex-1 bg-background border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              {pollOptions.length > 2 && (
                <button
                  type="button"
                  onClick={() =>
                    setPollOptions((prev) => prev.filter((_, idx) => idx !== i))
                  }
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={`Remove option ${i + 1}`}
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 6 && (
            <button
              type="button"
              onClick={() => setPollOptions((prev) => [...prev, ""])}
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <Plus className="w-4 h-4" /> Add option
            </button>
          )}
        </div>
      )}

      {(feeling || showLocation || location) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {feeling && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
              <span>{feeling.emoji}</span>
              <span>
                {feeling.verb}
                {feeling.label ? ` ${feeling.label}` : ""}
              </span>
              <button
                type="button"
                onClick={() => setFeeling(null)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove feeling"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
          {(showLocation || location) && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm">
              <MapPin className="w-3.5 h-3.5 text-red-500" />
              <input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Where are you?"
                maxLength={100}
                autoFocus={showLocation && !location}
                className="bg-transparent outline-none placeholder:text-muted-foreground w-32"
              />
              <button
                type="button"
                onClick={() => {
                  setLocation("");
                  setShowLocation(false);
                }}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remove location"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          )}
        </div>
      )}

      {feelingOpen && (
        <div className="mt-3 rounded-xl border border-border bg-muted/30 p-3 animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setFeelingTab("feelings")}
                className={`rounded-full px-3 py-1 text-sm font-medium ${feelingTab === "feelings" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                Feelings
              </button>
              <button
                type="button"
                onClick={() => setFeelingTab("activities")}
                className={`rounded-full px-3 py-1 text-sm font-medium ${feelingTab === "activities" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                Activities
              </button>
            </div>
            <button
              type="button"
              onClick={() => setFeelingOpen(false)}
              className="text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              value={feelingSearch}
              onChange={(e) => setFeelingSearch(e.target.value)}
              placeholder="Search..."
              className="w-full bg-background border border-border rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="grid grid-cols-2 gap-1 max-h-56 overflow-y-auto">
            {(feelingTab === "feelings" ? FEELINGS : ACTIVITIES)
              .filter((f) =>
                `${f.verb} ${f.label}`
                  .toLowerCase()
                  .includes(feelingSearch.trim().toLowerCase()),
              )
              .map((f) => (
                <button
                  key={`${f.verb}-${f.label}`}
                  type="button"
                  onClick={() => {
                    setFeeling(f);
                    setFeelingOpen(false);
                    setFeelingSearch("");
                  }}
                  className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-left hover:bg-muted transition-colors"
                >
                  <span className="text-lg">{f.emoji}</span>
                  <span>
                    {f.verb}
                    {f.label ? ` ${f.label}` : ""}
                  </span>
                </button>
              ))}
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {showEmoji && (
        <div className="mt-3 rounded-xl border border-border overflow-hidden animate-in fade-in slide-in-from-top-1">
          <EmojiPicker
            onEmojiClick={(data: EmojiClickData) =>
              setContent((prev) => prev + data.emoji)
            }
            theme={
              document.documentElement.classList.contains("dark")
                ? Theme.DARK
                : Theme.LIGHT
            }
            width="100%"
            height={320}
            lazyLoadEmojis
          />
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-border flex gap-1 sm:gap-2 items-center min-w-0">
        <Button
          variant="ghost"
          aria-label="Add photo"
          className="flex-1 min-w-0 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ImageIcon className="w-5 h-5 text-green-500" />}
          <span className="hidden sm:inline ml-1">Photo</span>
        </Button>
        <Button
          variant="ghost"
          aria-label="Add video"
          className="flex-1 min-w-0 px-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Video className="w-5 h-5 text-red-500" />
          <span className="hidden sm:inline ml-1">Video</span>
        </Button>
        <Button
          variant="ghost"
          aria-label="Add poll"
          className={`flex-1 min-w-0 px-2 hover:text-foreground hover:bg-muted/50 rounded-lg ${showPoll ? "text-primary" : "text-muted-foreground"}`}
          onClick={() => (showPoll ? resetPoll() : setShowPoll(true))}
        >
          <BarChart3 className="w-5 h-5 text-amber-500" />
          <span className="hidden sm:inline ml-1">Poll</span>
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              aria-label="More options"
              className={`flex-1 min-w-0 px-2 hover:text-foreground hover:bg-muted/50 rounded-lg ${feeling || feelingOpen || showLocation || location || showEmoji ? "text-primary" : "text-muted-foreground"}`}
            >
              <MoreHorizontal className="w-5 h-5 text-purple-500" />
              <span className="hidden sm:inline ml-1">More</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onSelect={() => setFeelingOpen((v) => !v)}
              className="gap-2"
            >
              <Smile className="w-4 h-4 text-yellow-500" />
              Feeling / Activity
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setShowLocation((v) => !v)}
              className="gap-2"
            >
              <MapPin className="w-4 h-4 text-red-500" />
              Check in
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => setShowEmoji((v) => !v)}
              className="gap-2"
            >
              <SmilePlus className="w-4 h-4 text-teal-500" />
              Emoji
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => appendToContent("@")}
              className="gap-2"
            >
              <AtSign className="w-4 h-4 text-blue-500" />
              Mention someone
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={() => {
                // If a real user named "Highlight" is already mentioned,
                // plain "@Highlight" would be ambiguous — use the raw token.
                const clash = mentionTargets.some(
                  (t) => t.displayName === "Highlight" && t.id !== HIGHLIGHT_ID,
                );
                appendToContent(clash ? `${HIGHLIGHT_TOKEN} ` : "@Highlight ");
                if (!clash) {
                  setMentionTargets((prev) =>
                    prev.some((t) => t.id === HIGHLIGHT_ID)
                      ? prev
                      : [...prev, { id: HIGHLIGHT_ID, displayName: "Highlight" }],
                  );
                }
              }}
              className="gap-2"
            >
              <Megaphone className="w-4 h-4 text-pink-500" />
              Highlight (all friends)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          onClick={submit}
          disabled={
            (!content.trim() && media.length === 0 && !pollValid) ||
            pollInvalid ||
            createPost.isPending
          }
          className="rounded-lg px-4 sm:px-6 shrink-0 aurora-button"
        >
          {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
        </Button>
      </div>
    </div>
  );
}
