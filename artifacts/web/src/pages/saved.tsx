import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import { Bookmark, Loader2, MapPin, ImagePlus, X, Play, Heart } from "lucide-react";
import { Link } from "wouter";
import {
  useListSavedItems,
  useUnsaveItem,
  getListSavedItemsQueryKey,
  getGetFeedQueryKey,
  getListReelsQueryKey,
  getListMarketplaceListingsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { PostCard } from "@/components/post-card";

function formatPrice(price: number, currency = "BDT") {
  if (price === 0) return "Free";
  const symbol = currency === "BDT" ? "৳" : currency + " ";
  return `${symbol}${price.toLocaleString()}`;
}

export default function SavedPage() {
  const { data: items, isLoading } = useListSavedItems();
  const queryClient = useQueryClient();
  const unsaveItem = useUnsaveItem();

  const unsaveListing = (entityId: number) => {
    unsaveItem.mutate(
      { entityType: "listing", entityId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetFeedQueryKey() });
        },
      },
    );
  };

  const unsaveReel = (entityId: number) => {
    unsaveItem.mutate(
      { entityType: "reel", entityId },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListReelsQueryKey() });
        },
      },
    );
  };

  const savedPosts = (items ?? []).filter((i) => i.entityType === "post" && i.post);
  const savedListings = (items ?? []).filter(
    (i) => i.entityType === "listing" && i.listing,
  );
  const savedReels = (items ?? []).filter((i) => i.entityType === "reel" && i.reel);
  const isEmpty = !isLoading && (items?.length ?? 0) === 0;

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-2xl p-6 card-depth animate-in fade-in mb-5">
        <h1 className="text-xl font-bold flex items-center gap-2 mb-2">
          <Bookmark className="w-6 h-6 text-primary" /> Saved
        </h1>
        <p className="text-muted-foreground text-sm">
          Your saved posts, reels, and items will live here.
        </p>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : isEmpty ? (
        <div className="bg-card border border-border rounded-2xl p-6 card-depth">
          <div className="flex flex-col items-center text-center py-12">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Bookmark className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-foreground font-semibold">Nothing saved yet</p>
            <p className="text-muted-foreground text-sm mt-1 max-w-sm">
              Save anything you like from your Feed or Shop, and find it
              here later.
            </p>
            <Link
              href="/"
              className="mt-5 bg-primary text-primary-foreground px-5 py-2 rounded-lg text-sm font-semibold"
            >
              Go to Feed
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {savedListings.length > 0 && (
            <div>
              <h2 className="font-bold text-lg px-1 mb-3">Saved items</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {savedListings.map((i) => {
                  const item = i.listing!;
                  return (
                    <div
                      key={i.id}
                      className="bg-card border border-border rounded-2xl overflow-hidden card-depth lift-on-hover relative"
                    >
                      <button
                        onClick={() => unsaveListing(item.id)}
                        disabled={unsaveItem.isPending}
                        aria-label="Unsave item"
                        title="Unsave"
                        className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div>
                        <div className="aspect-square bg-muted relative">
                          {item.photos[0] ? (
                            <img
                              src={item.photos[0]}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                              <ImagePlus className="w-8 h-8" />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-extrabold text-[15px]">
                            {formatPrice(item.price, item.currency)}
                          </p>
                          <p className="text-sm line-clamp-1">{item.title}</p>
                          {item.location && (
                            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1">
                              <MapPin className="w-3 h-3" /> {item.location}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {savedReels.length > 0 && (
            <div>
              <h2 className="font-bold text-lg px-1 mb-3">Saved reels</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {savedReels.map((i) => {
                  const reel = i.reel!;
                  return (
                    <div
                      key={i.id}
                      className="bg-card border border-border rounded-2xl overflow-hidden card-depth lift-on-hover relative"
                    >
                      <button
                        onClick={() => unsaveReel(reel.id)}
                        disabled={unsaveItem.isPending}
                        aria-label="Unsave reel"
                        title="Unsave"
                        className="absolute top-2 right-2 z-10 bg-black/60 text-white rounded-full p-1.5 hover:bg-black/80"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <Link href="/reels">
                        <div className="aspect-[9/16] bg-black relative cursor-pointer group">
                          {reel.thumbnailUrl ? (
                            <img
                              src={reel.thumbnailUrl}
                              alt={reel.caption ?? "Reel"}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <video
                              src={reel.videoUrl}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                            />
                          )}
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors">
                            <div className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center">
                              <Play className="w-6 h-6 text-white fill-white" />
                            </div>
                          </div>
                          <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 text-white">
                            <img
                              src={avatarSrc(reel.author.avatarUrl)}
                              className="w-6 h-6 rounded-full object-cover border border-white/30"
                              alt=""
                            />
                            <span className="text-xs font-semibold drop-shadow-md line-clamp-1">
                              {reel.author.displayName}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <div className="p-3">
                        {reel.caption && (
                          <p className="text-sm line-clamp-2">{reel.caption}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                          <Heart className="w-3 h-3" /> {reel.likeCount}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {savedPosts.length > 0 && (
            <div>
              <h2 className="font-bold text-lg px-1 mb-3">Saved posts</h2>
              <div className="space-y-4">
                {savedPosts.map((i) => (
                  <PostCard key={i.id} post={i.post!} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </MainLayout>
  );
}
