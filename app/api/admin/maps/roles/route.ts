import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { json, withDb, error } from "@/lib/api";
import { getAdminContext, canManageMap, getMapModerators } from "@/lib/admin";
import { getServerSupabase } from "@/lib/supabase-server";
import type { MapRole } from "@/lib/types";

// GET /api/admin/maps/roles?mapId=<mapId> -> moderators for a map (owner only)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  const ctx = await getAdminContext(req);
  const perm = await canManageMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  const moderators = await getMapModerators(mapId);
  return json({ mapId, moderators });
}

// POST /api/admin/maps/roles -> add a moderator by email (owner only)
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    mapId?: string;
    email?: string;
  };
  if (!body.mapId) return error("Missing mapId");
  const mapId = body.mapId;
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) return error("Missing moderator email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return error("Invalid email address.");
  }

  const ctx = await getAdminContext(req);
  const perm = await canManageMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  return withDb(async (db) => {
    const col = db.collection<MapRole>(COLLECTIONS.mapRoles);

    // Resolve the Supabase user (and their display name) from the admin API.
    // Fall back to storing the raw email as the identity when Supabase isn't
    // reachable, so owners can still assign by email.
    let userId = email;
    let displayName = email;
    const sb = await getServerSupabase();
    if (sb) {
      // listUsers caps at 1000 per page; walk pages until we find the address
      // (usually a single page) so it works regardless of directory size.
      let match: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | undefined;
      for (let page = 1; page <= 10 && !match; page++) {
        const { data, error: listErr } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
        if (listErr) {
          return error("Could not look up that user in Supabase. Try again.", 500);
        }
        match = data?.users.find((u) => u.email?.trim().toLowerCase() === email);
        if (!data?.users.length) break;
      }
      if (!match) {
        return error("No account found with that email address.");
      }
      userId = match.id;
      const first = match.user_metadata?.first_name;
      const last = match.user_metadata?.last_name;
      const metaName = match.user_metadata?.name;
      displayName =
        [first, last].filter(Boolean).join(" ").trim() ||
        (typeof metaName === "string" ? metaName : "") ||
        match.email ||
        email;
    }

    // Don't de-dup existing rows — reject duplicates.
    if (await col.findOne({ mapId, userId })) {
      return error("That user is already a moderator of this map.", 409);
    }

    const role: MapRole = {
      mapId,
      userId,
      displayName,
      addedBy: ctx.userId!,
      addedAt: new Date().toISOString(),
    };
    const result = await col.insertOne(role);
    const moderators = await getMapModerators(mapId);
    return json({ ok: true, moderator: { ...role, _id: result.insertedId }, moderators }, { status: 201 });
  });
}

// DELETE /api/admin/maps/roles?mapId=<mapId>&userId=<userId> -> remove a moderator (owner only)
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  const userId = searchParams.get("userId");
  if (!mapId || !userId) return error("Missing mapId or userId");

  const ctx = await getAdminContext(req);
  const perm = await canManageMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  return withDb(async (db) => {
    const col = db.collection<MapRole>(COLLECTIONS.mapRoles);
    const result = await col.deleteOne({ mapId, userId });
    if (result.deletedCount === 0) {
      return error("That user is not a moderator of this map.", 404);
    }
    return NextResponse.json({ ok: true });
  });
}