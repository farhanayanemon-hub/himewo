import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Store,
  ShoppingBag,
  BadgeDollarSign,
  Coins,
  ChevronRight,
  Save,
  Settings as SettingsIcon,
  ReceiptText,
  Plus,
  Pencil,
  Trash2,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { fmtDateTime, fmtNumber } from "../lib/format";
import type {
  ShopOrderRow,
  ShopOrderStatus,
  ShopPaymentMethod,
  ShopProductRow,
  ShopSettings,
  ShopStallRow,
  ShopSummary,
  ShopWithdrawalRow,
  ShopWithdrawalStatus,
  ShopCategoryRow,
} from "../lib/types";
import { ApiError } from "../lib/api";
import {
  Avatar,
  Badge,
  Button,
  Card,
  CardHeader,
  EmptyState,
  ErrorNote,
  Input,
  Loading,
  Modal,
  Select,
  Table,
  Td,
  Th,
  Textarea,
  Toggle,
} from "../components/ui";
import { PageHeader } from "../components/Layout";

/* ------------------------------ Helpers -------------------------------- */

// Money is stored as integer paisa; display as taka with 2 decimals.
function bdt(cents: number): string {
  const taka = cents / 100;
  return `৳${taka.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

const ORDER_STATUS_TONE: Record<
  ShopOrderStatus,
  "amber" | "blue" | "green" | "red" | "violet" | "neutral"
> = {
  awaiting_verification: "amber",
  pending: "blue",
  confirmed: "violet",
  delivered: "blue",
  completed: "green",
  cancelled: "red",
};

const ORDER_STATUS_LABEL: Record<ShopOrderStatus, string> = {
  awaiting_verification: "Awaiting verification",
  pending: "Pending",
  confirmed: "Confirmed",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

const ORDER_STATUSES: ShopOrderStatus[] = [
  "awaiting_verification",
  "pending",
  "confirmed",
  "delivered",
  "completed",
  "cancelled",
];

const WITHDRAWAL_STATUS_TONE: Record<
  ShopWithdrawalStatus,
  "amber" | "green" | "red"
> = {
  pending: "amber",
  approved: "green",
  rejected: "red",
};

type Tab =
  | "overview"
  | "stalls"
  | "categories"
  | "orders"
  | "payments"
  | "withdrawals"
  | "settings";

const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "stalls", label: "Stalls" },
  { key: "categories", label: "Categories" },
  { key: "orders", label: "Orders" },
  { key: "payments", label: "Payments" },
  { key: "withdrawals", label: "Withdrawals" },
  { key: "settings", label: "Settings" },
];

export function Shop() {
  const { can } = useAuth();
  const canManage = can("shop.manage");
  const canSettings = can("shop.manage");
  const [tab, setTab] = useState<Tab>("overview");

  return (
    <div>
      <PageHeader
        title="Shop"
        description="Stalls, orders, payments and seller payouts across the marketplace."
      />

      <div className="mb-6 flex flex-wrap gap-1 border-b border-slate-200">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={
              "-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors " +
              (tab === t.key
                ? "border-brand-600 text-brand-700"
                : "border-transparent text-slate-500 hover:text-slate-800")
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-6">
        {tab === "overview" && <OverviewSection />}
        {tab === "stalls" && <StallsSection />}
        {tab === "categories" && <CategoriesSection canManage={canManage} />}
        {tab === "orders" && <OrdersSection canManage={canManage} />}
        {tab === "payments" && <PaymentsSection canManage={canManage} />}
        {tab === "withdrawals" && <WithdrawalsSection canManage={canManage} />}
        {tab === "settings" && <SettingsSection canManage={canSettings} />}
      </div>
    </div>
  );
}

/* ------------------------------ Overview ------------------------------- */

function StatTile({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  tone: "emerald" | "amber" | "violet" | "blue";
}) {
  const toneClasses: Record<string, string> = {
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    blue: "bg-sky-50 text-sky-600",
  };
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <div className={`rounded-lg p-2 ${toneClasses[tone]}`}>{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-0.5 text-2xl font-semibold text-slate-900">{value}</p>
        {sub && <p className="mt-0.5 text-xs text-slate-400">{sub}</p>}
      </div>
    </div>
  );
}

function OverviewSection() {
  const query = useQuery({
    queryKey: ["shop-summary"],
    queryFn: () => api.get<ShopSummary>("/admin/shop/summary"),
  });

  return (
    <>
      <Card>
        <CardHeader
          title="Shop overview"
          subtitle="Platform commission earned, funds held in escrow, and marketplace activity. All values in BDT (৳)."
        />
        {query.isLoading && <Loading />}
        <ErrorNote error={query.error} />
        {query.data && (
          <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-x sm:divide-y-0 md:grid-cols-4">
            <StatTile
              tone="emerald"
              icon={<BadgeDollarSign className="h-5 w-5" />}
              label="Total commission"
              value={bdt(query.data.platformProfitCents)}
              sub="Platform profit"
            />
            <StatTile
              tone="amber"
              icon={<Coins className="h-5 w-5" />}
              label="Held funds"
              value={bdt(query.data.heldFundsCents)}
              sub="Direct-payment escrow"
            />
            <StatTile
              tone="blue"
              icon={<Store className="h-5 w-5" />}
              label="Stalls"
              value={fmtNumber(query.data.stallCount)}
              sub={`${fmtNumber(query.data.orderCount)} orders total`}
            />
            <StatTile
              tone="violet"
              icon={<ShoppingBag className="h-5 w-5" />}
              label="Awaiting action"
              value={fmtNumber(
                query.data.pendingPaymentCount + query.data.pendingWithdrawalCount,
              )}
              sub={`${fmtNumber(query.data.pendingPaymentCount)} payments · ${fmtNumber(
                query.data.pendingWithdrawalCount,
              )} withdrawals`}
            />
          </div>
        )}
      </Card>
    </>
  );
}

/* -------------------------------- Stalls ------------------------------- */

function StallsSection() {
  const [items, setItems] = useState<ShopStallRow[]>([]);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [expanded, setExpanded] = useState<number | null>(null);
  const limit = 30;

  const query = useQuery({
    queryKey: ["shop-stalls", cursor],
    queryFn: () =>
      api.get<ShopStallRow[]>("/admin/shop/stalls", {
        limit,
        ...(cursor ? { cursor } : {}),
      }),
  });

  const page = query.data;
  useEffect(() => {
    if (!page) return;
    if (cursor === undefined) {
      setItems(page);
      return;
    }
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...page.filter((p) => !seen.has(p.id))];
    });
  }, [page, cursor]);

  const hasMore = (page?.length ?? 0) === limit;
  const loadMore = () => {
    if (items.length > 0) setCursor(items[items.length - 1].id);
  };

  return (
    <Card>
      <CardHeader
        title="Stalls"
        subtitle="Every stall, its Hub, owner and activity. Expand a row to view its products."
      />
      {query.isLoading && items.length === 0 && <Loading />}
      <ErrorNote error={query.error} />
      {query.data && items.length === 0 && !query.isLoading && (
        <EmptyState title="No stalls yet" description="No sellers have opened a stall." />
      )}

      {items.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Stall (Hub)</Th>
              <Th>Owner</Th>
              <Th>Products</Th>
              <Th>Orders</Th>
              <Th>Status</Th>
              <Th>Created</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <StallRow
                key={s.id}
                stall={s}
                expanded={expanded === s.id}
                onToggle={() =>
                  setExpanded((cur) => (cur === s.id ? null : s.id))
                }
              />
            ))}
          </tbody>
        </Table>
      )}

      {hasMore && items.length > 0 && (
        <div className="flex justify-center px-5 py-4">
          <Button variant="outline" size="sm" loading={query.isFetching} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </Card>
  );
}

function StallRow({
  stall,
  expanded,
  onToggle,
}: {
  stall: ShopStallRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const products = useQuery({
    queryKey: ["shop-stall-products", stall.id],
    queryFn: () =>
      api.get<ShopProductRow[]>(`/admin/shop/stalls/${stall.id}/products`),
    enabled: expanded,
  });

  return (
    <>
      <tr className="hover:bg-slate-50">
        <Td>
          <div className="flex items-center gap-3">
            <Avatar src={stall.avatarUrl} name={stall.name} size={32} />
            <div>
              <div className="font-medium text-slate-900">{stall.name}</div>
              <div className="text-xs text-slate-500">Hub #{stall.pageId}</div>
            </div>
          </div>
        </Td>
        <Td>
          {stall.owner ? (
            <div>
              <div className="font-medium text-slate-900">
                {stall.owner.displayName}
              </div>
              <div className="text-xs text-slate-500">@{stall.owner.username}</div>
            </div>
          ) : (
            <span className="text-xs text-slate-400">{stall.userId.slice(0, 8)}</span>
          )}
        </Td>
        <Td>{fmtNumber(stall.productCount)}</Td>
        <Td>{fmtNumber(stall.orderCount)}</Td>
        <Td>
          <Badge tone={stall.active ? "green" : "neutral"}>
            {stall.active ? "Active" : "Inactive"}
          </Badge>
        </Td>
        <Td className="text-xs text-slate-500">{fmtDateTime(stall.createdAt)}</Td>
        <Td>
          <Button size="sm" variant="ghost" onClick={onToggle}>
            <ChevronRight
              className={
                "h-4 w-4 transition-transform " + (expanded ? "rotate-90" : "")
              }
            />
            Products
          </Button>
        </Td>
      </tr>
      {expanded && (
        <tr>
          <td colSpan={7} className="border-b border-slate-50 bg-slate-50 px-4 py-3">
            {products.isLoading && <Loading />}
            <ErrorNote error={products.error} />
            {products.data && products.data.length === 0 && (
              <p className="py-2 text-sm text-slate-500">This stall has no products.</p>
            )}
            {products.data && products.data.length > 0 && (
              <div className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
                {products.data.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5">
                    {p.photos[0] ? (
                      <img
                        src={p.photos[0]}
                        alt={p.name}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium text-slate-900">{p.name}</div>
                      <div className="text-xs text-slate-500">
                        Stock: {fmtNumber(p.stockQty)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold text-slate-900">{bdt(p.priceCents)}</div>
                      <Badge tone={p.active ? "green" : "neutral"} className="mt-0.5">
                        {p.active ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

/* ------------------------------ Categories ----------------------------- */

interface CategoryFormValues {
  name: string;
  icon: string;
  sortOrder: string;
  active: boolean;
}

function CategoryDialog({
  open,
  title,
  initial,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  title: string;
  initial: CategoryFormValues;
  submitting: boolean;
  error: unknown;
  onClose: () => void;
  onSubmit: (values: { name: string; icon: string; sortOrder: number; active: boolean }) => void;
}) {
  const [name, setName] = useState(initial.name);
  const [icon, setIcon] = useState(initial.icon);
  const [sortOrder, setSortOrder] = useState(initial.sortOrder);
  const [active, setActive] = useState(initial.active);

  // Reset fields whenever the dialog opens with fresh initial values.
  useEffect(() => {
    if (open) {
      setName(initial.name);
      setIcon(initial.icon);
      setSortOrder(initial.sortOrder);
      setActive(initial.active);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sortNum = Number(sortOrder);
  const validationError = (() => {
    if (name.trim() === "") return "Name is required.";
    if (sortOrder.trim() !== "" && !Number.isFinite(sortNum))
      return "Sort order must be a number.";
    return null;
  })();

  const submit = () => {
    if (validationError) return;
    onSubmit({
      name: name.trim(),
      icon: icon.trim(),
      sortOrder: sortOrder.trim() === "" ? 0 : sortNum,
      active,
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            loading={submitting}
            disabled={!!validationError}
            onClick={submit}
          >
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <ErrorNote error={error} />
        <div className="space-y-1">
          <label className="text-xs font-medium text-slate-600">Name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Electronics"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Icon (emoji)</label>
            <Input
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              placeholder="🛍️"
              className="text-lg"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-slate-600">Sort order</label>
            <Input
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-slate-600">Active</label>
          <Toggle checked={active} onChange={setActive} disabled={submitting} />
        </div>
        {validationError && (
          <p className="text-xs font-medium text-rose-600">{validationError}</p>
        )}
      </div>
    </Modal>
  );
}

function CategoriesSection({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["shop-categories"],
    queryFn: () => api.get<ShopCategoryRow[]>("/admin/shop/categories"),
  });

  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<ShopCategoryRow | null>(null);
  const [deleting, setDeleting] = useState<ShopCategoryRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["shop-categories"] });
  };

  // Extract a friendly message for the common 409 duplicate-name conflict.
  const conflictMessage = (err: unknown): string | null =>
    err instanceof ApiError && err.status === 409
      ? err.message || "A category with this name already exists."
      : null;

  const create = useMutation({
    mutationFn: (v: { name: string; icon: string; sortOrder: number; active: boolean }) =>
      api.post<ShopCategoryRow>("/admin/shop/categories", v),
    onSuccess: () => {
      invalidate();
      setCreating(false);
    },
    onError: (err) => {
      const msg = conflictMessage(err);
      if (msg) {
        setNotice(msg);
        setCreating(false);
      }
    },
  });

  const update = useMutation({
    mutationFn: (v: {
      id: number;
      body: Partial<{ name: string; icon: string; sortOrder: number; active: boolean }>;
    }) => api.patch<ShopCategoryRow>(`/admin/shop/categories/${v.id}`, v.body),
    onSuccess: () => {
      invalidate();
      setEditing(null);
    },
    onError: (err) => {
      const msg = conflictMessage(err);
      if (msg) {
        setNotice(msg);
        setEditing(null);
      }
    },
  });

  const remove = useMutation({
    mutationFn: (id: number) => api.del<void>(`/admin/shop/categories/${id}`),
    onSuccess: () => {
      invalidate();
      setDeleting(null);
    },
  });

  const toggleActive = (cat: ShopCategoryRow) => {
    if (!canManage) return;
    update.mutate({ id: cat.id, body: { active: !cat.active } });
  };

  return (
    <Card>
      <CardHeader
        title="Categories"
        subtitle="Product categories buyers use to browse. Deleting a category leaves its products uncategorised."
        action={
          canManage ? (
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" />
              New category
            </Button>
          ) : undefined
        }
      />

      {notice && (
        <div className="mx-5 mt-4 flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <span>{notice}</span>
          <button
            type="button"
            className="text-amber-600 hover:text-amber-800"
            onClick={() => setNotice(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {query.isLoading && <Loading />}
      <ErrorNote error={query.error} />
      {query.data && query.data.length === 0 && !query.isLoading && (
        <EmptyState
          title="No categories yet"
          description="Create a category to help buyers browse products."
        />
      )}

      {query.data && query.data.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Category</Th>
              <Th>Sort order</Th>
              <Th>Products</Th>
              <Th>Active</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {query.data.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <Td>
                  <div className="flex items-center gap-3">
                    <span className="text-xl leading-none">{c.icon || "🏷️"}</span>
                    <span className="font-medium text-slate-900">{c.name}</span>
                  </div>
                </Td>
                <Td className="text-sm text-slate-700">{fmtNumber(c.sortOrder)}</Td>
                <Td className="text-sm text-slate-700">{fmtNumber(c.productCount)}</Td>
                <Td>
                  {canManage ? (
                    <Toggle
                      checked={c.active}
                      onChange={() => toggleActive(c)}
                      disabled={update.isPending}
                    />
                  ) : (
                    <Badge tone={c.active ? "green" : "neutral"}>
                      {c.active ? "Active" : "Inactive"}
                    </Badge>
                  )}
                </Td>
                <Td>
                  {canManage ? (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(c)}>
                        <Pencil className="h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="danger"
                        onClick={() => setDeleting(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <CategoryDialog
        open={creating}
        title="New category"
        initial={{ name: "", icon: "", sortOrder: "0", active: true }}
        submitting={create.isPending}
        error={
          create.error instanceof ApiError && create.error.status === 409
            ? null
            : create.error
        }
        onClose={() => setCreating(false)}
        onSubmit={(v) => create.mutate(v)}
      />

      <CategoryDialog
        open={!!editing}
        title="Edit category"
        initial={{
          name: editing?.name ?? "",
          icon: editing?.icon ?? "",
          sortOrder: String(editing?.sortOrder ?? 0),
          active: editing?.active ?? true,
        }}
        submitting={update.isPending}
        error={
          update.error instanceof ApiError && update.error.status === 409
            ? null
            : update.error
        }
        onClose={() => setEditing(null)}
        onSubmit={(v) => editing && update.mutate({ id: editing.id, body: v })}
      />

      <Modal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        title="Delete category"
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={remove.isPending}
              onClick={() => deleting && remove.mutate(deleting.id)}
            >
              Delete
            </Button>
          </>
        }
      >
        {deleting && (
          <div className="space-y-4">
            <ErrorNote error={remove.error} />
            <p className="text-sm text-slate-700">
              Delete <span className="font-semibold">{deleting.name}</span>? Its{" "}
              {fmtNumber(deleting.productCount)} product(s) will remain but become
              uncategorised.
            </p>
          </div>
        )}
      </Modal>
    </Card>
  );
}

/* -------------------------------- Orders ------------------------------- */

function OrderStatusCell({
  order,
  canManage,
}: {
  order: ShopOrderRow;
  canManage: boolean;
}) {
  const qc = useQueryClient();
  const mutate = useMutation({
    mutationFn: (status: ShopOrderStatus) =>
      api.patch<ShopOrderRow>(`/admin/shop/orders/${order.id}`, { status }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["shop-orders"] });
      void qc.invalidateQueries({ queryKey: ["shop-summary"] });
    },
  });

  if (!canManage) {
    return (
      <Badge tone={ORDER_STATUS_TONE[order.status]}>
        {ORDER_STATUS_LABEL[order.status]}
      </Badge>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <Select
        value={order.status}
        disabled={mutate.isPending}
        onChange={(e) => mutate.mutate(e.target.value as ShopOrderStatus)}
      >
        {ORDER_STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABEL[s]}
          </option>
        ))}
      </Select>
      <ErrorNote error={mutate.error} />
    </div>
  );
}

function OrdersSection({ canManage }: { canManage: boolean }) {
  const [status, setStatus] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<ShopOrderRow[]>([]);
  const limit = 30;

  const query = useQuery({
    queryKey: ["shop-orders", status, paymentMethod, cursor],
    queryFn: () =>
      api.get<ShopOrderRow[]>("/admin/shop/orders", {
        limit,
        ...(status ? { status } : {}),
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(cursor ? { cursor } : {}),
      }),
  });

  useEffect(() => {
    setItems([]);
    setCursor(undefined);
  }, [status, paymentMethod]);

  const page = query.data;
  useEffect(() => {
    if (!page) return;
    if (cursor === undefined) {
      setItems(page);
      return;
    }
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...page.filter((p) => !seen.has(p.id))];
    });
  }, [page, cursor]);

  const hasMore = (page?.length ?? 0) === limit;
  const loadMore = () => {
    if (items.length > 0) setCursor(items[items.length - 1].id);
  };

  return (
    <Card>
      <CardHeader
        title="Orders"
        subtitle="All orders across every stall. Change any order's status inline."
        action={
          <div className="flex gap-2">
            <Select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
              <option value="">All payments</option>
              <option value="cod">Cash on Delivery</option>
              <option value="direct">Direct</option>
            </Select>
            <Select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
          </div>
        }
      />
      {query.isLoading && items.length === 0 && <Loading />}
      <ErrorNote error={query.error} />
      {query.data && items.length === 0 && !query.isLoading && (
        <EmptyState title="No orders" description="Nothing matches this filter." />
      )}

      {items.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Stall</Th>
              <Th>Buyer</Th>
              <Th>Total</Th>
              <Th>Payment</Th>
              <Th>Placed</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <Td>
                  <div className="flex items-center gap-3">
                    {o.productPhoto ? (
                      <img
                        src={o.productPhoto}
                        alt={o.productName}
                        className="h-10 w-10 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <ShoppingBag className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900">
                        {o.productName}
                      </div>
                      <div className="text-xs text-slate-500">
                        #{o.id} · qty {fmtNumber(o.quantity)}
                      </div>
                    </div>
                  </div>
                </Td>
                <Td className="text-sm text-slate-700">{o.stallName ?? "—"}</Td>
                <Td>
                  {o.counterpart ? (
                    <div>
                      <div className="font-medium text-slate-900">
                        {o.counterpart.displayName}
                      </div>
                      <div className="text-xs text-slate-500">
                        @{o.counterpart.username}
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {o.buyerId.slice(0, 8)}
                    </span>
                  )}
                  <div className="mt-1 max-w-[14rem] text-xs text-slate-400">
                    {o.phone} · {o.deliveryAddress}
                  </div>
                </Td>
                <Td>
                  <div className="font-semibold text-slate-900">{bdt(o.totalCents)}</div>
                  {o.heldCents > 0 && (
                    <div className="text-xs text-amber-600">
                      held {bdt(o.heldCents)}
                    </div>
                  )}
                </Td>
                <Td>
                  <Badge tone={o.paymentMethod === "cod" ? "neutral" : "blue"}>
                    {o.paymentMethod === "cod" ? "COD" : "Direct"}
                  </Badge>
                  {o.paymentRef && (
                    <div className="mt-1 text-xs text-slate-400">
                      Txn: {o.paymentRef}
                    </div>
                  )}
                </Td>
                <Td className="text-xs text-slate-500">{fmtDateTime(o.createdAt)}</Td>
                <Td className="min-w-[12rem]">
                  <OrderStatusCell order={o} canManage={canManage} />
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {hasMore && items.length > 0 && (
        <div className="flex justify-center px-5 py-4">
          <Button variant="outline" size="sm" loading={query.isFetching} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}
    </Card>
  );
}

/* ------------------------------ Payments ------------------------------- */

function PaymentsSection({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["shop-payments"],
    queryFn: () => api.get<ShopOrderRow[]>("/admin/shop/payments", { limit: 50 }),
  });

  const [active, setActive] = useState<ShopOrderRow | null>(null);
  const [approve, setApprove] = useState(true);
  const [note, setNote] = useState("");

  const process = useMutation({
    mutationFn: (v: { id: number; approve: boolean; note?: string }) =>
      api.post<ShopOrderRow>(`/admin/shop/orders/${v.id}/verify-payment`, {
        approve: v.approve,
        ...(v.note ? { note: v.note } : {}),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["shop-payments"] });
      void qc.invalidateQueries({ queryKey: ["shop-orders"] });
      void qc.invalidateQueries({ queryKey: ["shop-summary"] });
      close();
    },
  });

  const open = (order: ShopOrderRow, doApprove: boolean) => {
    setActive(order);
    setApprove(doApprove);
    setNote("");
  };
  const close = () => {
    setActive(null);
    setNote("");
  };

  return (
    <Card>
      <CardHeader
        title="Payment verification"
        subtitle="Direct-payment orders awaiting manual verification. Approve to hold funds and proceed, or reject to cancel and restore stock."
      />
      {query.isLoading && <Loading />}
      <ErrorNote error={query.error} />
      {query.data && query.data.length === 0 && !query.isLoading && (
        <EmptyState
          title="No payments to verify"
          description="Nothing is awaiting verification right now."
        />
      )}

      {query.data && query.data.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Order</Th>
              <Th>Stall</Th>
              <Th>Buyer</Th>
              <Th>Total</Th>
              <Th>Transaction ID</Th>
              <Th>Placed</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {query.data.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50">
                <Td>
                  <div className="font-medium text-slate-900">{o.productName}</div>
                  <div className="text-xs text-slate-500">
                    #{o.id} · qty {fmtNumber(o.quantity)}
                  </div>
                </Td>
                <Td className="text-sm text-slate-700">{o.stallName ?? "—"}</Td>
                <Td>
                  {o.counterpart ? (
                    <div className="text-xs text-slate-600">
                      @{o.counterpart.username}
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">
                      {o.buyerId.slice(0, 8)}
                    </span>
                  )}
                </Td>
                <Td className="font-semibold text-slate-900">{bdt(o.totalCents)}</Td>
                <Td className="text-sm text-slate-700">{o.paymentRef ?? "—"}</Td>
                <Td className="text-xs text-slate-500">{fmtDateTime(o.createdAt)}</Td>
                <Td>
                  {canManage ? (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => open(o, true)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => open(o, false)}>
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      <Modal
        open={!!active}
        onClose={close}
        title={approve ? "Approve payment" : "Reject payment"}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant={approve ? "primary" : "danger"}
              loading={process.isPending}
              onClick={() =>
                active &&
                process.mutate({
                  id: active.id,
                  approve,
                  note: note.trim() || undefined,
                })
              }
            >
              Confirm
            </Button>
          </>
        }
      >
        {active && (
          <div className="space-y-4">
            <ErrorNote error={process.error} />
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Order</span>
                <span className="font-medium text-slate-800">#{active.id}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Total</span>
                <span className="font-medium text-slate-800">{bdt(active.totalCents)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Transaction ID</span>
                <span className="font-medium text-slate-800">
                  {active.paymentRef ?? "—"}
                </span>
              </div>
            </div>
            {!approve && (
              <p className="text-xs text-amber-600">
                Rejecting cancels the order and restores product stock.
              </p>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">Note (optional)</label>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Optional note…"
              />
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

/* ----------------------------- Withdrawals ----------------------------- */

const WITHDRAWAL_METHOD_LABELS: Record<string, string> = {
  bkash: "bKash",
  nagad: "Nagad",
  bank: "Bank transfer",
};
function withdrawalMethodLabel(m: string): string {
  return WITHDRAWAL_METHOD_LABELS[m] ?? m;
}

function WithdrawalsSection({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const [status, setStatus] = useState<string>("pending");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [items, setItems] = useState<ShopWithdrawalRow[]>([]);
  const limit = 30;

  const query = useQuery({
    queryKey: ["shop-withdrawals", status, cursor],
    queryFn: () =>
      api.get<ShopWithdrawalRow[]>("/admin/shop/withdrawals", {
        limit,
        ...(status ? { status } : {}),
        ...(cursor ? { cursor } : {}),
      }),
  });

  useEffect(() => {
    setItems([]);
    setCursor(undefined);
  }, [status]);

  const page = query.data;
  useEffect(() => {
    if (!page) return;
    if (cursor === undefined) {
      setItems(page);
      return;
    }
    setItems((prev) => {
      const seen = new Set(prev.map((p) => p.id));
      return [...prev, ...page.filter((p) => !seen.has(p.id))];
    });
  }, [page, cursor]);

  const hasMore = (page?.length ?? 0) === limit;
  const loadMore = () => {
    if (items.length > 0) setCursor(items[items.length - 1].id);
  };

  const [active, setActive] = useState<ShopWithdrawalRow | null>(null);
  const [approve, setApprove] = useState(true);
  const [note, setNote] = useState("");

  const process = useMutation({
    mutationFn: (v: { id: number; approve: boolean; note?: string }) =>
      api.post<ShopWithdrawalRow>(`/admin/shop/withdrawals/${v.id}`, {
        approve: v.approve,
        ...(v.note ? { note: v.note } : {}),
      }),
    onSuccess: () => {
      setItems([]);
      setCursor(undefined);
      void qc.invalidateQueries({ queryKey: ["shop-withdrawals"] });
      void qc.invalidateQueries({ queryKey: ["shop-summary"] });
      close();
    },
  });

  const open = (w: ShopWithdrawalRow, doApprove: boolean) => {
    setActive(w);
    setApprove(doApprove);
    setNote("");
  };
  const close = () => {
    setActive(null);
    setNote("");
  };

  return (
    <Card>
      <CardHeader
        title="Withdrawal requests"
        subtitle="Approve (mark paid) or reject (refunds the seller's balance) payout requests."
        action={
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="">All statuses</option>
          </Select>
        }
      />
      {query.isLoading && items.length === 0 && <Loading />}
      <ErrorNote error={query.error} />
      {query.data && items.length === 0 && !query.isLoading && (
        <EmptyState title="No withdrawal requests" description="Nothing matches this filter." />
      )}

      {items.length > 0 && (
        <Table>
          <thead>
            <tr>
              <Th>Seller</Th>
              <Th>Stall</Th>
              <Th>Amount</Th>
              <Th>Method</Th>
              <Th>Account details</Th>
              <Th>Requested</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {items.map((w) => (
              <tr key={w.id} className="hover:bg-slate-50">
                <Td>
                  {w.seller ? (
                    <div className="flex items-center gap-3">
                      <Avatar src={w.seller.avatarUrl} name={w.seller.displayName} size={32} />
                      <div>
                        <div className="font-medium text-slate-900">
                          {w.seller.displayName}
                        </div>
                        <div className="text-xs text-slate-500">@{w.seller.username}</div>
                      </div>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">{w.sellerId.slice(0, 8)}</span>
                  )}
                </Td>
                <Td className="text-sm text-slate-700">{w.stallName ?? "—"}</Td>
                <Td className="font-semibold text-slate-900">{bdt(w.amountCents)}</Td>
                <Td>{withdrawalMethodLabel(w.method)}</Td>
                <Td className="max-w-[16rem]">
                  <span className="text-xs text-slate-600">
                    {Object.entries(w.details)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(", ") || "—"}
                  </span>
                </Td>
                <Td className="text-xs text-slate-500">{fmtDateTime(w.createdAt)}</Td>
                <Td>
                  <Badge tone={WITHDRAWAL_STATUS_TONE[w.status]}>{w.status}</Badge>
                  {w.adminNote && (
                    <div className="mt-1 max-w-[12rem] text-xs text-slate-400">
                      {w.adminNote}
                    </div>
                  )}
                </Td>
                <Td>
                  {canManage && w.status === "pending" ? (
                    <div className="flex justify-end gap-1.5">
                      <Button size="sm" variant="outline" onClick={() => open(w, true)}>
                        Approve
                      </Button>
                      <Button size="sm" variant="danger" onClick={() => open(w, false)}>
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {hasMore && items.length > 0 && (
        <div className="flex justify-center px-5 py-4">
          <Button variant="outline" size="sm" loading={query.isFetching} onClick={loadMore}>
            Load more
          </Button>
        </div>
      )}

      <Modal
        open={!!active}
        onClose={close}
        title={approve ? "Approve withdrawal" : "Reject withdrawal"}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button
              variant={approve ? "primary" : "danger"}
              loading={process.isPending}
              onClick={() =>
                active &&
                process.mutate({
                  id: active.id,
                  approve,
                  note: note.trim() || undefined,
                })
              }
            >
              Confirm
            </Button>
          </>
        }
      >
        {active && (
          <div className="space-y-4">
            <ErrorNote error={process.error} />
            <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Seller</span>
                <span className="font-medium text-slate-800">
                  {active.seller ? `@${active.seller.username}` : active.sellerId.slice(0, 8)}
                </span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Amount</span>
                <span className="font-medium text-slate-800">{bdt(active.amountCents)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span className="text-slate-500">Method</span>
                <span className="font-medium text-slate-800">
                  {withdrawalMethodLabel(active.method)}
                </span>
              </div>
            </div>
            {!approve && (
              <p className="text-xs text-amber-600">
                Rejecting refunds the amount to the seller's balance.
              </p>
            )}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-600">
                Note {approve ? "(optional)" : "(shown to the seller)"}
              </label>
              <Textarea
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={approve ? "Optional note…" : "Reason for rejection…"}
              />
            </div>
          </div>
        )}
      </Modal>
    </Card>
  );
}

/* ------------------------------ Settings ------------------------------- */

function SettingsSection({ canManage }: { canManage: boolean }) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["shop-settings"],
    queryFn: () => api.get<ShopSettings>("/admin/shop/settings"),
  });

  const update = useMutation({
    mutationFn: (body: Partial<ShopSettings>) =>
      api.patch<ShopSettings>("/admin/shop/settings", body),
    onSuccess: (data) => qc.setQueryData(["shop-settings"], data),
  });

  const [commission, setCommission] = useState("");
  const [instructions, setInstructions] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (query.data) {
      setCommission(String(query.data.commissionPercent));
      setInstructions(query.data.paymentInstructions);
    }
  }, [query.data]);

  const commissionNum = Number(commission);
  const validationError = (() => {
    if (commission.trim() === "") return "Commission is required.";
    if (!Number.isFinite(commissionNum) || commissionNum < 0 || commissionNum > 100)
      return "Commission must be between 0 and 100.";
    return null;
  })();

  const save = () => {
    if (validationError) return;
    update.mutate(
      { commissionPercent: commissionNum, paymentInstructions: instructions },
      {
        onSuccess: () => {
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2500);
        },
      },
    );
  };

  return (
    <>
      {query.isLoading && <Loading />}
      <ErrorNote error={query.error} />
      {query.data && (
        <Card>
          <CardHeader
            title="Shop settings"
            subtitle="Platform commission and buyer-facing direct-payment instructions."
            action={
              <div className="flex items-center gap-2">
                {saved && <span className="text-xs font-medium text-emerald-600">Saved</span>}
                <Button
                  size="sm"
                  disabled={!canManage || !!validationError}
                  loading={update.isPending}
                  onClick={save}
                >
                  <Save className="h-4 w-4" />
                  Save
                </Button>
              </div>
            }
          />
          <div className="space-y-4 px-5 py-4">
            <ErrorNote error={update.error} />
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <SettingsIcon className="h-3.5 w-3.5" />
                Commission (%)
              </label>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.1}
                value={commission}
                disabled={!canManage}
                onChange={(e) => setCommission(e.target.value)}
                className="max-w-40"
              />
              <p className="text-xs text-slate-400">
                Platform cut on each completed sale. Sellers only see ledger entries.
              </p>
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <ReceiptText className="h-3.5 w-3.5" />
                Direct payment instructions
              </label>
              <Textarea
                rows={5}
                value={instructions}
                disabled={!canManage}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="e.g. Send payment to bKash 01XXXXXXXXX and enter the Transaction ID."
              />
              <p className="text-xs text-slate-400">
                Shown to buyers who choose direct payment. They submit a Transaction ID.
              </p>
            </div>
            {validationError && (
              <p className="text-xs font-medium text-rose-600">{validationError}</p>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
