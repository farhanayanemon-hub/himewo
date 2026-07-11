import { useEffect, useRef, useState } from "react";
import { avatarSrc } from "@/lib/avatar";
import { MainLayout } from "@/components/layout/main-layout";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { SponsoredCard } from "@/components/sponsored-card";
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
  type Post,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Cake, Clapperboard } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useRealtime } from "@/lib/realtime";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import { Link } from "wouter";

function StoryRow() {
  const { data: stories } = useListStories();
  const { user } = useAuth();
  const { actingPage } = useActingPage();

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
      {/* Create Story */}
      <Link
        href="/stories"
        className="w-28 h-48 shrink-0 rounded-2xl relative overflow-hidden group cursor-pointer border border-card-border card-depth lift-on-hover bg-card"
      >
        <div className="h-2/3 overflow-hidden">
          <img
            src={avatarSrc(actingPage?.avatarUrl ?? user?.avatarUrl)}
            className="w-full h-full object-cover"
            alt=""
          />
        </div>
        <div className="absolute top-[calc(66%-16px)] left-1/2 -translate-x-1/2 w-9 h-9 rounded-full aurora-button flex items-center justify-center text-white border-4 border-card">
          <Plus className="w-5 h-5" />
        </div>
        <div className="absolute bottom-2 left-0 right-0 text-center text-foreground text-xs font-semibold leading-tight px-1">
          Create Story
        </div>
      </Link>

      {/* Create Reel */}
      <Link
        href="/reels"
        className="w-28 h-48 shrink-0 rounded-2xl relative overflow-hidden group cursor-pointer border border-card-border card-depth lift-on-hover bg-card"
      >
        <div className="h-2/3 overflow-hidden bg-gradient-to-br from-purple-500 via-fuchsia-500 to-pink-500 flex items-center justify-center">
          <Clapperboard className="w-9 h-9 text-white/90" />
        </div>
        <div className="absolute top-[calc(66%-16px)] left-1/2 -translate-x-1/2 w-9 h-9 rounded-full aurora-button flex items-center justify-center text-white border-4 border-card">
          <Plus className="w-5 h-5" />
        </div>
        <div className="absolute bottom-2 left-0 right-0 text-center text-foreground text-xs font-semibold leading-tight px-1">
          Create Reel
        </div>
      </Link>

      {/* Friends' stories */}
      {stories?.map((group) => (
        <Link
          key={group.authorPage ? `p${group.authorPage.id}` : group.author.id}
          href="/stories"
          className="w-28 h-48 shrink-0 rounded-2xl relative overflow-hidden group cursor-pointer border border-card-border card-depth lift-on-hover"
        >
          <img
            src={group.stories[0]?.mediaUrl || avatarSrc(group.authorPage?.avatarUrl ?? group.author.avatarUrl)}
            className="w-full h-full object-cover"
            alt=""
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          <div
            className={`absolute top-3 left-3 rounded-full ${group.hasUnseen ? "aurora-story-ring" : "p-[2px] bg-white/60"}`}
          >
            <img src={avatarSrc(group.authorPage?.avatarUrl ?? group.author.avatarUrl)} className="w-8 h-8 rounded-full object-cover border-2 border-black/40" alt="" />
          </div>
          <div className="absolute bottom-2 left-2 right-2 text-white text-xs font-medium leading-tight line-clamp-2">
            {group.authorPage?.name ?? group.author.displayName}
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
              <img src={avatarSrc(req.requester.avatarUrl)} className="w-12 h-12 rounded-full object-cover bg-muted shrink-0" alt="" />
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
            No birthdays today. They'll show up here once your friends add theirs.
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
            <Link href={`/profile/${user.id}`}>
              <img src={avatarSrc(user.avatarUrl)} className="w-12 h-12 rounded-full object-cover bg-muted shrink-0" alt="" />
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={`/profile/${user.id}`} className="font-semibold text-sm hover:underline block truncate">
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
            <div className="text-center py-10 text-muted-foreground bg-card border border-border rounded-xl">No posts yet. Create one!</div>
          ) : (
            posts.map((post, i) => {
              const adIdx = Math.floor(i / AD_EVERY);
              const showAd =
                i > 0 && i % AD_EVERY === 0 && ads && ads[adIdx - 1];
              return (
                <div key={post.id} className="space-y-4">
                  {showAd && <SponsoredCard ad={ads[adIdx - 1]} />}
                  <PostCard post={post} />
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
