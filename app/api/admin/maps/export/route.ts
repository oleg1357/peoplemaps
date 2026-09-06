import { NextResponse } from "next/server";
import { error, withDb } from "@/lib/api";
import { getAdminContext, canModerateMap, getMap } from "@/lib/admin";
import { COLLECTIONS } from "@/lib/mongodb";
import type { Spot, Zone, Route, GeoPoint } from "@/lib/types";

// GeoJSON / CSV export of everything on a map (spots, zones, routes). Access
// mirrors the rest of the admin API: owner, global admins and moderators.
// Exports include pending/rejected/hidden items and moderation state so an
// owner can move data between maps or into their own tooling.

function toGeo([lat, lng]: GeoPoint): [number, number] {
  // GeoJSON uses [lng, lat].
  return [lng, lat];
}

// A circle zone becomes a 32-vertex polygon so it survives in GeoJSON.
function circleRing(center: GeoPoint, radiusMeters: number): [number, number][] {
  const R = 6378137;
  const dLat = radiusMeters / R;
  const dLng = radiusMeters / (R * Math.cos((center[0] * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i < 32; i++) {
    const a = (i / 32) * 2 * Math.PI;
    ring.push([
      center[0] + dLat * Math.sin(a),
      center[1] + dLng * Math.cos(a),
    ]);
  }
  ring.push(ring[0]);
  return ring.map(toGeo);
}

const spotProps = (s: Spot) => ({
  name: s.name,
  street: s.street,
  city: s.city,
  zip: s.zip,
  type: "spot",
  status: s.status ?? "unknown",
  marker: s.marker ?? "",
  markerColor: s.markerColor ?? "",
  priceLevel: s.priceLevel ?? "",
  hours: s.hoursNote ?? "",
  tags: (s.tags ?? []).join(", "),
  tip: s.tip ?? "",
  moderation: s.moderation ?? "visible",
  hidden: Boolean(s.hidden),
  createdBy: s.createdBy ?? "",
  createdAt: s.createdAt,
});

const CSV_HEADERS = "id,name,street,city,zip,lat,lng,status,price_level,hours,tags,tip,moderation,hidden,marker,marker_color,created_by,created_at";

function csvEscape(v: unknown): string {
  const s = String(v ?? "");
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(spots: Spot[]): string {
  const rows = spots.map((s) =>
    [
      String(s._id ?? ""),
      s.name,
      s.street,
      s.city,
      s.zip,
      s.lat,
      s.lng,
      s.status ?? "unknown",
      s.priceLevel ?? "",
      s.hoursNote ?? "",
      (s.tags ?? []).join(", "),
      s.tip ?? "",
      s.moderation ?? "visible",
      Boolean(s.hidden),
      s.marker ?? "",
      s.markerColor ?? "",
      s.createdBy ?? "",
      s.createdAt,
    ]
      .map(csvEscape)
      .join(",")
  );
  return [CSV_HEADERS, ...rows].join("\r\n");
}

// GET /api/admin/maps/export?mapId=<mapId>&format=geojson|csv
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mapId = searchParams.get("mapId");
  const format = searchParams.get("format") === "csv" ? "csv" : "geojson";
  if (!mapId) return error("Missing mapId");

  const ctx = await getAdminContext(req);
  const perm = await canModerateMap(ctx, mapId);
  if (!perm.ok) return error(perm.reason || "Forbidden", 403);

  const map = await getMap(mapId);
  const base = (map?.slug || map?.title || "map").replace(/[^\w\-]+/g, "-");

  return withDb(async (db) => {
    const spots = await db
      .collection<Spot>(COLLECTIONS.spots)
      .find({ mapId })
      .sort({ createdAt: -1 })
      .toArray();

    if (format === "csv") {
      const body = toCsv(spots);
      return new NextResponse(body, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${base}.csv"`,
        },
      });
    }

    const zones = await db
      .collection<Zone>(COLLECTIONS.zones)
      .find({ mapId })
      .toArray();
    const routes = await db
      .collection<Route>(COLLECTIONS.routes)
      .find({ mapId })
      .toArray();

    const features: unknown[] = spots.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: toGeo([s.lat, s.lng]) },
      properties: spotProps(s),
    }));

    for (const z of zones) {
      const ring =
        z.shape === "circle" && z.center && z.radius
          ? circleRing(z.center, z.radius)
          : (z.points ?? []).map(toGeo);
      if (ring.length < 3) continue;
      features.push({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [ring] },
        properties: {
          name: z.name,
          shape: z.shape,
          color: z.color ?? "",
          description: z.description ?? "",
          moderation: z.moderation ?? "visible",
          hidden: Boolean(z.hidden),
          createdBy: z.createdBy ?? "",
          createdAt: z.createdAt,
        },
      });
    }

    for (const r of routes) {
      const line = (r.points ?? []).map(toGeo);
      if (line.length < 2) continue;
      features.push({
        type: "Feature",
        geometry: { type: "LineString", coordinates: line },
        properties: {
          name: r.name,
          color: r.color ?? "",
          description: r.description ?? "",
          moderation: r.moderation ?? "visible",
          hidden: Boolean(r.hidden),
          createdBy: r.createdBy ?? "",
          createdAt: r.createdAt,
        },
      });
    }

    const geojson = {
      type: "FeatureCollection" as const,
      name: map?.title ?? "map",
      features,
    };

    return new NextResponse(JSON.stringify(geojson, null, 2), {
      headers: {
        "Content-Type": "application/geo+json; charset=utf-8",
        "Content-Disposition": `attachment; filename="${base}.geojson"`,
      },
    });
  });
}