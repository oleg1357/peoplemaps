import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter } from "@/lib/api";
import { getAdminContext, getMap, isGlobalAdmin, canModerateMap } from "@/lib/admin";
import type { Spot } from "@/lib/types";
import type { Filter } from "mongodb";

// Public (map-visible) spots: approved or pre-moderation, never hidden.
function publicSpotsQuery(mapId: string): Filter<Spot> {
  return {
    mapId,
    $or: [{ moderation: "approved" }, { moderation: { $exists: false } }],
    hidden: { $ne: true },
  };
}

// GET /api/spots?mapId=<mapId>  -> all spots for a map
// POST /api/spots  -> create a spot
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  const spotId = searchParams.get("spotId");

  return withDb(async (db) => {
    const col = db.collection<Spot>(COLLECTIONS.spots);
    if (spotId) {
      const oid = toObjectId(spotId);
      if (!oid) return error("Invalid spot id");
      const spot = await col.findOne(byIdFilter<Spot>(oid));
      return spot ? json(spot) : error("Spot not found", 404);
    }
    if (!mapId) return error("Missing mapId");
    // Public map only shows spots that have been approved (or predate moderation)
    // and are not hidden. Pending and rejected spots are hidden from the public map.
    const spots = await col
      .find(publicSpotsQuery(mapId))
      .sort({ createdAt: -1 })
      .toArray();
    return json(spots);
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Spot>;
  if (!body.mapId) return error("Missing mapId");
  const mapId = body.mapId;
  if (!body.name || body.lat === undefined || body.lng === undefined) {
    return error("Spot requires name, lat and lng");
  }

  // Spot submissions require a signed-in user. Identity comes from the session
  // cookie (never from the request body), and moderation is decided server-side.
  const ctx = await getAdminContext(req);
  if (!ctx.userId) {
    return error("You must be signed in to add a spot.", 401);
  }

  let moderation: Spot["moderation"] = "pending";
  const map = await getMap(mapId);
  if (isGlobalAdmin(ctx.userId) || (map?.ownerId && map.ownerId === ctx.userId)) {
    moderation = "approved";
  }

  const spot: Spot = {
    mapId,
    name: String(body.name),
    street: String(body.street ?? ""),
    city: String(body.city ?? ""),
    zip: Number(body.zip ?? 0),
    lat: Number(body.lat),
    lng: Number(body.lng),
    createdBy: ctx.userId,
    createdAt: new Date().toISOString(),
    moderation,
    hidden: false,
    reviewNote: null,
  };
  return withDb(async (db) => {
    const col = db.collection<Spot>(COLLECTIONS.spots);
    const result = await col.insertOne(spot);
    // Return the updated public list so the map can refresh without a
    // follow-up request.
    const spots = await col
      .find(publicSpotsQuery(mapId))
      .sort({ createdAt: -1 })
      .toArray();
    return json({ spot: { ...spot, _id: result.insertedId }, spots }, { status: 201 });
  });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const spotId = searchParams.get("spotId");
  if (!spotId) return error("Missing spotId");

  const ctx = await getAdminContext(req);
  if (!ctx.userId) return error("You must be signed in to delete a spot.", 401);

  return withDb(async (db) => {
    const oid = toObjectId(spotId);
    if (!oid) return error("Invalid spot id");
    const col = db.collection<Spot>(COLLECTIONS.spots);
    const existing = await col.findOne(byIdFilter<Spot>(oid), {
      projection: { mapId: 1, createdBy: 1 },
    });
    if (!existing) return error("Spot not found", 404);
    // Only the submitter, the map owner or a global admin may delete a spot.
    if (existing.createdBy !== ctx.userId) {
      const perm = await canModerateMap(ctx, existing.mapId);
      if (!perm.ok) return error(perm.reason || "Forbidden", 403);
    }
    await col.deleteOne(byIdFilter<Spot>(oid));
    await db.collection(COLLECTIONS.reviews).deleteMany({ spotId });
    await db.collection(COLLECTIONS.photos).deleteMany({ spotId });
    await db.collection(COLLECTIONS.comments).deleteMany({ spotId });
    await db.collection(COLLECTIONS.votes).deleteMany({ spotId });
    await db.collection(COLLECTIONS.saved).deleteMany({ spotId });
    return NextResponse.json({ ok: true });
  });
}
