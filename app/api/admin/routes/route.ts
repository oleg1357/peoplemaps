import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter } from "@/lib/api";
import { getAdminContext, canModerateMap } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import type { Route, ModerationStatus } from "@/lib/types";

// Admin-only routes for route management. Access mirrors spots: the map owner,
// configured global admins, and designated moderators may review/edit/destroy
// routes on the map.

// GET /api/admin/routes?mapId=<mapId>  -> all routes (incl. pending/hidden)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  const ctx = await getAdminContext(req);
  const perm = await canModerateMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  return withDb(async (db) => {
    const col = db.collection<Route>(COLLECTIONS.routes);
    const routes = await col.find({ mapId }).sort({ createdAt: -1 }).toArray();
    const pending = routes.filter((r) => r.moderation === "pending").length;
    const hidden = routes.filter((r) => r.hidden === true).length;
    return json({ routes, pending, hidden, total: routes.length });
  });
}

// PATCH /api/admin/routes  -> moderate (approve/reject), hide/restore, or edit
export async function PATCH(req: Request) {
  const { routeId, moderation, hidden, name, description } = (await req.json()) as {
    routeId?: string;
    moderation?: ModerationStatus | null;
    hidden?: boolean;
    name?: string;
    description?: string | null;
  };
  if (!routeId) return error("Missing routeId");

  const ctx = await getAdminContext(req);

  return withDb(async (db) => {
    const oid = toObjectId(routeId);
    if (!oid) return error("Invalid route id");

    const col = db.collection<Route>(COLLECTIONS.routes);
    const existing = await col.findOne(byIdFilter<Route>(oid), { projection: { mapId: 1, name: 1 } });
    if (!existing) return error("Route not found", 404);

    const perm = await canModerateMap(ctx, existing.mapId);
    if (!perm.ok) return error(perm.reason || "Forbidden", 403);

    const set: Record<string, unknown> = {};
    if (moderation !== undefined) {
      if (moderation === "approved") {
        set.moderation = "approved";
        set.reviewedBy = ctx.userId;
        set.reviewedAt = new Date().toISOString();
        set.hidden = false;
      } else if (moderation === "rejected") {
        set.moderation = "rejected";
        set.reviewedBy = ctx.userId;
        set.reviewedAt = new Date().toISOString();
      } else {
        set.moderation = "pending";
      }
    }
    if (hidden !== undefined) set.hidden = hidden;
    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed || trimmed.length > 100) return error("Route name must be 1-100 characters.");
      set.name = trimmed;
    }
    if (description !== undefined) {
      set.description = description === null ? null : String(description).slice(0, 300);
    }

    if (Object.keys(set).length === 0) return error("Nothing to update");

    const action = moderation === "approved"
      ? "route.approve"
      : moderation === "rejected"
        ? "route.reject"
        : moderation !== undefined
          ? "route.pending"
          : hidden !== undefined
            ? (hidden ? "route.hide" : "route.restore")
            : "route.edit";
    await logActivity({
      mapId: existing.mapId,
      actorId: ctx.userId,
      action,
      targetType: "route",
      targetId: routeId,
      targetName: existing.name,
      detail: JSON.stringify({ moderation, hidden }),
    });

    await col.updateOne(byIdFilter<Route>(oid), { $set: set });
    return json({ ok: true });
  });
}

// DELETE /api/admin/routes?routeId=<routeId>  -> destroy a route
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const routeId = searchParams.get("routeId");
  if (!routeId) return error("Missing routeId");

  const ctx = await getAdminContext(req);

  return withDb(async (db) => {
    const oid = toObjectId(routeId);
    if (!oid) return error("Invalid route id");

    const col = db.collection<Route>(COLLECTIONS.routes);
    const existing = await col.findOne(byIdFilter<Route>(oid), { projection: { mapId: 1, name: 1 } });
    if (!existing) return error("Route not found", 404);

    const perm = await canModerateMap(ctx, existing.mapId);
    if (!perm.ok) return error(perm.reason || "Forbidden", 403);

    await col.deleteOne(byIdFilter<Route>(oid));
    await logActivity({
      mapId: existing.mapId,
      actorId: ctx.userId,
      action: "route.destroy",
      targetType: "route",
      targetId: routeId,
      targetName: existing.name,
    });
    return NextResponse.json({ ok: true });
  });
}
