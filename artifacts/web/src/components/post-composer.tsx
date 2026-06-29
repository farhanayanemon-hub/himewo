import { useEffect, useRef, useState } from "react";
import {
  useGetCurrentUser,
  useCreatePost,
  useGetMySettings,
  getGetFeedQueryKey,
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
import { Image as ImageIcon, Video, Loader2, X, Globe, Users, Lock, ChevronDown } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { uploadMedia, UploadUnavailableError, type UploadedMedia } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";
import { EmojiPickerButton } from "@/components/emoji-picker";

const PRIVACY_OPTIONS = [
  { value: PostInputPrivacy.public, label: "Public", icon: Globe },
  { value: PostInputPrivacy.friends, label: "Friends", icon: Users },
  { value: PostInputPrivacy.private, label: "Only me", icon: Lock },
] as const;

function settingToPrivacy(pv: string | undefined): PostInputPrivacy {
  if (pv === "only_me") return PostInputPrivacy.private;
  if (pv === "friends") return PostInputPrivacy.friends;
  return PostInputPrivacy.public;
}

export function PostComposer({ onPosted }: { onPosted?: () => void } = {}) {
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
    if (!content.trim() && media.length === 0) return;
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
          content,
          privacy: privacyReady ? privacy : undefined,
          media: mediaInput.length ? mediaInput : undefined,
        },
      },
      {
        onSuccess: () => {
          setContent("");
          setMedia([]);
          setPrivacyTouched(false);
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
          onPosted?.();
        },
      },
    );
  };

  return (
    <div className="bg-card border border-card-border rounded-2xl p-4 card-depth mb-6">
      <div className="flex gap-3">
        <img src={user?.avatarUrl || ""} className="w-10 h-10 rounded-full object-cover" alt="" />
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-foreground">
              {user?.displayName}
            </span>
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
          </div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={content || media.length ? 3 : 1}
            className="w-full bg-muted/50 border-none rounded-2xl px-4 py-2.5 text-base focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground resize-none"
            placeholder={`What's on your mind, ${user?.displayName?.split(" ")[0] || ""}?`}
          />
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

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      <div className="mt-3 pt-3 border-t border-border flex gap-2 items-center">
        <Button
          variant="ghost"
          className="flex-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {uploading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <ImageIcon className="w-5 h-5 mr-2 text-green-500" />}
          Photo
        </Button>
        <Button
          variant="ghost"
          className="flex-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Video className="w-5 h-5 mr-2 text-red-500" /> Video
        </Button>
        <div className="flex-1 flex justify-center">
          <EmojiPickerButton
            onSelect={(emoji) => setContent((prev) => prev + emoji)}
            className="w-full text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg flex items-center justify-center gap-2"
          />
        </div>
        <Button
          onClick={submit}
          disabled={(!content.trim() && media.length === 0) || createPost.isPending}
          className="rounded-lg px-6"
        >
          {createPost.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Post"}
        </Button>
      </div>
    </div>
  );
}
