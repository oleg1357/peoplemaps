import { COLLECTIONS } from "@/lib/mongodb";
import { withDb, json, error, toObjectId, byIdFilter } from "@/lib/api";
import { getAdminContext, canOnMap } from "@/lib/admin";
import { logActivity } from "@/lib/activity";
import type { SpotReport } from "@/lib/types";

// GET /api/admin/reports?mapId=<mapId>[&status=open|resolved] -> reports for a map
// PATCH /api/admin/reports { reportId, action: "resolve" } -> resolve a report
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");
  const rawStatus = searchParams.get("status") || "open";
  const status: "open" | "resolved" = rawStatus === "resolved" ? "resolved" : "open";
  const ctx = await getAdminContext(req);
  const perm = await canOnMap(ctx, mapId, "read");
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  return withDb(async (db) => {
    const reports = await db
      .collection<SpotReport>(COLLECTIONS.reports)
      .find({ mapId, status })
      .sort({ createdAt: -1 })
      .limit(200)
      .toArray();
    return json({ reports });
  });
}

export async function PATCH(req: Request) {
  const body = (await req.json()) as { reportId?: string; action?: string };
  if (!body.reportId) return error("Missing reportId");
  if (body.action !== "resolve") return error("Unsupported action");
  const reportId = body.reportId;

  return withDb(async (db) => {
    const oid = toObjectId(reportId);
    if (!oid) return error("Invalid report id");
    const col = db.collection<SpotReport>(COLLECTIONS.reports);
    const report = await col.findOne(byIdFilter<SpotReport>(oid));
    if (!report) return error("Report not found", 404);
    const ctx = await getAdminContext(req);
    if (!ctx.userId) return error("You must be signed in.", 401);
    const perm = await canOnMap(ctx, report.mapId, "staff");
    if (!perm.ok) return error(perm.reason || "Forbidden", 403);

    await col.updateOne(
      byIdFilter<SpotReport>(oid),
      { $set: { status: "resolved", resolvedAt: new Date().toISOString() } }
    );
    await logActivity({
      mapId: report.mapId,
      actorId: ctx.userId,
      action: "report.resolve",
      targetType: "spot",
      targetId: report.spotId,
      targetName: report.spotName,
    });
    return json({ ok: true });
  });
}
