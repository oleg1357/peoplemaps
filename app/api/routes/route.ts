import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, isValidLatLng, publicContentFilter, rateLimitByIp } from "@/lib/api";
import { getAdminContext, getMap, canContribute, canModerateMap } from "@/lib/admin";
import { isBannedOnMap } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { applyAutoModeration } from "@/lib/moderation-rules";
import { hasValidColor } from "@/lib/markers-data";
import type { Filter } from "mongodb";
import type { Route } from "@/lib/types";

const MAX_NAME = 100;
const MAX_DESC = 300;
const MAX_VERTICES = 2000;

function publicRoutesQuery(mapId: string): Filter<Route> {
  return publicContentFilter<Route>(mapId);
}

// GET /api/routes?mapId=<mapId>
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  return withDb(async (db) => {
    const routes = await db
      .collection<Route>(COLLECTIONS.routes)
      .find(publicRoutesQuery(mapId))
      .sort({ createdAt: -1 })
      .toArray();
    return json(routes, {
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600" },
    });
  });
}

// POST /api/routes  -> create a route (ordered polyline points)
export async function POST(req: Request) {
  const lim = await rateLimitByIp(req, 10, 60_000, "routes");
  if (!lim.ok) return error("Too many route submissions. Try again shortly.", 429);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return error("Invalid request body");

  const mapId = typeof body.mapId === "string" ? body.mapId : "";
  if (!mapId) return error("Missing mapId");
  const name = String(body.name ?? "").trim();
  if (!name || name.length > MAX_NAME) return error(`Route requires a name (max ${MAX_NAME} chars).`);
  const description =
    typeof body.description === "string"
      ? body.description.slice(0, MAX_DESC)
      : null;
  const color =
    typeof body.color === "string" && hasValidColor(body.color)
      ? body.color
      : null;

  if (!Array.isArray(body.points) || body.points.length < 2) {
    return error("Routes require at least 2 points.");
  }
  if (body.points.length > MAX_VERTICES) {
    return error(`Too many points (max ${MAX_VERTICES}).`);
  }
  for (const p of body.points) {
    if (!isValidLatLng(p)) return error("Invalid point coordinate.");
  }
  const points = body.points as [number, number][];

  const ctx = await getAdminContext(req);
  const userId = ctx.userId;
  const map = await getMap(mapId);

  const contrib = await canContribute(ctx, map);
  if (!contrib.ok) return error(contrib.reason || "Forbidden", 403);

  let moderation: Route["moderation"] = "pending";
  if (await canModerateMap(ctx, mapId).then((r) => r.ok)) {
    moderation = "approved";
  } else if (map && map.requireApproval === false) {
    moderation = "approved";
  }

  if (moderation === "pending") {
    const auto = await applyAutoModeration(mapId, { name, description });
    if (auto) moderation = auto;
  }

  const route: Route = {
    mapId,
    name,
    points,
    color,
    description,
    createdBy: userId,
    createdAt: new Date().toISOString(),
    moderation,
    hidden: false,
  };

  return withDb(async (db) => {
    if (userId && (await isBannedOnMap(db, mapId, userId))) {
      return error("You are banned from contributing to this map.", 403);
    }
    const col = db.collection<Route>(COLLECTIONS.routes);
    const result = await col.insertOne(route);
    await logActivity({
      mapId,
      actorId: ctx.userId,
      action: "route.create",
      targetType: "route",
      targetId: result.insertedId.toString(),
      targetName: route.name,
    });
    const routes = await col
      .find(publicRoutesQuery(mapId))
      .sort({ createdAt: -1 })
      .toArray();
    return json({ route: { ...route, _id: result.insertedId }, routes }, { status: 201 });
  });
}
