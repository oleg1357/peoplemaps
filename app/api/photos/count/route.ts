import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error } from "@/lib/api";

// GET /api/photos/count?spotId=<id>
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const spotId = searchParams.get("spotId");
  if (!spotId) return error("Missing spotId");
  return withDb(async (db) => {
    const count = await db
      .collection(COLLECTIONS.photos)
      .countDocuments({ spotId });
    return json({ count });
  });
}
