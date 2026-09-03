import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter } from "@/lib/api";
import { getAdminContext } from "@/lib/admin";
import type { Spot, SpotReport } from "@/lib/types";

// POST /api/spots/report { spotId, reason } -> flag a spot for moderator review
export async function POST(req: Request) {
  const ctx = await getAdminContext(req);
  if (!ctx.userId) return error("You must be signed in to report a spot.", 401);
  const reporterId = ctx.userId;

  const body = (await req.json()) as { spotId?: string; reason?: string };
  if (!body.spotId) return error("Missing spotId");
  const spotId = body.spotId;
  const reason = String(body.reason ?? "").trim().slice(0, 500);

  return withDb(async (db) => {
    const oid = toObjectId(spotId);
    if (!oid) return error("Invalid spot id");
    const spot = await db
      .collection<Spot>(COLLECTIONS.spots)
      .findOne(byIdFilter<Spot>(oid), { projection: { mapId: 1, name: 1, createdBy: 1 } });
    if (!spot) return error("Spot not found", 404);
    if (spot.createdBy === reporterId) return error("You cannot report your own spot.", 400);

    const existing = await db.collection<SpotReport>(COLLECTIONS.reports).findOne({
      spotId,
      reporterId,
      status: "open",
    });
    if (existing) return json({ ok: true, alreadyReported: true });

    await db.collection<SpotReport>(COLLECTIONS.reports).insertOne({
      spotId,
      mapId: spot.mapId,
      reporterId,
      reason: reason || "Not specified",
      spotName: spot.name,
      status: "open",
      createdAt: new Date().toISOString(),
    });
    return json({ ok: true, alreadyReported: false });
  });
}
