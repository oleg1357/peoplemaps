import { withDb, json } from "@/lib/api";
import { getAdminContext } from "@/lib/admin";
import { serverClient } from "@/sanity/lib/client";
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

  // Attach moderate-able maps + spot moderation counts.
  const result = await withDb(async (db) => {
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
    return moderated;
  });

  return json({ maps: result, owned: result, isAdmin });
}
