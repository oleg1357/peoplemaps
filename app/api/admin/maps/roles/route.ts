import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { json, withDb, error } from "@/lib/api";
import { getAdminContext, canManageMap, getMapModerators } from "@/lib/admin";
import { getServerSupabase } from "@/lib/supabase-server";
import { MAP_ROLE_TYPES, type MapRoleType } from "@/lib/roles";
import type { MapRole } from "@/lib/types";

// GET /api/admin/maps/roles?mapId=<mapId> -> team members for a map (owner only)
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return error("Missing mapId");

  const ctx = await getAdminContext(req);
  const perm = await canManageMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  const members = await getMapModerators(mapId);
  return json({ mapId, members });
}

// POST /api/admin/maps/roles -> add a team member by email + role (owner only)
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    mapId?: string;
    email?: string;
    role?: string;
  };
  if (!body.mapId) return error("Missing mapId");
  const mapId = body.mapId;
  const email = String(body.email ?? "").trim().toLowerCase();
  if (!email) return error("Missing email");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return error("Invalid email address.");
  }

  const role: MapRoleType =
    body.role && (MAP_ROLE_TYPES as readonly string[]).includes(body.role)
      ? (body.role as MapRoleType)
      : "moderator";

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
      return error("That user is already on this map's team.", 409);
    }

    const member: MapRole = {
      mapId,
      userId,
      role,
      displayName,
      addedBy: ctx.userId!,
      addedAt: new Date().toISOString(),
    };
    const result = await col.insertOne(member);
    const members = await getMapModerators(mapId);
    return json(
      { ok: true, member: { ...member, _id: result.insertedId }, members },
      { status: 201 }
    );
  });
}

// DELETE /api/admin/maps/roles?mapId=<mapId>&userId=<userId> -> remove a team member (owner only)
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
      return error("That user is not on this map's team.", 404);
    }
    return NextResponse.json({ ok: true });
  });
}