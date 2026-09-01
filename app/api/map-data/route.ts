import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, getOptionalContext } from "@/lib/api";
import type {
  Spot,
  Review,
  ReviewComment,
  SpotPhoto,
  WatchEntry,
  SavedEntry,
} from "@/lib/types";

// GET /api/map-data?mapId=<id>
// One request that loads everything the map view needs at once: the public
// spots for the map plus their reviews, comments and photos, and (when the
// requester is signed in) their watch + saved entries.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  const ctx = await getOptionalContext(req);
  const userId = ctx.userId;

  return withDb(async (db) => {
    // Public map only shows spots that have been approved (or predate moderation)
    // and are not hidden. Pending and rejected spots are hidden from public views.
    const spots = await db
      .collection<Spot>(COLLECTIONS.spots)
      .find({
        mapId,
        $or: [{ moderation: "approved" }, { moderation: { $exists: false } }],
        hidden: { $ne: true },
      })
      .sort({ createdAt: -1 })
      .toArray();

    const spotIds = spots.map((s) => s._id!.toString());

    const reviews = spotIds.length
      ? await db
          .collection<Review>(COLLECTIONS.reviews)
          .find({ spotId: { $in: spotIds } })
          .sort({ date: -1 })
          .toArray()
      : [];

    const reviewIds = reviews.map((r) => r._id!.toString());

    const comments = reviewIds.length
      ? await db
          .collection<ReviewComment>(COLLECTIONS.comments)
          .find({ reviewId: { $in: reviewIds } })
          .sort({ date: 1 })
          .toArray()
      : [];

    // Photos are data URLs and can be large, so cap the payload. Covers the
    // per-spot limit of 6 for maps up to ~20 spots.
    const photos = spotIds.length
      ? await db
          .collection<SpotPhoto>(COLLECTIONS.photos)
          .find({ spotId: { $in: spotIds } })
          .sort({ date: -1 })
          .limit(120)
          .toArray()
      : [];

    const [watches, saved] = userId
      ? [
          await db
            .collection<WatchEntry>(COLLECTIONS.watches)
            .find({ userId })
            .toArray(),
          await db
            .collection<SavedEntry>(COLLECTIONS.saved)
            .find({ userId })
            .toArray(),
        ]
      : [[], []];

    return json({ spots, reviews, comments, photos, watches, saved });
  });
}