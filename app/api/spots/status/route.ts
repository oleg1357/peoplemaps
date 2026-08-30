import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter } from "@/lib/api";
import type { Spot } from "@/lib/types";

// GET /api/spots/status?spotId=<id>
// POST /api/spots/status -> { spotId, status }  (open | closed | unknown)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const spotId = searchParams.get("spotId");
  if (!spotId) return error("Missing spotId");
  return withDb(async (db) => {
    const oid = toObjectId(spotId);
    if (!oid) return error("Invalid spot id");
    const spot = await db.collection<Spot>(COLLECTIONS.spots).findOne(byIdFilter<Spot>(oid));
    return json({ status: spot?.status ?? "unknown" });
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const status = body.status;
  if (!body.spotId) return error("Missing spotId");
  if (!["open", "closed", "unknown"].includes(status)) {
    return error("Invalid status");
  }
  return withDb(async (db) => {
    const oid = toObjectId(body.spotId);
    if (!oid) return error("Invalid spot id");
    await db
      .collection<Spot>(COLLECTIONS.spots)
      .updateOne(byIdFilter<Spot>(oid), { $set: { status } });
    return json({ status });
  });
}
