import { json, rateLimitByIp } from "@/lib/api";
import { getAdminContext } from "@/lib/admin";
import { getUserProfile } from "@/lib/billing";
import { getPaddle } from "@/lib/paddle";

// POST /api/billing/portal -> open Paddle's customer portal (cancel / update
// payment method) for a Pro subscriber.
export async function POST(req: Request) {
  const lim = await rateLimitByIp(req, 5, 60_000, "billing-portal");
  if (!lim.ok)
    return json({ error: "Too many attempts. Try again shortly." }, { status: 429 });
  const ctx = await getAdminContext(req);
  if (!ctx.userId) {
    return json({ error: "You must be signed in." }, { status: 401 });
  }

  const paddle = getPaddle();
  if (!paddle) {
    return json(
      { error: "Billing is not configured on this server." },
      { status: 503 }
    );
  }

  const profile = await getUserProfile(ctx.userId);
  if (!profile.paddleCustomerId) {
    return json({ error: "No billing account yet." }, { status: 400 });
  }

  try {
    const session = await paddle.customerPortalSessions.create(
      profile.paddleCustomerId,
      profile.paddleSubscriptionId ? [profile.paddleSubscriptionId] : []
    );
    const url = session.urls.general.overview;
    if (!url) {
      return json(
        { error: "Paddle could not open the billing portal." },
        { status: 500 }
      );
    }
    return json({ url });
  } catch {
    return json(
      { error: "Could not open the billing portal. Try again in a moment." },
      { status: 500 }
    );
  }
}