import { NextResponse } from "next/server";
import { json } from "@/lib/api";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { getUserProfile, upsertUserProfile } from "@/lib/billing";
import { getStripe, getWebhookSecret } from "@/lib/stripe";
import type { SubscriptionStatus, UserProfile } from "@/lib/types";

// POST /api/billing/webhook -> Stripe subscription lifecycle events. Grants and
// revokes Pro access by writing the user's profile row in Mongo. Verify the
// signature with STRIPE_WEBHOOK_SECRET (set with `stripe listen --forward-to`).
export async function POST(req: Request) {
  const stripe = getStripe();
  const secret = getWebhookSecret();
  if (!stripe || !secret) {
    return json(
      { error: "Billing webhook is not configured on this server." },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return json({ error: "Missing Stripe signature." }, { status: 400 });
  }

  let event: import("stripe").Stripe.Event;
  try {
    const raw = await req.text();
    event = stripe.webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return json({ error: `Webhook signature verification failed: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as import("stripe").Stripe.Checkout.Session;
        if (session.mode !== "subscription" || !session.subscription) break;
        const userId =
          session.client_reference_id ||
          (session.metadata?.userId as string | undefined);
        const customer =
          typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subscription = await stripe.subscriptions.retrieve(
          session.subscription as string
        );
        const status = mapStatus(subscription.status);
        const target = userId ?? (await profileIdForCustomer(customer));
        if (target) {
          const existing = await getUserProfile(target);
          await upsertUserProfile(target, {
            plan: isActive(status) ? "pro" : "free",
            stripeCustomerId: customer,
            stripeSubscriptionId: subscription.id,
            subscriptionStatus: status,
            proSince: isActive(status)
              ? existing.proSince ?? new Date().toISOString()
              : existing.proSince,
          });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as import("stripe").Stripe.Subscription;
        const customer =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const target = await profileIdForCustomer(customer);
        if (!target) break;
        const status = mapStatus(sub.status);
        const existing = await getUserProfile(target);
        await upsertUserProfile(target, {
          plan: isActive(status) ? "pro" : "free",
          stripeCustomerId: customer,
          stripeSubscriptionId: sub.id,
          subscriptionStatus: status,
          proSince: isActive(status)
            ? existing.proSince ?? new Date().toISOString()
            : existing.proSince,
        });
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as import("stripe").Stripe.Subscription;
        const customer =
          typeof sub.customer === "string" ? sub.customer : sub.customer?.id;
        const target = await profileIdForCustomer(customer);
        if (!target) break;
        await upsertUserProfile(target, {
          plan: "free",
          subscriptionStatus: "canceled",
          stripeSubscriptionId: null,
        });
        break;
      }

      default:
        break; // ignore payment/renewal events; status tracks the subscription
    }
  } catch (err) {
    console.error("billing webhook handler failed:", err);
    return json({ error: "Webhook handler failed." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

function mapStatus(status: string | null): SubscriptionStatus {
  switch (status) {
    case "active":
    case "trialing":
    case "past_due":
    case "incomplete":
    case "canceled":
    case "unpaid":
      return status;
    default:
      return "canceled";
  }
}

function isActive(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

// Find the profile row that owns a Stripe customer id.
async function profileIdForCustomer(
  customer: string | null | undefined
): Promise<string | null> {
  if (!customer) return null;
  try {
    const db = await getDb();
    if (!db) return null;
    const row = await db
      .collection<UserProfile>(COLLECTIONS.profiles)
      .findOne({ stripeCustomerId: customer });
    return row?.userId ?? null;
  } catch {
    return null;
  }
}