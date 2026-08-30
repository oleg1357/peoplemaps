import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, getOptionalContext } from "@/lib/api";
import type { ReviewVote } from "@/lib/types";

// POST /api/votes -> { reviewId, userId, on:boolean } toggles helpful vote
// GET /api/votes?reviewId=<id> -> count + whether the user voted
export async function GET(req: Request) {
  const ctx = await getOptionalContext(req);
  const { searchParams } = new URL(req.url);
  const reviewId = searchParams.get("reviewId");
  if (!reviewId) return error("Missing reviewId");
  const userId = searchParams.get("userId") ?? ctx.userId;
  return withDb(async (db) => {
    const col = db.collection<ReviewVote>(COLLECTIONS.votes);
    const count = await col.countDocuments({ reviewId });
    const voted = userId
      ? Boolean(await col.findOne({ reviewId, userId }))
      : false;
    return json({ count, voted });
  });
}

export async function POST(req: Request) {
  const ctx = await getOptionalContext(req);
  const body = await req.json();
  const reviewId = body.reviewId;
  const userId = body.userId ?? ctx.userId;
  if (!reviewId || !userId) return error("Missing reviewId or userId");
  const on = Boolean(body.on);
  return withDb(async (db) => {
    const col = db.collection<ReviewVote>(COLLECTIONS.votes);
    if (on) {
      await col.updateOne(
        { reviewId, userId },
        { $setOnInsert: { reviewId, userId } },
        { upsert: true }
      );
    } else {
      await col.deleteOne({ reviewId, userId });
    }
    const count = await col.countDocuments({ reviewId });
    return json({ count, voted: on });
  });
}
