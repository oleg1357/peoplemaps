import { getServerSupabase } from "@/lib/supabase-server";
import { serverClient } from "@/sanity/lib/client";
import { MAP_PROJECTION } from "@/sanity/lib/queries";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import type { MapDocument, MapRole } from "@/lib/types";

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

// True when the requesting user is allowed to moderate the given map. This is
// the "moderator-level" permission: map owners, global admins and any user
// designated as a moderator of this map may review/edit/destroy spots.
export async function canModerateMap(
  ctx: AdminContext,
  mapId: string
): Promise<{ ok: boolean; reason?: string }> {
  if (!ctx.userId) {
    return { ok: false, reason: "You must be signed in to manage spots." };
  }
  if (ctx.isGlobalAdmin) return { ok: true };

  const map = await getMap(mapId);
  if (!map) {
    return { ok: false, reason: "Map not found." };
  }

  if (map.ownerId === ctx.userId) return { ok: true };

  // Fall back to a designated moderator role (stored in Mongo).
  const isModerator = await isMapModerator(mapId, ctx.userId);
  if (isModerator) return { ok: true };

  return { ok: false, reason: "You don't have permission to manage this map." };
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

// Whether the given user has a moderator role for the given map.
export async function isMapModerator(
  mapId: string,
  userId: string
): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return false;
    const role = await db
      .collection<MapRole>(COLLECTIONS.mapRoles)
      .findOne({ mapId, userId });
    return Boolean(role);
  } catch {
    return false;
  }
}

// Moderator entries for a map (used by owners to manage their team).
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
