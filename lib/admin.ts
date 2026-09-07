import { getServerSupabase } from "@/lib/supabase-server";
import { serverClient } from "@/sanity/lib/client";
import { MAP_PROJECTION } from "@/sanity/lib/queries";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import type { MapDocument, MapRole } from "@/lib/types";
import {
  roleHasCapability,
  type MapCapability,
  type MapRoleType,
} from "@/lib/roles";

// Comma-separated Supabase user ids with global super-admin rights, e.g.
// ADMIN_USER_IDS="uuid-1,uuid-2". These users can manage every map's spots.
const adminIds = (process.env.ADMIN_USER_IDS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

export function isGlobalAdmin(userId: string | null | undefined): boolean {
  return Boolean(userId && adminIds.includes(userId));
}

export interface AdminContext {
  userId: string | null;
  isGlobalAdmin: boolean;
}

export async function getAdminContext(req: Request): Promise<AdminContext> {
  const sb = await getServerSupabase();
  const authHeader = req.headers.get("authorization");
  const bearer = authHeader?.replace(/^Bearer\s+/i, "") || null;
  const jwt = bearer ?? null;

  if (sb) {
    const {
      data: { user },
    } = jwt ? await sb.auth.getUser(jwt) : await sb.auth.getUser();
    const userId = user?.id ?? null;
    return { userId, isGlobalAdmin: isGlobalAdmin(userId) };
  }

  // No Supabase configured: fall back to the legacy bearer-as-user behavior.
  return { userId: bearer, isGlobalAdmin: isGlobalAdmin(bearer) };
}

// Fetches all public maps, newest first. Used by the public map client (via the
// /api/maps route) and the homepage.
export async function getAllPublicMaps(): Promise<MapDocument[]> {
  if (!serverClient) return [];
  try {
    const docs = await serverClient.fetch<MapDocument[]>(
      `*[_type == "map" && isPublic == "public"] | order(_createdAt desc)${MAP_PROJECTION}`
    );
    return docs ?? [];
  } catch {
    return [];
  }
}

// Fetches all maps owned by a user (any visibility). Used by the admin panel's
// map list via the /api/maps route.
export async function getMapsByOwner(ownerId: string): Promise<MapDocument[]> {
  if (!serverClient) return [];
  try {
    const docs = await serverClient.fetch<MapDocument[]>(
      `*[_type == "map" && ownerId == $ownerId] | order(_createdAt desc)${MAP_PROJECTION}`,
      { ownerId }
    );
    return docs ?? [];
  } catch {
    return [];
  }
}

// Fetches a map document from Sanity. Returns null if the map doesn't exist.
export async function getMap(mapId: string): Promise<MapDocument | null> {
  if (!serverClient) return null;
  try {
    const doc = await serverClient.fetch<MapDocument>(
      `*[_id == $id][0]${MAP_PROJECTION}`,
      { id: mapId }
    );
    return doc ?? null;
  } catch {
    return null;
  }
}

// Fetches a map document by its permalink slug. Returns null if unknown.
// Slugs are not globally unique in Sanity, so newest first is a sane tiebreak.
export async function getMapBySlug(slug: string): Promise<MapDocument | null> {
  if (!serverClient) return null;
  try {
    const doc = await serverClient.fetch<MapDocument>(
      `*[_type == "map" && slug.current == $slug] | order(_createdAt desc)[0]${MAP_PROJECTION}`,
      { slug }
    );
    return doc ?? null;
  } catch {
    return null;
  }
}

// Returns the team-role document for a user on a map, or null.
export async function getMapRole(
  mapId: string,
  userId: string
): Promise<MapRole | null> {
  try {
    const db = await getDb();
    if (!db) return null;
    return await db
      .collection<MapRole>(COLLECTIONS.mapRoles)
      .findOne({ mapId, userId });
  } catch {
    return null;
  }
}

// The user's role on a map, or null when they have no team role. Legacy rows
// (created before roles existed) default to "moderator".
export async function getMapRoleType(
  mapId: string,
  userId: string
): Promise<MapRoleType | null> {
  const role = await getMapRole(mapId, userId);
  if (!role) return null;
  return role.role ?? "moderator";
}

// True when the user has a team role in the given set on the map. Used by the
// public submission paths ("invitedOnly" collaboration, auto-approval).
export async function hasMapRole(
  mapId: string,
  userId: string,
  roles: MapRoleType[]
): Promise<boolean> {
  const type = await getMapRoleType(mapId, userId);
  return Boolean(type && roles.includes(type));
}

// Capability check (the core of the IAM model). Owners and global admins have
// every capability; team members get whatever their role grants. Callers pass
// the specific capability they need rather than a blanket "moderator" check.
export async function canOnMap(
  ctx: AdminContext,
  mapId: string,
  capability: MapCapability
): Promise<{ ok: boolean; reason?: string }> {
  if (!ctx.userId) {
    return { ok: false, reason: "You must be signed in." };
  }
  if (ctx.isGlobalAdmin) return { ok: true };

  const map = await getMap(mapId);
  if (!map) {
    return { ok: false, reason: "Map not found." };
  }
  if (map.ownerId === ctx.userId) return { ok: true };

  if (capability === "manage") {
    return { ok: false, reason: "Only the map owner can do that." };
  }

  const role = await getMapRoleType(mapId, ctx.userId);
  if (role && roleHasCapability(role, capability)) return { ok: true };

  return { ok: false, reason: "You don't have permission to do that on this map." };
}

// True when the requesting user is allowed to perform full content moderation
// (edit/hide/destroy) on the given map: owners, global admins and moderators.
// Reviewers (approve/reject only) and viewers (read-only) do not pass.
export async function canModerateMap(
  ctx: AdminContext,
  mapId: string
): Promise<{ ok: boolean; reason?: string }> {
  return canOnMap(ctx, mapId, "moderate");
}

// True only for the map's owner or a global admin — the "manage" level that can
// change map settings, add/remove moderators and delete the map itself.
export async function canManageMap(
  ctx: AdminContext,
  mapId: string
): Promise<{ ok: boolean; reason?: string }> {
  if (!ctx.userId) {
    return { ok: false, reason: "You must be signed in to manage this map." };
  }
  if (ctx.isGlobalAdmin) return { ok: true };

  const map = await getMap(mapId);
  if (!map) {
    return { ok: false, reason: "Map not found." };
  }
  if (map.ownerId === ctx.userId) return { ok: true };

  return { ok: false, reason: "Only the map owner can do that." };
}

// Whether the given user has the "moderator" team role for the given map.
// (Legacy role rows without an explicit role field count as moderators.)
export async function isMapModerator(
  mapId: string,
  userId: string
): Promise<boolean> {
  const role = await getMapRole(mapId, userId);
  return Boolean(role && (role.role ?? "moderator") === "moderator");
}

// Team-role entries for a map (used by owners to manage their team).
export async function getMapModerators(mapId: string): Promise<MapRole[]> {
  try {
    const db = await getDb();
    if (!db) return [];
    return db
      .collection<MapRole>(COLLECTIONS.mapRoles)
      .find({ mapId })
      .sort({ addedAt: 1 })
      .toArray();
  } catch {
    return [];
  }
}
