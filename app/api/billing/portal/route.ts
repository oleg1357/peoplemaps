import { json } from "@/lib/api";
import { getAdminContext } from "@/lib/admin";
import { getUserProfile } from "@/lib/billing";
import { getPaddle } from "@/lib/paddle";

// POST /api/billing/portal -> open Paddle's customer portal (cancel / update
// payment method) for a Pro subscriber.
export async function POST(req: Request) {
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
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Paddle error";
    return json({ error: `Portal failed: ${message}` }, { status: 500 });
  }
}