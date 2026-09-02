import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId } from "@/lib/api";
import type { Review, ReviewComment, SpotPhoto } from "@/lib/types";

// GET /api/map-data/spot?spotId=<id>
// Returns everything one spot's details panel needs (its reviews, the comments
// on those reviews, and its photos with image bytes). Loaded lazily only when
// a spot is opened, so /api/map-data can stay light.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const spotId = searchParams.get("spotId");
  if (!spotId) return error("Missing spotId");
  const oid = toObjectId(spotId);
  if (!oid) return error("Invalid spot id");

  return withDb(async (db) => {
    const reviews = await db
      .collection<Review>(COLLECTIONS.reviews)
      .find({ spotId })
      .sort({ date: -1 })
      .toArray();

    const reviewIds = reviews.map((r) => r._id!.toString());
    const comments = reviewIds.length
      ? await db
          .collection<ReviewComment>(COLLECTIONS.comments)
          .find({ reviewId: { $in: reviewIds } })
          .sort({ date: 1 })
          .toArray()
      : [];

    const photos = await db
      .collection<SpotPhoto>(COLLECTIONS.photos)
      .find({ spotId })
      .sort({ date: -1 })
      .toArray();

    return json(
      { reviews, comments, photos },
      {
        headers: {
          // Public GET — short CDN cache for repeat visits. Mutations go through
          // POST/PATCH/DELETE routes and patch this spot's detail locally.
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
        },
      }
    );
  });
}