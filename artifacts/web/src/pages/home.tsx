import { useRef, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { PostCard } from "@/components/post-card";
import {
  useGetFeed,
  useGetCurrentUser,
  useCreatePost,
  useListFriends,
  getGetFeedQueryKey,
  type MediaItemInput,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Smile, Loader2, X, Plus } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@/lib/realtime";
import { Link } from "wouter";
import { uploadMedia, UploadUnavailableError, type UploadedMedia } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";

function PostComposer() {
  const { data: user } = useGetCurrentUser();
  const createPost = useCreatePost();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [content, setContent] = useState("");
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);

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
    createPost.mutate(
      { data: { content, media: mediaInput.length ? mediaInput : undefined } },
      {
        onSuccess: () => {
          setContent("");
          setMedia([]);
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        },
      },
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm mb-6">
      <div className="flex gap-3">
        <img src={user?.avatarUrl || ""} className="w-10 h-10 rounded-full object-cover" alt="" />
        <div className="flex-1">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={content || media.length ? 3 : 1}
            className="w-full bg-muted/50 border-none rounded-2xl px-4 py-2.5 text-base focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground resize-none"
            placeholder={`Ki obostha, ${user?.displayName?.split(" ")[0] || ""}?`}
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
        <Button variant="ghost" className="flex-1 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg">
          <Smile className="w-5 h-5 mr-2 text-yellow-500" /> Feeling
        </Button>
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

function ContactsSidebar() {
  const { data: friends } = useListFriends();
  const realtime = useRealtime();

  if (!friends?.length) {
    return <div className="p-2 text-sm text-muted-foreground text-center">No contacts yet.</div>;
  }

  return (
    <>
      {friends.map((friend) => {
        const online = realtime.isOnline(friend.id);
        return (
          <Link
            key={friend.id}
            href={`/messages`}
            className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
          >
            <div className="relative">
              <img src={friend.avatarUrl || ""} className="w-8 h-8 rounded-full object-cover bg-muted" alt="" />
              {online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-card rounded-full" />}
            </div>
            <span className="font-medium text-sm">{friend.displayName}</span>
          </Link>
        );
      })}
    </>
  );
}

export default function HomePage() {
  const { data: feed, isLoading } = useGetFeed();

  return (
    <MainLayout rightSidebar={<ContactsSidebar />}>
      <div className="space-y-6">
        {/* Stories */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <Link href="/stories" className="w-28 h-48 shrink-0 rounded-xl relative overflow-hidden group cursor-pointer border border-border">
            <img src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80" className="w-full h-full object-cover opacity-80" alt="" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-3 left-3 right-3 text-white text-sm font-medium leading-tight">Create Story</div>
            <div className="absolute top-3 left-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white border-2 border-white">
              <Plus className="w-4 h-4" />
            </div>
          </Link>
        </div>

        <PostComposer />

        {/* Feed */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-10 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : feed?.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">No posts yet. Make one!</div>
          ) : (
            feed?.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </div>
    </MainLayout>
  );
}
