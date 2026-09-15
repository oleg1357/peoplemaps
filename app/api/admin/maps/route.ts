import { getDb, COLLECTIONS } from "@/lib/mongodb";
import { withDb, json } from "@/lib/api";
import { NextResponse } from "next/server";
import { getAdminContext, canManageMap, getMap } from "@/lib/admin";
import {
  countOwnedPublicMaps,
  FREE_PUBLIC_MAP_LIMIT,
  getUserProfile,
  isPaidProfile,
} from "@/lib/billing";
import { MAP_PROJECTION } from "@/sanity/lib/queries";
import { serverClient, writeClient } from "@/sanity/lib/client";
import { getServerSupabase } from "@/lib/supabase-server";
import {
  DEFAULT_ACCENT,
  DEFAULT_MARKER,
  hasValidColor,
  sanitizeMarkerEmoji,
} from "@/lib/markers-data";
import type { MapDocument } from "@/lib/types";
import {
  ALL_CAPABILITIES,
  capabilitiesForMember,
  type MapCapability,
  type MapRoleType,
} from "@/lib/roles";

// GET /api/admin/maps  -> maps the caller may moderate.
// Map owners see their own maps; global admins see every map (with spot counts).
export async function GET(req: Request) {
  const ctx = await getAdminContext(req);
  if (!ctx.userId) {
    return json({ maps: [], owned: [], isAdmin: false });
  }

  const isAdmin = ctx.isGlobalAdmin;

  let maps: MapDocument[] = [];
  if (!serverClient) {
    return json({ maps: [], owned: [], isAdmin });
  }

  try {
    maps = await serverClient.fetch<MapDocument[]>(
      `*[_type == "map"] | order(_createdAt desc)${MAP_PROJECTION}`
    );
  } catch {
    maps = [];
  }

  // Team members (viewer/reviewer/moderator) also get an admin view of maps they
  // don't own. Owners take precedence, so their own maps stay "owner" even if a
  // stale role row exists. Full role rows are kept so each map entry can carry
  // the caller's effective (fully granular) capability grants.
  const roleDocById = new Map<string, import("@/lib/types").MapRole>();
  if (!isAdmin && ctx.userId) {
    try {
      const db = await getDb();
      if (db) {
        const roleCol = db.collection<import("@/lib/types").MapRole>(COLLECTIONS.mapRoles);
        const roles = await roleCol
          .find({ userId: ctx.userId })
          .toArray();
        for (const r of roles) {
          roleDocById.set(r.mapId, r);
        }
      }
    } catch {
      roleDocById.clear();
    }
  }

  const viewable = isAdmin
    ? maps
    : [
        ...maps.filter((m) => m.ownerId === ctx.userId),
        ...maps.filter(
          (m) => roleDocById.has(m._id) && m.ownerId !== ctx.userId
        ),
      ];

  // Attach moderate-able maps + spot moderation counts. When Mongo is
  // unreachable we still return the map list (counts shown as 0) so the admin
  // UI keeps working instead of 500ing.
  let withCounts:
    | (MapDocument & { spotTotal: number; spotPending: number; spotHidden: number })[]
    | null = null;
  try {
    const db = await getDb();
    if (db) {
      const col = db.collection(COLLECTIONS.spots);
      const mapIds = viewable.map((m) => m._id);
      const rows = (
        await col
          .aggregate([
            { $match: { mapId: { $in: mapIds } } },
            {
              $group: {
                _id: "$mapId",
                total: { $sum: 1 },
                pending: { $sum: { $cond: [{ $eq: ["$moderation", "pending"] }, 1, 0] } },
                hidden: { $sum: { $cond: [{ $eq: ["$hidden", true] }, 1, 0] } },
              },
            },
          ])
          .toArray()
      ) as { _id: string; total: number; pending: number; hidden: number }[];
      const countsByMap = new Map(rows.map((r) => [r._id, r]));
      withCounts = viewable.map((m) => {
        const c = countsByMap.get(m._id);
        return {
          ...m,
          spotTotal: c?.total ?? 0,
          spotPending: c?.pending ?? 0,
          spotHidden: c?.hidden ?? 0,
        };
      }) as (MapDocument & { spotTotal: number; spotPending: number; spotHidden: number })[];
    }
  } catch {
    withCounts = null;
  }

  const roleFor = (m: MapDocument): "owner" | MapRoleType =>
    m.ownerId === ctx.userId || ctx.isGlobalAdmin
      ? "owner"
      : roleDocById.get(m._id)?.role ?? "moderator";

  // Effective fully-granular grants for the caller on this map. Owners and
  // global admins have every capability; team members get their exact set.
  const capsFor = (m: MapDocument): MapCapability[] =>
    m.ownerId === ctx.userId || ctx.isGlobalAdmin
      ? [...ALL_CAPABILITIES]
      : (() => {
          const row = roleDocById.get(m._id);
          return row ? capabilitiesForMember(row) : [...ALL_CAPABILITIES];
        })();

  const result = (
    withCounts ??
    viewable.map((m) => ({ ...m, spotTotal: 0, spotPending: 0, spotHidden: 0 }))
  ).map((m) => ({ ...m, role: roleFor(m), caps: capsFor(m) }));

  return json({ maps: result, owned: result, isAdmin });
}

// POST /api/admin/maps -> create a new map owned by the signed-in user.
export async function POST(req: Request) {
  const ctx = await getAdminContext(req);
  if (!ctx.userId) {
    return json({ error: "You must be signed in to create a map." }, { status: 401 });
  }
  if (!writeClient) {
    return json(
      { error: "SANITY_API_WRITE_TOKEN is not configured. Add it to .env.local to enable map creation." },
      { status: 503 }
    );
  }

  const body = await req.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  if (title.length < 2) {
    return json({ error: "Map title must be at least 2 characters." }, { status: 400 });
  }

  // Resolve a display name for the owner from the auth user's metadata.
  let ownerName = ctx.userId.slice(0, 8);
  const sb = await getServerSupabase();
  if (sb) {
    const {
      data: { user },
    } = await sb.auth.getUser();
    const md: Record<string, unknown> = user?.user_metadata || {};
    const first = typeof md.first_name === "string" ? md.first_name : "";
    const last = typeof md.last_name === "string" ? md.last_name : "";
    ownerName = [first, last].filter(Boolean).join(" ").trim() || user?.email || ownerName;
  }

  const isPublic = body.isPublic === "private" ? "private" : "public";

  // Free-tier quota: up to FREE_PUBLIC_MAP_LIMIT public maps; private maps are
  // a Pro feature. Global admins are exempt.
  if (!ctx.isGlobalAdmin && ctx.userId) {
    const [profile, publicCount] = await Promise.all([
      getUserProfile(ctx.userId),
      countOwnedPublicMaps(ctx.userId),
    ]);
    const paid = isPaidProfile(profile);
    if (!paid && isPublic === "private") {
      return json(
        { error: "Private maps are a Pro feature. Upgrade to Pro to make maps private." },
        { status: 403 }
      );
    }
    if (!paid && publicCount >= FREE_PUBLIC_MAP_LIMIT) {
      return json(
        {
          error: `Free accounts can create up to ${FREE_PUBLIC_MAP_LIMIT} public maps. Upgrade to Pro for unlimited maps and private visibility.`,
        },
        { status: 403 }
      );
    }
  }

  // Settings with validated defaults.
  const accentColor = hasValidColor(body.accentColor)
    ? String(body.accentColor)
    : DEFAULT_ACCENT;
  const defaultMarker =
    sanitizeMarkerEmoji(body.defaultMarker) ?? DEFAULT_MARKER.emoji;
  const defaultMarkerColor = hasValidColor(body.defaultMarkerColor)
    ? String(body.defaultMarkerColor)
    : DEFAULT_MARKER.color;
  const maxPhotos =
    Number.isFinite(Number(body.maxPhotosPerSpot))
      ? Math.max(0, Math.min(12, Number(body.maxPhotosPerSpot)))
      : 6;
  const requireApproval = body.requireApproval === false ? false : true;
  const allowReviews = body.allowReviews === false ? false : true;
  const allowComments = body.allowComments === false ? false : true;
  const allowPhotos = body.allowPhotos === false ? false : true;
  const collaborationMode = ["anyone", "loggedIn", "invitedOnly"].includes(
    String(body.collaborationMode)
  )
    ? String(body.collaborationMode)
    : "loggedIn";
  const enableClustering = body.enableClustering === true;

  const category = ["food", "sights", "shopping", "outdoors", "nightlife", "arts", "sports", "other"].includes(
    String(body.category)
  )
    ? String(body.category)
    : "";
  const tags = String(body.tags ?? "").slice(0, 200);

  try {
    const doc = await writeClient.create({
      _type: "map",
      title,
      slug: { _type: "slug", current: slugify(title) },
      description: String(body.description ?? ""),
      ownerId: ctx.userId,
      ownerName,
      isPublic,
      baseCenter: {
        lat: Number(body.lat ?? 55.6761),
        lng: Number(body.lng ?? 12.5683),
      },
      baseZoom: Number(body.baseZoom ?? 12),
      accentColor,
      defaultMarker,
      defaultMarkerColor,
      welcomeMessage: String(body.welcomeMessage ?? ""),
      submissionNote: String(body.submissionNote ?? ""),
      maxPhotosPerSpot: maxPhotos,
      requireApproval,
      contactEmail: String(body.contactEmail ?? ""),
      website: String(body.website ?? ""),
      allowReviews,
      allowComments,
      allowPhotos,
      collaborationMode,
      enableClustering,
      category,
      tags,
    });
    return json(
      { _id: doc._id, title: doc.title, slug: doc.slug?.current ?? null },
      { status: 201 }
    );
  } catch {
    return json(
      { error: "Failed to create map. Please try again." },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/maps -> update settings for a map the user owns.
export async function PATCH(req: Request) {
  const { mapId, ...input } = (await req.json()) as Record<string, unknown>;
  if (!mapId) return json({ error: "Missing mapId" }, { status: 400 });

  const ctx = await getAdminContext(req);
  const perm = await canManageMap(ctx, String(mapId));
  if (!perm.ok) return json({ error: perm.reason || "Forbidden" }, { status: 403 });
  if (!writeClient || !serverClient) {
    return json(
      { error: "Sanity is not configured for the server." },
      { status: 503 }
    );
  }

  const patch: Record<string, unknown> = {};
  if (input.title !== undefined) {
    const title = String(input.title ?? "").trim();
    if (title.length < 2) {
      return json({ error: "Map title must be at least 2 characters." }, { status: 400 });
    }
    patch.title = title;
    patch.slug = { _type: "slug", current: slugify(title) };
  }
  if (input.description !== undefined) patch.description = String(input.description ?? "");
  if (input.isPublic !== undefined && String(input.isPublic) !== "") {
    const nextIsPublic = input.isPublic === "private" ? "private" : "public";
    // Private visibility is a Pro feature (enforced here, not just in the UI).
    if (nextIsPublic === "private" && !ctx.isGlobalAdmin && ctx.userId) {
      const profile = await getUserProfile(ctx.userId);
      if (!isPaidProfile(profile)) {
        return json(
          { error: "Private maps are a Pro feature. Upgrade to Pro to make maps private." },
          { status: 403 }
        );
      }
    }
    patch.isPublic = nextIsPublic;
  }
  if (input.accentColor !== undefined) {
    if (!hasValidColor(String(input.accentColor))) {
      return json({ error: "Invalid accent color." }, { status: 400 });
    }
    patch.accentColor = String(input.accentColor);
  }
  if (input.defaultMarker !== undefined) {
    const marker = sanitizeMarkerEmoji(String(input.defaultMarker));
    if (!marker) {
      return json({ error: "Unknown marker." }, { status: 400 });
    }
    patch.defaultMarker = marker;
  }
  if (input.defaultMarkerColor !== undefined) {
    if (!hasValidColor(String(input.defaultMarkerColor))) {
      return json({ error: "Invalid marker color." }, { status: 400 });
    }
    patch.defaultMarkerColor = String(input.defaultMarkerColor);
  }
  if (input.welcomeMessage !== undefined) {
    patch.welcomeMessage = String(input.welcomeMessage ?? "");
  }
  if (input.submissionNote !== undefined) {
    patch.submissionNote = String(input.submissionNote ?? "");
  }
  if (input.maxPhotosPerSpot !== undefined) {
    const n = Math.max(0, Math.min(12, Number(input.maxPhotosPerSpot)));
    if (!Number.isFinite(n)) {
      return json({ error: "Invalid max photos value." }, { status: 400 });
    }
    patch.maxPhotosPerSpot = n;
  }
  if (input.requireApproval !== undefined) {
    patch.requireApproval = input.requireApproval === false ? false : true;
  }
  if (input.contactEmail !== undefined) {
    const email = String(input.contactEmail ?? "").trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: "Invalid contact email." }, { status: 400 });
    }
    patch.contactEmail = email;
  }
  if (input.website !== undefined) {
    const url = String(input.website ?? "").trim();
    if (url && !/^https?:\/\/.+/i.test(url)) {
      return json({ error: "Website must be a valid http(s) URL." }, { status: 400 });
    }
    patch.website = url;
  }
  if (input.allowReviews !== undefined) {
    patch.allowReviews = input.allowReviews === false ? false : true;
  }
  if (input.allowComments !== undefined) {
    patch.allowComments = input.allowComments === false ? false : true;
  }
  if (input.allowPhotos !== undefined) {
    patch.allowPhotos = input.allowPhotos === false ? false : true;
  }
  if (input.collaborationMode !== undefined) {
    if (["anyone", "loggedIn", "invitedOnly"].includes(String(input.collaborationMode))) {
      patch.collaborationMode = String(input.collaborationMode);
    } else {
      return json({ error: "Invalid collaboration mode." }, { status: 400 });
    }
  }
  if (input.enableClustering !== undefined) {
    patch.enableClustering = input.enableClustering === true;
  }
  if (input.category !== undefined) {
    if (
      input.category !== "" &&
      !["food", "sights", "shopping", "outdoors", "nightlife", "arts", "sports", "other"].includes(
        String(input.category)
      )
    ) {
      return json({ error: "Invalid category." }, { status: 400 });
    }
    patch.category = String(input.category ?? "");
  }
  if (input.tags !== undefined) {
    patch.tags = String(input.tags ?? "").slice(0, 200);
  }
  if (input.baseCenter !== undefined) {
    const c = input.baseCenter as { lat?: number; lng?: number };
    if (
      typeof c === "object" &&
      c !== null &&
      Number.isFinite(Number(c.lat)) &&
      Number.isFinite(Number(c.lng))
    ) {
      patch.baseCenter = { lat: Number(c.lat), lng: Number(c.lng) };
    }
  }
  if (input.baseZoom !== undefined) {
    const z = Number(input.baseZoom);
    if (Number.isFinite(z)) patch.baseZoom = Math.max(3, Math.min(18, z));
  }

  if (Object.keys(patch).length === 0) {
    return json({ error: "Nothing to update." }, { status: 400 });
  }

  try {
    await writeClient.patch(String(mapId)).set(patch).commit();
    const updated = await getMap(String(mapId));
    return json({ ok: true, map: updated });
  } catch {
    return json(
      { error: "Failed to update map. Please try again." },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/maps?mapId=<id> -> remove a map and all of its data.
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  if (!mapId) return json({ error: "Missing mapId" }, { status: 400 });

  const ctx = await getAdminContext(req);
  const perm = await canManageMap(ctx, mapId);
  if (!perm.ok) return json({ error: perm.reason || "Forbidden" }, { status: 403 });
  if (!writeClient) {
    return json(
      { error: "Sanity is not configured for the server." },
      { status: 503 }
    );
  }

  try {
    await writeClient.delete(mapId);
    await withDb(async (db) => {
      const col = db.collection(COLLECTIONS.spots);
      const spots = await col.find({ mapId }).toArray();
      const spotIds = spots.map((s) => String(s._id));
      await col.deleteMany({ mapId });
      if (spotIds.length > 0) {
        await db.collection(COLLECTIONS.reviews).deleteMany({ spotId: { $in: spotIds } });
        await db.collection(COLLECTIONS.photos).deleteMany({ spotId: { $in: spotIds } });
        await db.collection(COLLECTIONS.comments).deleteMany({ spotId: { $in: spotIds } });
        await db.collection(COLLECTIONS.votes).deleteMany({ spotId: { $in: spotIds } });
      }
    });
    return NextResponse.json({ ok: true });
  } catch {
    return json(
      { error: "Failed to delete map. Please try again." },
      { status: 500 }
    );
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "map";
}
