import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, rateLimitByIp } from "@/lib/api";
import { getAdminContext, getMap, canContribute } from "@/lib/admin";
import { isBannedOnMap } from "@/lib/api";
import type { Filter } from "mongodb";
import type { ReviewComment, Review, Spot } from "@/lib/types";

const MAX_COMMENT_LENGTH = 1000;

// GET /api/comments?reviewId=<id>
// POST /api/comments -> add a comment (or a reply to another comment).
// DELETE /api/comments?id=<id> -> author deletes their own comment (and replies).
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
  const lim = await rateLimitByIp(req, 10, 60_000, "comments");
  if (!lim.ok) return error("Too many comments. Try again shortly.", 429);
  const ctx = await getAdminContext(req);
  const body = await req.json();
  if (!body.reviewId || !body.text) return error("Missing reviewId or text");
  const text = String(body.text).trim();
  if (!text) return error("Comment text cannot be empty.");
  if (text.length > MAX_COMMENT_LENGTH) {
    return error(`Comments are limited to ${MAX_COMMENT_LENGTH} characters.`);
  }

  const comment: ReviewComment = {
    reviewId: String(body.reviewId),
    text,
    date: new Date().toISOString().slice(0, 10),
    user_fk: ctx.userId,
    authorName: typeof body.authorName === "string" ? body.authorName.slice(0, 80) : undefined,
    parentId: typeof body.parentId === "string" && body.parentId ? body.parentId : null,
  };
  return withDb(async (db) => {
    const review = await db.collection<Review>(COLLECTIONS.reviews).findOne({ _id: comment.reviewId as never } as never);
    if (!review) return error("Review not found", 404);
    const spot = review.spotId
      ? await db.collection<Spot>(COLLECTIONS.spots).findOne({ _id: review.spotId as never } as never)
      : null;
    if (!spot) return error("Spot not found", 404);
    const map = spot.mapId ? await getMap(spot.mapId) : null;

    // Enforce collaboration mode + ban checks.
    const contrib = await canContribute(ctx, map);
    if (!contrib.ok) return error(contrib.reason || "Forbidden", 403);
    if (ctx.userId && spot.mapId && (await isBannedOnMap(db, spot.mapId, ctx.userId))) {
      return error("You are banned from contributing to this map.", 403);
    }

    if (map?.allowComments === false) {
      return error("Comments are disabled for this map.", 403);
    }
    const col = db.collection<ReviewComment>(COLLECTIONS.comments);
    if (comment.parentId) {
      const parent = await col.findOne({
        _id: comment.parentId as never,
        reviewId: comment.reviewId,
      } as unknown as Filter<ReviewComment>);
      if (!parent) return error("Parent comment not found.");
    }
    const result = await col.insertOne(comment);
    return json({ ...comment, _id: result.insertedId }, { status: 201 });
  });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return error("Missing comment id");

  const ctx = await getAdminContext(req);
  if (!ctx.userId) return error("You must be signed in to delete a comment.", 401);

  return withDb(async (db) => {
    const col = db.collection<ReviewComment>(COLLECTIONS.comments);
    const comment = await col.findOne({
      _id: id as never,
    } as unknown as Filter<ReviewComment>);
    if (!comment) return error("Comment not found.", 404);
    if (comment.user_fk !== ctx.userId) {
      return error("You can only delete your own comments.", 403);
    }

    const reviewId = comment.reviewId;
    const toDelete = new Set<string>([id]);
    const scan = async () => {
      const children = await col
        .find({
          reviewId,
          parentId: { $in: [...toDelete] },
        } as unknown as Filter<ReviewComment>)
        .toArray();
      let added = false;
      children.forEach((c) => {
        if (c._id && !toDelete.has(c._id.toString())) {
          toDelete.add(c._id.toString());
          added = true;
        }
      });
      if (added) await scan();
    };
    await scan();

    await col.deleteMany({
      _id: { $in: [...toDelete] },
    } as unknown as Filter<ReviewComment>);
    return json({ ok: true });
  });
}
