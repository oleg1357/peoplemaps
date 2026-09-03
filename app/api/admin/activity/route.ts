import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error } from "@/lib/api";
import { getAdminContext, canModerateMap } from "@/lib/admin";
import type { ActivityEntry } from "@/lib/activity";
import type { Filter } from "mongodb";

const MAX = 200;

// GET /api/admin/activity?mapId=<mapId>[&limit=<n>][&action=<a>][&actorId=<id>][&dateFrom=<iso>][&dateTo=<iso>]
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  const ctx = await getAdminContext(req);
  const perm = await canModerateMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  const rawLimit = Number(searchParams.get("limit"));
  const limit = Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), MAX) : 100;

  const filter: Filter<ActivityEntry> = { mapId };
  const action = searchParams.get("action");
  if (action) filter.action = action;
  const actorId = searchParams.get("actorId");
  if (actorId) filter.actorId = actorId;
  // createdAt is stored as an ISO string, so filter with ISO strings (they
  // sort lexicographically in the same order as timestamps).
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const from = dateFrom ? Date.parse(dateFrom) : NaN;
  const to = dateTo ? Date.parse(dateTo) : NaN;
  if (Number.isFinite(from)) filter.createdAt = { $gte: new Date(from).toISOString() };
  if (Number.isFinite(to)) {
    // Extend a bare day to the end of that day.
    const end = new Date(to + 86399999);
    filter.createdAt = { ...(filter.createdAt as object), $lte: end.toISOString() };
  }

  return withDb(async (db) => {
    const entries = await db
      .collection<ActivityEntry>(COLLECTIONS.activityLog)
      .find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    return json({ entries });
  });
}
