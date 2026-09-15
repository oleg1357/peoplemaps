import { NextResponse } from "next/server";
import { COLLECTIONS } from "@/lib/mongodb";
import { json, withDb, error, rateLimitByIp } from "@/lib/api";
import { getAdminContext, canManageMap, getMapModerators } from "@/lib/admin";
import { getAdminSupabase, getServerSupabase } from "@/lib/supabase-server";
import {
  MAP_ROLE_TYPES,
  sanitizeCapabilities,
  type MapCapability,
  type MapRoleType,
} from "@/lib/roles";
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
  const lim = await rateLimitByIp(req, 10, 60_000, "roles");
  if (!lim.ok) return error("Too many requests. Try again shortly.", 429);
  const body = (await req.json().catch(() => ({}))) as {
    mapId?: string;
    email?: string;
    role?: string;
    capabilities?: string[];
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
  // Fully granular grants: an explicit capability list overrides the preset.
  const capabilities = sanitizeCapabilities(body.capabilities);

  const ctx = await getAdminContext(req);
  const perm = await canManageMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  return withDb(async (db) => {
    const col = db.collection<MapRole>(COLLECTIONS.mapRoles);

    // Resolve the Supabase user (and their display name) via the admin API.
    // GoTrue has no "look up by email" call, so we page through the directory
    // (bounded) with the service-role client; the result is cached on the
    // member row so this only happens once per add.
    let userId = email;
    let displayName = email;
    const adminSb = await getAdminSupabase();
    if (adminSb) {
      let match: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | undefined;
      for (let page = 1; page <= 10 && !match; page++) {
        const { data, error: listErr } = await adminSb.auth.admin.listUsers({ page, perPage: 1000 });
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
    } else {
      // No service-role key configured: keep the previous behavior and store
      // the raw email as the identity so owners can still assign by email.
      const sb = await getServerSupabase();
      if (sb) {
        const { data: page } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
        const match = page?.users.find(
          (u: { id: string; email?: string | null }) =>
            u.email?.trim().toLowerCase() === email
        );
        if (match) {
          userId = match.id;
          displayName = match.email || email;
        }
      }
    }

    // Don't de-dup existing rows — reject duplicates.
    if (await col.findOne({ mapId, userId })) {
      return error("That user is already on this map's team.", 409);
    }

    const member: MapRole = {
      mapId,
      userId,
      role,
      ...(capabilities && capabilities.length ? { capabilities } : {}),
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

// PATCH /api/admin/maps/roles -> update a member's role preset and/or their
// explicit granular capability grants (owner only).
export async function PATCH(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    mapId?: string;
    userId?: string;
    role?: string;
    capabilities?: string[];
  };
  if (!body.mapId || !body.userId) return error("Missing mapId or userId");
  const mapId = body.mapId;
  const userId = body.userId;

  const ctx = await getAdminContext(req);
  const perm = await canManageMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  return withDb(async (db) => {
    const col = db.collection<MapRole>(COLLECTIONS.mapRoles);
    const existing = await col.findOne({ mapId, userId });
    if (!existing) {
      return error("That user is not on this map's team.", 404);
    }

    const patch: { role?: MapRoleType; capabilities?: MapCapability[] | null } = {};
    if (body.role !== undefined) {
      if (!(MAP_ROLE_TYPES as readonly string[]).includes(body.role)) {
        return error("Invalid role.", 400);
      }
      patch.role = body.role as MapRoleType;
    }
    if (body.capabilities !== undefined) {
      const caps = sanitizeCapabilities(body.capabilities);
      // An explicit empty list means "no grants" — respect it, but drop the
      // field when the input wasn't an array at all.
      if (caps === null) return error("Invalid capabilities list.", 400);
      patch.capabilities = caps.length ? caps : null;
    }
    if (Object.keys(patch).length === 0) {
      return error("Nothing to update.", 400);
    }

    await col.updateOne({ mapId, userId }, { $set: patch });
    const members = await getMapModerators(mapId);
    return json({ ok: true, members });
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