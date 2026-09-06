import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json } from "@/lib/api";
import type { Spot } from "@/lib/types";

// GET /api/maps/counts -> { counts: Record<mapId, number> }
// Publicly visible spot total per map (approved or pre-moderation, never hidden),
// used by the homepage cards. Matches what the map view itself shows.
export async function GET() {
  return withDb(async (db) => {
    const col = db.collection<Spot>(COLLECTIONS.spots);
    const rows = await col
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            $or: [{ moderation: "approved" }, { moderation: { $exists: false } }],
            hidden: { $ne: true },
          },
        },
        { $group: { _id: "$mapId", count: { $sum: 1 } } },
      ])
      .toArray();
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r._id] = r.count;
    return json({ counts }, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" },
    });
  });
}