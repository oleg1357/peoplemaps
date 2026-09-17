import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, isValidLatLng, publicContentFilter, rateLimitByIp } from "@/lib/api";
import { getAdminContext, getMap, canContribute, canModerateMap, canDraw } from "@/lib/admin";
import { isBannedOnMap } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { applyAutoModeration } from "@/lib/moderation-rules";
import { hasValidColor } from "@/lib/markers-data";
import type { Filter } from "mongodb";
import type { Zone } from "@/lib/types";

const MAX_NAME = 60;
const MAX_DESC = 300;
const MAX_VERTICES = 500;

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
  const lim = await rateLimitByIp(req, 10, 60_000, "zones");
  if (!lim.ok) return error("Too many zone submissions. Try again shortly.", 429);
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

  let value: number | null = null;
  if (body.value !== undefined && body.value !== null) {
    const parsed = typeof body.value === "number" ? body.value : Number(body.value);
    if (Number.isFinite(parsed)) value = parsed;
  }
  let valueCount: number | null = null;
  if (body.valueCount !== undefined && body.valueCount !== null) {
    const parsed =
      typeof body.valueCount === "number" ? body.valueCount : Number(body.valueCount);
    if (Number.isInteger(parsed) && parsed >= 0) valueCount = Math.min(parsed, 1_000_000);
  }
  const valueUpdatedAt =
    typeof body.valueUpdatedAt === "string" && body.valueUpdatedAt
      ? body.valueUpdatedAt.slice(0, 40)
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

  const ctx = await getAdminContext(req);
  const userId = ctx.userId;
  const map = await getMap(mapId);

  const contrib = await canContribute(ctx, map);
  if (!contrib.ok) return error(contrib.reason || "Forbidden", 403);

  const draw = await canDraw(ctx, map);
  if (!draw.ok) return error(draw.reason || "Forbidden", 403);

  let moderation: Zone["moderation"] = "pending";
  if (await canModerateMap(ctx, mapId).then((r) => r.ok)) {
    moderation = "approved";
  } else if (map && map.requireApproval === false) {
    moderation = "approved";
  }

  if (moderation === "pending") {
    const auto = await applyAutoModeration(mapId, { name, description });
    if (auto) moderation = auto;
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
    value,
    valueCount,
    valueUpdatedAt,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    moderation,
    hidden: false,
  };

  return withDb(async (db) => {
    if (userId && (await isBannedOnMap(db, mapId, userId))) {
      return error("You are banned from contributing to this map.", 403);
    }
    const col = db.collection<Zone>(COLLECTIONS.zones);
    const result = await col.insertOne(zone);
    await logActivity({
      mapId,
      actorId: ctx.userId,
      action: "zone.create",
      targetType: "zone",
      targetId: result.insertedId.toString(),
      targetName: zone.name,
    });
    const zones = await col
      .find(publicZonesQuery(mapId))
      .sort({ createdAt: -1 })
      .toArray();
    return json({ zone: { ...zone, _id: result.insertedId }, zones }, { status: 201 });
  });
}
