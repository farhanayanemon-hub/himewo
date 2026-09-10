import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import { getUserProfileUrl } from "@/lib/user-link";
import {
  useListPages,
  useGetPage,
  useGetPagePosts,
  useCreatePage,
  useUpdatePage,
  useFollowPage,
  useUnfollowPage,
  useListPageReviews,
  useReviewPage,
  useDeletePageReview,
  useCreateConversation,
  useListPageMembers,
  useAddPageMember,
  useRemovePageMember,
  useSearchUsers,
  useListPageMedia,
  useListPageFollowers,
  useListPageFollowing,
  useInviteToPage,
  useListFriends,
  getListPagesQueryKey,
  getGetPageQueryKey,
  getListPageReviewsQueryKey,
  getListPageMembersQueryKey,
  getSearchUsersQueryKey,
  getListPageFollowersQueryKey,
  getListPageFollowingQueryKey,
  getListFriendsQueryKey,
} from "@workspace/api-client-react";
import type { Page, PageReview, Profile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import { Switch } from "@/components/ui/switch";
import { PhotoActionMenu, usePhotoEditor } from "@/components/photo-editor";
import { useParams, Link, useLocation } from "wouter";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
import { VerifiedBadge } from "@/components/verified-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  FileText,
  Phone,
  Mail,
  Globe,
  MapPin,
  Clock,
  Star,
  MessageCircle,
  ShoppingBag,
  UserPlus,
  Pencil,
  Trash2,
  Settings,
  X,
  MoreHorizontal,
  Users,
  Lock,
  Sliders,
  ShieldCheck,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";

export const PAGE_CATEGORIES = [
  "Business",
  "Brand",
  "Community",
  "Public Figure",
  "Entertainment",
  "Shop & Retail",
  "Restaurant & Cafe",
  "Education",
  "Health & Beauty",
  "Sports",
  "Technology",
  "News & Media",
  "Nonprofit Organization",
  "Travel",
  "Art",
  "Music",
  "Gaming",
  "Personal Blog",
  "Other",
];

function safeHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export default function PagesView() {
  const { id } = useParams<{ id: string }>();

  if (id) {
    return <PageDetail id={Number(id)} />;
  }

  return <PageList />;
}

function PageList() {
  const { data: pages, isLoading } = useListPages();
  const queryClient = useQueryClient();
  const [location, navigate] = useLocation();
  const { switchTo } = useActingPage();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const createPage = useCreatePage();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("create") === "1" || params.get("create") === "true") {
        setOpen(true);
      }
    }
  }, [location]);

  const resetWizard = () => {
    setStep(1);
    setName("");
    setCategory("");
    setDescription("");
  };

  const handleOpenChange = (v: boolean) => {
    setOpen(v);
    if (!v) resetWizard();
  };

  const handleCreate = () => {
    if (!name.trim() || !category) return;
    createPage.mutate(
      {
        data: {
          name: name.trim(),
          category,
          description: description.trim() || undefined,
        },
      },
      {
        onSuccess: (page) => {
          queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
          setOpen(false);
          resetWizard();
          // Auto switch identity to the newly created Hub
          switchTo({
            id: page.id,
            name: page.name,
            avatarUrl: page.avatarUrl ?? null,
          });
          navigate(`/pages/${page.id}`);
        },
      }
    );
  };

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Hubs</h1>
          <Button onClick={() => setOpen(true)}>Create Hub</Button>
        </div>

        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : pages?.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">No hubs found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pages?.map(page => (
              <Link key={page.id} href={`/pages/${page.id}`}>
                <div className="border border-border rounded-xl p-4 flex gap-4 hover:bg-muted/50 transition-colors group cursor-pointer">
                  <div className="w-16 h-16 rounded-full bg-muted shrink-0 overflow-hidden">
                    {page.avatarUrl ? (
                      <img src={avatarSrc(page.avatarUrl)} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                        <FileText className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h3 className="font-bold text-lg truncate group-hover:text-primary transition-colors">{page.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">{page.category || "General"}</p>
                    <div className="text-xs font-medium text-muted-foreground mt-1 flex items-center gap-2">
                      <span>{page.followerCount} followers</span>
                      {page.reviewCount > 0 && (
                        <span className="flex items-center gap-0.5">
                          <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                          {page.averageRating?.toFixed(1)} ({page.reviewCount})
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Hub</DialogTitle>
            <p className="text-sm text-muted-foreground">Step {step} of 3</p>
          </DialogHeader>
          <div className="flex gap-1.5 mb-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
          {step === 1 && (
            <div className="space-y-2">
              <Label htmlFor="page-name">Hub name</Label>
              <Input
                id="page-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Hub name"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Use the name of your business, brand or organization.
              </p>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-2">
              <Label>Category</Label>
              <p className="text-xs text-muted-foreground">
                Choose the category that best describes your Hub.
              </p>
              <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-1">
                {PAGE_CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`text-left text-sm px-3 py-2.5 rounded-lg border transition-colors ${
                      category === cat
                        ? "border-primary bg-primary/10 text-primary font-semibold"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-2">
              <Label htmlFor="page-description">Bio (optional)</Label>
              <Textarea
                id="page-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this hub about?"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Tell people a little about what your Hub does.
              </p>
            </div>
          )}
          <DialogFooter>
            {step > 1 ? (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>Back</Button>
            ) : (
              <Button variant="secondary" onClick={() => handleOpenChange(false)}>Cancel</Button>
            )}
            {step === 1 && (
              <Button onClick={() => setStep(2)} disabled={!name.trim()}>Next</Button>
            )}
            {step === 2 && (
              <Button onClick={() => setStep(3)} disabled={!category}>Next</Button>
            )}
            {step === 3 && (
              <Button onClick={handleCreate} disabled={!name.trim() || !category || createPage.isPending}>
                {createPage.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                Create Hub
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}

function PageCTA({ page }: { page: Page }) {
  const [, navigate] = useLocation();
  const createConversation = useCreateConversation();

  if (page.ctaType === "message") {
    return (
      <Button
        onClick={() =>
          createConversation.mutate(
            { data: { type: "direct", memberIds: [page.ownerId] } },
            { onSuccess: (conv) => navigate(`/messages/${conv.id}`) }
          )
        }
        disabled={createConversation.isPending}
      >
        {createConversation.isPending ? (
          <Loader2 className="w-4 h-4 animate-spin mr-2" />
        ) : (
          <MessageCircle className="w-4 h-4 mr-2" />
        )}
        Message
      </Button>
    );
  }
  if (page.ctaType === "call" && page.contactPhone) {
    return (
      <Button asChild>
        <a href={`tel:${page.contactPhone}`}>
          <Phone className="w-4 h-4 mr-2" />
          Call Now
        </a>
      </Button>
    );
  }
  const ctaLink = safeHttpUrl(page.ctaUrl);
  if (page.ctaType === "shop" && ctaLink) {
    return (
      <Button asChild>
        <a href={ctaLink} target="_blank" rel="noopener noreferrer">
          <ShoppingBag className="w-4 h-4 mr-2" />
          Shop Now
        </a>
      </Button>
    );
  }
  if (page.ctaType === "signup" && ctaLink) {
    return (
      <Button asChild>
        <a href={ctaLink} target="_blank" rel="noopener noreferrer">
          <UserPlus className="w-4 h-4 mr-2" />
          Sign Up
        </a>
      </Button>
    );
  }
  return null;
}

function AboutCard({ page }: { page: Page }) {
  const rows: { icon: React.ReactNode; value: string; href?: string }[] = [];
  if (page.contactPhone)
    rows.push({ icon: <Phone className="w-4 h-4" />, value: page.contactPhone, href: `tel:${page.contactPhone}` });
  if (page.contactEmail)
    rows.push({ icon: <Mail className="w-4 h-4" />, value: page.contactEmail, href: `mailto:${page.contactEmail}` });
  if (page.website)
    rows.push({
      icon: <Globe className="w-4 h-4" />,
      value: page.website,
      href: safeHttpUrl(page.website) ?? undefined,
    });
  if (page.address) rows.push({ icon: <MapPin className="w-4 h-4" />, value: page.address });
  if (page.hours) rows.push({ icon: <Clock className="w-4 h-4" />, value: page.hours });

  if (rows.length === 0) return null;

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <h2 className="font-bold text-lg mb-3">About</h2>
      <div className="space-y-2.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-3 text-[15px]">
            <span className="text-muted-foreground shrink-0">{r.icon}</span>
            {r.href ? (
              <a
                href={r.href}
                target={r.href.startsWith("http") ? "_blank" : undefined}
                rel="noopener noreferrer"
                className="text-primary hover:underline break-all"
              >
                {r.value}
              </a>
            ) : (
              <span className="break-words">{r.value}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function StarRating({
  value,
  onChange,
  size = "w-5 h-5",
}: {
  value: number;
  onChange?: (v: number) => void;
  size?: string;
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(n)}
          className={onChange ? "cursor-pointer" : "cursor-default"}
        >
          <Star
            className={`${size} ${
              n <= value ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function ReviewsSection({ page }: { page: Page }) {
  const id = page.id;
  const { data: reviews, isLoading } = useListPageReviews(id);
  const queryClient = useQueryClient();
  const reviewPage = useReviewPage();
  const deleteReview = useDeletePageReview();

  const [rating, setRating] = useState(page.viewerReview?.rating ?? 0);
  const [body, setBody] = useState(page.viewerReview?.body ?? "");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListPageReviewsQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
  };

  const handleSubmit = () => {
    if (rating < 1) return;
    reviewPage.mutate(
      { id, data: { rating, body: body.trim() || undefined } },
      { onSuccess: invalidate }
    );
  };

  const handleDelete = () => {
    deleteReview.mutate(
      { id },
      {
        onSuccess: () => {
          setRating(0);
          setBody("");
          invalidate();
        },
      }
    );
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-bold text-lg">Reviews</h2>
        {page.reviewCount > 0 && (
          <div className="flex items-center gap-1.5 text-sm font-medium">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            {page.averageRating?.toFixed(1)} · {page.reviewCount} reviews
          </div>
        )}
      </div>

      {page.viewerCanReview && (
        <div className="border border-border rounded-lg p-3 mb-4 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Your rating:</span>
            <StarRating value={rating} onChange={setRating} />
          </div>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Share your experience (optional)"
            rows={2}
          />
          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={rating < 1 || reviewPage.isPending}>
              {reviewPage.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {page.viewerReview ? "Update Review" : "Submit Review"}
            </Button>
            {page.viewerReview && (
              <Button variant="secondary" onClick={handleDelete} disabled={deleteReview.isPending}>
                {deleteReview.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="w-4 h-4 mr-2" />
                )}
                Delete
              </Button>
            )}
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
      ) : reviews?.length === 0 ? (
        <div className="py-6 text-center text-muted-foreground text-sm">No reviews yet. Be the first!</div>
      ) : (
        <div className="space-y-4">
          {reviews?.map((rev: PageReview) => (
            <div key={rev.id} className="flex gap-3">
              <img
                src={avatarSrc(rev.user.avatarUrl)}
                className="w-10 h-10 rounded-full object-cover bg-muted shrink-0"
                alt=""
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{rev.user.displayName || rev.user.username}</span>
                  <StarRating value={rev.rating} size="w-3.5 h-3.5" />
                </div>
                {rev.body && <p className="text-[15px] mt-0.5">{rev.body}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EditPageDialog({
  page,
  open,
  onOpenChange,
  onOpenSettings,
}: {
  page: Page;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onOpenSettings?: () => void;
}) {
  const queryClient = useQueryClient();
  const updatePage = useUpdatePage();

  const [category, setCategory] = useState(page.category ?? "");
  const [description, setDescription] = useState(page.description ?? "");
  const [contactPhone, setContactPhone] = useState(page.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(page.contactEmail ?? "");
  const [website, setWebsite] = useState(page.website ?? "");
  const [address, setAddress] = useState(page.address ?? "");
  const [hours, setHours] = useState(page.hours ?? "");
  const [ctaType, setCtaType] = useState(page.ctaType);
  const [ctaUrl, setCtaUrl] = useState(page.ctaUrl ?? "");
  const [reviewsEnabled, setReviewsEnabled] = useState(page.reviewsEnabled);

  const handleSave = () => {
    updatePage.mutate(
      {
        id: page.id,
        data: {
          name: page.name,
          category: category || null,
          description: description.trim() || null,
          contactPhone: contactPhone.trim() || null,
          contactEmail: contactEmail.trim() || null,
          website: website.trim() || null,
          address: address.trim() || null,
          hours: hours.trim() || null,
          ctaType,
          ctaUrl: ctaUrl.trim() || null,
          reviewsEnabled,
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(page.id) });
          queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
          onOpenChange(false);
        },
      }
    );
  };

  const ctaOptions: Page["ctaType"][] = ["none", "message", "call", "shop", "signup"];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Hub</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Read-only Hub Name */}
          <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border">
            <div className="flex items-center justify-between">
              <Label className="font-semibold text-xs text-muted-foreground flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5" /> Hub Name
              </Label>
              {onOpenSettings && (
                <button
                  type="button"
                  onClick={() => {
                    onOpenChange(false);
                    onOpenSettings();
                  }}
                  className="text-xs text-primary font-semibold hover:underline"
                >
                  Change in Settings →
                </button>
              )}
            </div>
            <Input
              value={page.name}
              disabled
              className="bg-muted/60 text-foreground font-semibold cursor-not-allowed opacity-90"
            />
            <p className="text-[11px] text-muted-foreground">
              Hub name cannot be edited from this quick menu. Open Hub Settings to change name.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={category || undefined} onValueChange={(v) => setCategory(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a category" />
              </SelectTrigger>
              <SelectContent>
                {!PAGE_CATEGORIES.includes(category) && category ? (
                  <SelectItem value={category}>{category}</SelectItem>
                ) : null}
                {PAGE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Write a bio for this hub..." />
          </div>
          <div className="space-y-2">
            <Label>Phone</Label>
            <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Website</Label>
            <Input value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Hours</Label>
            <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="e.g. Mon-Fri 9am-6pm" />
          </div>
          <div className="space-y-2">
            <Label>Action Button</Label>
            <div className="flex flex-wrap gap-2">
              {ctaOptions.map((opt) => (
                <Button
                  key={opt}
                  type="button"
                  size="sm"
                  variant={ctaType === opt ? "default" : "secondary"}
                  onClick={() => setCtaType(opt)}
                >
                  {opt}
                </Button>
              ))}
            </div>
          </div>
          {(ctaType === "shop" || ctaType === "signup") && (
            <div className="space-y-2">
              <Label>Button Link URL</Label>
              <Input value={ctaUrl} onChange={(e) => setCtaUrl(e.target.value)} placeholder="https://..." />
            </div>
          )}
          <div className="flex items-center justify-between border border-border rounded-lg p-3">
            <div>
              <Label>Reviews</Label>
              <p className="text-xs text-muted-foreground mt-0.5">Let people rate and review this Hub.</p>
            </div>
            <Switch checked={reviewsEnabled} onCheckedChange={setReviewsEnabled} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updatePage.isPending}>
            {updatePage.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function HubSettingsDialog({
  page,
  open,
  onOpenChange,
  initialTab = "general",
}: {
  page: Page;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialTab?: "general" | "access" | "cta" | "reviews" | "visibility";
}) {
  const queryClient = useQueryClient();
  const updatePage = useUpdatePage();
  const [activeTab, setActiveTab] = useState<"general" | "access" | "cta" | "reviews" | "visibility">(initialTab);

  // General Form States
  const [name, setName] = useState(page.name);
  const [category, setCategory] = useState(page.category ?? "");
  const [description, setDescription] = useState(page.description ?? "");
  const [contactPhone, setContactPhone] = useState(page.contactPhone ?? "");
  const [contactEmail, setContactEmail] = useState(page.contactEmail ?? "");
  const [website, setWebsite] = useState(page.website ?? "");
  const [address, setAddress] = useState(page.address ?? "");
  const [hours, setHours] = useState(page.hours ?? "");

  // CTA & Reviews States
  const [ctaType, setCtaType] = useState<Page["ctaType"]>(page.ctaType);
  const [ctaUrl, setCtaUrl] = useState(page.ctaUrl ?? "");
  const [reviewsEnabled, setReviewsEnabled] = useState(page.reviewsEnabled);

  // User Access States
  const [query, setQuery] = useState("");
  const { data: members, isLoading: membersLoading } = useListPageMembers(page.id, {
    query: {
      enabled: open,
      queryKey: getListPageMembersQueryKey(page.id),
    },
  });
  const addMember = useAddPageMember();
  const removeMember = useRemovePageMember();

  const q = query.trim();
  const { data: results } = useSearchUsers(
    { q, limit: 6 },
    {
      query: {
        enabled: open && q.length >= 2,
        queryKey: getSearchUsersQueryKey({ q, limit: 6 }),
      },
    },
  );

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(page.id) });
    queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListPageMembersQueryKey(page.id) });
  };

  const memberIds = new Set((members ?? []).map((m) => m.user.id));
  const candidates = (results ?? []).filter(
    (p: Profile) => p.id !== page.ownerId && !memberIds.has(p.id),
  );

  const handleAdd = (userId: string) => {
    addMember.mutate(
      { id: page.id, data: { userId } },
      {
        onSuccess: () => {
          invalidate();
          setQuery("");
        },
      },
    );
  };

  const handleRemove = (userId: string) => {
    removeMember.mutate({ id: page.id, userId }, { onSuccess: invalidate });
  };

  const handleSave = () => {
    updatePage.mutate(
      {
        id: page.id,
        data: {
          name: name.trim() || page.name,
          category: category || null,
          description: description.trim() || null,
          contactPhone: contactPhone.trim() || null,
          contactEmail: contactEmail.trim() || null,
          website: website.trim() || null,
          address: address.trim() || null,
          hours: hours.trim() || null,
          ctaType,
          ctaUrl: ctaUrl.trim() || null,
          reviewsEnabled,
        },
      },
      {
        onSuccess: () => {
          invalidate();
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-card border border-border rounded-2xl shadow-2xl">
        <DialogHeader className="p-4 border-b border-border/60 bg-muted/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <Settings className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold">Hub Settings</DialogTitle>
                <p className="text-xs text-muted-foreground">Manage {page.name}'s name, permissions, and features</p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* Settings Left Navigation Sidebar */}
          <div className="flex md:flex-col overflow-x-auto md:overflow-x-visible md:w-52 border-b md:border-b-0 md:border-r border-border/60 bg-muted/10 p-2 gap-1.5 md:space-y-1 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors text-left ${
                activeTab === "general"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText className="w-4 h-4 shrink-0" />
              <span>General Info</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("access")}
              className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors text-left ${
                activeTab === "access"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4 shrink-0" />
              <span>Page Access & Roles</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("cta")}
              className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors text-left ${
                activeTab === "cta"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Sliders className="w-4 h-4 shrink-0" />
              <span>Action Button (CTA)</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("reviews")}
              className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors text-left ${
                activeTab === "reviews"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <Star className="w-4 h-4 shrink-0" />
              <span>Reviews & Ratings</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("visibility")}
              className={`flex items-center gap-2 px-3 py-2 md:py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-colors text-left ${
                activeTab === "visibility"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldCheck className="w-4 h-4 shrink-0" />
              <span>Visibility & Status</span>
            </button>
          </div>

          {/* Settings Tab Content Area */}
          <div className="flex-1 p-4 md:p-5 overflow-y-auto max-h-[65vh] md:max-h-[580px] w-full">
            {activeTab === "general" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-base font-bold text-foreground">General Information</h3>
                  <p className="text-xs text-muted-foreground">Manage your hub's official name, category, and basic information.</p>
                </div>

                <div className="space-y-1.5 p-3.5 rounded-xl bg-primary/5 border border-primary/20">
                  <Label className="font-bold text-xs text-foreground flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5 text-primary" /> Hub Name
                  </Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Hub name"
                    className="font-semibold bg-background"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    This is your official Hub display name across HiMewo.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Category</Label>
                  <Select value={category || undefined} onValueChange={(v) => setCategory(v)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Choose a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {!PAGE_CATEGORIES.includes(category) && category ? (
                        <SelectItem value={category}>{category}</SelectItem>
                      ) : null}
                      {PAGE_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold">Bio / Description</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Write a bio for this hub..."
                    rows={3}
                    className="bg-background resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Phone</Label>
                    <Input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} placeholder="+880..." className="bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Email</Label>
                    <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@..." className="bg-background" />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label className="text-xs font-semibold">Website</Label>
                    <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://..." className="bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Address / Location</Label>
                    <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Dhaka, Bangladesh" className="bg-background" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Operating Hours</Label>
                    <Input value={hours} onChange={(e) => setHours(e.target.value)} placeholder="Mon-Fri 9am-6pm" className="bg-background" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === "access" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-base font-bold text-foreground">Hub Access & Roles</h3>
                  <p className="text-xs text-muted-foreground">
                    People with access can create posts, stories, and manage this Hub. Only you (the owner) can manage permissions.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-muted/40 border border-border space-y-2.5">
                  <Label className="font-semibold text-xs text-foreground">Add People (Search Users)</Label>
                  <Input
                    placeholder="Search people by name or username..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="bg-background"
                  />
                  {q.length >= 2 && candidates.length > 0 && (
                    <div className="border border-border rounded-xl divide-y divide-border bg-background overflow-hidden shadow-sm">
                      {candidates.map((p: Profile) => (
                        <div key={p.id} className="flex items-center gap-2.5 p-2.5 hover:bg-muted/40 transition-colors">
                          <img
                            src={avatarSrc(p.avatarUrl)}
                            className="w-8 h-8 rounded-full object-cover bg-muted"
                            alt=""
                          />
                          <div className="flex-1 min-w-0 text-sm">
                            <div className="font-semibold truncate">{p.displayName}</div>
                            <div className="text-xs text-muted-foreground">@{p.username}</div>
                          </div>
                          <Button
                            size="sm"
                            disabled={addMember.isPending}
                            onClick={() => handleAdd(p.id)}
                            className="rounded-lg gap-1"
                          >
                            <UserPlus className="w-3.5 h-3.5" /> Add Editor
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    People with access
                  </Label>
                  {membersLoading ? (
                    <div className="py-6 flex justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    </div>
                  ) : !members || members.length === 0 ? (
                    <div className="p-4 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                      Only you have access to this Hub right now. Use the search above to invite editors.
                    </div>
                  ) : (
                    <div className="border border-border rounded-xl divide-y divide-border bg-background overflow-hidden">
                      {members.map((m) => (
                        <div key={m.id} className="flex items-center gap-2.5 p-3">
                          <img
                            src={avatarSrc(m.user.avatarUrl)}
                            className="w-9 h-9 rounded-full object-cover bg-muted"
                            alt=""
                          />
                          <div className="flex-1 min-w-0 text-sm">
                            <div className="font-semibold truncate">{m.user.displayName}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <span>@{m.user.username}</span>
                              <span>•</span>
                              <span className="font-medium text-primary">Editor</span>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10 rounded-lg text-xs"
                            disabled={removeMember.isPending}
                            onClick={() => handleRemove(m.user.id)}
                          >
                            Remove access
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "cta" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-base font-bold text-foreground">Action Button (CTA)</h3>
                  <p className="text-xs text-muted-foreground">
                    Customize the primary action button displayed on your Hub header.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold">Button Type</Label>
                  <Select value={ctaType} onValueChange={(v) => setCtaType(v as Page["ctaType"])}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Choose action button" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (No Button)</SelectItem>
                      <SelectItem value="message">Send Message</SelectItem>
                      <SelectItem value="call">Call Now</SelectItem>
                      <SelectItem value="shop">Shop Now</SelectItem>
                      <SelectItem value="signup">Sign Up</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(ctaType === "shop" || ctaType === "signup") && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Target URL</Label>
                    <Input
                      value={ctaUrl}
                      onChange={(e) => setCtaUrl(e.target.value)}
                      placeholder="https://..."
                      className="bg-background"
                    />
                    <p className="text-[11px] text-muted-foreground">
                      Users who click this button will be redirected to this link.
                    </p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-base font-bold text-foreground">Reviews & Recommendations</h3>
                  <p className="text-xs text-muted-foreground">
                    Manage whether visitors can rate and write reviews on your Hub.
                  </p>
                </div>

                <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
                  <div className="space-y-0.5 pr-4">
                    <Label className="font-semibold text-sm">Allow Hub Reviews</Label>
                    <p className="text-xs text-muted-foreground">
                      When turned on, users can leave star ratings and public reviews on your Hub profile.
                    </p>
                  </div>
                  <Switch
                    checked={reviewsEnabled}
                    onCheckedChange={setReviewsEnabled}
                  />
                </div>
              </div>
            )}

            {activeTab === "visibility" && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div>
                  <h3 className="text-base font-bold text-foreground">Visibility & Ownership</h3>
                  <p className="text-xs text-muted-foreground">
                    Hub publication status and profile linking details.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-border bg-muted/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-semibold text-sm text-foreground">Hub Status</span>
                      <p className="text-xs text-muted-foreground">This Hub is active and publicly visible.</p>
                    </div>
                    <span className="px-2.5 py-1 bg-green-500/10 text-green-600 font-bold text-xs rounded-full border border-green-500/20">
                      Published
                    </span>
                  </div>
                  <div className="pt-2 border-t border-border/60 text-xs text-muted-foreground">
                    <b>Ownership:</b> Connected to your personal profile.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="p-3 border-t border-border/60 bg-muted/20 flex items-center justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={updatePage.isPending}>
            {updatePage.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Keep PageAccessDialog as a helper that opens HubSettingsDialog directly on the "access" tab
function PageAccessDialog({
  page,
  open,
  onOpenChange,
}: {
  page: Page;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <HubSettingsDialog
      page={page}
      open={open}
      onOpenChange={onOpenChange}
      initialTab="access"
    />
  );
}

function PageMediaGrid({ pageId }: { pageId: number }) {
  const { data: media, isLoading } = useListPageMedia(pageId);

  if (isLoading) {
    return <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!media || media.length === 0) {
    return <div className="py-10 text-center bg-card border border-border rounded-xl text-muted-foreground">No photos or videos yet.</div>;
  }
  return (
    <div className="grid grid-cols-3 gap-1 bg-card border border-border rounded-xl p-1 overflow-hidden">
      {media.map((item) => (
        <div key={item.id} className="relative aspect-square bg-muted overflow-hidden">
          {item.type === "video" ? (
            <video
              src={item.url}
              poster={item.thumbnailUrl ?? undefined}
              className="w-full h-full object-cover"
              muted
              playsInline
              controls
            />
          ) : (
            <img src={item.url} className="w-full h-full object-cover" alt="" loading="lazy" />
          )}
        </div>
      ))}
    </div>
  );
}

function PageFollowersDialog({
  pageId,
  open,
  onOpenChange,
}: {
  pageId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: followers, isLoading } = useListPageFollowers(pageId, {
    query: { enabled: open, queryKey: getListPageFollowersQueryKey(pageId) },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Followers</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : followers?.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">No followers yet.</div>
        ) : (
          <div className="space-y-1">
            {followers?.map((p) => (
              <Link
                key={p.id}
                href={getUserProfileUrl(p)}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <img src={avatarSrc(p.avatarUrl)} className="w-10 h-10 rounded-full object-cover bg-muted shrink-0" alt="" />
                <div className="min-w-0">
                  <div className="font-medium truncate">{p.displayName || p.username}</div>
                  {p.username && <div className="text-xs text-muted-foreground truncate">@{p.username}</div>}
                </div>
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function PageFollowingDialog({
  pageId,
  open,
  onOpenChange,
}: {
  pageId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: following, isLoading } = useListPageFollowing(pageId, {
    query: { enabled: open, queryKey: getListPageFollowingQueryKey(pageId) },
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[70vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Following</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : following?.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">Not following any hubs.</div>
        ) : (
          <div className="space-y-1">
            {following?.map((pg) => (
              <Link
                key={pg.id}
                href={`/pages/${pg.id}`}
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-muted shrink-0 overflow-hidden">
                  {pg.avatarUrl ? (
                    <img src={avatarSrc(pg.avatarUrl)} className="w-full h-full object-cover" alt="" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                      <FileText className="w-4 h-4" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="font-medium truncate">{pg.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{pg.category || "General"}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function InvitePageFriendsDialog({
  pageId,
  open,
  onOpenChange,
}: {
  pageId: number;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { data: friends, isLoading } = useListFriends({
    query: { enabled: open, queryKey: getListFriendsQueryKey() },
  });
  const inviteToPage = useInviteToPage();
  const [selected, setSelected] = useState<string[]>([]);

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const handleInvite = () => {
    if (selected.length === 0) return;
    inviteToPage.mutate(
      { id: pageId, data: { userIds: selected } },
      {
        onSuccess: () => {
          setSelected([]);
          onOpenChange(false);
        },
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setSelected([]);
      }}
    >
      <DialogContent className="max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Invite friends</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {isLoading ? (
            <div className="py-6 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : friends?.length === 0 ? (
            <div className="py-6 text-center text-muted-foreground text-sm">No friends to invite.</div>
          ) : (
            <div className="space-y-1">
              {friends?.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggle(f.id)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
                >
                  <Checkbox checked={selected.includes(f.id)} className="pointer-events-none" />
                  <img src={avatarSrc(f.avatarUrl)} className="w-10 h-10 rounded-full object-cover bg-muted shrink-0" alt="" />
                  <div className="min-w-0">
                    <div className="font-medium truncate">{f.displayName || f.username}</div>
                    {f.username && <div className="text-xs text-muted-foreground truncate">@{f.username}</div>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleInvite} disabled={selected.length === 0 || inviteToPage.isPending}>
            {inviteToPage.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Send{selected.length > 0 ? ` (${selected.length})` : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PageDetail({ id }: { id: number }) {
  const { actingPage } = useActingPage();
  const { data: page, isLoading } = useGetPage(
    id,
    actingPage ? { asPageId: actingPage.id } : undefined,
  );
  const { data: posts, isLoading: postsLoading } = useGetPagePosts(id);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [editOpen, setEditOpen] = useState(false);
  const [accessOpen, setAccessOpen] = useState(false);
  const [tab, setTab] = useState<"posts" | "media">("posts");
  const [followersOpen, setFollowersOpen] = useState(false);
  const [followingOpen, setFollowingOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [, navigate] = useLocation();

  const followPage = useFollowPage();
  const unfollowPage = useUnfollowPage();
  const updatePage = useUpdatePage();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListPagesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPageQueryKey(id) });
  };

  const savePagePhoto = async (data: { avatarUrl?: string; coverUrl?: string }) => {
    await updatePage.mutateAsync({ id, data });
    invalidate();
  };

  const avatarEditor = usePhotoEditor({
    kind: "avatar",
    photoUrl: page?.avatarUrl,
    onSaved: (url) => savePagePhoto({ avatarUrl: url }),
  });
  const coverEditor = usePhotoEditor({
    kind: "cover",
    photoUrl: page?.coverUrl,
    onSaved: (url) => savePagePhoto({ coverUrl: url }),
  });

  if (isLoading) {
    return <MainLayout><div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div></MainLayout>;
  }

  if (!page) {
    return <MainLayout><div className="py-10 text-center text-muted-foreground">Hub not found</div></MainLayout>;
  }

  const followParams = actingPage ? { asPageId: actingPage.id } : undefined;
  const handleFollow = () => {
    if (page.viewerFollows) {
      unfollowPage.mutate({ id, params: followParams }, { onSuccess: invalidate });
    } else {
      followPage.mutate({ id, params: followParams }, { onSuccess: invalidate });
    }
  };

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm mb-6 animate-in fade-in">
        <PhotoActionMenu
          photoUrl={page.coverUrl}
          kind="cover"
          canChange={!!page.viewerCanPost}
          onView={coverEditor.onView}
          onPickFile={coverEditor.onPickFile}
        >
          <div className="h-48 md:h-64 lg:h-72 bg-muted relative">
            {page.coverUrl ? (
              <img src={page.coverUrl} className="w-full h-full object-cover" alt="Cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-purple-600/30 via-indigo-500/30 to-pink-500/30" />
            )}
          </div>
        </PhotoActionMenu>
        <div className="px-6 pb-6 pt-2 relative">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-5">
              <div className="-mt-16 sm:-mt-20 relative z-10 w-32 sm:w-36 shrink-0 mx-auto sm:mx-0">
                <PhotoActionMenu
                  photoUrl={page.avatarUrl}
                  kind="avatar"
                  canChange={!!page.viewerCanPost}
                  onView={avatarEditor.onView}
                  onPickFile={avatarEditor.onPickFile}
                >
                  <img
                    src={avatarSrc(page.avatarUrl)}
                    className="w-32 h-32 sm:w-36 sm:h-36 rounded-full border-4 border-card object-cover bg-muted shadow-md"
                    alt="Avatar"
                  />
                </PhotoActionMenu>
              </div>
              <div className="text-center sm:text-left pt-1 sm:pt-0 sm:pb-1">
                <h1 className="text-2xl sm:text-3xl font-bold flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-foreground tracking-tight">{page.name}</span>
                  {(page as any).isVerified && <VerifiedBadge className="w-6 h-6" />}
                </h1>
                <p className="text-muted-foreground text-sm font-medium">{page.category}</p>
                <div className="text-sm text-muted-foreground font-medium flex items-center justify-center sm:justify-start gap-3 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setFollowersOpen(true)}
                    className="hover:text-foreground hover:underline transition-colors"
                  >
                    <b className="text-foreground">{page.followerCount}</b> Followers
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => setFollowingOpen(true)}
                    className="hover:text-foreground hover:underline transition-colors"
                  >
                    <b className="text-foreground">{page.followingCount}</b> Following
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center sm:justify-end gap-2 pb-1 flex-wrap">
              {actingPage?.id !== page.id && (
                <Button
                  variant={page.viewerFollows ? "secondary" : "default"}
                  onClick={handleFollow}
                  disabled={followPage.isPending || unfollowPage.isPending}
                >
                  {(followPage.isPending || unfollowPage.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  {page.viewerFollows ? "Following" : "Follow"}
                </Button>
              )}
              {actingPage?.id !== page.id && user?.id !== page.ownerId && (
                <PageCTA page={page} />
              )}
              {page.viewerCanPost && (
                <Button variant="secondary" size="icon" onClick={() => setEditOpen(true)} aria-label="Edit hub">
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {user?.id === page.ownerId && (
                <Button variant="secondary" size="icon" onClick={() => setAccessOpen(true)} aria-label="Hub settings" data-testid="page-settings-button">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary" size="icon" aria-label="More options">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setInviteOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite friends
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate("/groups?create=1")}>
                    <Users className="w-4 h-4 mr-2" />
                    Create circle
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <AboutCard page={page} />
        {page.reviewsEnabled && <ReviewsSection page={page} />}

        <div className="flex gap-1 border-b border-border px-2">
          <button
            type="button"
            onClick={() => setTab("posts")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === "posts" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Posts
          </button>
          <button
            type="button"
            onClick={() => setTab("media")}
            className={`px-4 py-2 text-sm font-semibold border-b-2 -mb-px transition-colors ${tab === "media" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
          >
            Photos & Videos
          </button>
        </div>

        {tab === "posts" ? (
          <>
            {page.viewerCanPost && <PostComposer pageId={id} />}
            {postsLoading ? (
              <div className="py-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : posts?.length === 0 ? (
              <div className="py-10 text-center bg-card border border-border rounded-xl text-muted-foreground">No posts yet.</div>
            ) : (
              posts?.map(post => <PostCard key={post.id} post={post} />)
            )}
          </>
        ) : (
          <PageMediaGrid pageId={id} />
        )}
      </div>

      {page.viewerCanPost && (
        <>
          <EditPageDialog
            page={page}
            open={editOpen}
            onOpenChange={setEditOpen}
            onOpenSettings={user?.id === page.ownerId ? () => setAccessOpen(true) : undefined}
          />
        </>
      )}
      {user?.id === page.ownerId && (
        <PageAccessDialog page={page} open={accessOpen} onOpenChange={setAccessOpen} />
      )}
      <PageFollowersDialog pageId={id} open={followersOpen} onOpenChange={setFollowersOpen} />
      <PageFollowingDialog pageId={id} open={followingOpen} onOpenChange={setFollowingOpen} />
      <InvitePageFriendsDialog pageId={id} open={inviteOpen} onOpenChange={setInviteOpen} />
      {avatarEditor.dialogs}
      {coverEditor.dialogs}
    </MainLayout>
  );
}
