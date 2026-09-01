import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json } from "@/lib/api";
import type { Spot } from "@/lib/types";

// GET /api/maps/counts -> { counts: Record<mapId, number> }
// Spot total per map (all visibility/moderation states), used by the homepage
// cards as a lightweight supplement to the Sanity map list.
export async function GET() {
  return withDb(async (db) => {
    const col = db.collection<Spot>(COLLECTIONS.spots);
    const rows = await col
      .aggregate<{ _id: string; count: number }>([
        { $group: { _id: "$mapId", count: { $sum: 1 } } },
      ])
      .toArray();
    const counts: Record<string, number> = {};
    for (const r of rows) counts[r._id] = r.count;
    return json({ counts });
  });
}