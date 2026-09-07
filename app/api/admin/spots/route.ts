import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter } from "@/lib/api";
import { getAdminContext, canOnMap } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import { sanitizeMarkerEmoji, hasValidColor } from "@/lib/markers-data";
import type { Spot, ModerationStatus } from "@/lib/types";

// Admin-only routes for map management. Access is restricted to the map owner,
// configured global admins, and team members with the relevant capability:
//   GET (list)                 -> "read"   (viewers + up)
//   PATCH moderation/hidden    -> "approve" / "moderate"
//   PATCH edit fields          -> "moderate"
//   DELETE                     -> "moderate"

// GET /api/admin/spots?mapId=<mapId>  -> all spots (incl. pending/hidden)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  const ctx = await getAdminContext(req);
  const perm = await canOnMap(ctx, mapId, "read");
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  return withDb(async (db) => {
    const col = db.collection<Spot>(COLLECTIONS.spots);
    const spots = await col.find({ mapId }).sort({ createdAt: -1 }).toArray();
    const pending = spots.filter((s) => s.moderation === "pending").length;
    const hidden = spots.filter((s) => s.hidden === true).length;
    return json({ spots, pending, hidden, total: spots.length });
  });
}

// PATCH /api/admin/spots  -> moderate (approve/reject), hide/restore, or edit
export async function PATCH(req: Request) {
  const { spotId, moderation, hidden, fields } = (await req.json()) as {
    spotId?: string;
    moderation?: ModerationStatus | null;
    hidden?: boolean;
    fields?: Partial<
      Pick<
        Spot,
        | "name"
        | "street"
        | "city"
        | "zip"
        | "lat"
        | "lng"
        | "status"
        | "marker"
        | "markerColor"
        | "priceLevel"
        | "hoursNote"
        | "tags"
        | "tip"
      >
    >;
  };
  if (!spotId) return error("Missing spotId");

  const ctx = await getAdminContext(req);

  return withDb(async (db) => {
    const oid = toObjectId(spotId);
    if (!oid) return error("Invalid spot id");

    const col = db.collection<Spot>(COLLECTIONS.spots);
    const existing = await col.findOne(byIdFilter<Spot>(oid), { projection: { mapId: 1, name: 1 } });
    if (!existing) return error("Spot not found", 404);

    // Approving/rejecting needs the "approve" capability; hiding and editing
    // need "moderate". When both are present, the stricter one wins.
    const need: "approve" | "moderate" =
      moderation !== undefined && hidden === undefined && !fields
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
    if (hidden !== undefined) {
      set.hidden = hidden;
    }
    if (fields) {
      if (fields.name !== undefined) set.name = String(fields.name);
      if (fields.street !== undefined) set.street = String(fields.street);
      if (fields.city !== undefined) set.city = String(fields.city);
      if (fields.zip !== undefined) set.zip = Number(fields.zip);
      if (fields.lat !== undefined) set.lat = Number(fields.lat);
      if (fields.lng !== undefined) set.lng = Number(fields.lng);
      if (fields.status !== undefined) set.status = fields.status;
      if (fields.marker !== undefined) {
        const marker = sanitizeMarkerEmoji(String(fields.marker ?? ""));
        if (fields.marker !== null && !marker) {
          return error("Unknown marker.");
        }
        set.marker = marker;
      }
      if (fields.markerColor !== undefined) {
        if (
          fields.markerColor !== null &&
          !hasValidColor(String(fields.markerColor))
        ) {
          return error("Invalid marker color.");
        }
        set.markerColor = fields.markerColor;
      }
      if (fields.priceLevel !== undefined) {
        set.priceLevel = [0, 1, 2, 3].includes(Number(fields.priceLevel))
          ? Number(fields.priceLevel)
          : null;
      }
      if (fields.hoursNote !== undefined) {
        set.hoursNote = String(fields.hoursNote ?? "").slice(0, 120) || null;
      }
      if (fields.tags !== undefined) {
        set.tags = Array.isArray(fields.tags)
          ? (fields.tags as unknown[])
              .map((t) => String(t).trim().slice(0, 24))
              .filter(Boolean)
              .slice(0, 8)
          : [];
      }
      if (fields.tip !== undefined) {
        set.tip = String(fields.tip ?? "").slice(0, 280) || null;
      }
    }

    if (Object.keys(set).length === 0) return error("Nothing to update");

    await col.updateOne(byIdFilter<Spot>(oid), { $set: set });

    const action = moderation === "approved"
      ? "spot.approve"
      : moderation === "rejected"
        ? "spot.reject"
        : moderation !== undefined
          ? "spot.pending"
          : hidden !== undefined
            ? (hidden ? "spot.hide" : "spot.restore")
            : fields
              ? "spot.edit"
              : "spot.update";
    await logActivity({
      mapId: existing.mapId,
      actorId: ctx.userId,
      action,
      targetType: "spot",
      targetId: spotId,
      targetName: existing.name,
      detail: JSON.stringify({ moderation, hidden }),
    });

    return json({ ok: true });
  });
}

// DELETE /api/admin/spots?spotId=<spotId>  -> destroy a spot + its data
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const spotId = searchParams.get("spotId");
  if (!spotId) return error("Missing spotId");

  const ctx = await getAdminContext(req);

  return withDb(async (db) => {
    const oid = toObjectId(spotId);
    if (!oid) return error("Invalid spot id");

    const col = db.collection<Spot>(COLLECTIONS.spots);
    const existing = await col.findOne(byIdFilter<Spot>(oid), { projection: { mapId: 1, name: 1 } });
    if (!existing) return error("Spot not found", 404);

    const perm = await canOnMap(ctx, existing.mapId, "moderate");
    if (!perm.ok) return error(perm.reason || "Forbidden", 403);

await col.deleteOne(byIdFilter<Spot>(oid));
    await db.collection(COLLECTIONS.reviews).deleteMany({ spotId });
    await db.collection(COLLECTIONS.photos).deleteMany({ spotId });
    await db.collection(COLLECTIONS.comments).deleteMany({ spotId });
    await db.collection(COLLECTIONS.votes).deleteMany({ spotId });
    await logActivity({
      mapId: existing.mapId,
      actorId: ctx.userId,
      action: "spot.destroy",
      targetType: "spot",
      targetId: spotId,
      targetName: existing.name,
    });
    return NextResponse.json({ ok: true });
  });
}
