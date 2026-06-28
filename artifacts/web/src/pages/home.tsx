import { useEffect, useRef, useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { PostCard } from "@/components/post-card";
import {
  useGetFeed,
  useGetCurrentUser,
  useCreatePost,
  useListFriends,
  useListStories,
  useListFriendRequests,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useGetTodaysBirthdays,
  getGetFeedQueryKey,
  getListFriendRequestsQueryKey,
  type MediaItemInput,
  type Post,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Video, Loader2, X, Plus, Cake } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@/lib/realtime";
import { Link } from "wouter";
import { uploadMedia, UploadUnavailableError, type UploadedMedia } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";
import { EmojiPickerButton } from "@/components/emoji-picker";

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
    <div className="bg-card border border-card-border rounded-2xl p-4 card-depth mb-6">
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

function StoryRow() {
  const { data: stories } = useListStories();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {/* Create Story */}
      <Link
        href="/stories"
        className="w-28 h-48 shrink-0 rounded-2xl relative overflow-hidden group cursor-pointer border border-card-border card-depth lift-on-hover bg-card"
      >
        <div className="h-2/3 overflow-hidden">
          <img
            src="https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80"
            className="w-full h-full object-cover"
            alt=""
          />
        </div>
        <div className="absolute top-[calc(66%-16px)] left-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white border-4 border-card">
          <Plus className="w-5 h-5" />
        </div>
        <div className="absolute bottom-2 left-0 right-0 text-center text-foreground text-xs font-semibold leading-tight px-1">
          Create Story
        </div>
      </Link>

      {/* Friends' stories */}
      {stories?.map((group) => (
        <Link
          key={group.author.id}
          href="/stories"
          className="w-28 h-48 shrink-0 rounded-2xl relative overflow-hidden group cursor-pointer border border-card-border card-depth lift-on-hover"
        >
          <img
            src={group.stories[0]?.mediaUrl || group.author.avatarUrl || ""}
            className="w-full h-full object-cover"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div
            className={`absolute top-3 left-3 w-9 h-9 rounded-full overflow-hidden border-[3px] ${group.hasUnseen ? "border-primary" : "border-white/60"}`}
          >
            <img src={group.author.avatarUrl || ""} className="w-full h-full object-cover" alt="" />
          </div>
          <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium leading-tight line-clamp-2">
            {group.author.displayName}
          </div>
        </Link>
      ))}
    </div>
  );
}

function FriendRequestsRail() {
  const { data: requests } = useListFriendRequests();
  const accept = useAcceptFriendRequest();
  const decline = useDeclineFriendRequest();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListFriendRequestsQueryKey() });
  };

  if (!requests?.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="text-foreground font-bold">Friend Requests</h3>
        <Link href="/friends" className="text-primary text-sm font-medium hover:underline">
          See all
        </Link>
      </div>
      <div className="space-y-2">
        {requests.slice(0, 4).map((req) => (
          <div key={req.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors">
            <Link href={`/profile/${req.requester.id}`}>
              <img src={req.requester.avatarUrl || ""} className="w-12 h-12 rounded-full object-cover bg-muted shrink-0" alt="" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile/${req.requester.id}`} className="font-semibold text-sm hover:underline block truncate">
                {req.requester.displayName}
              </Link>
              <div className="flex gap-1.5 mt-1">
                <button
                  onClick={() => accept.mutate({ id: req.id }, { onSuccess: invalidate })}
                  disabled={accept.isPending || decline.isPending}
                  className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  Confirm
                </button>
                <button
                  onClick={() => decline.mutate({ id: req.id }, { onSuccess: invalidate })}
                  disabled={accept.isPending || decline.isPending}
                  className="bg-muted text-foreground px-3 py-1 rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function BirthdaysRail() {
  const { data: birthdays } = useGetTodaysBirthdays();

  return (
    <div className="mb-6">
      <h3 className="text-foreground font-bold px-2 mb-2">Birthdays</h3>
      {!birthdays?.length ? (
        <div className="flex items-start gap-3 p-2 rounded-xl">
          <Cake className="w-8 h-8 text-primary shrink-0" />
          <p className="text-sm text-muted-foreground">
            Aaj karo birthday nei. Bondhura kichu add korle ekhane dekha jabe.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {birthdays.map((friend) => (
            <Link
              key={friend.id}
              href={`/profile/${friend.id}`}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="relative shrink-0">
                <img src={friend.avatarUrl || ""} className="w-9 h-9 rounded-full object-cover bg-muted" alt="" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                  <Cake className="w-3 h-3 text-white" />
                </div>
              </div>
              <p className="text-sm text-foreground">
                <span className="font-semibold">{friend.displayName}</span>
                <span className="text-muted-foreground">{" "}-er aaj birthday! 🎂</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function ContactsRail() {
  const { data: friends } = useListFriends();
  const realtime = useRealtime();

  return (
    <div>
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="text-foreground font-bold">Contacts</h3>
        <Link href="/friends" className="text-primary text-sm font-medium hover:underline">
          See all
        </Link>
      </div>
      {!friends?.length ? (
        <div className="p-2 text-sm text-muted-foreground text-center">No contacts yet.</div>
      ) : (
        <div className="space-y-1">
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
        </div>
      )}
    </div>
  );
}

function HomeRightRail() {
  return (
    <>
      <FriendRequestsRail />
      <BirthdaysRail />
      <ContactsRail />
    </>
  );
}

const FEED_PAGE_SIZE = 10;

export default function HomePage() {
  const [pages, setPages] = useState<Post[][]>([]);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const { data: page, isLoading, isFetching } = useGetFeed(
    { cursor, limit: FEED_PAGE_SIZE },
    { query: { queryKey: getGetFeedQueryKey({ cursor, limit: FEED_PAGE_SIZE }) } },
  );

  useEffect(() => {
    if (!page) return;
    setPages((prev) => {
      const next = [...prev];
      const idx = cursor === undefined ? 0 : next.length;
      next[idx] = page;
      return cursor === undefined ? [page] : next;
    });
    if (page.length < FEED_PAGE_SIZE) setHasMore(false);
  }, [page, cursor]);

  const posts = pages.flat();
  const lastId = posts.length ? posts[posts.length - 1].id : undefined;

  const loadMore = () => {
    if (!hasMore || isFetching || lastId === undefined) return;
    setCursor(lastId);
  };

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isFetching, lastId]);

  return (
    <MainLayout rightSidebar={<HomeRightRail />}>
      <div className="space-y-6">
        <StoryRow />

        <PostComposer />

        {/* Feed */}
        <div className="space-y-4">
          {isLoading && posts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">No posts yet. Make one!</div>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}

          {/* Infinite scroll sentinel */}
          {hasMore && posts.length > 0 && (
            <div ref={sentinelRef} className="py-6 flex justify-center">
              {isFetching ? (
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              ) : (
                <Button variant="ghost" onClick={loadMore} className="text-muted-foreground">
                  Load more
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
