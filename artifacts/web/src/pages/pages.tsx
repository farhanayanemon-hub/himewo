import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
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
  getListPagesQueryKey,
  getGetPageQueryKey,
  getListPageReviewsQueryKey,
  getListPageMembersQueryKey,
  getSearchUsersQueryKey,
} from "@workspace/api-client-react";
import type { Page, PageReview, Profile } from "@workspace/api-client-react";
import { useAuth } from "@/lib/auth";
import { useActingPage } from "@/lib/acting-page";
import { Switch } from "@/components/ui/switch";
import { PhotoActionMenu, usePhotoEditor } from "@/components/photo-editor";
import { useParams, Link, useLocation } from "wouter";
import { PostCard } from "@/components/post-card";
import { PostComposer } from "@/components/post-composer";
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
} from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [, navigate] = useLocation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");

  const createPage = useCreatePage();

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
          navigate(`/pages/${page.id}`);
        },
      }
    );
  };

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-xl p-4 shadow-sm animate-in fade-in">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-bold">Pages</h1>
          <Button onClick={() => setOpen(true)}>Create Page</Button>
        </div>

        {isLoading ? (
          <div className="py-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
        ) : pages?.length === 0 ? (
          <div className="py-10 text-center text-muted-foreground">No pages found.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <DialogTitle>Create Page</DialogTitle>
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
              <Label htmlFor="page-name">Page name</Label>
              <Input
                id="page-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Page name"
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
                Choose the category that best describes your Page.
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
                placeholder="What's this page about?"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Tell people a little about what your Page does.
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
                Create Page
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
}: {
  page: Page;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const updatePage = useUpdatePage();

  const [name, setName] = useState(page.name);
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
    if (!name.trim()) return;
    updatePage.mutate(
      {
        id: page.id,
        data: {
          name: name.trim(),
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
          <DialogTitle>Edit Page</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
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
            <Label>Description</Label>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
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
              <p className="text-xs text-muted-foreground mt-0.5">Let people rate and review this Page.</p>
            </div>
            <Switch checked={reviewsEnabled} onCheckedChange={setReviewsEnabled} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!name.trim() || updatePage.isPending}>
            {updatePage.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PageAccessDialog({
  page,
  open,
  onOpenChange,
}: {
  page: Page;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");

  const { data: members, isLoading } = useListPageMembers(page.id, {
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

  const invalidate = () =>
    queryClient.invalidateQueries({
      queryKey: getListPageMembersQueryKey(page.id),
    });

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Page access</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            People with access can post and edit this Page. Only you (the
            owner) can manage access.
          </p>
          <div className="space-y-2">
            <Label>Add people</Label>
            <Input
              placeholder="Search by name or username..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              data-testid="page-access-search"
            />
            {q.length >= 2 && candidates.length > 0 && (
              <div className="border border-border rounded-lg divide-y divide-border">
                {candidates.map((p: Profile) => (
                  <div key={p.id} className="flex items-center gap-2 p-2">
                    <img
                      src={avatarSrc(p.avatarUrl)}
                      className="w-8 h-8 rounded-full object-cover bg-muted"
                      alt=""
                    />
                    <div className="flex-1 min-w-0 text-sm">
                      <div className="font-medium truncate">{p.displayName}</div>
                      <div className="text-xs text-muted-foreground">@{p.username}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={addMember.isPending}
                      onClick={() => handleAdd(p.id)}
                    >
                      <UserPlus className="w-4 h-4 mr-1" /> Add
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-2">
            <Label>People with access</Label>
            {isLoading ? (
              <div className="py-4 flex justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : !members || members.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Only you have access to this Page.
              </p>
            ) : (
              <div className="border border-border rounded-lg divide-y divide-border">
                {members.map((m) => (
                  <div key={m.id} className="flex items-center gap-2 p-2">
                    <img
                      src={avatarSrc(m.user.avatarUrl)}
                      className="w-8 h-8 rounded-full object-cover bg-muted"
                      alt=""
                    />
                    <div className="flex-1 min-w-0 text-sm">
                      <div className="font-medium truncate">{m.user.displayName}</div>
                      <div className="text-xs text-muted-foreground">
                        @{m.user.username} · Editor
                      </div>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Remove access"
                      disabled={removeMember.isPending}
                      onClick={() => handleRemove(m.user.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
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
    return <MainLayout><div className="py-10 text-center text-muted-foreground">Page not found</div></MainLayout>;
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
          <div className="h-48 bg-muted relative">
            {page.coverUrl ? (
              <img src={page.coverUrl} className="w-full h-full object-cover" alt="Cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/40" />
            )}
          </div>
        </PhotoActionMenu>
        <div className="px-6 pb-6 relative">
          <div className="flex justify-between items-end mb-4">
            <div className="-mt-16 relative z-10 w-32 shrink-0">
              <PhotoActionMenu
                photoUrl={page.avatarUrl}
                kind="avatar"
                canChange={!!page.viewerCanPost}
                onView={avatarEditor.onView}
                onPickFile={avatarEditor.onPickFile}
              >
                <img
                  src={avatarSrc(page.avatarUrl)}
                  className="w-32 h-32 rounded-full border-4 border-card object-cover bg-muted"
                  alt="Avatar"
                />
              </PhotoActionMenu>
            </div>
            <div className="flex gap-2">
              <Button
                variant={page.viewerFollows ? "secondary" : "default"}
                onClick={handleFollow}
                disabled={followPage.isPending || unfollowPage.isPending}
              >
                {(followPage.isPending || unfollowPage.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {page.viewerFollows ? "Following" : "Follow"}
              </Button>
              <PageCTA page={page} />
              {page.viewerCanPost && (
                <Button variant="secondary" size="icon" onClick={() => setEditOpen(true)} aria-label="Edit page">
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {user?.id === page.ownerId && (
                <Button variant="secondary" size="icon" onClick={() => setAccessOpen(true)} aria-label="Page settings" data-testid="page-settings-button">
                  <Settings className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold">{page.name}</h1>
            <p className="text-muted-foreground text-sm mb-2">{page.category}</p>
            {page.description && <p className="text-[15px] mb-4">{page.description}</p>}
            <div className="text-sm text-muted-foreground font-medium flex items-center gap-3">
              <span>{page.followerCount} Followers</span>
              <span>{page.followingCount} Following</span>
              {page.reviewCount > 0 && (
                <span className="flex items-center gap-1">
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  {page.averageRating?.toFixed(1)} ({page.reviewCount})
                </span>
              )}
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
          <EditPageDialog page={page} open={editOpen} onOpenChange={setEditOpen} />
        </>
      )}
      {user?.id === page.ownerId && (
        <PageAccessDialog page={page} open={accessOpen} onOpenChange={setAccessOpen} />
      )}
      {avatarEditor.dialogs}
      {coverEditor.dialogs}
    </MainLayout>
  );
}
