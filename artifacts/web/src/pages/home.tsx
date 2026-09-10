import { useEffect, useRef, useState } from "react";
import { avatarSrc } from "@/lib/avatar";
import { MainLayout } from "@/components/layout/main-layout";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { SponsoredCard } from "@/components/sponsored-card";
import { ReelsShelf } from "@/components/reels-shelf";
import { ShopShowcaseShelf } from "@/components/shop-showcase-shelf";
import { CreateMediaLauncherModal, type LauncherResult } from "@/components/create-media-launcher-modal";
import { StoryReelEditor } from "@/components/story-reel-editor";
import { TextStoryCreator } from "@/components/text-story-creator";
import {
  useGetFeed,
  useServeAds,
  useListFriends,
  useListStories,
  useListFriendRequests,
  useAcceptFriendRequest,
  useDeclineFriendRequest,
  useGetTodaysBirthdays,
  useGetFriendSuggestions,
  useSendFriendRequest,
  getGetFeedQueryKey,
  getListFriendRequestsQueryKey,
  getGetFriendSuggestionsQueryKey,
  getListStoriesQueryKey,
  getListReelsQueryKey,
  useCreateStory,
  useCreateReel,
  StoryInputMediaType,
  StoryInputAudience,
  StoryInputStoryType,
  type StoryInput,
  type ReelInput,
  type Post,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Cake, Clapperboard, BookImage, Film } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@/lib/realtime";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import { Link } from "wouter";

// Tracks which story groups have been viewed locally
const VIEWED_STORIES_KEY = "himewo_viewed_stories";
function getViewedStories(): Set<string> {
  try {
    const raw = localStorage.getItem(VIEWED_STORIES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch {
    return new Set();
  }
}
function markStoryViewed(key: string) {
  const viewed = getViewedStories();
  viewed.add(key);
  localStorage.setItem(VIEWED_STORIES_KEY, JSON.stringify([...viewed]));
}

function StoryRow() {
  const { data: stories } = useListStories();
  const { user } = useAuth();
  const { actingPage } = useActingPage();
  const qc = useQueryClient();
  const createStory = useCreateStory();
  const createReel = useCreateReel();

  // ── Plus menu state ────────────────────────────────────────────────────────
  const [showCreateMenu, setShowCreateMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // ── Launcher & editor state ───────────────────────────────────────────────
  const [launcherMode, setLauncherMode] = useState<"story" | "reel" | null>(null);
  const [editorFile, setEditorFile] = useState<{ file: File; filterCss: string; mode: "story" | "reel" } | null>(null);
  const [showTextCreator, setShowTextCreator] = useState(false);

  // ── Viewed stories state ──────────────────────────────────────────────────
  const [viewedStories, setViewedStories] = useState<Set<string>>(() => getViewedStories());

  // Close menu on outside click
  useEffect(() => {
    if (!showCreateMenu) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowCreateMenu(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCreateMenu]);

  const openLauncher = (mode: "story" | "reel") => {
    setShowCreateMenu(false);
    setLauncherMode(mode);
  };

  const handleFileReady = (result: LauncherResult, mode: "story" | "reel") => {
    setEditorFile({ file: result.file, filterCss: result.filterCss, mode });
    setLauncherMode(null);
  };

  const handleEditorSubmit = async (data: {
    mediaUrl: string;
    mediaType: "video" | "image";
    caption: string;
    musicUrl?: string;
    musicTitle?: string;
    musicArtist?: string;
    filterCss?: string;
    trimStart?: number;
    trimEnd?: number;
    speed?: number;
  }) => {
    if (!editorFile) return;
    if (editorFile.mode === "story") {
      await createStory.mutateAsync({ data: {
        storyType: StoryInputStoryType.media,
        mediaType: data.mediaType === "video" ? StoryInputMediaType.video : StoryInputMediaType.image,
        mediaUrl: data.mediaUrl,
        caption: data.caption,
        musicUrl: data.musicUrl,
        musicTitle: data.musicTitle,
        musicArtist: data.musicArtist,
        audience: StoryInputAudience.public,
      } as StoryInput });
      qc.invalidateQueries({ queryKey: getListStoriesQueryKey() });
    } else {
      await createReel.mutateAsync({ data: {
        videoUrl: data.mediaUrl,
        caption: data.caption,
        musicUrl: data.musicUrl,
        musicTitle: data.musicTitle,
        musicArtist: data.musicArtist,
      } as ReelInput });
        qc.invalidateQueries({ queryKey: getListReelsQueryKey() });
        qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        qc.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey;
            return Array.isArray(k) && (k[0] === "user-reels" || k[0] === "user-profile-reels");
          },
        });
        window.dispatchEvent(new CustomEvent("himewo:reel-created"));
    }
    setEditorFile(null);
  };

  // Sort stories: own story pinned first, then others
  const myId = actingPage ? `p${actingPage.id}` : user?.id;
  const sortedStories = stories
    ? [
        ...(stories.filter((g) => (g.authorPage ? `p${g.authorPage.id}` : g.author.id) === myId)),
        ...(stories.filter((g) => (g.authorPage ? `p${g.authorPage.id}` : g.author.id) !== myId)),
      ]
    : [];

  return (
    <>
    {/* Launcher modals */}
    {launcherMode && (
      <CreateMediaLauncherModal
        open={!!launcherMode}
        onOpenChange={(v) => { if (!v) setLauncherMode(null); }}
        mode={launcherMode}
        onFileReady={(r) => handleFileReady(r, launcherMode!)}
        onTextStory={() => { setLauncherMode(null); setShowTextCreator(true); }}
      />
    )}
    {editorFile && (
      <StoryReelEditor
        file={editorFile.file}
        type={editorFile.mode}
        initialFilter={editorFile.filterCss}
        onClose={() => setEditorFile(null)}
        onSubmit={handleEditorSubmit}
      />
    )}
    {showTextCreator && (
      <TextStoryCreator
        onClose={() => setShowTextCreator(false)}
        onPublished={() => qc.invalidateQueries({ queryKey: getListStoriesQueryKey() })}
      />
    )}

    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {/* ── Single + create button with popup menu ── */}
      <div ref={menuRef} className="relative shrink-0">
        <button
          id="create-content-btn"
          onClick={() => setShowCreateMenu((v) => !v)}
          className="w-28 h-48 shrink-0 rounded-2xl relative overflow-hidden group cursor-pointer border border-card-border card-depth lift-on-hover bg-card"
        >
          <div className="h-2/3 overflow-hidden">
            <img
              src={avatarSrc(actingPage ? actingPage.avatarUrl : user?.avatarUrl)}
              className="w-full h-full object-cover"
              alt=""
            />
          </div>
          <div className="absolute top-[calc(66%-16px)] left-1/2 -translate-x-1/2 w-9 h-9 rounded-full aurora-button flex items-center justify-center text-white border-4 border-card transition-transform duration-200 group-hover:scale-110">
            <Plus className="w-5 h-5" />
          </div>
          <div className="absolute bottom-2 left-0 right-0 text-center text-foreground text-xs font-semibold leading-tight px-1">
            Create
          </div>
        </button>

        {/* Popup menu */}
        {showCreateMenu && (
          <div className="absolute left-0 top-full mt-2 z-50 min-w-[160px] bg-card border border-card-border rounded-2xl shadow-xl overflow-hidden animate-in fade-in-0 zoom-in-95 duration-150">
            <button
              id="create-story-menu-btn"
              onClick={() => openLauncher("story")}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                <BookImage className="w-4 h-4 text-primary" />
              </div>
              Create Story
            </button>
            <div className="h-px bg-border/60 mx-3" />
            <button
              id="create-reel-menu-btn"
              onClick={() => openLauncher("reel")}
              className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-foreground hover:bg-muted/60 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-fuchsia-500/15 flex items-center justify-center shrink-0">
                <Film className="w-4 h-4 text-fuchsia-500" />
              </div>
              Create Reel
            </button>
          </div>
        )}
      </div>

      {/* Stories — own story pinned first, viewed ones get grey ring */}
      {sortedStories.map((group) => {
        const groupKey = group.authorPage ? `p${group.authorPage.id}` : group.author.id;
        const isOwn = groupKey === myId;
        const isViewed = viewedStories.has(groupKey);
        // unseen = server says unseen AND not locally viewed
        const hasUnseen = group.hasUnseen && !isViewed;
        return (
          <Link
            key={groupKey}
            href="/stories"
            onClick={() => {
              markStoryViewed(groupKey);
              setViewedStories(new Set([...viewedStories, groupKey]));
            }}
            className="w-28 h-48 shrink-0 rounded-2xl relative overflow-hidden group cursor-pointer border border-card-border card-depth lift-on-hover"
          >
            <img
              src={group.stories[0]?.mediaUrl || avatarSrc(group.authorPage?.avatarUrl ?? group.author.avatarUrl)}
              className="w-full h-full object-cover"
              alt=""
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
            <div
              className={`absolute top-3 left-3 rounded-full ${
                isOwn
                  ? "aurora-story-ring"
                  : hasUnseen
                  ? "aurora-story-ring"
                  : "p-[2px] bg-white/30 grayscale"
              }`}
            >
              <img src={avatarSrc(group.authorPage?.avatarUrl ?? group.author.avatarUrl)} className="w-8 h-8 rounded-full object-cover border-2 border-black/40" alt="" />
            </div>
            <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium leading-tight line-clamp-2">
              {isOwn ? "Your Story" : (group.authorPage?.name ?? group.author.displayName)}
            </div>
          </Link>
        );
      })}
    </div>
    </>
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
            <Link href={`/${req.requester.username || req.requester.id}`}>
              <img src={avatarSrc(req.requester.avatarUrl)} className="w-12 h-12 rounded-full object-cover bg-muted shrink-0" alt="" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/${req.requester.username || req.requester.id}`} className="font-semibold text-sm hover:underline block truncate">
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
            No birthdays today. They'll show up here once your friends add theirs.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {birthdays.map((friend) => (
            <Link
              key={friend.id}
              href={`/${friend.username || friend.id}`}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="relative shrink-0">
                <img src={avatarSrc(friend.avatarUrl)} className="w-9 h-9 rounded-full object-cover bg-muted" alt="" />
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                  <Cake className="w-3 h-3 text-primary-foreground" />
                </div>
              </div>
              <p className="text-sm text-foreground">
                <span className="font-semibold">{friend.displayName}</span>
                <span className="text-muted-foreground">{" "}has a birthday today! 🎂</span>
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
                  <img src={avatarSrc(friend.avatarUrl)} className="w-8 h-8 rounded-full object-cover bg-muted" alt="" />
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

function PeopleYouMayKnowRail() {
  const { data: suggestions } = useGetFriendSuggestions();
  const sendRequest = useSendFriendRequest();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetFriendSuggestionsQueryKey() });
  };

  if (!suggestions?.length) return null;

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between px-2 mb-2">
        <h3 className="text-foreground font-bold">People You May Know</h3>
        <Link href="/friends" className="text-primary text-sm font-medium hover:underline">
          See all
        </Link>
      </div>
      <div className="space-y-2">
        {suggestions.slice(0, 3).map((user) => (
          <div key={user.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-muted/40 transition-colors">
            <Link href={`/${user.username || user.id}`}>
              <img src={avatarSrc(user.avatarUrl)} className="w-12 h-12 rounded-full object-cover bg-muted shrink-0" alt="" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/${user.username || user.id}`} className="font-semibold text-sm hover:underline block truncate">
                {user.displayName}
              </Link>
              {user.mutualFriendsCount > 0 && (
                <div className="text-xs text-muted-foreground">
                  {user.mutualFriendsCount} mutual friend{user.mutualFriendsCount > 1 ? "s" : ""}
                </div>
              )}
              <button
                onClick={() => sendRequest.mutate({ data: { addresseeId: user.id } }, { onSuccess: invalidate })}
                disabled={sendRequest.isPending}
                className="mt-1 text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-md disabled:opacity-50 flex items-center gap-1"
              >
                {sendRequest.isPending && sendRequest.variables?.data.addresseeId === user.id && <Loader2 className="w-3 h-3 animate-spin" />}
                Add Friend
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function HomeRightRail() {
  return (
    <>
      <FriendRequestsRail />
      <PeopleYouMayKnowRail />
      <BirthdaysRail />
      <ContactsRail />
    </>
  );
}

const FEED_PAGE_SIZE = 10;

export default function HomePage() {
  const qc = useQueryClient();
  const { actingPage } = useActingPage();
  const [pages, setPages] = useState<Post[][]>([]);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [hasMore, setHasMore] = useState(true);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleReelCreated = () => {
      qc.invalidateQueries({ queryKey: getGetFeedQueryKey() });
      qc.invalidateQueries({ queryKey: getListReelsQueryKey() });
    };
    window.addEventListener("himewo:reel-created", handleReelCreated);
    return () => window.removeEventListener("himewo:reel-created", handleReelCreated);
  }, [qc]);

  const feedParams = {
    cursor,
    limit: FEED_PAGE_SIZE,
    ...(actingPage ? { pageId: actingPage.id } : {}),
  };
  const { data: page, isLoading, isFetching } = useGetFeed(feedParams, {
    query: { queryKey: getGetFeedQueryKey(feedParams) },
  });

  // Switching identity (self <-> page) changes what the feed returns, so reset
  // the accumulated pages and start again from the top.
  useEffect(() => {
    setPages([]);
    setCursor(undefined);
    setHasMore(true);
  }, [actingPage?.id]);

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

  // The first page can contain boosted (hoisted) posts for new users; an old
  // boosted post may legitimately reappear at its natural chronological spot
  // on a later page, so dedupe by id to keep list keys unique.
  const seenIds = new Set<number>();
  const posts = pages.flat().filter((p) => {
    if (seenIds.has(p.id)) return false;
    seenIds.add(p.id);
    return true;
  });
  // Next cursor must come from the RAW last fetched page (not the deduped
  // render list) — if a page were all duplicates, the deduped list's last id
  // wouldn't advance and pagination would stall on the same cursor.
  const lastRawPage = pages.length ? pages[pages.length - 1] : undefined;
  const lastId = lastRawPage?.length
    ? lastRawPage[lastRawPage.length - 1].id
    : undefined;

  const { data: ads } = useServeAds({ placement: "feed", limit: 3 });
  const AD_EVERY = 5;

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
      <div className="space-y-2 sm:space-y-3.5">
        {/* Seamless Facebook-Style Unified Card for Stories + Composer */}
        <div className="aurora-glass-card rounded-none sm:rounded-2xl border-x-0 sm:border-x border-y sm:border border-card-border shadow-sm space-y-3 p-3 sm:p-3.5">
          <StoryRow />
          <div className="border-t border-border/60" />
          <PostComposer className="mb-0 shadow-none border-0 bg-transparent p-0" />
        </div>

        <ShopShowcaseShelf />

        {/* Feed */}
        <div className="space-y-2 sm:space-y-3.5">
          {isLoading && posts.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Loader2 className="w-6 h-6 animate-spin mx-auto" />
            </div>
          ) : posts.length === 0 ? (
            <div className="space-y-4">
              <div className="text-center py-10 text-muted-foreground bg-card border-x-0 sm:border border-border rounded-none sm:rounded-xl">
                No posts yet. Create one!
              </div>
              <ReelsShelf />
            </div>
          ) : (
            posts.map((post, i) => {
              const adIdx = Math.floor(i / AD_EVERY);
              const showAd =
                i > 0 && i % AD_EVERY === 0 && ads && ads[adIdx - 1];
              // Reels section appears after 4-5 posts (index 3), or after last post if fewer than 4 posts
              const showReelsShelf = i === 3 || (posts.length < 4 && i === posts.length - 1);
              return (
                <div key={post.id} className="space-y-2 sm:space-y-3.5">
                  {showAd && <SponsoredCard ad={ads[adIdx - 1]} />}
                  <PostCard post={post} />
                  {showReelsShelf && (
                    <div className="pt-1">
                      <ReelsShelf />
                    </div>
                  )}
                </div>
              );
            })
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
