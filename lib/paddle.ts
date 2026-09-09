// Lazy Paddle Billing client. Never touches the Paddle SDK (or throws) unless
// the API key is configured, so every other part of the app stays usable in
// demo/offline setups. API routes decide on the "not configured" case instead.
import { Environment, LogLevel, Paddle } from "@paddle/paddle-node-sdk";

let cachedPaddle: Paddle | null | undefined;
let cachedPriceId: string | null = null;

export function getPaddle(): Paddle | null {
  if (cachedPaddle !== undefined) return cachedPaddle;
  const key = process.env.PADDLE_API_KEY || "";
  if (!key) {
    cachedPaddle = null;
    return cachedPaddle;
  }
  cachedPaddle = new Paddle(key, {
    environment:
      process.env.NEXT_PUBLIC_PADDLE_ENV === "production"
        ? Environment.production
        : Environment.sandbox,
    logLevel: LogLevel.error,
  });
  return cachedPaddle;
}

// The Pro subscription price. Prefer PADDLE_PRICE_ID; fall back to the first
// active recurring price when unset. Cached per serverless process.
export async function getProPriceId(): Promise<string | null> {
  const envId = process.env.PADDLE_PRICE_ID || null;
  if (envId) return envId;
  if (cachedPriceId !== null) return cachedPriceId;
  const paddle = getPaddle();
  if (!paddle) return null;
  try {
    const prices = paddle.prices.list({ recurring: true, status: ["active"] });
    for await (const price of prices) {
      cachedPriceId = price.id;
      return cachedPriceId;
    }
    cachedPriceId = null;
  } catch {
    return null;
  }
  return cachedPriceId;
}

export function getWebhookSecret(): string | null {
  return process.env.PADDLE_WEBHOOK_SECRET || null;
}