import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, isValidLatLng, publicContentFilter } from "@/lib/api";
import { getAdminContext, getMap, isMapModerator } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { hasValidColor } from "@/lib/markers-data";
import type { Filter } from "mongodb";
import type { Zone } from "@/lib/types";

const MAX_NAME = 60;
const MAX_DESC = 300;
const MAX_VERTICES = 500;

// Public (map-visible) zones: approved or pre-moderation, never hidden.
function publicZonesQuery(mapId: string): Filter<Zone> {
  return publicContentFilter<Zone>(mapId);
}

// GET /api/zones?mapId=<mapId>
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  return withDb(async (db) => {
    const zones = await db
      .collection<Zone>(COLLECTIONS.zones)
      .find(publicZonesQuery(mapId))
      .sort({ createdAt: -1 })
      .toArray();
    return json(zones, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" },
    });
  });
}

// POST /api/zones  -> create a zone (polygon or circle)
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return error("Invalid request body");

  const mapId = typeof body.mapId === "string" ? body.mapId : "";
  if (!mapId) return error("Missing mapId");
  const name = String(body.name ?? "").trim();
  if (!name || name.length > MAX_NAME) return error(`Zone requires a name (max ${MAX_NAME} chars).`);
  const description =
    typeof body.description === "string"
      ? body.description.slice(0, MAX_DESC)
      : null;
  const color =
    typeof body.color === "string" && hasValidColor(body.color)
      ? body.color
      : null;

  const shape = body.shape;
  let points: [number, number][] | undefined;
  let center: [number, number] | undefined;
  let radius: number | undefined;

  if (shape === "polygon") {
    if (!Array.isArray(body.points) || body.points.length < 3) {
      return error("Polygon zones require at least 3 points.");
    }
    if (body.points.length > MAX_VERTICES) {
      return error(`Too many points (max ${MAX_VERTICES}).`);
    }
    for (const p of body.points) {
      if (!isValidLatLng(p)) return error("Invalid point coordinate.");
    }
    points = body.points as [number, number][];
  } else if (shape === "circle") {
    if (!isValidLatLng(body.center)) return error("Circle zone requires a valid center.");
    radius = typeof body.radius === "number" ? body.radius : Number(body.radius);
    if (!Number.isFinite(radius) || radius <= 0 || radius > 1_000_000) {
      return error("Circle zone requires a valid positive radius (max 1,000,000 m).");
    }
    center = body.center;
  } else {
    return error("Zone shape must be 'polygon' or 'circle'.");
  }

  // Spot submission rules apply to zones too: owners/admins/moderators (and maps
  // with approval off) go straight to approved; everyone else is pending.
  const ctx = await getAdminContext(req);
  if (!ctx.userId) return error("You must be signed in to add a zone.", 401);

  let moderation: Zone["moderation"] = "pending";
  const map = await getMap(mapId);
  if (
    ctx.isGlobalAdmin ||
    (map?.ownerId && map.ownerId === ctx.userId) ||
    (await isMapModerator(mapId, ctx.userId))
  ) {
    moderation = "approved";
  } else if (map && map.requireApproval === false) {
    moderation = "approved";
  }

  const zone: Zone = {
    mapId,
    name,
    shape: shape as Zone["shape"],
    points,
    center,
    radius,
    color,
    description,
    createdBy: ctx.userId,
    createdAt: new Date().toISOString(),
    moderation,
    hidden: false,
  };

  return withDb(async (db) => {
    const col = db.collection<Zone>(COLLECTIONS.zones);
    const result = await col.insertOne(zone);
    // Re-run moderation on the object for the entry name (avoiding a re-query).
    await logActivity({
      mapId,
      actorId: ctx.userId,
      action: "zone.create",
      targetType: "zone",
      targetId: result.insertedId.toString(),
      targetName: zone.name,
    });
    // Return the refreshed public list so the map updates without a follow-up
    // request, like spots do.
    const zones = await col
      .find(publicZonesQuery(mapId))
      .sort({ createdAt: -1 })
      .toArray();
    return json({ zone: { ...zone, _id: result.insertedId }, zones }, { status: 201 });
  });
}