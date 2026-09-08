import { json } from "@/lib/api";
import { getAdminContext } from "@/lib/admin";
import {
  countOwnedPublicMaps,
  FREE_PUBLIC_MAP_LIMIT,
  getUserProfile,
  isPaidProfile,
} from "@/lib/billing";
import { getProPriceId, getStripe } from "@/lib/stripe";

// GET /api/billing/status -> the signed-in user's plan + public-map quota.
// The admin panel uses this to render the upgrade prompt and gate the private
// visibility option. Server-side enforcement lives in /api/admin/maps.
export async function GET(req: Request) {
  const ctx = await getAdminContext(req);
  if (!ctx.userId) {
    return json({ error: "You must be signed in to view billing." }, { status: 401 });
  }

  const [profile, publicMapCount, priceId] = await Promise.all([
    getUserProfile(ctx.userId),
    countOwnedPublicMaps(ctx.userId),
    getProPriceId(),
  ]);

  return json({
    plan: profile.plan,
    isPaid: isPaidProfile(profile),
    subscriptionStatus: profile.subscriptionStatus ?? null,
    publicMapCount,
    freePublicLimit: FREE_PUBLIC_MAP_LIMIT,
    stripeConfigured: Boolean(getStripe() && priceId),
  });
}