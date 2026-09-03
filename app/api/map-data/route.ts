import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, publicContentFilter } from "@/lib/api";
import type { Spot, Review, ReviewComment, SpotPhoto, Zone, Route } from "@/lib/types";

// GET /api/map-data?mapId=<id>
// One request that loads everything the map view needs at once: the public
// spots for the map plus their reviews, comments, photos, zones and routes.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  return withDb(async (db) => {
    // Public map only shows spots that have been approved (or predate moderation)
    // and are not hidden. Pending and rejected spots are hidden from public views.
    const spots = await db
      .collection<Spot>(COLLECTIONS.spots)
      .find(publicContentFilter<Spot>(mapId))
      .sort({ createdAt: -1 })
      .toArray();

    // Public zones (same approval rule as spots).
    const zones = await db
      .collection<Zone>(COLLECTIONS.zones)
      .find(publicContentFilter<Zone>(mapId))
      .sort({ createdAt: -1 })
      .toArray();

    // Public routes (same approval rule as spots).
    const routes = await db
      .collection<Route>(COLLECTIONS.routes)
      .find(publicContentFilter<Route>(mapId))
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

    // Photos are data URLs and can be large. The map payload only carries photo
    // metadata (id, spotId, date); the actual image bytes are served lazily per
    // spot via GET /api/photos when its details open. Bound each spot to its
    // most recent few photos so the count stays honest and the response scales
    // with the number of spots, not with someone having uploaded a huge pile.
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
            { $project: { dataUrl: 0 } },
          ])
          .toArray()
      : [];

    return json(
      { spots, reviews, comments, photos, zones, routes },
      {
        headers: {
          // Public GET — short CDN cache so repeat visits (and the Next/Vercel
          // cache) serve this without a fresh serverless invocation.
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
        },
      }
    );
  });
}