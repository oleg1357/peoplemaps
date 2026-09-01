import { withDb, json } from "@/lib/api";
import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin";
import { serverClient, writeClient } from "@/sanity/lib/client";
import { getServerSupabase } from "@/lib/supabase-server";
import { COLLECTIONS } from "@/lib/mongodb";
import type { MapDocument } from "@/lib/types";

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
      `*[_type == "map"] | order(_createdAt desc){ _id, title, description, ownerId, ownerName, isPublic }`
    );
  } catch {
    maps = [];
  }

  const owned = isAdmin ? maps : maps.filter((m) => m.ownerId === ctx.userId);

  // Attach moderate-able maps + spot moderation counts. When Mongo is
  // unreachable we still return the map list (counts shown as 0) so the admin
  // UI keeps working instead of 500ing.
  const dbResult = await withDb(async (db) => {
    const col = db.collection(COLLECTIONS.spots);
    const moderated = await Promise.all(
      owned.map(async (m) => {
        const spots = await col.find({ mapId: m._id }).toArray();
        return {
          ...m,
          spotTotal: spots.length,
          spotPending: spots.filter((s) => s.moderation === "pending").length,
          spotHidden: spots.filter((s) => s.hidden === true).length,
        };
      })
    );
    return moderated as (MapDocument & { spotTotal: number; spotPending: number; spotHidden: number })[];
  });

  const result =
    dbResult instanceof NextResponse
      ? owned.map((m) => ({ ...m, spotTotal: 0, spotPending: 0, spotHidden: 0 }))
      : dbResult;

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
    });
    return json({ _id: doc._id, title: doc.title }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown Sanity error";
    return json({ error: `Failed to create map: ${message}` }, { status: 500 });
  }
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96) || "map";
}
