import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error } from "@/lib/api";
import type { Spot, Review, ReviewComment, SpotPhoto } from "@/lib/types";

// GET /api/map-data?mapId=<id>
// One request that loads everything the map view needs at once: the public
// spots for the map plus their reviews, comments and photos.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

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

    // Photos are data URLs and can be large, so cap the payload. Bound each
    // spot to its most recent few photos (the app shows at most 6 per spot) so
    // the response size scales with the number of spots, not with one spot
    // having uploaded a huge pile of images.
    const photos = spotIds.length
      ? await db
          .collection<SpotPhoto>(COLLECTIONS.photos)
          .aggregate<SpotPhoto>([
            { $match: { spotId: { $in: spotIds } } },
            { $sort: { date: -1 } },
            { $group: { _id: "$spotId", docs: { $push: "$$ROOT" } } },
            { $project: { docs: { $slice: ["$docs", 6] } } },
            { $unwind: "$docs" },
            { $replaceRoot: { newRoot: "$docs" } },
          ])
          .toArray()
      : [];

    return json({ spots, reviews, comments, photos });
  });
}