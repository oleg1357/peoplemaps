import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { COLLECTIONS } from "@/lib/mongodb";
import { getServerSupabase } from "@/lib/supabase-server";
import { MongoServerError, ObjectId, type Filter } from "mongodb";
import type { MapBan } from "@/lib/types";

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function error(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function notConfigured() {
  return NextResponse.json(
    { error: "MongoDB is not configured. Set MONGODB_URI in .env.local", notConfigured: true },
    { status: 503 }
  );
}

type Db = NonNullable<Awaited<ReturnType<typeof getDb>>>;

export async function withDb<T>(fn: (db: Db) => Promise<T>) {
  let db;
  try {
    db = await getDb();
  } catch (err) {
    console.error("DB connection failed:", err instanceof Error ? err.message : err);
    return error("Database is unreachable. Check MONGODB_URI / MONGODB_TIMEOUT_MS.", 503);
  }
  if (!db) return notConfigured();
  try {
    const result = await fn(db);
    return result instanceof NextResponse ? result : json(result);
  } catch (err) {
    console.error("DB write error:", err);
    if (err instanceof MongoServerError) {
      return error("A database error occurred.", 500);
    }
    return error("Internal server error", 500);
  }
}

/** True when the user is banned from contributing to this map. */
export async function isBannedOnMap(db: Db, mapId: string, userId: string): Promise<boolean> {
  return !!(
    await db.collection<MapBan>(COLLECTIONS.bans).findOne({ mapId, userId })
  );
}

// ---- Rate limiting ----
// Upstash Redis (sliding window) when configured, otherwise an in-process
// bucket. See lib/rate-limit.ts.
export { rateLimit, rateLimitByIp } from "@/lib/rate-limit";

export function toObjectId(id: string): ObjectId | null {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

// Filter that satisfies TypeScript when the document's `_id` is typed as string
// but we query with an ObjectId.
export function byIdFilter<D>(oid: ObjectId): Filter<D> {
  return { _id: oid } as unknown as Filter<D>;
}

/** Validate a [lat, lng] pair. */
export function isValidLatLng(p: unknown): p is [number, number] {
  return (
    Array.isArray(p) &&
    p.length === 2 &&
    typeof p[0] === "number" &&
    Number.isFinite(p[0]) &&
    p[0] >= -90 &&
    p[0] <= 90 &&
    typeof p[1] === "number" &&
    Number.isFinite(p[1]) &&
    p[1] >= -180 &&
    p[1] <= 180
  );
}

/** MongoDB filter for publicly visible content (spots, zones, routes). */
export function publicContentFilter<T>(mapId: string): Filter<T> {
  return {
    mapId,
    $or: [{ moderation: "approved" }, { moderation: { $exists: false } }],
    hidden: { $ne: true },
  } as Filter<T>;
}

export async function getOptionalContext(req: Request) {
  // Resolve the active Supabase user from the session cookie, or from a
  // `Bearer <jwt>` header when present (server-to-server calls).
  const sb = await getServerSupabase();
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "") || null;
  const jwt = bearer ?? null;

  if (sb) {
    const {
      data: { user },
    } = jwt
      ? await sb.auth.getUser(jwt)
      : await sb.auth.getUser();
    if (user?.id) return { userId: user.id };
    return { userId: null };
  }

  // No Supabase configured: fall back to the legacy header behavior.
  return { userId: bearer };
}
