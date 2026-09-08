import { json } from "@/lib/api";
import { getAdminContext } from "@/lib/admin";
import { getUserProfile } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";

// POST /api/billing/portal -> open Stripe's billing portal (cancel / update
// payment method) for a Pro subscriber.
export async function POST(req: Request) {
  const ctx = await getAdminContext(req);
  if (!ctx.userId) {
    return json({ error: "You must be signed in." }, { status: 401 });
  }

  const stripe = getStripe();
  if (!stripe) {
    return json(
      { error: "Billing is not configured on this server." },
      { status: 503 }
    );
  }

  const profile = await getUserProfile(ctx.userId);
  if (!profile.stripeCustomerId) {
    return json({ error: "No billing account yet." }, { status: 400 });
  }

  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripeCustomerId,
      return_url: `${origin}/dashboard`,
    });
    return json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    return json({ error: `Portal failed: ${message}` }, { status: 500 });
  }
}