import { MainLayout } from "@/components/layout/main-layout";
import { avatarSrc } from "@/lib/avatar";
import {
  useBrowseProducts,
  useGetProduct,
  useGetStall,
  useGetStallProducts,
  useBrowseStalls,
  useCreateStall,
  useGetMyStall,
  useCreateProduct,
  useUpdateProduct,
  useDeleteProduct,
  useCreateOrder,
  useListOrders,
  useUpdateOrderStatus,
  useGetShopWallet,
  useCreateShopWithdrawal,
  useListShopWithdrawals,
  useGetShopSettings,
  useListPages,
  getBrowseProductsQueryKey,
  getGetProductQueryKey,
  getGetStallQueryKey,
  getGetStallProductsQueryKey,
  getGetMyStallQueryKey,
  getListOrdersQueryKey,
  getGetOrderQueryKey,
  getGetShopWalletQueryKey,
  getListShopWithdrawalsQueryKey,
  ApiError,
  type ShopProduct,
  type ShopOrder,
  type ShopOrderStatus,
  type ShopWithdrawal,
} from "@workspace/api-client-react";
import { useParams, Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
  ArrowLeft,
  X,
  ImagePlus,
  Trash2,
  Pencil,
  ShoppingBag,
  Wallet,
  Package,
  ClipboardList,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { uploadMedia, UploadUnavailableError } from "@/lib/upload";
import { toast } from "@/hooks/use-toast";

/* ---------------- Helpers ---------------- */

/** priceCents (paisa) → "৳125.50" */
export function formatTaka(cents: number) {
  const taka = cents / 100;
  return `৳${taka.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** taka string input → integer paisa */
function takaToCents(taka: string): number {
  const n = Number(taka);
  if (!isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

const STATUS_LABELS: Record<ShopOrderStatus, string> = {
  awaiting_verification: "Awaiting verification",
  pending: "Pending",
  confirmed: "Confirmed",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_CLASSES: Record<ShopOrderStatus, string> = {
  awaiting_verification: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  pending: "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  confirmed: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-400",
  delivered: "bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-400",
  completed: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

function StatusBadge({ status }: { status: ShopOrderStatus }) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_CLASSES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}

function apiErrorMessage(err: unknown, fallback: string) {
  if (err instanceof ApiError) {
    const data = err.data as { message?: string; error?: string } | null;
    return data?.message || data?.error || fallback;
  }
  return fallback;
}

/* ---------------- Shop home (browse) ---------------- */
export default function ShopPage() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data: products, isLoading } = useBrowseProducts(
    debounced ? { search: debounced } : {},
  );

  return (
    <MainLayout>
      <div className="bg-card border border-border rounded-2xl p-5 card-depth mb-5 animate-in fade-in">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold leading-tight">Shop</h1>
              <p className="text-xs text-muted-foreground">
                Discover products from HiMewo stalls
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link href="/shop/orders">
              <Button variant="secondary" className="press">
                <ShoppingBag className="w-4 h-4 mr-2" /> My orders
              </Button>
            </Link>
            <Link href="/shop/my-stall">
              <Button className="press">
                <Store className="w-4 h-4 mr-2" /> My stall
              </Button>
            </Link>
          </div>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products"
            className="pl-9 rounded-full"
          />
        </div>
      </div>

      <h2 className="font-bold text-lg px-1 mb-3">
        {debounced ? "Results" : "Featured products"}
      </h2>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !products || products.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border rounded-2xl card-depth">
          <Store className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">
            No products yet. Open a stall to start selling!
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {products.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      )}
    </MainLayout>
  );
}

function ProductCard({ product }: { product: ShopProduct }) {
  return (
    <Link href={`/shop/products/${product.id}`}>
      <div className="bg-card border border-border rounded-2xl overflow-hidden card-depth lift-on-hover cursor-pointer">
        <div className="aspect-square bg-muted relative">
          {product.photos[0] ? (
            <img
              src={product.photos[0]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImagePlus className="w-8 h-8" />
            </div>
          )}
        </div>
        <div className="p-3">
          <p className="font-extrabold text-[15px]">{formatTaka(product.priceCents)}</p>
          <p className="text-sm line-clamp-1">{product.name}</p>
          {product.stallName && (
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5 flex items-center gap-1">
              <Store className="w-3 h-3" /> {product.stallName}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}

/* ---------------- Stall page ---------------- */
export function ShopStallPage() {
  const { id } = useParams<{ id: string }>();
  const stallId = Number(id);
  const { data: stall, isLoading } = useGetStall(stallId);
  const { data: products, isLoading: productsLoading } = useGetStallProducts(stallId);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!stall) {
    return (
      <MainLayout>
        <div className="py-16 text-center text-muted-foreground">Stall not found</div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Link href="/shop">
        <Button variant="ghost" className="mb-3 press">
          <ArrowLeft className="w-4 h-4 mr-2" /> Shop
        </Button>
      </Link>

      <div className="bg-card border border-border rounded-2xl p-5 card-depth mb-5 flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl bg-muted overflow-hidden shrink-0">
          {stall.avatarUrl ? (
            <img src={avatarSrc(stall.avatarUrl)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <Store className="w-7 h-7" />
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold truncate">{stall.name}</h1>
          <p className="text-sm text-muted-foreground">
            {stall.productCount ?? products?.length ?? 0} products
          </p>
          <Link
            href={`/pages/${stall.pageId}`}
            className="text-xs text-primary hover:underline"
          >
            View Hub
          </Link>
        </div>
      </div>

      {productsLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !products || products.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border rounded-2xl card-depth">
          <p className="text-muted-foreground">This stall has no products yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {products.map((item) => (
            <ProductCard key={item.id} product={item} />
          ))}
        </div>
      )}
    </MainLayout>
  );
}

/* ---------------- Product page + checkout ---------------- */
export function ShopProductPage() {
  const { id } = useParams<{ id: string }>();
  const productId = Number(id);
  const { data: product, isLoading } = useGetProduct(productId);
  const { user } = useAuth();
  const { data: myStall } = useGetMyStall({
    query: { queryKey: getGetMyStallQueryKey(), retry: false },
  });
  const [activePhoto, setActivePhoto] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!product) {
    return (
      <MainLayout>
        <div className="py-16 text-center text-muted-foreground">Product not found</div>
      </MainLayout>
    );
  }

  const isMine = myStall != null && myStall.id === product.stallId;
  const outOfStock = product.stockQty <= 0;
  const photos = product.photos.length ? product.photos : [];

  return (
    <MainLayout>
      <Link href="/shop">
        <Button variant="ghost" className="mb-3 press">
          <ArrowLeft className="w-4 h-4 mr-2" /> Shop
        </Button>
      </Link>

      <div className="grid md:grid-cols-2 gap-5">
        <div className="bg-card border border-border rounded-2xl overflow-hidden card-depth">
          <div className="aspect-square bg-muted relative">
            {photos[activePhoto] ? (
              <img
                src={photos[activePhoto]}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <ImagePlus className="w-12 h-12" />
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
            <h1 className="text-2xl font-extrabold">{product.name}</h1>
            <p className="text-2xl font-extrabold text-primary mt-1">
              {formatTaka(product.priceCents)}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {outOfStock ? (
                <span className="text-destructive font-semibold">Out of stock</span>
              ) : (
                `${product.stockQty} in stock`
              )}
            </p>

            {product.stallName && (
              <Link
                href={`/shop/stalls/${product.stallId}`}
                className="inline-flex items-center gap-1 mt-3 text-sm text-primary hover:underline"
              >
                <Store className="w-4 h-4" /> {product.stallName}
              </Link>
            )}

            {product.description && (
              <>
                <h3 className="font-bold mt-5 mb-1">Description</h3>
                <p className="text-[15px] whitespace-pre-wrap">{product.description}</p>
              </>
            )}

            {isMine ? (
              <div className="mt-5 p-3 rounded-xl bg-muted text-sm text-muted-foreground">
                This is your own product. Manage it from{" "}
                <Link href="/shop/my-stall" className="text-primary hover:underline">
                  My stall
                </Link>
                .
              </div>
            ) : (
              <div className="mt-5">
                <div className="flex items-center gap-3 mb-3">
                  <Label className="text-sm">Quantity</Label>
                  <div className="flex items-center border border-border rounded-lg overflow-hidden">
                    <button
                      className="px-3 py-1.5 hover:bg-muted press disabled:opacity-40"
                      disabled={quantity <= 1}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    >
                      −
                    </button>
                    <span className="px-4 py-1.5 min-w-[3rem] text-center font-semibold">
                      {quantity}
                    </span>
                    <button
                      className="px-3 py-1.5 hover:bg-muted press disabled:opacity-40"
                      disabled={quantity >= product.stockQty}
                      onClick={() =>
                        setQuantity((q) => Math.min(product.stockQty, q + 1))
                      }
                    >
                      +
                    </button>
                  </div>
                </div>
                <Button
                  className="w-full press"
                  disabled={outOfStock}
                  onClick={() => setCheckoutOpen(true)}
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  {outOfStock ? "Out of stock" : "Order now"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        product={product}
        quantity={quantity}
        buyerPhone={user?.phone ?? ""}
      />
    </MainLayout>
  );
}

function CheckoutDialog({
  open,
  onOpenChange,
  product,
  quantity,
  buyerPhone,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  product: ShopProduct;
  quantity: number;
  buyerPhone: string;
}) {
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const createOrder = useCreateOrder();
  const { data: settings } = useGetShopSettings();

  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState(buyerPhone);
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "direct">("cod");
  const [paymentRef, setPaymentRef] = useState("");

  useEffect(() => {
    if (open) setPhone(buyerPhone);
  }, [open, buyerPhone]);

  const total = product.priceCents * quantity;
  const canSubmit =
    address.trim().length > 0 &&
    phone.trim().length > 0 &&
    (paymentMethod === "cod" || paymentRef.trim().length > 0);

  const submit = () => {
    if (!canSubmit || createOrder.isPending) return;
    createOrder.mutate(
      {
        data: {
          productId: product.id,
          quantity,
          deliveryAddress: address.trim(),
          phone: phone.trim(),
          paymentMethod,
          ...(paymentMethod === "direct" ? { paymentRef: paymentRef.trim() } : {}),
        },
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ role: "buyer" }) });
          queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(product.id) });
          queryClient.invalidateQueries({ queryKey: getBrowseProductsQueryKey() });
          onOpenChange(false);
          toast({
            title: "Order placed!",
            description:
              paymentMethod === "direct"
                ? "Awaiting payment verification by the team."
                : "The seller will confirm your order soon.",
          });
          navigate("/shop/orders");
        },
        onError: (err) => {
          toast({
            title: "Could not place order",
            description: apiErrorMessage(err, "Please try again."),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Checkout</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-muted">
            <div className="w-14 h-14 rounded-lg bg-background overflow-hidden shrink-0">
              {product.photos[0] ? (
                <img src={product.photos[0]} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <ImagePlus className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold line-clamp-1">{product.name}</p>
              <p className="text-sm text-muted-foreground">
                {formatTaka(product.priceCents)} × {quantity}
              </p>
            </div>
            <p className="font-extrabold">{formatTaka(total)}</p>
          </div>

          <div>
            <Label htmlFor="co-address" className="mb-1.5 block">
              Delivery address
            </Label>
            <Textarea
              id="co-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="House, road, area, city"
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="co-phone" className="mb-1.5 block">
              Phone number
            </Label>
            <Input
              id="co-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXXXXXXXX"
            />
          </div>

          <div>
            <Label className="mb-1.5 block">Payment method</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod("cod")}
                className={`p-3 rounded-xl border text-sm font-semibold press transition-colors ${
                  paymentMethod === "cod"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                Cash on Delivery
              </button>
              <button
                type="button"
                onClick={() => setPaymentMethod("direct")}
                className={`p-3 rounded-xl border text-sm font-semibold press transition-colors ${
                  paymentMethod === "direct"
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border hover:bg-muted"
                }`}
              >
                Direct payment
              </button>
            </div>
          </div>

          {paymentMethod === "direct" && (
            <div className="space-y-3">
              {settings?.paymentInstructions && (
                <div className="p-3 rounded-xl bg-muted text-sm whitespace-pre-wrap">
                  {settings.paymentInstructions}
                </div>
              )}
              <div>
                <Label htmlFor="co-ref" className="mb-1.5 block">
                  Transaction ID
                </Label>
                <Input
                  id="co-ref"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  placeholder="e.g. bKash TrxID"
                />
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            className="w-full press"
            disabled={!canSubmit || createOrder.isPending}
            onClick={submit}
          >
            {createOrder.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Place order · {formatTaka(total)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- My orders ---------------- */
export function ShopOrdersPage() {
  const [tab, setTab] = useState<"buyer" | "seller">("buyer");

  return (
    <MainLayout>
      <Link href="/shop">
        <Button variant="ghost" className="mb-3 press">
          <ArrowLeft className="w-4 h-4 mr-2" /> Shop
        </Button>
      </Link>

      <div className="bg-card border border-border rounded-2xl p-5 card-depth mb-5">
        <h1 className="text-xl font-extrabold mb-4">My orders</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setTab("buyer")}
            className={`px-4 py-2 rounded-full text-sm font-semibold press transition-colors ${
              tab === "buyer" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
            }`}
          >
            Buying
          </button>
          <button
            onClick={() => setTab("seller")}
            className={`px-4 py-2 rounded-full text-sm font-semibold press transition-colors ${
              tab === "seller" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
            }`}
          >
            Selling
          </button>
        </div>
      </div>

      <OrdersList role={tab} />
    </MainLayout>
  );
}

function OrdersList({ role }: { role: "buyer" | "seller" }) {
  const { data: orders, isLoading } = useListOrders(
    { role },
    { query: { queryKey: getListOrdersQueryKey({ role }) } },
  );

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="py-16 text-center bg-card border border-border rounded-2xl card-depth">
        <ShoppingBag className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
        <p className="text-muted-foreground">
          {role === "buyer" ? "You haven't ordered anything yet." : "No orders yet."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {orders.map((order) => (
        <OrderRow key={order.id} order={order} role={role} />
      ))}
    </div>
  );
}

function OrderRow({ order, role }: { order: ShopOrder; role: "buyer" | "seller" }) {
  const queryClient = useQueryClient();
  const updateStatus = useUpdateOrderStatus();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ role: "buyer" }) });
    queryClient.invalidateQueries({ queryKey: getListOrdersQueryKey({ role: "seller" }) });
    queryClient.invalidateQueries({ queryKey: getGetOrderQueryKey(order.id) });
    queryClient.invalidateQueries({ queryKey: getGetShopWalletQueryKey() });
  };

  const change = (status: ShopOrderStatus, successMsg: string) => {
    updateStatus.mutate(
      { id: order.id, data: { status } },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: successMsg });
        },
        onError: (err) => {
          toast({
            title: "Could not update order",
            description: apiErrorMessage(err, "Please try again."),
            variant: "destructive",
          });
        },
      },
    );
  };

  const pending = updateStatus.isPending;

  // Actions depend on role + status.
  const actions: { label: string; status: ShopOrderStatus; variant?: "default" | "secondary" | "destructive"; msg: string }[] = [];
  if (role === "seller") {
    if (order.status === "pending")
      actions.push({ label: "Confirm", status: "confirmed", msg: "Order confirmed" });
    if (order.status === "confirmed")
      actions.push({ label: "Mark delivered", status: "delivered", msg: "Marked as delivered" });
    if (order.status === "pending")
      actions.push({ label: "Cancel", status: "cancelled", variant: "destructive", msg: "Order cancelled" });
  } else {
    if (order.status === "delivered")
      actions.push({ label: "Confirm received", status: "completed", msg: "Order completed" });
    if (order.status === "awaiting_verification" || order.status === "pending")
      actions.push({ label: "Cancel", status: "cancelled", variant: "destructive", msg: "Order cancelled" });
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-4 card-depth">
      <div className="flex items-start gap-3">
        <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
          {order.productPhoto ? (
            <img src={order.productPhoto} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <ImagePlus className="w-6 h-6" />
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-semibold line-clamp-1">{order.productName}</p>
            <StatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Qty {order.quantity} · {formatTaka(order.totalCents)}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {order.paymentMethod === "cod" ? "Cash on Delivery" : "Direct payment"}
            {order.counterpart &&
              ` · ${role === "seller" ? "Buyer" : "Seller"}: ${order.counterpart.displayName}`}
          </p>
        </div>
      </div>

      {actions.length > 0 && (
        <div className="flex gap-2 mt-3 flex-wrap">
          {actions.map((a) => (
            <Button
              key={a.status + a.label}
              size="sm"
              variant={a.variant ?? "default"}
              className="press"
              disabled={pending}
              onClick={() => change(a.status, a.msg)}
            >
              {pending && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
              {a.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Seller dashboard (My stall) ---------------- */
export function ShopMyStallPage() {
  const { data: myStall, isLoading } = useGetMyStall({
    query: { queryKey: getGetMyStallQueryKey(), retry: false },
  });
  const [tab, setTab] = useState<"products" | "orders" | "wallet">("products");

  if (isLoading) {
    return (
      <MainLayout>
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <Link href="/shop">
        <Button variant="ghost" className="mb-3 press">
          <ArrowLeft className="w-4 h-4 mr-2" /> Shop
        </Button>
      </Link>

      {!myStall ? (
        <StallSetup />
      ) : (
        <>
          <div className="bg-card border border-border rounded-2xl p-5 card-depth mb-5 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-muted overflow-hidden shrink-0">
              {myStall.avatarUrl ? (
                <img
                  src={avatarSrc(myStall.avatarUrl)}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                  <Store className="w-6 h-6" />
                </div>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold truncate">{myStall.name}</h1>
              <Link
                href={`/shop/stalls/${myStall.id}`}
                className="text-xs text-primary hover:underline"
              >
                View public stall
              </Link>
            </div>
          </div>

          <div className="flex gap-2 mb-5">
            <button
              onClick={() => setTab("products")}
              className={`px-4 py-2 rounded-full text-sm font-semibold press transition-colors inline-flex items-center gap-1.5 ${
                tab === "products" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
              }`}
            >
              <Package className="w-4 h-4" /> Products
            </button>
            <button
              onClick={() => setTab("orders")}
              className={`px-4 py-2 rounded-full text-sm font-semibold press transition-colors inline-flex items-center gap-1.5 ${
                tab === "orders" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
              }`}
            >
              <ClipboardList className="w-4 h-4" /> Orders
            </button>
            <button
              onClick={() => setTab("wallet")}
              className={`px-4 py-2 rounded-full text-sm font-semibold press transition-colors inline-flex items-center gap-1.5 ${
                tab === "wallet" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/70"
              }`}
            >
              <Wallet className="w-4 h-4" /> Wallet
            </button>
          </div>

          {tab === "products" && <StallProductsTab stallId={myStall.id} />}
          {tab === "orders" && <OrdersList role="seller" />}
          {tab === "wallet" && <WalletTab />}
        </>
      )}
    </MainLayout>
  );
}

function StallSetup() {
  const queryClient = useQueryClient();
  const { data: pages, isLoading } = useListPages({ mine: true });
  const createStall = useCreateStall();
  const [pageId, setPageId] = useState<string>("");

  const submit = () => {
    if (!pageId || createStall.isPending) return;
    createStall.mutate(
      { data: { pageId: Number(pageId) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetMyStallQueryKey() });
          toast({ title: "Stall created!", description: "You can now add products." });
        },
        onError: (err) => {
          toast({
            title: "Could not create stall",
            description: apiErrorMessage(err, "Please try again."),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 card-depth max-w-lg mx-auto animate-in fade-in text-center">
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mx-auto mb-4">
        <Store className="w-8 h-8" />
      </div>
      <h1 className="text-xl font-extrabold mb-1">Open your stall</h1>
      <p className="text-sm text-muted-foreground mb-5">
        Your stall is connected to one of your Hubs — its name and avatar come from
        the Hub you pick.
      </p>

      {isLoading ? (
        <div className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !pages || pages.length === 0 ? (
        <div>
          <p className="text-sm text-muted-foreground mb-4">
            You don't have any Hubs yet. Create a Hub first to open a stall.
          </p>
          <Link href="/pages">
            <Button className="press">
              <Plus className="w-4 h-4 mr-2" /> Create a Hub
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4 text-left">
          <div>
            <Label className="mb-1.5 block">Choose a Hub</Label>
            <Select value={pageId} onValueChange={setPageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a Hub" />
              </SelectTrigger>
              <SelectContent>
                {pages.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full press"
            disabled={!pageId || createStall.isPending}
            onClick={submit}
          >
            {createStall.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            Open stall
          </Button>
        </div>
      )}
    </div>
  );
}

/* ---------------- Products tab ---------------- */
function StallProductsTab({ stallId }: { stallId: number }) {
  const { data: products, isLoading } = useGetStallProducts(stallId);
  const [editing, setEditing] = useState<ShopProduct | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button className="press" onClick={() => setCreating(true)}>
          <Plus className="w-4 h-4 mr-2" /> Add product
        </Button>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : !products || products.length === 0 ? (
        <div className="py-16 text-center bg-card border border-border rounded-2xl card-depth">
          <Package className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
          <p className="text-muted-foreground">No products yet. Add your first one!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <ProductManageRow key={p.id} product={p} stallId={stallId} onEdit={() => setEditing(p)} />
          ))}
        </div>
      )}

      <ProductDialog
        open={creating}
        onOpenChange={setCreating}
        stallId={stallId}
        product={null}
      />
      <ProductDialog
        open={editing != null}
        onOpenChange={(v) => !v && setEditing(null)}
        stallId={stallId}
        product={editing}
      />
    </div>
  );
}

function ProductManageRow({
  product,
  stallId,
  onEdit,
}: {
  product: ShopProduct;
  stallId: number;
  onEdit: () => void;
}) {
  const queryClient = useQueryClient();
  const deleteProduct = useDeleteProduct();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetStallProductsQueryKey(stallId) });
    queryClient.invalidateQueries({ queryKey: getBrowseProductsQueryKey() });
  };

  const remove = () => {
    if (!confirm(`Delete "${product.name}"?`)) return;
    deleteProduct.mutate(
      { id: product.id },
      {
        onSuccess: () => {
          invalidate();
          toast({ title: "Product deleted" });
        },
        onError: (err) => {
          toast({
            title: "Could not delete",
            description: apiErrorMessage(err, "Please try again."),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-4 card-depth flex items-center gap-3">
      <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0">
        {product.photos[0] ? (
          <img src={product.photos[0]} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <ImagePlus className="w-6 h-6" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold line-clamp-1">{product.name}</p>
          {!product.active && (
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              Hidden
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {formatTaka(product.priceCents)} · {product.stockQty} in stock
        </p>
      </div>
      <div className="flex gap-1.5 shrink-0">
        <Button variant="secondary" size="icon" className="press" onClick={onEdit}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="press"
          disabled={deleteProduct.isPending}
          onClick={remove}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function ProductDialog({
  open,
  onOpenChange,
  stallId,
  product,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stallId: number;
  product: ShopProduct | null;
}) {
  const queryClient = useQueryClient();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const isEdit = product != null;

  const [name, setName] = useState("");
  const [priceTaka, setPriceTaka] = useState("");
  const [description, setDescription] = useState("");
  const [stockQty, setStockQty] = useState("0");
  const [active, setActive] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "");
      setPriceTaka(product ? String(product.priceCents / 100) : "");
      setDescription(product?.description ?? "");
      setStockQty(product ? String(product.stockQty) : "0");
      setActive(product?.active ?? true);
      setPhotos(product?.photos ?? []);
    }
  }, [open, product]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image")) continue;
      try {
        const uploaded = await uploadMedia(file);
        setPhotos((prev) => [...prev, uploaded.url]);
      } catch (err) {
        if (err instanceof UploadUnavailableError) {
          const url = window.prompt(
            "Direct upload isn't available in this environment. Paste an image URL instead:",
          );
          if (url) setPhotos((prev) => [...prev, url]);
        } else {
          toast({ title: "Upload failed", description: "Please try again.", variant: "destructive" });
        }
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getGetStallProductsQueryKey(stallId) });
    queryClient.invalidateQueries({ queryKey: getBrowseProductsQueryKey() });
    if (product) queryClient.invalidateQueries({ queryKey: getGetProductQueryKey(product.id) });
  };

  const canSubmit = name.trim().length > 0 && priceTaka.trim().length > 0 && !uploading;

  const submit = () => {
    if (!canSubmit) return;
    const priceCents = takaToCents(priceTaka);
    const stock = Math.max(0, Math.round(Number(stockQty) || 0));
    if (isEdit && product) {
      updateProduct.mutate(
        {
          id: product.id,
          data: {
            name: name.trim(),
            priceCents,
            description: description.trim(),
            stockQty: stock,
            active,
            photos,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            onOpenChange(false);
            toast({ title: "Product updated" });
          },
          onError: (err) => {
            toast({
              title: "Could not save",
              description: apiErrorMessage(err, "Please try again."),
              variant: "destructive",
            });
          },
        },
      );
    } else {
      createProduct.mutate(
        {
          data: {
            name: name.trim(),
            priceCents,
            description: description.trim(),
            stockQty: stock,
            photos,
          },
        },
        {
          onSuccess: () => {
            invalidate();
            onOpenChange(false);
            toast({ title: "Product added" });
          },
          onError: (err) => {
            toast({
              title: "Could not add",
              description: apiErrorMessage(err, "Please try again."),
              variant: "destructive",
            });
          },
        },
      );
    }
  };

  const pending = createProduct.isPending || updateProduct.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "Add product"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">Photos</Label>
            <div className="grid grid-cols-4 gap-2">
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
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="aspect-square rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground hover:border-primary transition-colors press disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <ImagePlus className="w-5 h-5" />
                    <span className="text-[11px] font-medium">Add</span>
                  </>
                )}
              </button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>

          <div>
            <Label htmlFor="p-name" className="mb-1.5 block">
              Name
            </Label>
            <Input
              id="p-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Product name"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-price" className="mb-1.5 block">
                Price (৳)
              </Label>
              <Input
                id="p-price"
                type="number"
                inputMode="decimal"
                value={priceTaka}
                onChange={(e) => setPriceTaka(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="p-stock" className="mb-1.5 block">
                Stock
              </Label>
              <Input
                id="p-stock"
                type="number"
                inputMode="numeric"
                value={stockQty}
                onChange={(e) => setStockQty(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="p-desc" className="mb-1.5 block">
              Description
            </Label>
            <Textarea
              id="p-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your product"
              rows={3}
            />
          </div>

          {isEdit && (
            <div className="flex items-center justify-between">
              <div>
                <Label>Active</Label>
                <p className="text-xs text-muted-foreground">
                  Inactive products are hidden from the Shop.
                </p>
              </div>
              <Switch checked={active} onCheckedChange={setActive} />
            </div>
          )}
        </div>
        <DialogFooter>
          <Button className="w-full press" disabled={!canSubmit || pending} onClick={submit}>
            {pending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
            {isEdit ? "Save changes" : "Add product"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------------- Wallet tab ---------------- */
const WITHDRAW_METHODS = [
  { value: "bkash", label: "bKash" },
  { value: "nagad", label: "Nagad" },
  { value: "bank", label: "Bank transfer" },
];

const LEDGER_LABELS: Record<string, string> = {
  sale_credit: "Sale",
  cod_commission: "COD commission",
  withdraw: "Withdrawal",
  withdraw_refund: "Withdrawal refund",
  admin_adjust: "Adjustment",
};

function WalletTab() {
  const { data: wallet, isLoading } = useGetShopWallet();

  if (isLoading) {
    return (
      <div className="py-16 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!wallet) {
    return (
      <div className="py-16 text-center text-muted-foreground">Wallet unavailable</div>
    );
  }

  const negative = wallet.balanceCents < 0;

  return (
    <div className="space-y-5">
      <div className="bg-card border border-border rounded-2xl p-5 card-depth">
        <p className="text-sm text-muted-foreground">Available balance</p>
        <p className={`text-3xl font-extrabold mt-1 ${negative ? "text-destructive" : ""}`}>
          {formatTaka(wallet.balanceCents)}
        </p>
        {wallet.pendingWithdrawCents > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {formatTaka(wallet.pendingWithdrawCents)} pending withdrawal
          </p>
        )}
      </div>

      <WithdrawalForm
        available={wallet.balanceCents - wallet.pendingWithdrawCents}
      />

      <div className="bg-card border border-border rounded-2xl p-5 card-depth">
        <h3 className="font-bold mb-3">Ledger history</h3>
        {wallet.ledger.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {wallet.ledger.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {LEDGER_LABELS[entry.kind] ?? entry.kind}
                  </p>
                  {entry.note && (
                    <p className="text-xs text-muted-foreground line-clamp-1">{entry.note}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p
                  className={`font-semibold shrink-0 ${
                    entry.amountCents < 0 ? "text-destructive" : "text-green-600 dark:text-green-400"
                  }`}
                >
                  {entry.amountCents < 0 ? "−" : "+"}
                  {formatTaka(Math.abs(entry.amountCents))}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      <WithdrawalsList />
    </div>
  );
}

function WithdrawalForm({ available }: { available: number }) {
  const queryClient = useQueryClient();
  const createWithdrawal = useCreateShopWithdrawal();
  const [amountTaka, setAmountTaka] = useState("");
  const [method, setMethod] = useState("bkash");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");

  const amountCents = takaToCents(amountTaka);
  const canSubmit =
    amountCents >= 1 && accountNumber.trim().length > 0 && !createWithdrawal.isPending;

  const submit = () => {
    if (!canSubmit) return;
    const details: Record<string, string> = { accountNumber: accountNumber.trim() };
    if (accountName.trim()) details.accountName = accountName.trim();
    createWithdrawal.mutate(
      { data: { amountCents, method, details } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetShopWalletQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListShopWithdrawalsQueryKey() });
          setAmountTaka("");
          setAccountNumber("");
          setAccountName("");
          toast({ title: "Withdrawal requested", description: "The team will review it." });
        },
        onError: (err) => {
          toast({
            title: "Could not request withdrawal",
            description: apiErrorMessage(err, "Please try again."),
            variant: "destructive",
          });
        },
      },
    );
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-5 card-depth">
      <h3 className="font-bold mb-3">Request withdrawal</h3>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="w-amount" className="mb-1.5 block">
              Amount (৳)
            </Label>
            <Input
              id="w-amount"
              type="number"
              inputMode="decimal"
              value={amountTaka}
              onChange={(e) => setAmountTaka(e.target.value)}
              placeholder="0.00"
            />
          </div>
          <div>
            <Label className="mb-1.5 block">Method</Label>
            <Select value={method} onValueChange={setMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WITHDRAW_METHODS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="w-acct" className="mb-1.5 block">
            {method === "bank" ? "Account number" : "Account number"}
          </Label>
          <Input
            id="w-acct"
            value={accountNumber}
            onChange={(e) => setAccountNumber(e.target.value)}
            placeholder={method === "bank" ? "Bank account number" : "01XXXXXXXXX"}
          />
        </div>
        <div>
          <Label htmlFor="w-name" className="mb-1.5 block">
            Account holder name{" "}
            <span className="text-muted-foreground font-normal">(optional)</span>
          </Label>
          <Input
            id="w-name"
            value={accountName}
            onChange={(e) => setAccountName(e.target.value)}
            placeholder="Name on the account"
          />
        </div>
        {available < amountCents && amountCents > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Requested amount exceeds your available balance ({formatTaka(Math.max(0, available))}).
          </p>
        )}
        <Button className="w-full press" disabled={!canSubmit} onClick={submit}>
          {createWithdrawal.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
          Request withdrawal
        </Button>
      </div>
    </div>
  );
}

const WITHDRAWAL_STATUS_CLASSES: Record<ShopWithdrawal["status"], string> = {
  pending: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400",
  approved: "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
};

function WithdrawalsList() {
  const { data: withdrawals, isLoading } = useListShopWithdrawals();

  return (
    <div className="bg-card border border-border rounded-2xl p-5 card-depth">
      <h3 className="font-bold mb-3">Withdrawal requests</h3>
      {isLoading ? (
        <div className="py-6 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : !withdrawals || withdrawals.length === 0 ? (
        <p className="text-sm text-muted-foreground">No withdrawal requests yet.</p>
      ) : (
        <div className="divide-y divide-border">
          {withdrawals.map((w) => (
            <div key={w.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-semibold">{formatTaka(w.amountCents)}</p>
                <p className="text-xs text-muted-foreground capitalize">
                  {w.method} · {new Date(w.createdAt).toLocaleDateString()}
                </p>
                {w.adminNote && (
                  <p className="text-xs text-muted-foreground">{w.adminNote}</p>
                )}
              </div>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold capitalize ${WITHDRAWAL_STATUS_CLASSES[w.status]}`}
              >
                {w.status}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
