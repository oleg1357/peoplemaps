import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error } from "@/lib/api";
import { getAdminContext, canModerateMap } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import type { MapBan } from "@/lib/types";

// GET /api/admin/bans?mapId=<mapId> -> list bans for a map
// POST /api/admin/bans { mapId, userId, reason } -> ban a user from the map
// DELETE /api/admin/bans?mapId=<mapId>&userId=<id> -> lift a ban
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");
  const ctx = await getAdminContext(req);
  const perm = await canModerateMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  return withDb(async (db) => {
    const bans = await db
      .collection<MapBan>(COLLECTIONS.bans)
      .find({ mapId })
      .sort({ createdAt: -1 })
      .toArray();
    return json({ bans });
  });
}

export async function POST(req: Request) {
  const body = (await req.json()) as { mapId?: string; userId?: string; reason?: string };
  if (!body.mapId || !body.userId) return error("Missing mapId or userId");
  const mapId = body.mapId;
  const userId = body.userId;
  const reason = String(body.reason ?? "").trim().slice(0, 300) || "No reason given";

  const ctx = await getAdminContext(req);
  if (!ctx.userId) return error("You must be signed in.", 401);
  const actorId = ctx.userId;
  const perm = await canModerateMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  return withDb(async (db) => {
    const col = db.collection<MapBan>(COLLECTIONS.bans);
    const exists = await col.findOne({ mapId, userId });
    if (exists) return error("User is already banned on this map.");
    await col.insertOne({
      mapId,
      userId,
      reason,
      bannedBy: actorId,
      createdAt: new Date().toISOString(),
    });
    await logActivity({
      mapId,
      actorId,
      action: "ban.add",
      targetType: "map",
      targetName: userId,
      detail: reason,
    });
    return json({ ok: true });
  });
}

export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  const userId = searchParams.get("userId");
  if (!mapId || !userId) return error("Missing mapId or userId");
  const ctx = await getAdminContext(req);
  if (!ctx.userId) return error("You must be signed in.", 401);
  const actorId = ctx.userId;
  const perm = await canModerateMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  return withDb(async (db) => {
    const res = await db.collection<MapBan>(COLLECTIONS.bans).deleteOne({ mapId, userId });
    if (res.deletedCount > 0) {
      await logActivity({
        mapId,
        actorId,
        action: "ban.remove",
        targetType: "map",
        targetName: userId,
      });
    }
    return json({ ok: true });
  });
}
