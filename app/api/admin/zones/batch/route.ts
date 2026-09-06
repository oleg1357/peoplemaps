import { json, error, withDb, toObjectId } from "@/lib/api";
import { getAdminContext, canModerateMap } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { COLLECTIONS } from "@/lib/mongodb";
import type { Zone } from "@/lib/types";
import type { Filter, ObjectId } from "mongodb";

const MAX_IDS = 500;

// POST /api/admin/zones/batch -> moderate many zones in one request.
// Body: { mapId, ids: string[], action: "approve" | "reject" | "hide" | "restore" }
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as {
    mapId?: string;
    ids?: unknown;
    action?: unknown;
  } | null;
  if (!body?.mapId) return error("Missing mapId");
  const mapId = body.mapId as string;
  if (!Array.isArray(body.ids) || body.ids.length === 0) {
    return error("Missing zone ids");
  }
  const action = body.action;
  if (action !== "approve" && action !== "reject" && action !== "hide" && action !== "restore") {
    return error("Action must be approve, reject, hide or restore.");
  }

  const ctx = await getAdminContext(req);
  const perm = await canModerateMap(ctx, body.mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  const oids: ObjectId[] = [];
  for (const id of body.ids.slice(0, MAX_IDS)) {
    const oid = toObjectId(String(id));
    if (oid) oids.push(oid);
  }
  if (oids.length === 0) return error("No valid zone ids");

  return withDb(async (db) => {
    const col = db.collection<Zone>(COLLECTIONS.zones);
    const set: Record<string, unknown> = {};
    if (action === "approve") {
      set.moderation = "approved";
      set.reviewedBy = ctx.userId;
      set.reviewedAt = new Date().toISOString();
      set.hidden = false;
    } else if (action === "reject") {
      set.moderation = "rejected";
      set.reviewedBy = ctx.userId;
      set.reviewedAt = new Date().toISOString();
    } else if (action === "hide") {
      set.hidden = true;
    } else {
      set.hidden = false;
    }

    const result = await col.updateMany(
      { mapId, _id: { $in: oids } } as unknown as Filter<Zone>,
      { $set: set }
    );

    await logActivity({
      mapId,
      actorId: ctx.userId,
      action: `zone.batch_${action}`,
      targetType: "zone",
      detail: `${result.modifiedCount} zones ${action}`,
    });

    return json({ ok: true, matched: result.matchedCount, modified: result.modifiedCount });
  });
}