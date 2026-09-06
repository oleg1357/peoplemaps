import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter, publicContentFilter } from "@/lib/api";
import { getAdminContext, getMap, isGlobalAdmin, canModerateMap, isMapModerator } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { sanitizeMarkerEmoji, hasValidColor } from "@/lib/markers-data";
import type { Spot, MapBan } from "@/lib/types";
import type { Filter, Db } from "mongodb";

// True when the user is banned from contributing to this map.
async function isBanned(db: Db, mapId: string, userId: string): Promise<boolean> {
  return !!(
    await db.collection<MapBan>(COLLECTIONS.bans).findOne({ mapId, userId })
  );
}

// Public (map-visible) spots: approved or pre-moderation, never hidden.
function publicSpotsQuery(mapId: string): Filter<Spot> {
  return publicContentFilter<Spot>(mapId);
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
    return json(spots, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" },
    });
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<Spot>;
  if (!body.mapId) return error("Missing mapId");
  const mapId = body.mapId;
  if (!body.name || body.lat === undefined || body.lng === undefined) {
    return error("Spot requires name, lat and lng");
  }

  // Spot submissions require a signed-in user (unless the map is in "anyone"
  // mode). Identity comes from the session cookie (never from the request body),
  // and moderation is decided server-side.
  const ctx = await getAdminContext(req);
  const userId = ctx.userId;

  const map = await getMap(mapId);

  // collaborationMode decides who can add spots to this map.
  const mode = map?.collaborationMode ?? "loggedIn";
  if (mode !== "anyone") {
    if (!ctx.userId) {
      return error("You must be signed in to add a spot.", 401);
    }
  }
  if (mode === "invitedOnly" && ctx.userId) {
    const allowed =
      isGlobalAdmin(ctx.userId) ||
      (map?.ownerId && map.ownerId === ctx.userId) ||
      (await isMapModerator(mapId, ctx.userId));
    if (!allowed) {
      return error(
        "Only the map owner and moderators can add spots to this map.",
        403
      );
    }
  }

  let moderation: Spot["moderation"] = "pending";
  // The map owner, global admins and designated moderators are always trusted; a
  // map can also disable approval entirely so everyone's spots go live
  // immediately.
  if (
    (ctx.userId && isGlobalAdmin(ctx.userId)) ||
    (map?.ownerId && ctx.userId && map.ownerId === ctx.userId) ||
    (ctx.userId && (await isMapModerator(mapId, ctx.userId)))
  ) {
    moderation = "approved";
  } else if (map && map.requireApproval === false) {
    moderation = "approved";
  }

  // Only the known marker emoji are stored; everything else falls back to the
  // map's default on the client.
  const marker = sanitizeMarkerEmoji(String(body.marker ?? ""));

  // Rich content fields — sanitized, optional, and capped so one contributor
  // can't bloat a spot.
  const priceLevel = [0, 1, 2, 3].includes(Number(body.priceLevel))
    ? Number(body.priceLevel)
    : null;
  const hoursNote = String(body.hoursNote ?? "").slice(0, 120) || null;
  const tags = Array.isArray(body.tags)
    ? (body.tags as unknown[])
        .map((t) => String(t).trim().slice(0, 24))
        .filter(Boolean)
        .slice(0, 8)
    : [];
  const tip = String(body.tip ?? "").slice(0, 280) || null;

  const spot: Spot = {
    mapId,
    name: String(body.name),
    street: String(body.street ?? ""),
    city: String(body.city ?? ""),
    zip: Number(body.zip ?? 0),
    lat: Number(body.lat),
    lng: Number(body.lng),
    createdBy: userId,
    createdAt: new Date().toISOString(),
    moderation,
    hidden: false,
    reviewNote: null,
    marker: marker ?? undefined,
    priceLevel,
    hoursNote,
    tags,
    tip,
  };
  return withDb(async (db) => {
    if (userId && (await isBanned(db, mapId, userId))) {
      return error("You are banned from contributing to this map.", 403);
    }
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
  const userId = ctx.userId;

  return withDb(async (db) => {
    const oid = toObjectId(spotId);
    if (!oid) return error("Invalid spot id");
    const col = db.collection<Spot>(COLLECTIONS.spots);
    const existing = await col.findOne(byIdFilter<Spot>(oid), {
      projection: { mapId: 1, createdBy: 1 },
    });
    if (!existing) return error("Spot not found", 404);
    if (await isBanned(db, existing.mapId, userId)) {
      return error("You are banned from contributing to this map.", 403);
    }
    // Only the submitter, the map owner or a global admin may delete a spot.
    if (existing.createdBy !== userId) {
      const perm = await canModerateMap(ctx, existing.mapId);
      if (!perm.ok) return error(perm.reason || "Forbidden", 403);
    }
await col.deleteOne(byIdFilter<Spot>(oid));
    await db.collection(COLLECTIONS.reviews).deleteMany({ spotId });
    await db.collection(COLLECTIONS.photos).deleteMany({ spotId });
    await db.collection(COLLECTIONS.comments).deleteMany({ spotId });
    await db.collection(COLLECTIONS.votes).deleteMany({ spotId });
    return NextResponse.json({ ok: true });
  });
}

// PATCH /api/spots  -> a submitter edits their own spot (or a moderator/admin edits any)
export async function PATCH(req: Request) {
  const ctx = await getAdminContext(req);
  if (!ctx.userId) return error("You must be signed in to edit a spot.", 401);
  const userId = ctx.userId;

  const body = (await req.json()) as {
    spotId?: string;
    name?: string;
    street?: string;
    city?: string;
    zip?: number;
    lat?: number;
    lng?: number;
    marker?: string | null;
    markerColor?: string | null;
    priceLevel?: number | null;
    hoursNote?: string | null;
    tags?: string[] | null;
    tip?: string | null;
  };
  if (!body.spotId) return error("Missing spotId");
  const spotId = body.spotId;

  return withDb(async (db) => {
    const oid = toObjectId(spotId);
    if (!oid) return error("Invalid spot id");
    const col = db.collection<Spot>(COLLECTIONS.spots);
    const existing = await col.findOne(byIdFilter<Spot>(oid), {
      projection: { mapId: 1, createdBy: 1, name: 1 },
    });
    if (!existing) return error("Spot not found", 404);

    if (await isBanned(db, existing.mapId, userId)) {
      return error("You are banned from contributing to this map.", 403);
    }

    // The submitter may edit their own spot; otherwise a moderator/admin may.
    if (existing.createdBy !== userId) {
      const perm = await canModerateMap(ctx, existing.mapId);
      if (!perm.ok) return error("You can only edit your own spots.", 403);
    }

    const set: Record<string, unknown> = {};
    const num = (v: unknown) => (typeof v === "number" ? v : Number(v));
    if (body.name !== undefined) {
      const n = String(body.name).trim();
      if (!n) return error("Spot name is required.");
      set.name = n;
    }
    if (body.street !== undefined) set.street = String(body.street ?? "");
    if (body.city !== undefined) set.city = String(body.city ?? "");
    if (body.zip !== undefined) set.zip = Number.isFinite(num(body.zip)) ? num(body.zip) : 0;
    if (body.lat !== undefined) {
      const lat = num(body.lat);
      if (!Number.isFinite(lat) || lat < -90 || lat > 90) return error("Invalid latitude.");
      set.lat = lat;
    }
    if (body.lng !== undefined) {
      const lng = num(body.lng);
      if (!Number.isFinite(lng) || lng < -180 || lng > 180) return error("Invalid longitude.");
      set.lng = lng;
    }
    if (body.marker !== undefined) {
      const marker = sanitizeMarkerEmoji(String(body.marker ?? ""));
      if (body.marker !== null && !marker) return error("Unknown marker.");
      set.marker = marker;
    }
    if (body.markerColor !== undefined) {
      if (body.markerColor !== null && !hasValidColor(String(body.markerColor))) {
        return error("Invalid marker color.");
      }
      set.markerColor = body.markerColor;
    }
    if (body.priceLevel !== undefined) {
      set.priceLevel = [0, 1, 2, 3].includes(num(body.priceLevel))
        ? num(body.priceLevel)
        : null;
    }
    if (body.hoursNote !== undefined) {
      set.hoursNote = String(body.hoursNote ?? "").slice(0, 120) || null;
    }
    if (body.tags !== undefined) {
      set.tags = Array.isArray(body.tags)
        ? (body.tags as unknown[])
            .map((t) => String(t).trim().slice(0, 24))
            .filter(Boolean)
            .slice(0, 8)
        : [];
    }
    if (body.tip !== undefined) {
      set.tip = String(body.tip ?? "").slice(0, 280) || null;
    }

    if (Object.keys(set).length === 0) return error("Nothing to update");

    await col.updateOne(byIdFilter<Spot>(oid), { $set: set });
    await logActivity({
      mapId: existing.mapId,
      actorId: userId,
      action: "spot.edit_self",
      targetType: "spot",
      targetId: body.spotId,
      targetName: existing.name,
    });
    const spot = await col.findOne(byIdFilter<Spot>(oid));
    return json({ ok: true, spot });
  });
}
