import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { getServerSupabase } from "@/lib/supabase-server";
import { MongoServerError, ObjectId, type Filter } from "mongodb";

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

export async function withDb<T>(fn: (db: NonNullable<Awaited<ReturnType<typeof getDb>>>) => Promise<T>) {
  const db = await getDb();
  if (!db) return notConfigured();
  try {
    const result = await fn(db);
    return result instanceof NextResponse ? result : json(result);
  } catch (err) {
    if (err instanceof MongoServerError) {
      return error(err.message, 500);
    }
    console.error(err);
    return error("Internal server error", 500);
  }
}

export function toObjectId(id: string): ObjectId | null {
  if (!ObjectId.isValid(id)) return null;
  return new ObjectId(id);
}

// Filter that satisfies TypeScript when the document's `_id` is typed as string
// but we query with an ObjectId.
export function byIdFilter<D>(oid: ObjectId): Filter<D> {
  return { _id: oid } as unknown as Filter<D>;
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
