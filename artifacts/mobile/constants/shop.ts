/** BDT (৳) helpers for the Shop. Prices are stored as integer paisa (cents). */

export const BDT = "৳";

/** Format integer paisa → "৳125.50". */
export function formatTaka(cents: number): string {
  const taka = (cents ?? 0) / 100;
  return `${BDT}${taka.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Parse a taka string (e.g. "125.50") → integer paisa. */
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
