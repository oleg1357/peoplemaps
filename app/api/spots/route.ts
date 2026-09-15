import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter, publicContentFilter, rateLimitByIp } from "@/lib/api";
import { getAdminContext, getMap, canContribute, canModerateMap } from "@/lib/admin";
import { isBannedOnMap } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { applyAutoModeration } from "@/lib/moderation-rules";
import { sanitizeMarkerEmoji, hasValidColor } from "@/lib/markers-data";
import type { Spot } from "@/lib/types";

// Public (map-visible) spots: approved or pre-moderation, never hidden.
function publicSpotsQuery(mapId: string) {
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
  const lim = await rateLimitByIp(req, 20, 60_000, "spots");
  if (!lim.ok) return error("Too many submissions. Try again shortly.", 429);
  const body = (await req.json()) as Partial<Spot>;
  if (!body.mapId) return error("Missing mapId");
  const mapId = body.mapId;
  if (!body.name || body.lat === undefined || body.lng === undefined) {
    return error("Spot requires name, lat and lng");
  }

  const ctx = await getAdminContext(req);
  const userId = ctx.userId;
  const map = await getMap(mapId);

  // Enforce collaboration mode (anyone / loggedIn / invitedOnly).
  const contrib = await canContribute(ctx, map);
  if (!contrib.ok) return error(contrib.reason || "Forbidden", 403);

  let moderation: Spot["moderation"] = "pending";
  // Trusted authors and maps with approval disabled get auto-approved.
  if (await canModerateMap(ctx, mapId).then((r) => r.ok)) {
    moderation = "approved";
  } else if (map && map.requireApproval === false) {
    moderation = "approved";
  }

  const marker = sanitizeMarkerEmoji(String(body.marker ?? ""));

  const name = String(body.name).trim().slice(0, 100);
  const street = String(body.street ?? "").slice(0, 200);
  const city = String(body.city ?? "").slice(0, 100);
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

  if (moderation === "pending") {
    const auto = await applyAutoModeration(mapId, {
      name,
      tip,
      tags,
      hoursNote,
    });
    if (auto) moderation = auto;
  }

  const spot: Spot = {
    mapId,
    name,
    street,
    city,
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
    if (userId && (await isBannedOnMap(db, mapId, userId))) {
      return error("You are banned from contributing to this map.", 403);
    }
    const col = db.collection<Spot>(COLLECTIONS.spots);
    const result = await col.insertOne(spot);
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
    if (await isBannedOnMap(db, existing.mapId, userId)) {
      return error("You are banned from contributing to this map.", 403);
    }
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

    if (await isBannedOnMap(db, existing.mapId, userId)) {
      return error("You are banned from contributing to this map.", 403);
    }

    if (existing.createdBy !== userId) {
      const perm = await canModerateMap(ctx, existing.mapId);
      if (!perm.ok) return error("You can only edit your own spots.", 403);
    }

    const set: Record<string, unknown> = {};
    const num = (v: unknown) => (typeof v === "number" ? v : Number(v));
    if (body.name !== undefined) {
      const n = String(body.name).trim().slice(0, 100);
      if (!n) return error("Spot name is required.");
      set.name = n;
    }
    if (body.street !== undefined) set.street = String(body.street ?? "").slice(0, 200);
    if (body.city !== undefined) set.city = String(body.city ?? "").slice(0, 100);
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
