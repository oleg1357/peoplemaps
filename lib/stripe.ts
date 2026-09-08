// Lazy Stripe client. Never touches the Stripe SDK (or throws) unless the
// secret key is configured, so every other part of the app stays usable in
// demo/offline setups. API routes decide on the "not configured" case instead.
import Stripe from "stripe";

let cachedStripe: Stripe | null | undefined;
let cachedPriceId: string | null = null;

export function getStripe(): Stripe | null {
  if (cachedStripe !== undefined) return cachedStripe;
  const key = process.env.STRIPE_SECRET_KEY || "";
  if (!key) {
    cachedStripe = null;
    return cachedStripe;
  }
  cachedStripe = new Stripe(key, { apiVersion: "2024-06-20" as Stripe.LatestApiVersion });
  return cachedStripe;
}

// The Pro subscription price. Price lookup is cached per serverless process.
export async function getProPriceId(): Promise<string | null> {
  const envId = process.env.STRIPE_PRICE_ID || null;
  if (envId) return envId;
  if (cachedPriceId !== null) return cachedPriceId;
  const stripe = getStripe();
  if (!stripe) return null;
  try {
    const prices = await stripe.prices.list({
      active: true,
      limit: 10,
    });
    // Prefer a recurring "pro"-looking price, else the first recurring one.
    const recurring = prices.data.filter((p) => p.recurring);
    const pro = recurring.find((p) => /pro|premium/i.test(p.nickname || "") || /pro/i.test(p.id));
    const chosen = pro ?? recurring[0];
    cachedPriceId = chosen?.id ?? null;
    return cachedPriceId;
  } catch {
    return null;
  }
}

export function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}