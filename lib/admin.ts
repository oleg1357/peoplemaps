import { getServerSupabase } from "@/lib/supabase-server";
import { serverClient } from "@/sanity/lib/client";
import { MAP_PROJECTION } from "@/sanity/lib/queries";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import type { MapDocument, MapRole } from "@/lib/types";
import {
  capabilitiesForMember,
  type MapCapability,
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

// The user's effective (fully granular) grants on a map. Owners and admins are
// handled by the callers (they short-circuit before this runs); team members
// get their explicit `capabilities` when present, otherwise the role preset.
// Returns null when the user has no team row (no access).
export async function getEffectiveCapabilities(
  mapId: string,
  userId: string
): Promise<MapCapability[] | null> {
  const role = await getMapRole(mapId, userId);
  if (!role) return null;
  return capabilitiesForMember(role);
}

// Capability check (the core of the IAM model). Owners and global admins have
// every capability; team members are granted whatever their role preset OR
// explicit per-member `capabilities` give them. Callers pass the specific
// capability they need rather than a blanket "moderator" check.
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

  const caps = await getEffectiveCapabilities(mapId, ctx.userId);
  if (caps && caps.includes(capability)) return { ok: true };

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

// Enforce a map's collaboration mode for content contributions (spots, zones,
// routes, photos, reviews, comments).  "anyone" => open; "loggedIn" =>
// signed-in required; "invitedOnly" => owner / global-admin or a team member
// holding the "approve" capability.
export async function canContribute(
  ctx: AdminContext,
  map: MapDocument | null
): Promise<{ ok: boolean; reason?: string }> {
  const mode = map?.collaborationMode ?? "loggedIn";
  if (mode !== "anyone" && !ctx.userId) {
    return { ok: false, reason: "You must be signed in to contribute." };
  }
  if (mode === "invitedOnly") {
    if (!map) return { ok: false, reason: "Map not found." };
    if (!ctx.userId) return { ok: false, reason: "You must be signed in to contribute." };
    if (ctx.isGlobalAdmin || map.ownerId === ctx.userId) return { ok: true };
    const caps = await getEffectiveCapabilities(map._id, ctx.userId);
    if (caps && caps.includes("approve")) return { ok: true };
    return { ok: false, reason: "Only the map owner and moderators can contribute to this map." };
  }
  return { ok: true };
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
