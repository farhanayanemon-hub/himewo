import { db, siteSettingsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

// site_settings keys used by the Shop feature.
export const SHOP_COMMISSION_KEY = "shop_commission_percent";
export const SHOP_PAYMENT_INSTRUCTIONS_KEY = "shop_payment_instructions";

export const DEFAULT_COMMISSION_PERCENT = 5;
export const DEFAULT_PAYMENT_INSTRUCTIONS = "";

export type ShopSettings = {
  commissionPercent: number;
  paymentInstructions: string;
};

/** Read the admin-configurable shop settings from site_settings. */
export async function getShopSettings(): Promise<ShopSettings> {
  const rows = await db
    .select()
    .from(siteSettingsTable)
    .where(
      inArray(siteSettingsTable.key, [
        SHOP_COMMISSION_KEY,
        SHOP_PAYMENT_INSTRUCTIONS_KEY,
      ]),
    );
  const map = new Map(rows.map((r) => [r.key, r.value]));
  const rawPct = map.get(SHOP_COMMISSION_KEY);
  const parsed = rawPct != null ? Number(rawPct) : NaN;
  const commissionPercent =
    Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
      ? Math.round(parsed)
      : DEFAULT_COMMISSION_PERCENT;
  const paymentInstructions =
    map.get(SHOP_PAYMENT_INSTRUCTIONS_KEY) ?? DEFAULT_PAYMENT_INSTRUCTIONS;
  return { commissionPercent, paymentInstructions };
}

/** Commission (integer paisa) for a total, rounded to the nearest paisa. */
export function commissionFor(totalCents: number, percent: number): number {
  return Math.round((totalCents * percent) / 100);
}
