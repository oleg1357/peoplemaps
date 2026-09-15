import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter, rateLimitByIp } from "@/lib/api";
import { getAdminContext, canModerateMap } from "@/lib/admin";
import { isBannedOnMap } from "@/lib/api";
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
  const lim = await rateLimitByIp(req, 20, 60_000, "spot-status");
  if (!lim.ok) return error("Too many requests. Try again shortly.", 429);
  const ctx = await getAdminContext(req);
  const userId = ctx.userId;
  if (!userId) {
    return error("You must be signed in to update a spot's status.", 401);
  }
  const body = await req.json();
  const status = body.status;
  if (!body.spotId) return error("Missing spotId");
  if (!["open", "closed", "unknown"].includes(status)) {
    return error("Invalid status");
  }
  return withDb(async (db) => {
    const oid = toObjectId(body.spotId);
    if (!oid) return error("Invalid spot id");
    const col = db.collection<Spot>(COLLECTIONS.spots);
    const existing = await col.findOne(byIdFilter<Spot>(oid), {
      projection: { mapId: 1, createdBy: 1 },
    });
    if (!existing) return error("Spot not found", 404);
    if (await isBannedOnMap(db, existing.mapId, userId)) {
      return error("You are banned from contributing to this map.", 403);
    }
    // The spot's author may update the status; otherwise a moderator is required.
    if (existing.createdBy !== userId) {
      const perm = await canModerateMap(ctx, existing.mapId);
      if (!perm.ok) return error("You can only update the status of your own spots.", 403);
    }
    await col.updateOne(byIdFilter<Spot>(oid), { $set: { status } });
    return json({ status });
  });
}
