import { useRef } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetFollowedShopShowcase,
  type ShopProduct,
  type ShopStall,
} from "@workspace/api-client-react";
import { avatarSrc } from "@/lib/avatar";
import { formatTaka } from "@/pages/shop";
import {
  Store,
  ChevronLeft,
  ChevronRight,
  ShoppingBag,
  MapPin,
  Globe,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function ShopShowcaseShelf() {
  const { data: showcase, isLoading } = useGetFollowedShopShowcase();
  const [, setLocation] = useLocation();

  if (isLoading || !showcase || showcase.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 my-6">
      <div className="flex items-center justify-between px-3 sm:px-1">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-foreground flex items-center gap-1.5">
              From Shops You Follow
              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 font-semibold">
                Shop Feed
              </span>
            </h2>
            <p className="text-xs text-muted-foreground">
              Browse the latest products from community stalls
            </p>
          </div>
        </div>
        <Link
          href="/shop"
          className="text-xs font-semibold text-purple-600 hover:text-purple-700 hover:underline flex items-center gap-1"
        >
          Explore All Shops →
        </Link>
      </div>

      {showcase.map((item, idx) => (
        <ShopShowcaseCard key={item.stall.id || idx} stall={item.stall} products={item.products} />
      ))}
    </div>
  );
}

function ShopShowcaseCard({
  stall,
  products,
}: {
  stall: ShopStall;
  products: ShopProduct[];
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const offset = direction === "left" ? -260 : 260;
      scrollRef.current.scrollBy({ left: offset, behavior: "smooth" });
    }
  };

  return (
    <div className="bg-card border-x-0 sm:border-x border-y sm:border border-border/80 rounded-none sm:rounded-3xl p-3.5 sm:p-5 card-depth shadow-sm hover:border-border transition-colors">
      {/* Shop Header */}
      <div className="flex items-center justify-between gap-3 mb-3.5 pb-3 border-b border-border/50">
        <Link
          href={`/shop/stalls/${stall.id}`}
          className="flex items-center gap-3 min-w-0 group cursor-pointer"
        >
          <div className="w-11 h-11 rounded-2xl bg-muted overflow-hidden shrink-0 border border-border/60 group-hover:scale-105 transition-transform">
            {stall.avatarUrl ? (
              <img
                src={avatarSrc(stall.avatarUrl)}
                alt={stall.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-purple-600 bg-purple-500/10">
                <Store className="w-5 h-5" />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-sm sm:text-base text-foreground group-hover:text-purple-600 truncate transition-colors flex items-center gap-1.5">
              {stall.name}
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 border border-purple-500/20">
                Shop
              </span>
            </h3>
            <div className="flex items-center gap-2 text-xs text-muted-foreground truncate mt-0.5">
              <span>{stall.followerCount ?? 0} followers</span>
              {stall.address && (
                <>
                  <span>·</span>
                  <span className="flex items-center gap-0.5 truncate max-w-[150px]">
                    <MapPin className="w-3 h-3 text-purple-500 shrink-0" />
                    {stall.address}
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* Action button & Carousel arrows */}
        <div className="flex items-center gap-1.5 shrink-0">
          <Link href={`/shop/stalls/${stall.id}`}>
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs font-semibold rounded-xl hover:bg-purple-500/10 hover:text-purple-600 border-border/80"
            >
              Visit Shop
            </Button>
          </Link>
          <button
            type="button"
            onClick={() => scroll("left")}
            aria-label="Previous products"
            className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center transition-colors press"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll("right")}
            aria-label="Next products"
            className="w-8 h-8 rounded-xl bg-muted/60 hover:bg-muted text-foreground flex items-center justify-center transition-colors press"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Swipeable Products Carousel */}
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none scroll-smooth snap-x"
      >
        {products.map((prod) => (
          <div
            key={prod.id}
            onClick={() => setLocation(`/shop/products/${prod.id}`)}
            className="w-40 sm:w-44 shrink-0 rounded-2xl bg-muted/30 hover:bg-muted/60 border border-border/60 hover:border-purple-500/40 p-2.5 transition-all cursor-pointer group snap-start flex flex-col"
          >
            <div className="aspect-square rounded-xl bg-background overflow-hidden relative mb-2">
              {prod.photos?.[0] ? (
                <img
                  src={prod.photos[0]}
                  alt={prod.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ShoppingBag className="w-8 h-8 opacity-40" />
                </div>
              )}
              <div className="absolute top-1.5 left-1.5">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-black/70 text-white backdrop-blur-md">
                  {formatTaka(prod.priceCents)}
                </span>
              </div>
            </div>

            <h4 className="font-bold text-xs text-foreground group-hover:text-purple-600 truncate leading-snug">
              {prod.name}
            </h4>

            <div className="mt-auto pt-2 flex items-center justify-between text-[11px] text-muted-foreground">
              <span className="text-purple-600 dark:text-purple-400 font-semibold group-hover:underline">
                View product →
              </span>
              {prod.stockQty > 0 ? (
                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium">
                  In stock
                </span>
              ) : (
                <span className="text-[10px] text-red-500 font-medium">Out of stock</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
