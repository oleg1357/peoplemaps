import { json } from "@/lib/api";
import { getAdminContext } from "@/lib/admin";
import { getProPriceId, getStripe } from "@/lib/stripe";

// POST /api/billing/checkout -> start a Stripe Checkout subscription session.
// Returns the hosted checkout URL; the client redirects to it. On completion
// Stripe's webhook marks the user Pro.
export async function POST(req: Request) {
  const ctx = await getAdminContext(req);
  if (!ctx.userId) {
    return json({ error: "You must be signed in to upgrade." }, { status: 401 });
  }

  const stripe = getStripe();
  const priceId = await getProPriceId();
  if (!stripe || !priceId) {
    return json(
      { error: "Billing is not configured on this server." },
      { status: 503 }
    );
  }

  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      client_reference_id: ctx.userId,
      allow_promotion_codes: true,
      customer_email: await maybeCustomerEmail(),
      success_url: `${origin}/dashboard?upgraded=1`,
      cancel_url: `${origin}/dashboard`,
      metadata: { userId: ctx.userId },
    });
    if (!session.url) {
      return json({ error: "Stripe could not create a checkout session." }, { status: 500 });
    }
    return json({ url: session.url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Stripe error";
    return json({ error: `Checkout failed: ${message}` }, { status: 500 });
  }
}

// Best-effort: attach the user's email so Stripe can send receipts.
async function maybeCustomerEmail(): Promise<string | undefined> {
  try {
    const { getServerSupabase } = await import("@/lib/supabase-server");
    const sb = await getServerSupabase();
    if (!sb) return undefined;
    const {
      data: { user },
    } = await sb.auth.getUser();
    return user?.email ?? undefined;
  } catch {
    return undefined;
  }
}