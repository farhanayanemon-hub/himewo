/** Dynamic Currency helpers for the Shop. Base prices are stored as integer paisa (BDT cents). */

let currentCurrency: "BDT" | "USD" = "BDT";
let currentRate = 1; // 1 USD = 120 BDT

export function setShopCurrency(currency: "BDT" | "USD", rate = 120) {
  currentCurrency = currency;
  currentRate = rate > 0 ? rate : 120;
}

export function getShopCurrency(): "BDT" | "USD" {
  return currentCurrency;
}

export const BDT = "৳";

/**
 * Format integer cents dynamically based on IP:
 * - Bangladesh IP: "৳125.50" (or 125.50 TK)
 * - Outside Bangladesh: "$1.05" (converted at 1 USD = 120 BDT)
 */
export function formatTaka(cents: number, forceCurrency?: "BDT" | "USD"): string {
  const curr = forceCurrency ?? currentCurrency;
  const baseTaka = (cents ?? 0) / 100;

  if (curr === "USD") {
    const usd = baseTaka / (currentRate || 120);
    return `$${usd.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  return `৳${baseTaka.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Parse a taka/amount string (e.g. "125.50") → integer paisa. */
export function takaToCents(taka: string): number {
  const n = Number(taka);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

export const ORDER_STATUS_LABEL: Record<string, string> = {
  awaiting_verification: "Awaiting verification",
  pending: "Pending",
  confirmed: "Confirmed",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
};

/** Colors keyed by status; consumed with the theme accent as fallback. */
export const ORDER_STATUS_COLOR: Record<string, string> = {
  awaiting_verification: "#d97706",
  pending: "#2563eb",
  confirmed: "#7c3aed",
  delivered: "#0891b2",
  completed: "#16a34a",
  cancelled: "#dc2626",
};

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABEL[status] ?? status;
}

export const LEDGER_KIND_LABEL: Record<string, string> = {
  sale_credit: "Sale",
  cod_commission: "COD commission",
  withdraw: "Withdrawal",
  withdraw_refund: "Withdrawal refund",
  admin_adjust: "Adjustment",
};

export const WITHDRAWAL_METHODS = ["bKash", "Nagad", "Rocket", "Bank"];
