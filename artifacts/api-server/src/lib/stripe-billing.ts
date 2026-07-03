import Stripe from "stripe";
import { db, adAccountsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { creditWallet } from "./billing-engine";
import { logger } from "./logger";

// Payments are Stripe-backed. The API is hosted on Railway (not Replit), so we
// use the plain Stripe SDK with STRIPE_SECRET_KEY / STRIPE_WEBHOOK_SECRET env
// vars rather than any Replit-only Stripe connection helper.
let cached: Stripe | null = null;

export function stripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!cached) {
    cached = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return cached;
}

/** Minimum/maximum top-up guards (cents). */
export const MIN_TOPUP_CENTS = 500; // $5
export const MAX_TOPUP_CENTS = 500000; // $5,000

type Account = typeof adAccountsTable.$inferSelect;

/** Ensure the account has a Stripe customer; returns the customer id. */
export async function ensureCustomer(account: Account): Promise<string> {
  if (account.stripeCustomerId) return account.stripeCustomerId;
  const stripe = getStripe();
  const customer = await stripe.customers.create({
    name: account.name,
    metadata: { adAccountId: String(account.id) },
  });
  await db
    .update(adAccountsTable)
    .set({ stripeCustomerId: customer.id })
    .where(eq(adAccountsTable.id, account.id));
  return customer.id;
}

/** Hosted Checkout session to top up the wallet (mode=payment). */
export async function createTopupCheckout(opts: {
  account: Account;
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; id: string }> {
  const { account, amountCents, successUrl, cancelUrl } = opts;
  const stripe = getStripe();
  const customerId = await ensureCustomer(account);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    // Save the card so it can be reused for auto-recharge.
    payment_intent_data: {
      setup_future_usage: "off_session",
      metadata: { adAccountId: String(account.id), purpose: "topup" },
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: account.currency.toLowerCase(),
          unit_amount: amountCents,
          product_data: { name: `HiMewo Ads wallet top-up` },
        },
      },
    ],
    metadata: {
      adAccountId: String(account.id),
      purpose: "topup",
      amountCents: String(amountCents),
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, id: session.id };
}

/** Hosted Checkout session to save a payment method (mode=setup). */
export async function createSetupCheckout(opts: {
  account: Account;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ url: string; id: string }> {
  const { account, successUrl, cancelUrl } = opts;
  const stripe = getStripe();
  const customerId = await ensureCustomer(account);
  const session = await stripe.checkout.sessions.create({
    mode: "setup",
    customer: customerId,
    metadata: { adAccountId: String(account.id), purpose: "setup" },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });
  if (!session.url) throw new Error("Stripe did not return a checkout URL");
  return { url: session.url, id: session.id };
}

export type SavedCard = {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
};

/** List saved cards for the account (empty if no Stripe customer yet). */
export async function listCards(account: Account): Promise<SavedCard[]> {
  if (!account.stripeCustomerId) return [];
  const stripe = getStripe();
  const methods = await stripe.paymentMethods.list({
    customer: account.stripeCustomerId,
    type: "card",
  });
  return methods.data.map((pm) => ({
    id: pm.id,
    brand: pm.card?.brand ?? "card",
    last4: pm.card?.last4 ?? "****",
    expMonth: pm.card?.exp_month ?? 0,
    expYear: pm.card?.exp_year ?? 0,
    isDefault: pm.id === account.defaultPaymentMethodId,
  }));
}

/** Set the account's default payment method (used for auto-recharge). */
export async function setDefaultCard(
  account: Account,
  paymentMethodId: string,
): Promise<void> {
  const stripe = getStripe();
  const customerId = await ensureCustomer(account);
  // Verify the PM belongs to this customer.
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== customerId) {
    throw new Error("payment method does not belong to this account");
  }
  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });
  await db
    .update(adAccountsTable)
    .set({ defaultPaymentMethodId: paymentMethodId })
    .where(eq(adAccountsTable.id, account.id));
}

/** Remove a saved card; clears the default pointer if it was the default. */
export async function removeCard(
  account: Account,
  paymentMethodId: string,
): Promise<void> {
  const stripe = getStripe();
  // Tenant guard: only detach a card that belongs to THIS account's customer,
  // so a leaked/guessed payment-method id can't be used to detach another
  // advertiser's card.
  if (!account.stripeCustomerId) {
    throw new Error("payment method does not belong to this account");
  }
  const pm = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (pm.customer !== account.stripeCustomerId) {
    throw new Error("payment method does not belong to this account");
  }
  await stripe.paymentMethods.detach(paymentMethodId);
  if (account.defaultPaymentMethodId === paymentMethodId) {
    await db
      .update(adAccountsTable)
      .set({ defaultPaymentMethodId: null, autoRechargeEnabled: false })
      .where(eq(adAccountsTable.id, account.id));
  }
}

/**
 * Off-session auto-recharge: when available funds fall below the billing
 * threshold, charge the saved card. The wallet is credited by the webhook
 * (payment_intent.succeeded) keyed on the PaymentIntent id, so this is safe to
 * call best-effort and will never double-credit.
 */
export async function maybeAutoRecharge(accountId: number): Promise<void> {
  const [account] = await db
    .select()
    .from(adAccountsTable)
    .where(eq(adAccountsTable.id, accountId));
  if (
    !account ||
    !account.autoRechargeEnabled ||
    !account.stripeCustomerId ||
    !account.defaultPaymentMethodId ||
    account.autoRechargeAmountCents == null ||
    account.autoRechargeThresholdCents == null
  ) {
    return;
  }
  const available = account.balanceCents + account.creditBalanceCents;
  if (available >= account.autoRechargeThresholdCents) return;

  const stripe = getStripe();
  try {
    // Single-flight guard: a burst of charges crossing the threshold in the
    // same minute all produce the SAME idempotency key, so Stripe returns the
    // one PaymentIntent instead of charging the card multiple times before the
    // webhook credit lands.
    const idempotencyKey = `autorecharge:${account.id}:${Math.floor(
      Date.now() / 60000,
    )}`;
    await stripe.paymentIntents.create(
      {
        amount: account.autoRechargeAmountCents,
        currency: account.currency.toLowerCase(),
        customer: account.stripeCustomerId,
        payment_method: account.defaultPaymentMethodId,
        off_session: true,
        confirm: true,
        metadata: {
          adAccountId: String(account.id),
          purpose: "auto_recharge",
          amountCents: String(account.autoRechargeAmountCents),
        },
      },
      { idempotencyKey },
    );
  } catch (err) {
    // A failed off-session charge (e.g. authentication required) must not throw
    // into the tracking hot path. Disable auto-recharge so we stop retrying.
    logger.warn({ err, accountId }, "auto-recharge failed; disabling");
    await db
      .update(adAccountsTable)
      .set({ autoRechargeEnabled: false })
      .where(eq(adAccountsTable.id, account.id));
  }
}

/** Verify + handle a Stripe webhook. Returns nothing; throws on bad signature. */
export async function handleStripeWebhook(
  rawBody: Buffer,
  signature: string | undefined,
): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  if (!signature) throw new Error("missing stripe-signature header");
  const stripe = getStripe();
  const event = stripe.webhooks.constructEvent(rawBody, signature, secret);

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const accountId = Number(session.metadata?.adAccountId);
      if (!accountId) break;
      if (session.mode === "setup") {
        // Save the newly added card as the default.
        const setupIntentId =
          typeof session.setup_intent === "string"
            ? session.setup_intent
            : session.setup_intent?.id;
        if (setupIntentId) {
          const si = await stripe.setupIntents.retrieve(setupIntentId);
          const pmId =
            typeof si.payment_method === "string"
              ? si.payment_method
              : si.payment_method?.id;
          const [account] = await db
            .select()
            .from(adAccountsTable)
            .where(eq(adAccountsTable.id, accountId));
          if (account && pmId) {
            await setDefaultCard(account, pmId).catch((err) =>
              logger.warn({ err, accountId }, "failed to set default card"),
            );
          }
        }
      }
      // Payment-mode top-ups are credited via payment_intent.succeeded below.
      break;
    }
    case "payment_intent.succeeded": {
      const pi = event.data.object;
      const accountId = Number(pi.metadata?.adAccountId);
      if (!accountId || !pi.amount_received) break;
      const purpose = pi.metadata?.purpose ?? "topup";
      await creditWallet({
        accountId,
        amountCents: pi.amount_received,
        type: "topup",
        description:
          purpose === "auto_recharge"
            ? "Automatic wallet top-up"
            : "Wallet top-up",
        referenceId: pi.id,
      });
      break;
    }
    case "payment_intent.payment_failed": {
      const pi = event.data.object;
      const accountId = Number(pi.metadata?.adAccountId);
      logger.warn(
        { accountId, piId: pi.id, purpose: pi.metadata?.purpose },
        "stripe payment failed",
      );
      break;
    }
    default:
      break;
  }
}
