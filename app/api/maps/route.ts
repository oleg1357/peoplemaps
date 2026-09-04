import { json } from "@/lib/api";
import { getAllPublicMaps, getMapsByOwner } from "@/lib/admin";

// GET /api/maps[?owner=<id>] -> map list for the interactive map client.
//
// Fetched server-side from Sanity so the browser never talks to Sanity
// directly. That avoids Sanity's per-origin CORS allow-list, which blocked the
// previously client-side `useMaps()` hook in production (the deployed origin
// wasn't whitelisted, returning 403).
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const owner = searchParams.get("owner");
  const maps = owner
    ? await getMapsByOwner(owner)
    : await getAllPublicMaps();
  return json(maps, {
    headers: {
      "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
    },
  });
}
