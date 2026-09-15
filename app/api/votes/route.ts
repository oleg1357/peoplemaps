import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, getOptionalContext, rateLimitByIp } from "@/lib/api";
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

// POST /api/votes -> { reviewId, on?:boolean } toggles helpful vote. Identity
// always comes from the session cookie, never the request body.
export async function POST(req: Request) {
  const lim = await rateLimitByIp(req, 20, 60_000, "votes");
  if (!lim.ok) return error("Too many votes. Try again shortly.", 429);
  const ctx = await getOptionalContext(req);
  const userId = ctx.userId;
  if (!userId) return error("You must be signed in to vote.", 401);
  const body = await req.json();
  const reviewId = body.reviewId;
  if (!reviewId) return error("Missing reviewId");
  return withDb(async (db) => {
    const col = db.collection<ReviewVote>(COLLECTIONS.votes);
    const on =
      body.on !== undefined
        ? Boolean(body.on)
        : !(await col.findOne({ reviewId, userId }));
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
