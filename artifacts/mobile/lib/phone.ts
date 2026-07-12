/** Heuristic: an identifier without "@" made of digits/spaces/dashes is a phone. */
export function isPhoneLike(identifier: string): boolean {
  const t = identifier.trim();
  if (t.includes("@")) return false;
  return /^\+?[\d\s()-]{6,}$/.test(t);
}

/** Normalize to E.164 for Supabase: local BD "01712..." becomes "+8801712...". */
export function normalizePhone(identifier: string): string {
  const t = identifier.trim().replace(/[\s()-]/g, "");
  if (t.startsWith("+")) return t;
  if (t.startsWith("00")) return `+${t.slice(2)}`;
  if (t.startsWith("0")) return `+880${t.slice(1)}`;
  return `+${t}`;
}
