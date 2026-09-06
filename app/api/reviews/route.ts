import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter, getOptionalContext } from "@/lib/api";
import { getMap } from "@/lib/admin";
import type { Review, Spot } from "@/lib/types";

const MIN_SCORE = 0;
const MAX_SCORE = 5;

// GET /api/reviews?spotId=<id>
// POST /api/reviews  -> add review
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const spotId = searchParams.get("spotId");
  if (!spotId) return error("Missing spotId");
  return withDb(async (db) => {
    const col = db.collection<Review>(COLLECTIONS.reviews);
    const reviews = await col.find({ spotId }).sort({ date: -1 }).toArray();
    return json(reviews, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" },
    });
  });
}

export async function POST(req: Request) {
  const ctx = await getOptionalContext(req);
  const body = await req.json();
  if (!body.spotId) return error("Missing spotId");
  const score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(Number(body.score ?? 0))));
  if (!Number.isFinite(score)) return error(`Score must be between ${MIN_SCORE} and ${MAX_SCORE}`);
  const review: Review = {
    spotId: body.spotId,
    review: String(body.review ?? ""),
    score,
    date: new Date().toISOString().slice(0, 10),
    // Server-resolved identity wins; body user_fk is only a fallback so legacy
    // clients (demo mode) keep attribution without being able to spoof.
    user_fk: ctx.userId ?? body.user_fk ?? null,
  };
  return withDb(async (db) => {
    // The spot must exist and the map's allowReviews toggle must permit reviews.
    const spot = await db.collection<Spot>(COLLECTIONS.spots).findOne({ _id: body.spotId as never } as never);
    if (!spot) return error("Spot not found", 404);
    const map = spot.mapId ? await getMap(spot.mapId) : null;
    if (map?.allowReviews === false) {
      return error("Reviews are disabled for this map.", 403);
    }
    const col = db.collection<Review>(COLLECTIONS.reviews);
    const result = await col.insertOne(review);
    return json({ ...review, _id: result.insertedId }, { status: 201 });
  });
}

export async function PATCH(req: Request) {
  const ctx = await getOptionalContext(req);
  if (!ctx.userId) return error("You must be signed in to edit a review.", 401);
  const body = await req.json();
  if (!body.id) return error("Missing review id");
  return withDb(async (db) => {
    const oid = toObjectId(body.id);
    if (!oid) return error("Invalid review id");
    const col = db.collection<Review>(COLLECTIONS.reviews);
    const existing = await col.findOne(byIdFilter<Review>(oid));
    if (!existing) return error("Review not found", 404);
    if (existing.user_fk !== ctx.userId) {
      return error("You can only edit your own reviews.", 403);
    }
    const score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(Number(body.score ?? 0))));
    if (!Number.isFinite(score)) return error(`Score must be between ${MIN_SCORE} and ${MAX_SCORE}`);
    await col.updateOne(
      byIdFilter<Review>(oid),
      {
        $set: {
          review: String(body.review ?? ""),
          score,
        },
      }
    );
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return error("Missing review id");

  const ctx = await getOptionalContext(req);
  if (!ctx.userId) return error("You must be signed in to delete a review.", 401);

  return withDb(async (db) => {
    const oid = toObjectId(id);
    if (!oid) return error("Invalid review id");
    const col = db.collection<Review>(COLLECTIONS.reviews);
    const existing = await col.findOne(byIdFilter<Review>(oid));
    if (!existing) return error("Review not found", 404);
    if (existing.user_fk !== ctx.userId) {
      return error("You can only delete your own reviews.", 403);
    }
    await col.deleteOne(byIdFilter<Review>(oid));
    await db.collection(COLLECTIONS.comments).deleteMany({ reviewId: id });
    await db.collection(COLLECTIONS.votes).deleteMany({ reviewId: id });
    return NextResponse.json({ ok: true });
  });
}
