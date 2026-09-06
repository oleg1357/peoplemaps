import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, getOptionalContext } from "@/lib/api";
import { getMap } from "@/lib/admin";
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
  const ctx = await getOptionalContext(req);
  const body = await req.json();
  if (!body.reviewId || !body.text) return error("Missing reviewId or text");
  const text = String(body.text).trim();
  if (!text) return error("Comment text cannot be empty.");
  if (text.length > MAX_COMMENT_LENGTH) {
    return error(`Comments are limited to ${MAX_COMMENT_LENGTH} characters.`);
  }

  const comment: ReviewComment = {
    reviewId: String(body.reviewId),
    text: String(body.text),
    date: new Date().toISOString().slice(0, 10),
    user_fk: ctx.userId ?? body.user_fk ?? null,
    authorName: typeof body.authorName === "string" ? body.authorName.slice(0, 80) : undefined,
    parentId: typeof body.parentId === "string" && body.parentId ? body.parentId : null,
  };
  return withDb(async (db) => {
    // The review (and its spot) must exist and the map's allowComments toggle
    // must permit comments.
    const review = await db.collection<Review>(COLLECTIONS.reviews).findOne({ _id: comment.reviewId as never } as never);
    if (!review) return error("Review not found", 404);
    const spot = review.spotId
      ? await db.collection<Spot>(COLLECTIONS.spots).findOne({ _id: review.spotId as never } as never)
      : null;
    if (!spot) return error("Spot not found", 404);
    const map = spot.mapId ? await getMap(spot.mapId) : null;
    if (map?.allowComments === false) {
      return error("Comments are disabled for this map.", 403);
    }
    const col = db.collection<ReviewComment>(COLLECTIONS.comments);
    // The parent must exist and belong to the same review.
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

  const ctx = await getOptionalContext(req);
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

    // Remove the comment and the whole reply subtree beneath it.
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