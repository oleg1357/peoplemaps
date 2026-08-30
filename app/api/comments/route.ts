import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, getOptionalContext } from "@/lib/api";
import type { ReviewComment } from "@/lib/types";

// GET /api/comments?reviewId=<id>
// POST /api/comments -> add comment
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const reviewId = searchParams.get("reviewId");
  if (!reviewId) return error("Missing reviewId");
  return withDb(async (db) => {
    const comments = await db
      .collection<ReviewComment>(COLLECTIONS.comments)
      .find({ reviewId })
      .sort({ date: 1 })
      .toArray();
    return json(comments);
  });
}

export async function POST(req: Request) {
  const ctx = await getOptionalContext(req);
  const body = await req.json();
  if (!body.reviewId || !body.text) return error("Missing reviewId or text");
  const comment: ReviewComment = {
    reviewId: body.reviewId,
    text: String(body.text),
    date: new Date().toISOString().slice(0, 10),
    user_fk: body.user_fk ?? ctx.userId ?? null,
    authorName: body.authorName,
  };
  return withDb(async (db) => {
    const result = await db
      .collection<ReviewComment>(COLLECTIONS.comments)
      .insertOne(comment);
    return json({ ...comment, _id: result.insertedId }, { status: 201 });
  });
}
