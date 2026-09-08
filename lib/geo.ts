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

// Human-readable distance: meters under 1 km, then kilometers with 1 decimal.
export function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

// Human-readable area: m² under 10 000, then hectares (ha), then km².
export function formatArea(squareMeters: number): string {
  if (squareMeters < 10_000) {
    return `${Math.round(squareMeters)} m²`;
  }
  if (squareMeters < 1_000_000) {
    return `${(squareMeters / 10_000).toFixed(2)} ha`;
  }
  return `${(squareMeters / 1_000_000).toFixed(2)} km²`;
}