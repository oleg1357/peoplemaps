import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter } from "@/lib/api";
import { getAdminContext, canOnMap } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import type { Zone, ModerationStatus } from "@/lib/types";

// Admin-only routes for zone management. Access mirrors spots: the map owner,
// global admins, and team members with the matching capability.
//   GET (list)                 -> "read"   (viewers + up)
//   PATCH moderation/hidden    -> "approve" / "moderate"
//   PATCH edit fields          -> "moderate"
//   DELETE                     -> "moderate"

// GET /api/admin/zones?mapId=<mapId>  -> all zones (incl. pending/hidden)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  const ctx = await getAdminContext(req);
  const perm = await canOnMap(ctx, mapId, "read");
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  return withDb(async (db) => {
    const col = db.collection<Zone>(COLLECTIONS.zones);
    const zones = await col.find({ mapId }).sort({ createdAt: -1 }).toArray();
    const pending = zones.filter((z) => z.moderation === "pending").length;
    const hidden = zones.filter((z) => z.hidden === true).length;
    return json({ zones, pending, hidden, total: zones.length });
  });
}

// PATCH /api/admin/zones  -> moderate (approve/reject), hide/restore, or edit
export async function PATCH(req: Request) {
  const { zoneId, moderation, hidden, name, description } = (await req.json()) as {
    zoneId?: string;
    moderation?: ModerationStatus | null;
    hidden?: boolean;
    name?: string;
    description?: string | null;
  };
  if (!zoneId) return error("Missing zoneId");

  const ctx = await getAdminContext(req);

  return withDb(async (db) => {
    const oid = toObjectId(zoneId);
    if (!oid) return error("Invalid zone id");

    const col = db.collection<Zone>(COLLECTIONS.zones);
    const existing = await col.findOne(byIdFilter<Zone>(oid), { projection: { mapId: 1, name: 1 } });
    if (!existing) return error("Zone not found", 404);

    const need: "approve" | "moderate" =
      moderation !== undefined && hidden === undefined && name === undefined && description === undefined
        ? "approve"
        : "moderate";
    const perm = await canOnMap(ctx, existing.mapId, need);
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
      if (!trimmed || trimmed.length > 60) return error("Zone name must be 1-60 characters.");
      set.name = trimmed;
    }
    if (description !== undefined) {
      set.description = description === null ? null : String(description).slice(0, 300);
    }

    if (Object.keys(set).length === 0) return error("Nothing to update");

    const action = moderation === "approved"
      ? "zone.approve"
      : moderation === "rejected"
        ? "zone.reject"
        : moderation !== undefined
          ? "zone.pending"
          : hidden !== undefined
            ? (hidden ? "zone.hide" : "zone.restore")
            : "zone.edit";
    await logActivity({
      mapId: existing.mapId,
      actorId: ctx.userId,
      action,
      targetType: "zone",
      targetId: zoneId,
      targetName: existing.name,
      detail: JSON.stringify({ moderation, hidden }),
    });

    await col.updateOne(byIdFilter<Zone>(oid), { $set: set });
    return json({ ok: true });
  });
}

// DELETE /api/admin/zones?zoneId=<zoneId>  -> destroy a zone
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const zoneId = searchParams.get("zoneId");
  if (!zoneId) return error("Missing zoneId");

  const ctx = await getAdminContext(req);

  return withDb(async (db) => {
    const oid = toObjectId(zoneId);
    if (!oid) return error("Invalid zone id");

    const col = db.collection<Zone>(COLLECTIONS.zones);
    const existing = await col.findOne(byIdFilter<Zone>(oid), { projection: { mapId: 1, name: 1 } });
    if (!existing) return error("Zone not found", 404);

    const perm = await canOnMap(ctx, existing.mapId, "moderate");
    if (!perm.ok) return error(perm.reason || "Forbidden", 403);

    await col.deleteOne(byIdFilter<Zone>(oid));
    await logActivity({
      mapId: existing.mapId,
      actorId: ctx.userId,
      action: "zone.destroy",
      targetType: "zone",
      targetId: zoneId,
      targetName: existing.name,
    });
    return NextResponse.json({ ok: true });
  });
}
