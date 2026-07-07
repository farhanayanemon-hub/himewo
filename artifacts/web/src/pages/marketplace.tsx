import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import {
  useListMarketplaceListings,
  useGetMarketplaceListing,
  useCreateMarketplaceListing,
  useGetSellingDashboard,
  useUpdateMarketplaceListing,
  useDeleteMarketplaceListing,
  useGeocodeLocation,
  getGeocodeLocationQueryKey,
  useCreateConversation,
  useSaveItem,
  useUnsaveItem,
  getListMarketplaceListingsQueryKey,
  getGetSellingDashboardQueryKey,
  getGetMarketplaceListingQueryKey,
  getListConversationsQueryKey,
  getListSavedItemsQueryKey,
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Store,
  Search,
  Plus,
  MapPin,
  Tag,
  ArrowLeft,
  X,
  ImagePlus,
  Trash2,
  CheckCircle2,
  PackageOpen,
  Bookmark,
  LocateFixed,
  Loader2 as Spinner,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";

function useDebounced<T>(value: T, delay = 400): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

const RADIUS_OPTIONS = [5, 10, 25, 50, 100, 200];

/** Text input with OpenStreetMap (free) location suggestions. */
function LocationAutocomplete({
  value,
  onChange,
  onPick,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (r: { displayName: string; lat: number; lng: number }) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(value.trim(), 400);
  const boxRef = useRef<HTMLDivElement>(null);
  const { data: results, isFetching } = useGeocodeLocation(
    { q: debounced },
    {
      query: {
        enabled: debounced.length >= 2,
        queryKey: getGeocodeLocationQueryKey({ q: debounced }),
      },
    },
  );

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative" ref={boxRef}>
      <div className="relative">
        <MapPin className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder ?? "Search a city or area"}
          className="pl-9"
        />
        {isFetching && (
          <Spinner className="w-4 h-4 animate-spin absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        )}
      </div>
      {open && debounced.length >= 2 && results && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full bg-card border border-border rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                onPick(r);
                onChange(r.displayName);
                setOpen(false);
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-muted flex items-start gap-2"
            >
              <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-muted-foreground" />
              <span className="line-clamp-2">{r.displayName}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export const CATEGORIES = [
  { value: "vehicles", label: "Vehicles" },
  { value: "property", label: "Property Rentals" },
  { value: "electronics", label: "Electronics" },
  { value: "home", label: "Home & Garden" },
  { value: "clothing", label: "Clothing & Accessories" },
  { value: "hobbies", label: "Hobbies & Toys" },
  { value: "family", label: "Family" },
  { value: "free", label: "Free Stuff" },
  { value: "other", label: "Miscellaneous" },
];

export const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "used_like_new", label: "Used - Like New" },
  { value: "used_good", label: "Used - Good" },
  { value: "used_fair", label: "Used - Fair" },
];

export function formatPrice(price: number, currency = "BDT") {
  if (price === 0) return "Free";
  const symbol = currency === "BDT" ? "৳" : currency + " ";
  return `${symbol}${price.toLocaleString()}`;
}

function categoryLabel(value: string) {
  return CATEGORIES.find((c) => c.value === value)?.label ?? "Miscellaneous";
}

function conditionLabel(value: string) {
  return CONDITIONS.find((c) => c.value === value)?.label ?? value;
}

/* ---------------- Browse ---------------- */
export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | undefined>(undefined);
  const [locText, setLocText] = useState("");
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radiusKm, setRadiusKm] = useState(25);
  const [locating, setLocating] = useState(false);

  const clearLocation = () => {
    setCenter(null);
    setLocText("");
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLocText("My current location");
        setLocating(false);
      },
      () => {
        setLocating(false);
        alert("Could not get your location. Please search for a place instead.");
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  };

  const { data: listings, isLoading } = useListMarketplaceListings({
    ...(category ? { category } : {}),
    ...(search.trim() ? { search: search.trim() } : {}),
    ...(center ? { lat: center.lat, lng: center.lng, radiusKm } : {}),
  });

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-2xl p-5 card-depth mb-5 animate-in fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">Marketplace</h1>
              <p className="text-xs text-muted-foreground">Buy and sell, all in one place</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/marketplace/selling">
              <Button variant="secondary" className="press">
                <PackageOpen className="w-4 h-4 mr-2" /> Selling
              </Button>
            </Link>
            <Link href="/marketplace/create">
              <Button className="press">
                <Plus className="w-4 h-4 mr-2" /> Create listing
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search Marketplace"
            className="pl-9 rounded-full"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="flex-1">
            <LocationAutocomplete
              value={locText}
              onChange={(v) => {
                setLocText(v);
                setCenter(null);
              }}
              onPick={(r) => setCenter({ lat: r.lat, lng: r.lng })}
              placeholder="Filter by location (e.g. Dhaka)"
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            className="press shrink-0"
            onClick={useMyLocation}
            disabled={locating}
          >
            {locating ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <LocateFixed className="w-4 h-4 mr-1.5" />
            )}
            Near me
          </Button>
        </div>

        {center && (
          <div className="flex items-center gap-2 mb-4 text-sm">
            <span className="text-muted-foreground">Within</span>
            <Select
              value={String(radiusKm)}
              onValueChange={(v) => setRadiusKm(Number(v))}
            >
              <SelectTrigger className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RADIUS_OPTIONS.map((r) => (
                  <SelectItem key={r} value={String(r)}>
                    {r} km
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              onClick={clearLocation}
              className="inline-flex items-center gap-1 text-primary hover:underline press"
            >
              <X className="w-3.5 h-3.5" /> Clear
            </button>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          <button
            onClick={() => setCategory(undefined)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium press transition-colors ${
              !category ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategory(cat.value)}
              className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium press transition-colors ${
                category === cat.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/70"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <h2 className="font-bold text-lg px-1 mb-3">
        {search.trim() || category ? "Results" : "Today's picks"}
      </h2>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !listings || listings.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border rounded-2xl card-depth">
          <Store className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No listings yet. Be the first to create one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {listings.map((item) => (
            <Link key={item.id} href={`/marketplace/${item.id}`}>
              <div className="bg-card border border-border rounded-2xl overflow-hidden card-depth lift-on-hover cursor-pointer">
                <div className="aspect-square bg-muted relative">
                  {item.photos[0] ? (
                    <img src={item.photos[0]} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImagePlus className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="font-extrabold text-[15px]">{formatPrice(item.price, item.currency)}</p>
                  <p className="text-sm line-clamp-1">{item.title}</p>
                  {item.location && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1">
                      <MapPin className="w-3 h-3" /> {item.location}
                    </p>
                  )}
                  {item.distanceKm != null && (
                    <p className="text-xs font-medium text-primary mt-0.5">
                      {item.distanceKm < 1
                        ? "Less than 1 km away"
                        : `${Math.round(item.distanceKm)} km away`}
                    </p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </MainLayout>
  );
}

/* ---------------- Detail ---------------- */
export function MarketplaceListingPage() {
  const { id } = useParams<{ id: string }>();
  const listingId = Number(id);
  const { data: listing, isLoading } = useGetMarketplaceListing(listingId);
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const updateListing = useUpdateMarketplaceListing();
  const deleteListing = useDeleteMarketplaceListing();
  const createConversation = useCreateConversation();
  const saveItem = useSaveItem();
  const unsaveItem = useUnsaveItem();
  const [activePhoto, setActivePhoto] = useState(0);

  const messageSeller = () => {
    if (!listing) return;
    createConversation.mutate(
      { data: { type: "direct", memberIds: [listing.seller.id] } },
      {
        onSuccess: (conv) => {
          queryClient.invalidateQueries({ queryKey: getListConversationsQueryKey() });
          navigate(`/messages/${conv.id}`);
        },
      },
    );
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetMarketplaceListingQueryKey(listingId) });
    queryClient.invalidateQueries({ queryKey: getGetSellingDashboardQueryKey() });
  };

  const invalidateSaved = () => {
    invalidate();
    queryClient.invalidateQueries({ queryKey: getListSavedItemsQueryKey() });
  };

  const toggleSave = () => {
    if (!listing) return;
    if (listing.viewerHasSaved) {
      unsaveItem.mutate(
        { entityType: "listing", entityId: listingId },
        { onSuccess: invalidateSaved },
      );
    } else {
      saveItem.mutate(
        { data: { entityType: "listing", entityId: listingId } },
        { onSuccess: invalidateSaved },
      );
    }
  };

  const savePending = saveItem.isPending || unsaveItem.isPending;

  if (isLoading) {
    return (
      <MainLayout>
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!listing) {
    return (
      <MainLayout>
        <div className="py-16 text-center text-muted-foreground">Listing not found</div>
      </MainLayout>
    );
  }

  const isOwner = listing.viewerIsSeller;
  const photos = listing.photos.length ? listing.photos : [];

  return (
    <MainLayout>
      <Link href="/marketplace">
        <Button variant="ghost" className="mb-3 press">
          <ArrowLeft className="w-4 h-4 mr-2" /> Marketplace
        </Button>
      </Link>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-2xl overflow-hidden card-depth">
          <div className="aspect-square bg-muted relative">
            {photos[activePhoto] ? (
              <img src={photos[activePhoto]} alt={listing.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ImagePlus className="w-12 h-12" />
              </div>
            )}
            {listing.status === "sold" && (
              <div className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs font-bold px-3 py-1 rounded-full">
                SOLD
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {photos.map((p, i) => (
                <button
                  key={i}
                  onClick={() => setActivePhoto(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden shrink-0 border-2 ${
                    i === activePhoto ? "border-primary" : "border-transparent"
                  }`}
                >
                  <img src={p} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div className="bg-card border border-border rounded-2xl p-5 card-depth">
            <h1 className="text-2xl font-extrabold">{listing.title}</h1>
            <p className="text-2xl font-extrabold text-primary mt-1">
              {formatPrice(listing.price, listing.currency)}
            </p>
            <div className="flex flex-wrap gap-2 mt-3 text-sm">
              <span className="inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full">
                <Tag className="w-3.5 h-3.5" /> {categoryLabel(listing.category)}
              </span>
              <span className="inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full">
                {conditionLabel(listing.condition)}
              </span>
              {listing.location && (
                <span className="inline-flex items-center gap-1 bg-muted px-2.5 py-1 rounded-full">
                  <MapPin className="w-3.5 h-3.5" /> {listing.location}
                </span>
              )}
            </div>

            {listing.description && (
              <>
                <h3 className="font-bold mt-5 mb-1">Description</h3>
                <p className="text-[15px] whitespace-pre-wrap">{listing.description}</p>
              </>
            )}

            <h3 className="font-bold mt-5 mb-2">Seller</h3>
            <Link href={`/profile/${listing.seller.id}`}>
              <div className="flex items-center gap-3 hover:bg-muted/50 rounded-xl p-2 -mx-2 transition-colors cursor-pointer">
                <div className="w-11 h-11 rounded-full bg-muted overflow-hidden">
                  {listing.seller.avatarUrl ? (
                    <img src={avatarSrc(listing.seller.avatarUrl)} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <p className="font-semibold">{listing.seller.displayName}</p>
                  <p className="text-xs text-muted-foreground">@{listing.seller.username}</p>
                </div>
              </div>
            </Link>

            {isOwner ? (
              <div className="flex gap-2 mt-5">
                <Button
                  variant={listing.status === "sold" ? "secondary" : "default"}
                  className="flex-1 press"
                  disabled={updateListing.isPending}
                  onClick={() =>
                    updateListing.mutate(
                      {
                        id: listingId,
                        data: { status: listing.status === "sold" ? "available" : "sold" },
                      },
                      { onSuccess: invalidate },
                    )
                  }
                >
                  {updateListing.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {listing.status === "sold" ? "Mark available" : "Mark as sold"}
                </Button>
                <Button
                  variant="secondary"
                  className="press"
                  disabled={savePending}
                  aria-label={listing.viewerHasSaved ? "Unsave listing" : "Save listing"}
                  title={listing.viewerHasSaved ? "Saved — click to unsave" : "Save listing"}
                  onClick={toggleSave}
                >
                  {savePending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bookmark
                      className={`w-4 h-4 ${listing.viewerHasSaved ? "text-primary" : ""}`}
                      fill={listing.viewerHasSaved ? "currentColor" : "none"}
                    />
                  )}
                </Button>
                <Button
                  variant="destructive"
                  className="press"
                  disabled={deleteListing.isPending}
                  onClick={() => {
                    if (!confirm("Delete this listing?")) return;
                    deleteListing.mutate(
                      { id: listingId },
                      {
                        onSuccess: () => {
                          invalidate();
                          navigate("/marketplace");
                        },
                      },
                    );
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex gap-2 mt-5">
                <Button
                  className="flex-1 press"
                  disabled={createConversation.isPending}
                  onClick={messageSeller}
                >
                  {createConversation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  Message seller
                </Button>
                <Button
                  variant="secondary"
                  className="press"
                  disabled={savePending}
                  aria-label={listing.viewerHasSaved ? "Unsave listing" : "Save listing"}
                  title={listing.viewerHasSaved ? "Saved — click to unsave" : "Save listing"}
                  onClick={toggleSave}
                >
                  {savePending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Bookmark
                      className={`w-4 h-4 ${listing.viewerHasSaved ? "text-primary" : ""}`}
                      fill={listing.viewerHasSaved ? "currentColor" : "none"}
                    />
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}

/* ---------------- Create ---------------- */
export function MarketplaceCreatePage() {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const createListing = useCreateMarketplaceListing();

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("other");
  const [condition, setCondition] = useState("used_good");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState("");

  const addPhoto = () => {
    const url = photoInput.trim();
    if (!url) return;
    setPhotos((p) => [...p, url]);
    setPhotoInput("");
  };

  const canSubmit = title.trim().length > 0 && price.trim().length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    createListing.mutate(
      {
        data: {
          title: title.trim(),
          price: Math.max(0, Math.round(Number(price) || 0)),
          category,
          condition,
          description: description.trim(),
          location: location.trim() || undefined,
          ...(coords ? { lat: coords.lat, lng: coords.lng } : {}),
          photos,
        },
      },
      {
        onSuccess: (listing) => {
          queryClient.invalidateQueries({ queryKey: getListMarketplaceListingsQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetSellingDashboardQueryKey() });
          navigate(`/marketplace/${listing.id}`);
        },
      },
    );
  };

  return (
    <MainLayout>
      <Link href="/marketplace">
        <Button variant="ghost" className="mb-3 press">
          <ArrowLeft className="w-4 h-4 mr-2" /> Marketplace
        </Button>
      </Link>

      <div className="bg-card border border-border rounded-2xl p-5 card-depth max-w-2xl mx-auto animate-in fade-in">
        <h1 className="text-xl font-extrabold mb-4">Create new listing</h1>

        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Photos</Label>
            <div className="grid grid-cols-4 gap-2 mb-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                  <img src={p} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Input
                value={photoInput}
                onChange={(e) => setPhotoInput(e.target.value)}
                placeholder="Photo image URL"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPhoto();
                  }
                }}
              />
              <Button type="button" variant="secondary" onClick={addPhoto} className="press">
                <ImagePlus className="w-4 h-4 mr-1" /> Add
              </Button>
            </div>
          </div>

          <div>
            <Label htmlFor="m-title" className="mb-1.5 block">Title</Label>
            <Input
              id="m-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What are you selling?"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="m-price" className="mb-1.5 block">Price (৳)</Label>
              <Input
                id="m-price"
                type="number"
                inputMode="numeric"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <Label className="mb-1.5 block">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="mb-1.5 block">Condition</Label>
              <Select value={condition} onValueChange={setCondition}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="m-location" className="mb-1.5 block">Location</Label>
              <LocationAutocomplete
                value={location}
                onChange={(v) => {
                  setLocation(v);
                  setCoords(null);
                }}
                onPick={(r) => setCoords({ lat: r.lat, lng: r.lng })}
                placeholder="e.g. Dhaka"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="m-desc" className="mb-1.5 block">Description</Label>
            <Textarea
              id="m-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your item..."
              rows={4}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || createListing.isPending}
            className="w-full press"
          >
            {createListing.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Publish listing
          </Button>
        </div>
      </div>
    </MainLayout>
  );
}

/* ---------------- Selling dashboard ---------------- */
export function MarketplaceSellingPage() {
  const { data, isLoading } = useGetSellingDashboard();

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-4">
        <Link href="/marketplace">
          <Button variant="ghost" className="press">
            <ArrowLeft className="w-4 h-4 mr-2" /> Marketplace
          </Button>
        </Link>
        <Link href="/marketplace/create">
          <Button className="press">
            <Plus className="w-4 h-4 mr-2" /> Create listing
          </Button>
        </Link>
      </div>

      <h1 className="text-xl font-extrabold px-1 mb-3">Your selling</h1>

      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-card border border-border rounded-2xl p-4 card-depth text-center">
          <p className="text-2xl font-extrabold text-primary">{data?.activeListings ?? 0}</p>
          <p className="text-xs text-muted-foreground">Active</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 card-depth text-center">
          <p className="text-2xl font-extrabold">{data?.soldListings ?? 0}</p>
          <p className="text-xs text-muted-foreground">Sold</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 card-depth text-center">
          <p className="text-2xl font-extrabold">{data?.totalListings ?? 0}</p>
          <p className="text-xs text-muted-foreground">Total</p>
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !data || data.listings.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border rounded-2xl card-depth">
          <PackageOpen className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">You haven't listed anything yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.listings.map((item) => (
            <Link key={item.id} href={`/marketplace/${item.id}`}>
              <div className="bg-card border border-border rounded-2xl p-3 card-depth lift-on-hover cursor-pointer flex gap-3 items-center">
                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
                  {item.photos[0] ? (
                    <img src={item.photos[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImagePlus className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold line-clamp-1">{item.title}</p>
                  <p className="text-primary font-extrabold text-sm">
                    {formatPrice(item.price, item.currency)}
                  </p>
                </div>
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1 ${
                    item.status === "sold"
                      ? "bg-muted text-muted-foreground"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {item.status === "sold" ? "Sold" : <><CheckCircle2 className="w-3 h-3" /> Active</>}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </MainLayout>
  );
}
