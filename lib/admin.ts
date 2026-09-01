import { getServerSupabase } from "@/lib/supabase-server";
import { serverClient } from "@/sanity/lib/client";
import type { MapDocument } from "@/lib/types";

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

// Fetches a map document from Sanity. Returns null if the map doesn't exist.
export async function getMap(mapId: string): Promise<MapDocument | null> {
  if (!serverClient) return null;
  try {
    const doc = await serverClient.fetch<MapDocument>(
      `*[_id == $id][0]{ _id, title, ownerId, ownerName, isPublic }`,
      { id: mapId }
    );
    return doc ?? null;
  } catch {
    return null;
  }
}

// True when the requesting user is allowed to moderate the given map.
export async function canModerateMap(
  ctx: AdminContext,
  mapId: string
): Promise<{ ok: boolean; reason?: string }> {
  if (ctx.isGlobalAdmin) return { ok: true };

  if (!ctx.userId) {
    return { ok: false, reason: "You must be signed in to manage spots." };
  }

  const map = await getMap(mapId);
  if (!map) {
    return { ok: false, reason: "Map not found." };
  }

  if (!map.ownerId) {
    return { ok: false, reason: "This map has no owner assigned." };
  }

  if (map.ownerId !== ctx.userId) {
    return { ok: false, reason: "You are not the owner of this map." };
  }

  return { ok: true };
}
