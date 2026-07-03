export function formatCents(
  cents: number | null | undefined,
  currency = "USD",
): string {
  const value = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currency || "USD",
    }).format(value);
  } catch {
    return `${(currency || "USD").toUpperCase()} ${value.toFixed(2)}`;
  }
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDay(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Convert a whole-currency amount (e.g. "12.50") to integer cents. */
export function toCents(amount: string | number | null | undefined): number | undefined {
  if (amount === null || amount === undefined || amount === "") return undefined;
  const n = typeof amount === "number" ? amount : Number(amount);
  if (Number.isNaN(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

/** Convert integer cents to a whole-currency string for form inputs. */
export function centsToAmount(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "";
  return (cents / 100).toFixed(2);
}
