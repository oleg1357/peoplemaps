import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter, rateLimitByIp } from "@/lib/api";
import { getAdminContext, getMap, canContribute, canModerateMap } from "@/lib/admin";
import { isBannedOnMap } from "@/lib/api";
import type { Review, Spot } from "@/lib/types";

const MIN_SCORE = 0;
const MAX_SCORE = 5;
const MAX_REVIEW_LENGTH = 2000;

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
  const lim = await rateLimitByIp(req, 10, 60_000, "reviews");
  if (!lim.ok) return error("Too many reviews. Try again shortly.", 429);
  const ctx = await getAdminContext(req);
  const body = await req.json();
  if (!body.spotId) return error("Missing spotId");
  const score = Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.round(Number(body.score ?? 0))));
  if (!Number.isFinite(score)) return error(`Score must be between ${MIN_SCORE} and ${MAX_SCORE}`);
  const review: Review = {
    spotId: body.spotId,
    review: String(body.review ?? "").slice(0, MAX_REVIEW_LENGTH),
    score,
    date: new Date().toISOString().slice(0, 10),
    user_fk: ctx.userId,
  };
  return withDb(async (db) => {
    const spot = await db.collection<Spot>(COLLECTIONS.spots).findOne({ _id: body.spotId as never } as never);
    if (!spot) return error("Spot not found", 404);
    const map = spot.mapId ? await getMap(spot.mapId) : null;

    // Enforce collaboration mode + ban checks.
    const contrib = await canContribute(ctx, map);
    if (!contrib.ok) return error(contrib.reason || "Forbidden", 403);

    // Locked maps: reviews are part of the submission surface.
    if (map?.freezeSubmissions && spot.mapId) {
      const canMod = await canModerateMap(ctx, spot.mapId);
      if (!canMod.ok) return error("Submissions are frozen for this map.", 403);
    }
    // "Require login to review" gates anonymous ratings/rewriting.
    if (map?.requireLoginToReview && !ctx.userId) {
      return error("You must be signed in to review or vote on this map.", 403);
    }

    if (ctx.userId && spot.mapId && (await isBannedOnMap(db, spot.mapId, ctx.userId))) {
      return error("You are banned from contributing to this map.", 403);
    }

    if (map?.allowReviews === false) {
      return error("Reviews are disabled for this map.", 403);
    }

    // Per-map cap on how many reviews one user can leave on the same spot.
    const max = map?.maxReviewsPerSpotPerUser ?? 1;
    if (max > 0 && ctx.userId) {
      const mine = await db
        .collection<Review>(COLLECTIONS.reviews)
        .countDocuments({ spotId: spot._id as never, user_fk: ctx.userId } as never);
      if (mine >= max) {
        return error(`You can leave at most ${max} review${max > 1 ? "s" : ""} on a spot.`, 403);
      }
    }
    const col = db.collection<Review>(COLLECTIONS.reviews);
    const result = await col.insertOne(review);
    return json({ ...review, _id: result.insertedId }, { status: 201 });
  });
}

export async function PATCH(req: Request) {
  const ctx = await getAdminContext(req);
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
          review: String(body.review ?? "").slice(0, MAX_REVIEW_LENGTH),
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

  const ctx = await getAdminContext(req);
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
