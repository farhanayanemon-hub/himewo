import { format, formatDistanceToNow } from "date-fns";

export function fmtDate(value?: string | number | Date | null): string {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export function fmtDateTime(value?: string | number | Date | null): string {
  if (!value) return "—";
  try {
    return format(new Date(value), "MMM d, yyyy · h:mm a");
  } catch {
    return "—";
  }
}

export function fmtRelative(value?: string | number | Date | null): string {
  if (!value) return "—";
  try {
    return formatDistanceToNow(new Date(value), { addSuffix: true });
  } catch {
    return "—";
  }
}

export function fmtNumber(value?: number | null): string {
  if (value === null || value === undefined) return "0";
  return new Intl.NumberFormat("en-US").format(value);
}

export function initials(name?: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
