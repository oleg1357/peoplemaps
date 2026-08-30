import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter, getOptionalContext } from "@/lib/api";
import type { Review } from "@/lib/types";

// GET /api/reviews?spotId=<id>
// POST /api/reviews  -> add review
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const spotId = searchParams.get("spotId");
  if (!spotId) return error("Missing spotId");
  return withDb(async (db) => {
    const col = db.collection<Review>(COLLECTIONS.reviews);
    const reviews = await col.find({ spotId }).sort({ date: -1 }).toArray();
    return json(reviews);
  });
}

export async function POST(req: Request) {
  const ctx = await getOptionalContext(req);
  const body = await req.json();
  if (!body.spotId) return error("Missing spotId");
  const review: Review = {
    spotId: body.spotId,
    review: String(body.review ?? ""),
    score: Number(body.score ?? 0),
    date: new Date().toISOString().slice(0, 10),
    user_fk: body.user_fk ?? ctx.userId ?? null,
  };
  return withDb(async (db) => {
    const col = db.collection<Review>(COLLECTIONS.reviews);
    const result = await col.insertOne(review);
    return json({ ...review, _id: result.insertedId }, { status: 201 });
  });
}

export async function PATCH(req: Request) {
  const body = await req.json();
  if (!body.id) return error("Missing review id");
  return withDb(async (db) => {
    const oid = toObjectId(body.id);
    if (!oid) return error("Invalid review id");
    await db.collection<Review>(COLLECTIONS.reviews).updateOne(
      byIdFilter<Review>(oid),
      {
        $set: {
          review: String(body.review ?? ""),
          score: Number(body.score ?? 0),
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
  return withDb(async (db) => {
    const oid = toObjectId(id);
    if (!oid) return error("Invalid review id");
    await db.collection<Review>(COLLECTIONS.reviews).deleteOne(byIdFilter<Review>(oid));
    await db.collection(COLLECTIONS.comments).deleteMany({ reviewId: id });
    await db.collection(COLLECTIONS.votes).deleteMany({ reviewId: id });
    return NextResponse.json({ ok: true });
  });
}
