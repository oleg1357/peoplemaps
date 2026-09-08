// Small geodesy helpers for measurement tools. No external library — these are
// thin wrappers over the haversine formula and the spherical-excess polygon
// area algorithm. Accurate enough for interactive map measuring (meters/m²).

export type LatLng = [number, number];

const EARTH_RADIUS_M = 6371008.8; // mean Earth radius (meters)

// Great-circle distance between two [lat, lng] points in meters.
export function haversineDistance(a: LatLng, b: LatLng): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// Total length of a polyline of [lat, lng] points in meters. 0 when fewer
// than two points.
export function polylineLength(points: LatLng[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineDistance(points[i - 1], points[i]);
  }
  return total;
}

// Spherical area of a closed polygon, approximated by summing the great-circle
// arc lengths (spherical excess). Requires at least 3 distinct points. Returns
// square meters. Returns 0 for degenerate polygons.
// @see https://en.wikipedia.org/wiki/Spherical_trigonometry#Area_and_spherical_excess
export function polygonArea(points: LatLng[]): number {
  const n = points.length;
  if (n < 3) return 0;
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  // Spherical excess using the l'Huilier-style formula on edges:
  // E = |sum over edges of (lng2-lng1) * ln( tan((90-lat2)/2) / tan((90-lat1)/2) )|
  // This is a widely used approximation (valid mid-latitudes, not polar).
  let acc = 0;
  for (let i = 0; i < n; i++) {
    const p1 = points[i];
    const p2 = points[(i + 1) % n];
    const lat1 = toRad(90 - p1[0]);
    const lat2 = toRad(90 - p2[0]);
    if (lat1 <= 0 || lat2 <= 0) return 0; // polar — formula degenerates
    acc += toRad(p2[1] - p1[1]) * (Math.log(Math.tan(lat2 / 2)) - Math.log(Math.tan(lat1 / 2)));
  }

  const areaM2 = Math.abs(acc) * EARTH_RADIUS_M * EARTH_RADIUS_M;
  // Guard against huge values from degenerate/self-crossing input.
  return Number.isFinite(areaM2) && areaM2 < 4 * Math.PI * EARTH_RADIUS_M ** 2
    ? areaM2
    : 0;
}

// Human-readable distance. Metric shows meters/kilometers; imperial shows
// feet/miles (Feet under 1000 ft, else miles with 1 decimal).
export type Units = "metric" | "imperial";

export function formatDistance(meters: number, units: Units = "metric"): string {
  if (units === "imperial") {
    const feet = meters * 3.28084;
    if (feet < 1000) return `${Math.round(feet)} ft`;
    return `${(feet / 5280).toFixed(2)} mi`;
  }
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// Human-readable area. Metric shows m²/hectares/km²; imperial shows ft²/acres.
export function formatArea(
  squareMeters: number,
  units: Units = "metric"
): string {
  if (units === "imperial") {
    const sqFt = squareMeters * 10.76391;
    if (sqFt < 43_560) return `${Math.round(sqFt)} ft²`;
    return `${(sqFt / 43_560).toFixed(2)} ac`;
  }
  if (squareMeters < 10_000) {
    return `${Math.round(squareMeters)} m²`;
  }
  if (squareMeters < 1_000_000) {
    return `${(squareMeters / 10_000).toFixed(2)} ha`;
  }
  return `${(squareMeters / 1_000_000).toFixed(2)} km²`;
}

// Midpoint (simple average) between two points — good for placing segment
// labels on the map.
export function segmentMidpoint(a: LatLng, b: LatLng): LatLng {
  return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
}

// ---- Point containment (for auto-aggregating zone values from spots) ----

// Ray-casting point-in-polygon test on [lat, lng] vertices (assumes the
// polygon edges follow latitude/longitude — fine at map scale).
export function pointInPolygon(
  point: LatLng,
  polygon: LatLng[]
): boolean {
  const [lat, lng] = point;
  let inside = false;
  let j = polygon.length - 1;
  for (let i = 0; i < polygon.length; i++) {
    const [latI, lngI] = polygon[i];
    const [latJ, lngJ] = polygon[j];
    const intersect =
      lngI > lng !== lngJ > lng &&
      lat < ((latJ - latI) * (lng - lngI)) / (lngJ - lngI || 1e-12) + latI;
    if (intersect) inside = !inside;
    j = i;
  }
  return inside;
}

// Point inside a [lat, lng] center + radius-in-meters circle.
export function pointInCircle(
  point: LatLng,
  center: LatLng,
  radiusM: number
): boolean {
  return haversineDistance(point, center) <= radiusM;
}

// Whether a spot-like point falls inside a zone (polygon via `points` or
// circle via `center`+`radius`). Zone shape is inferred from the same fields
// the renderer uses, so this stays consistent with what's drawn on the map.
export function latLngInZone(
  point: LatLng,
  zone: { points?: LatLng[]; center?: LatLng; radius?: number }
): boolean {
  if (zone.center && typeof zone.radius === "number" && zone.radius > 0) {
    return pointInCircle(point, zone.center, zone.radius);
  }
  if (zone.points && zone.points.length >= 3) {
    return pointInPolygon(point, zone.points);
  }
  return false;
}

// ---- Auto-aggregation (zone value + trust count from contained spots) ----

export type ChoroplethMetric = "priceLevel" | "rating";

// For every zone, count the spots inside it and average the chosen metric:
//  - "priceLevel": averages the spot's `priceLevel` (0-3 where present).
//  - "rating": averages the average review score per spot (from `reviewScores`,
//    a pre-built spotId → average-score map).
// Zones without any contributing spot get no value (undefined), so the map
// shows them in the neutral/missing color rather than inventing a signal.
// Returns Map<zoneId, { value: number; count: number }>.
interface ZoneGeometry {
  _id?: string;
  points?: LatLng[];
  center?: LatLng;
  radius?: number;
}

export function aggregateZoneValues(
  zones: ZoneGeometry[],
  spots: { _id?: string; lat: number; lng: number; priceLevel?: number | null }[],
  reviewScores: Map<string, number>,
  metric: ChoroplethMetric
): Map<string, { value: number; count: number }> {
  const out = new Map<string, { value: number; count: number }>();
  for (const zone of zones) {
    if (!zone._id) continue;
    let sum = 0;
    let count = 0;
    for (const spot of spots) {
      const pt: LatLng = [spot.lat, spot.lng];
      if (!latLngInZone(pt, zone)) continue;
      if (metric === "priceLevel") {
        if (typeof spot.priceLevel === "number" && Number.isFinite(spot.priceLevel)) {
          sum += spot.priceLevel;
          count += 1;
        }
      } else {
        const avg = reviewScores.get(spot._id ?? "");
        if (typeof avg === "number" && Number.isFinite(avg)) {
          sum += avg;
          count += 1;
        }
      }
    }
    if (count > 0) out.set(zone._id, { value: sum / count, count });
  }
  return out;
}

// Averaged review score per spot, for the "rating" metric.
export function averageReviewScoreBySpot(
  reviews: { spotId: string; score: number }[]
): Map<string, number> {
  const sums = new Map<string, { total: number; count: number }>();
  for (const r of reviews) {
    if (!Number.isFinite(r.score)) continue;
    const cur = sums.get(r.spotId) ?? { total: 0, count: 0 };
    cur.total += r.score;
    cur.count += 1;
    sums.set(r.spotId, cur);
  }
  const out = new Map<string, number>();
  for (const [id, v] of sums) {
    if (v.count > 0) out.set(id, v.total / v.count);
  }
  return out;
}