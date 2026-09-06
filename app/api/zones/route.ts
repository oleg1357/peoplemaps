import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, isValidLatLng, publicContentFilter } from "@/lib/api";
import { getAdminContext, getMap, isGlobalAdmin, isMapModerator } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { applyAutoModeration } from "@/lib/moderation-rules";
import { hasValidColor } from "@/lib/markers-data";
import type { Filter, Db } from "mongodb";
import type { Zone, MapBan } from "@/lib/types";

const MAX_NAME = 60;
const MAX_DESC = 300;
const MAX_VERTICES = 500;

// True when the user is banned from contributing to this map.
async function isBanned(db: Db, mapId: string, userId: string): Promise<boolean> {
  return !!(await db.collection<MapBan>(COLLECTIONS.bans).findOne({ mapId, userId }));
}

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

  // Zone submission rules mirror spots: anyone (when the map allows it) or a
  // signed-in user; "invitedOnly" restricts to owner/moderators/global admins.
  // Identity comes from the session cookie, never the request body.
  const ctx = await getAdminContext(req);
  const userId = ctx.userId;
  const map = await getMap(mapId);

  const mode = map?.collaborationMode ?? "loggedIn";
  if (mode !== "anyone") {
    if (!ctx.userId) return error("You must be signed in to add a zone.", 401);
  }
  if (mode === "invitedOnly" && ctx.userId) {
    const allowed =
      isGlobalAdmin(ctx.userId) ||
      (map?.ownerId && map.ownerId === ctx.userId) ||
      (await isMapModerator(mapId, ctx.userId));
    if (!allowed) {
      return error(
        "Only the map owner and moderators can add zones to this map.",
        403
      );
    }
  }

  let moderation: Zone["moderation"] = "pending";
  if (
    (ctx.userId && isGlobalAdmin(ctx.userId)) ||
    (map?.ownerId && ctx.userId && map.ownerId === ctx.userId) ||
    (ctx.userId && (await isMapModerator(mapId, ctx.userId)))
  ) {
    moderation = "approved";
  } else if (map && map.requireApproval === false) {
    moderation = "approved";
  }

  // Auto-moderation rules can still override a pending submission.
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
    createdBy: userId,
    createdAt: new Date().toISOString(),
    moderation,
    hidden: false,
  };

  return withDb(async (db) => {
    if (userId && (await isBanned(db, mapId, userId))) {
      return error("You are banned from contributing to this map.", 403);
    }
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