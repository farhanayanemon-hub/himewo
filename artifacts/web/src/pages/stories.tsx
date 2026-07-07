import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import {
  useListStories,
  useCreateStory,
  getListStoriesQueryKey,
  type StoryInputMediaType,
} from "@workspace/api-client-react";
import { Loader2, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
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

function CreateStoryDialog() {
  const queryClient = useQueryClient();
  const createStory = useCreateStory();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [media, setMedia] = useState<UploadedMedia | null>(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const reset = () => {
    setMedia(null);
    setCaption("");
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

  const submit = () => {
    if (!media) return;
    createStory.mutate(
      {
        data: {
          mediaUrl: media.url,
          mediaType: media.type as StoryInputMediaType,
          caption: caption.trim() || undefined,
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

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <Button onClick={() => setOpen(true)} className="rounded-full gap-2">
        <Plus className="w-4 h-4" /> Create Story
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Story</DialogTitle>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files)}
        />

        {media ? (
          <div className="relative rounded-xl overflow-hidden border border-border bg-muted aspect-[9/16] max-h-[50vh] mx-auto">
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
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-full py-10 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:bg-muted/50 transition-colors flex flex-col items-center gap-2"
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
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={2}
          placeholder="Add a caption (optional)"
          className="w-full bg-muted/50 border-none rounded-xl px-4 py-2.5 text-sm focus:ring-1 focus:ring-primary focus:outline-none placeholder:text-muted-foreground resize-none"
        />

        <DialogFooter>
          <Button
            onClick={submit}
            disabled={!media || createStory.isPending}
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

  if (isLoading) {
    return <MainLayout><div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
  }

  if (!storyGroups || storyGroups.length === 0) {
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

  const activeGroup = storyGroups[activeIndex];
  // Simple viewer for now: taking the first story of the active group
  const activeStory = activeGroup.stories[0];

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
                <div className={`h-full bg-white ${i === 0 ? 'w-full' : 'w-0'}`} />
              </div>
            ))}
          </div>

          {/* Author Header */}
          <div className="absolute top-6 left-4 right-4 flex items-center gap-3 z-20">
            <img src={avatarSrc(activeGroup.author.avatarUrl)} className="w-10 h-10 rounded-full border border-white/20 object-cover" alt="" />
            <div>
              <div className="font-bold text-white text-sm drop-shadow-md">{activeGroup.author.displayName}</div>
            </div>
          </div>

          {/* Media */}
          {activeStory.mediaType === "video" ? (
             <video src={activeStory.mediaUrl} className="w-full h-full object-cover" autoPlay loop muted />
          ) : (
             <img src={activeStory.mediaUrl} className="w-full h-full object-cover" alt="" />
          )}

          {/* Caption */}
          {activeStory.caption && (
            <div className="absolute bottom-6 left-4 right-4 text-white font-medium drop-shadow-md z-20 text-center bg-black/30 backdrop-blur-sm p-3 rounded-xl">
              {activeStory.caption}
            </div>
          )}

          {/* Navigation Overlay */}
          <div className="absolute inset-0 flex z-10">
            <div 
              className="w-1/2 h-full cursor-pointer" 
              onClick={() => setActiveIndex(Math.max(0, activeIndex - 1))}
            />
            <div 
              className="w-1/2 h-full cursor-pointer" 
              onClick={() => setActiveIndex(Math.min(storyGroups.length - 1, activeIndex + 1))}
            />
          </div>
        </div>
      </div>
    </MainLayout>
  );
}