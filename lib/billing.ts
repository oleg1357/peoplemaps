import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { serverClient } from "@/sanity/lib/client";
import type { SubscriptionStatus, UserProfile } from "@/lib/types";

// Free public maps a user may own (private maps are a Pro feature).
export const FREE_PUBLIC_MAP_LIMIT = 3;

// Paddle statuses that count as paid.
export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  "active",
  "trialing",
];

export function isPaidProfile(profile: UserProfile | null | undefined): boolean {
  return (
    profile != null &&
    profile.plan === "pro" &&
    (profile.subscriptionStatus == null ||
      ACTIVE_SUBSCRIPTION_STATUSES.includes(profile.subscriptionStatus))
  );
}

export function defaultProfile(userId: string): UserProfile {
  return { userId, plan: "free", updatedAt: new Date().toISOString() };
}

// The user's billing profile, or a free-by-default object when there is no DB
// row yet (first-time users are free until they check out).
export async function getUserProfile(userId: string): Promise<UserProfile> {
  try {
    const db = await getDb();
    if (!db) return defaultProfile(userId);
    const row = await db
      .collection<UserProfile>(COLLECTIONS.profiles)
      .findOne({ userId });
    return row ?? defaultProfile(userId);
  } catch {
    return defaultProfile(userId);
  }
}

// Persist a profile row (create or overwrite fields). Keeps `updatedAt` fresh.
export async function upsertUserProfile(
  userId: string,
  patch: Partial<UserProfile>
): Promise<UserProfile> {
  const now = new Date().toISOString();
  const merged: UserProfile = { ...(await getUserProfile(userId)), ...patch, userId, updatedAt: now };
  try {
    const db = await getDb();
    if (db) {
      await db
        .collection<UserProfile>(COLLECTIONS.profiles)
        .updateOne(
          { userId },
          { $set: merged as never },
          { upsert: true }
        );
    }
  } catch {
    // No DB: still return the merged value so callers behave "as if" persisted
    // in a degraded environment.
  }
  return merged;
}

// Number of PUBLIC maps owned by the user (free-tier quota counts public only).
export async function countOwnedPublicMaps(ownerId: string): Promise<number> {
  if (!serverClient) return 0;
  try {
    const result = await serverClient.fetch<number>(
      `count(*[_type == "map" && ownerId == $ownerId && isPublic == "public"])`,
      { ownerId }
    );
    return result ?? 0;
  } catch {
    return 0;
  }
}