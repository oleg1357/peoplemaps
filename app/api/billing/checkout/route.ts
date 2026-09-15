import { json, rateLimitByIp } from "@/lib/api";
import { getAdminContext } from "@/lib/admin";
import { getPaddle, getProPriceId } from "@/lib/paddle";

// POST /api/billing/checkout -> start a Paddle hosted checkout for the Pro
// subscription. Returns the checkout URL; the client redirects to it. When the
// customer completes checkout Paddle charges the card, creates the subscription
// automatically, and copies our custom_data (userId) onto it so the webhook can
// mark the user Pro.
export async function POST(req: Request) {
  const lim = await rateLimitByIp(req, 5, 60_000, "checkout");
  if (!lim.ok)
    return json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  const ctx = await getAdminContext(req);
  if (!ctx.userId) {
    return json({ error: "You must be signed in to upgrade." }, { status: 401 });
  }

  const paddle = getPaddle();
  const priceId = await getProPriceId();
  if (!paddle || !priceId) {
    return json(
      { error: "Billing is not configured on this server." },
      { status: 503 }
    );
  }

  try {
    const transaction = await paddle.transactions.create({
      items: [{ priceId, quantity: 1 }],
      // Carried onto the subscription Paddle creates, so webhooks know whose
      // profile to update.
      customData: { userId: ctx.userId },
      collectionMode: "automatic",
    });
    const url = transaction.checkout?.url;
    if (!url) {
      return json(
        { error: "Paddle could not create a checkout session." },
        { status: 500 }
      );
    }
    return json({ url });
  } catch {
    return json(
      { error: "Checkout failed. Please try again in a moment." },
      { status: 500 }
    );
  }
}