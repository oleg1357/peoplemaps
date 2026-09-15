import { NextResponse } from "next/server";
import { json } from "@/lib/api";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { getUserProfile, upsertUserProfile } from "@/lib/billing";
import { getPaddle, getWebhookSecret } from "@/lib/paddle";
import {
  EventName,
  type SubscriptionNotification,
} from "@paddle/paddle-node-sdk";
import type { SubscriptionStatus } from "@/lib/types";

// POST /api/billing/webhook -> Paddle subscription lifecycle events. Grants and
// revokes Pro access by writing the user's profile row in Mongo. Verify the
// signature with PADDLE_WEBHOOK_SECRET (the webhook's signing key from Paddle's
// dashboard or `paddle webhook simulate` during local development).
export async function POST(req: Request) {
  const paddle = getPaddle();
  const secret = getWebhookSecret();
  if (!paddle || !secret) {
    return json(
      { error: "Billing webhook is not configured on this server." },
      { status: 503 }
    );
  }

  const signature = req.headers.get("paddle-signature");
  if (!signature) {
    return json({ error: "Missing Paddle signature." }, { status: 400 });
  }

  let event: Awaited<ReturnType<typeof paddle.webhooks.unmarshal>>;
  try {
    const raw = await req.text();
    event = await paddle.webhooks.unmarshal(raw, secret, signature);
  } catch {
    return json(
      { error: "Webhook signature verification failed." },
      { status: 400 }
    );
  }

  try {
    switch (event.eventType) {
      case EventName.SubscriptionCreated:
      case EventName.SubscriptionUpdated:
      case EventName.SubscriptionActivated:
      case EventName.SubscriptionTrialing:
      case EventName.SubscriptionResumed:
      case EventName.SubscriptionPastDue:
      case EventName.SubscriptionPaused:
      case EventName.SubscriptionCanceled: {
        const sub = event.data as SubscriptionNotification;
        // Paddle copies the transaction's custom_data onto the subscription, so
        // every lifecycle event tells us whose profile to update.
        const userId = typeof sub.customData?.userId === "string"
          ? sub.customData.userId
          : await profileIdForCustomer(sub.customerId);
        if (!userId) break;
        const status = mapStatus(sub.status);
        const active = isActive(status);
        const existing = await getUserProfile(userId);
        await upsertUserProfile(userId, {
          plan: active ? "pro" : "free",
          paddleCustomerId: sub.customerId,
          paddleSubscriptionId: sub.id,
          subscriptionStatus: status,
          proSince: active
            ? existing.proSince ?? new Date().toISOString()
            : existing.proSince,
        });
        break;
      }

      default:
        break; // ignore invoice/payment events; status tracks the subscription
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
    case "paused":
    case "canceled":
      return status;
    default:
      return "canceled";
  }
}

function isActive(status: SubscriptionStatus): boolean {
  return status === "active" || status === "trialing";
}

// Find the profile row that owns a Paddle customer id (fallback when a webhook
// arrives without usable custom_data).
async function profileIdForCustomer(
  customer: string | null | undefined
): Promise<string | null> {
  if (!customer) return null;
  try {
    const db = await getDb();
    if (!db) return null;
    const row = await db
      .collection<{ userId: string }>(COLLECTIONS.profiles)
      .findOne({ paddleCustomerId: customer });
    return row?.userId ?? null;
  } catch {
    return null;
  }
}