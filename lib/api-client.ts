import { sanityConfigured } from "@/sanity/lib/client";
import { supabase, supabaseConfigured } from "./supabase";
import {
  demoFetchMapData,
  demoFetchMapSpots,
  demoCreateSpot,
  demoUpdateOwnSpot,
  demoDeleteSpot,
  demoCreateZone,
  demoCreateRoute,
  demoFetchSpotById,
  demoFetchReviews,
  demoAddReview,
  demoUpdateReview,
  demoDeleteReview,
  demoFetchStatus,
  demoSetStatus,
  demoToggleHelpfulReview,
  demoFetchComments,
  demoAddComment,
  demoDeleteComment,
  demoFetchPhotos,
  demoAddSpotPhoto,
  demoReportSpot as demoReportSpotFn,
} from "./demo-store";
import type {
  Spot,
  Review,
  ReviewComment,
  SpotPhoto,
  SpotPhotoMeta,
  SpotStatus,
  ModerationStatus,
  MapDocument,
  ProfileData,
  Zone,
  Route,
  SpotReport,
  MapBan,
  ModerationRule,
  MapContributorEntry,
} from "./types";
import type { MapCapability, MapRoleType } from "@/lib/roles";

// True when the backend (Mongo + Sanity) is wired. Uses public env flags so the
// client bundle can decide which experience to render. The API route handlers
// still independently guard on MONGODB_URI server-side.
export const backendLive =
  (process.env.NEXT_PUBLIC_BACKEND_LIVE === "1" ||
    process.env.NEXT_PUBLIC_BACKEND_LIVE === "true") &&
  sanityConfigured &&
  supabaseConfigured;

// Attach the signed-in user's access token so API routes can authenticate even
// when the session cookie isn't reflected to the server immediately. Falls back
// to the cookie path (no header) when there's no browser session or Supabase.
async function authHeaders(): Promise<Record<string, string>> {
  if (!supabase) return {};
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function req<T>(
  url: string,
  init?: RequestInit,
  opts?: { cache?: boolean }
): Promise<T> {
  // Public GETs skip the Authorization header so the browser and Vercel CDN are
  // allowed to cache them (an Authorization header makes a response uncacheable
  // for both, turning every map visit into a fresh function invocation).
  const auth = opts?.cache ? {} : await authHeaders();
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...auth,
      ...(init?.headers || {}),
    },
  });
  if (res.status === 503) throw new Error("not-configured");
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// 60s in-memory cache for the per-visit public GETs (the public map list and the
// selected map's data). Repeat visits within the window issue zero requests,
// which is the biggest lever on Vercel request counts. Cleared on any write via
// clearDataCache() so the next load always sees fresh data.
const GET_CACHE_TTL_MS = 60_000;
const getCache = new Map<string, { ts: number; data: unknown }>();

export function clearDataCache() {
  getCache.clear();
}

async function cachedGet<T>(url: string): Promise<T> {
  const hit = getCache.get(url);
  if (hit && Date.now() - hit.ts < GET_CACHE_TTL_MS) return hit.data as T;
  const data = await req<T>(url, undefined, { cache: true });
  getCache.set(url, { ts: Date.now(), data });
  return data;
}

// The public map list, shared by useMaps() across pages (no `owner`).
export async function fetchPublicMaps(): Promise<MapDocument[]> {
  return cachedGet<MapDocument[]>("/api/maps");
}

// ---- Spots ----
export async function fetchMapSpots(mapId: string): Promise<Spot[]> {
  if (!backendLive) return demoFetchMapSpots(mapId);
  return cachedGet<Spot[]>(`/api/spots?mapId=${encodeURIComponent(mapId)}`);
}

// Everything the map view needs in a single request. Photo entries are
// metadata-only (no dataUrl) — image bytes come from fetchPhotos() per spot
// when its details panel opens.
export interface MapData {
  spots: Spot[];
  reviews: Review[];
  comments: ReviewComment[];
  photos: SpotPhotoMeta[];
  zones: Zone[];
  routes: Route[];
}

export async function fetchMapData(mapId: string): Promise<MapData> {
  if (!backendLive) return demoFetchMapData(mapId);
  return cachedGet<MapData>(`/api/map-data?mapId=${encodeURIComponent(mapId)}`);
}

// POST returns the created spot plus the updated public spot list for the map,
// so the caller can refresh in a single request.
export interface CreateSpotResult {
  spot: Spot;
  spots: Spot[];
}

export async function createSpot(input: Omit<Spot, "_id" | "createdAt">): Promise<CreateSpotResult> {
  if (!backendLive) return demoCreateSpot(input);
  return req<CreateSpotResult>("/api/spots", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// A submitter edits their own spot (moderators/admins may edit any spot on a
// map they moderate). Returns the refreshed spot document.
export async function updateOwnSpot(
  spotId: string,
  fields: {
    name?: string;
    street?: string;
    city?: string;
    zip?: number;
    lat?: number;
    lng?: number;
    marker?: string | null;
    markerColor?: string | null;
    priceLevel?: number | null;
    hoursNote?: string | null;
    tags?: string[] | null;
    tip?: string | null;
  }
): Promise<Spot | null> {
  if (!backendLive) return demoUpdateOwnSpot(spotId, fields);
  const res = await req<{ ok: boolean; spot: Spot | null }>("/api/spots", {
    method: "PATCH",
    body: JSON.stringify({ spotId, ...fields }),
  });
  return res.spot;
}

export async function deleteSpot(spotId: string): Promise<void> {
  if (!backendLive) return demoDeleteSpot(spotId);
  await req(`/api/spots?spotId=${encodeURIComponent(spotId)}`, { method: "DELETE" });
}

// ---- Zones ----
export interface CreateZoneResult {
  zone: Zone;
  zones: Zone[]; // refreshed public zone list for the map
}

// POST returns the created zone plus the updated public zone list for the map,
// so the caller can refresh in a single request.
export async function createZone(input: Omit<Zone, "_id" | "createdAt">): Promise<CreateZoneResult> {
  if (!backendLive) return demoCreateZone(input);
  return req<CreateZoneResult>("/api/zones", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

// ---- Routes ----
export interface CreateRouteResult {
  route: Route;
  routes: Route[]; // refreshed public route list for the map
}

export async function createRoute(input: Omit<Route, "_id" | "createdAt">): Promise<CreateRouteResult> {
  if (!backendLive) return demoCreateRoute(input);
  return req<CreateRouteResult>("/api/routes", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function fetchSpotById(spotId: string): Promise<Spot> {
  if (!backendLive) return (await demoFetchSpotById(spotId)) ?? ({} as Spot);
  return cachedGet<Spot>(`/api/spots?spotId=${encodeURIComponent(spotId)}`);
}

// ---- Reviews ----
export async function fetchReviews(spotId: string): Promise<Review[]> {
  if (!backendLive) return demoFetchReviews(spotId);
  return cachedGet<Review[]>(`/api/reviews?spotId=${encodeURIComponent(spotId)}`);
}

export async function addReview(spotId: string, score: number, review: string, userId?: string | null): Promise<Review | null> {
  if (!backendLive) return demoAddReview(spotId, score, review, userId);
  return req<Review>("/api/reviews", {
    method: "POST",
    body: JSON.stringify({ spotId, score, review, user_fk: userId }),
  });
}

export async function updateReview(reviewId: string, review: string, score: number): Promise<void> {
  if (!backendLive) return demoUpdateReview(reviewId, review, score);
  await req("/api/reviews", { method: "PATCH", body: JSON.stringify({ id: reviewId, review, score }) });
}

export async function deleteReview(reviewId: string): Promise<void> {
  if (!backendLive) return demoDeleteReview(reviewId);
  await req(`/api/reviews?id=${encodeURIComponent(reviewId)}`, { method: "DELETE" });
}

// ---- Status ----
export async function fetchStatus(spotId: string): Promise<SpotStatus> {
  if (!backendLive) return demoFetchStatus(spotId);
  return (await req<{ status: SpotStatus }>(`/api/spots/status?spotId=${encodeURIComponent(spotId)}`)).status;
}

export async function setStatus(spotId: string, status: SpotStatus): Promise<void> {
  if (!backendLive) return demoSetStatus(spotId, status);
  await req("/api/spots/status", { method: "POST", body: JSON.stringify({ spotId, status }) });
}

// ---- Votes ----
export async function toggleHelpfulReview(reviewId: string, userId: string | null): Promise<{ count: number; voted: boolean }> {
  if (!backendLive) return demoToggleHelpfulReview(reviewId, userId);
  if (!userId) {
    return req<{ count: number; voted: boolean }>(`/api/votes?reviewId=${encodeURIComponent(reviewId)}`);
  }
  // True toggle in a single request: the server flips it and returns the state.
  return req<{ count: number; voted: boolean }>("/api/votes", {
    method: "POST",
    body: JSON.stringify({ reviewId }),
  });
}

// ---- Comments ----
export async function fetchComments(reviewId: string): Promise<ReviewComment[]> {
  if (!backendLive) return demoFetchComments(reviewId);
  return cachedGet<ReviewComment[]>(`/api/comments?reviewId=${encodeURIComponent(reviewId)}`);
}

export interface AddCommentOptions {
  userId?: string | null;
  parentId?: string | null;
  authorName?: string;
}

export async function addComment(
  reviewId: string,
  text: string,
  opts: AddCommentOptions = {}
): Promise<ReviewComment | null> {
  if (!backendLive) return demoAddComment(reviewId, text, {
    userId: opts.userId,
    parentId: opts.parentId ?? null,
    authorName: opts.authorName,
  });
  return req<ReviewComment>("/api/comments", {
    method: "POST",
    body: JSON.stringify({
      reviewId,
      text,
      user_fk: opts.userId,
      parentId: opts.parentId ?? null,
      authorName: opts.authorName,
    }),
  });
}

export async function deleteComment(commentId: string): Promise<void> {
  if (!backendLive) return demoDeleteComment(commentId);
  await req(`/api/comments?id=${encodeURIComponent(commentId)}`, {
    method: "DELETE",
  });
}

// ---- Photos ----
export async function fetchPhotos(spotId: string): Promise<SpotPhoto[]> {
  if (!backendLive) return demoFetchPhotos(spotId);
  return cachedGet<SpotPhoto[]>(`/api/photos?spotId=${encodeURIComponent(spotId)}`);
}

export async function addSpotPhoto(spotId: string, dataUrl: string, userId?: string | null): Promise<SpotPhoto | null> {
  if (!backendLive) return demoAddSpotPhoto(spotId, dataUrl, userId);
  return req<SpotPhoto>("/api/photos", { method: "POST", body: JSON.stringify({ spotId, dataUrl, user_fk: userId }) });
}

export async function getSpotPhotosCountApi(spotId: string): Promise<number> {
  if (!backendLive) return 0;
  const res = await cachedGet<{ count: number }>(`/api/photos/count?spotId=${encodeURIComponent(spotId)}`);
  return res.count;
}

// ---- Admin (map owners / moderators / global admins) ----
export interface AdminMapEntry extends MapDocument {
  spotTotal: number;
  spotPending: number;
  spotHidden: number;
  // The caller's relationship to this map: "owner" or a team role
  // (viewer/reviewer/moderator). Absent for maps read via other paths.
  role?: "owner" | MapRoleType;
  // The caller's effective fully-granular grants on this map (owners/admins get
  // everything; team members get their exact set — see lib/roles.ts).
  caps?: MapCapability[];
}

// A team member of a map. Roles gate which capabilities they get in the admin
// UI (see lib/roles.ts): viewers are read-only, reviewers approve/reject,
// moderators get full content control. Fully granular PAM: an explicit
// `capabilities` array overrides the role preset for that member.
export interface MapRoleEntry {
  _id: string;
  userId: string;
  role?: MapRoleType; // absent = legacy moderator
  capabilities?: MapCapability[] | null; // explicit granular grants
  displayName?: string;
  email?: string;
  addedBy: string;
  addedAt: string;
}

export interface AdminMapsResponse {
  maps: AdminMapEntry[];
  owned: AdminMapEntry[];
  isAdmin: boolean;
}

// Free-tier quota + subscription state surfaced to the admin panel.
export interface BillingStatus {
  plan: "free" | "pro";
  isPaid: boolean;
  subscriptionStatus: string | null;
  publicMapCount: number;
  freePublicLimit: number;
  paddleConfigured: boolean;
}

export async function fetchBillingStatus(): Promise<BillingStatus> {
  if (!backendLive) {
    return {
      plan: "free",
      isPaid: true, // demo mode has no quotas
      subscriptionStatus: null,
      publicMapCount: 0,
      freePublicLimit: 3,
      paddleConfigured: false,
    };
  }
  return req<BillingStatus>("/api/billing/status");
}

export async function createCheckoutSession(): Promise<{ url: string }> {
  return req<{ url: string }>("/api/billing/checkout", { method: "POST" });
}

export async function createPortalSession(): Promise<{ url: string }> {
  return req<{ url: string }>("/api/billing/portal", { method: "POST" });
}

export interface CreateMapInput {
  title: string;
  description?: string;
  isPublic?: "public" | "private";
  accentColor?: string;
  defaultMarker?: string;
  defaultMarkerColor?: string;
  welcomeMessage?: string;
  submissionNote?: string;
  maxPhotosPerSpot?: number;
  requireApproval?: boolean;
  contactEmail?: string;
  website?: string;
  allowReviews?: boolean;
  allowComments?: boolean;
  allowPhotos?: boolean;
  collaborationMode?: "anyone" | "loggedIn" | "invitedOnly";
  enableClustering?: boolean;
  category?: string;
  tags?: string;
}

export async function createMap(input: CreateMapInput): Promise<{ _id: string; title: string; slug: string | null }> {
  if (!backendLive) throw new Error("backend not configured");
  return req<{ _id: string; title: string; slug: string | null }>("/api/admin/maps", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export type MapSettingsInput = Partial<CreateMapInput> & { baseCenter?: { lat: number; lng: number }; baseZoom?: number };

export async function updateMapSettings(mapId: string, input: MapSettingsInput): Promise<MapDocument | null> {
  if (!backendLive) return null;
  const res = await req<{ ok: boolean; map: MapDocument | null }>("/api/admin/maps", {
    method: "PATCH",
    body: JSON.stringify({ mapId, ...input }),
  });
  return res.map;
}

export async function uploadCoverImage(
  mapId: string,
  file: Blob,
): Promise<{ ok: boolean; assetId: string; url: string } | null> {
  if (!backendLive) return null;
  return req<{ ok: boolean; assetId: string; url: string }>(
    `/api/admin/maps/cover?mapId=${encodeURIComponent(mapId)}`,
    { method: "POST", body: file, headers: { "Content-Type": file.type } }
  );
}

export async function removeCoverImage(mapId: string): Promise<{ ok: boolean } | null> {
  if (!backendLive) return null;
  return req<{ ok: boolean }>(
    `/api/admin/maps/cover?mapId=${encodeURIComponent(mapId)}`,
    { method: "DELETE" }
  );
}

export async function destroyMap(mapId: string): Promise<void> {
  if (!backendLive) return;
  await req(`/api/admin/maps?mapId=${encodeURIComponent(mapId)}`, { method: "DELETE" });
}

export async function fetchAdminMaps(): Promise<AdminMapsResponse> {
  if (!backendLive) return { maps: [], owned: [], isAdmin: false };
  return req<AdminMapsResponse>("/api/admin/maps");
}

export interface AdminSpotList {
  spots: Spot[];
  pending: number;
  hidden: number;
  total: number;
}

export async function fetchAdminSpots(mapId: string): Promise<AdminSpotList | null> {
  if (!backendLive) return null;
  return req<AdminSpotList>(`/api/admin/spots?mapId=${encodeURIComponent(mapId)}`);
}

export async function moderateSpot(
  spotId: string,
  moderation: ModerationStatus
): Promise<void> {
  await req("/api/admin/spots", {
    method: "PATCH",
    body: JSON.stringify({ spotId, moderation }),
  });
}

export async function setSpotHidden(spotId: string, hidden: boolean): Promise<void> {
  await req("/api/admin/spots", {
    method: "PATCH",
    body: JSON.stringify({ spotId, hidden }),
  });
}

export async function updateSpotFields(
  spotId: string,
  fields: Partial<
    Pick<
      Spot,
      | "name"
      | "street"
      | "city"
      | "zip"
      | "lat"
      | "lng"
      | "status"
      | "marker"
      | "markerColor"
      | "priceLevel"
      | "hoursNote"
      | "tags"
      | "tip"
    >
  >
): Promise<void> {
  await req("/api/admin/spots", {
    method: "PATCH",
    body: JSON.stringify({ spotId, fields }),
  });
}

export async function destroySpot(spotId: string): Promise<void> {
  await req(`/api/admin/spots?spotId=${encodeURIComponent(spotId)}`, {
    method: "DELETE",
  });
}

// ---- Map team roles (owner-only) ----
export interface MapRolesResponse {
  mapId: string;
  members: MapRoleEntry[];
}

export async function fetchMapModerators(mapId: string): Promise<MapRolesResponse | null> {
  if (!backendLive) return null;
  return req<MapRolesResponse>(`/api/admin/maps/roles?mapId=${encodeURIComponent(mapId)}`);
}

export async function addMapModerator(
  mapId: string,
  email: string,
  role: MapRoleType = "moderator",
  capabilities?: MapCapability[]
): Promise<MapRolesResponse> {
  return req<MapRolesResponse>("/api/admin/maps/roles", {
    method: "POST",
    body: JSON.stringify({
      mapId,
      email,
      role,
      ...(capabilities ? { capabilities } : {}),
    }),
  });
}

// Update a team member's role preset and/or their explicit granular grants.
export async function updateMapModerator(
  mapId: string,
  userId: string,
  patch: { role?: MapRoleType; capabilities?: MapCapability[] }
): Promise<MapRolesResponse> {
  return req<MapRolesResponse>("/api/admin/maps/roles", {
    method: "PATCH",
    body: JSON.stringify({ mapId, userId, ...patch }),
  });
}

export async function removeMapModerator(
  mapId: string,
  userId: string
): Promise<void> {
  await req(
    `/api/admin/maps/roles?mapId=${encodeURIComponent(mapId)}&userId=${encodeURIComponent(userId)}`,
    { method: "DELETE" }
  );
}

// ---- Admin: zones & routes ----
export interface AdminZoneList {
  zones: Zone[];
  pending: number;
  hidden: number;
  total: number;
}

export interface AdminRouteList {
  routes: Route[];
  pending: number;
  hidden: number;
  total: number;
}

export async function fetchAdminZones(mapId: string): Promise<AdminZoneList | null> {
  if (!backendLive) return null;
  return req<AdminZoneList>(`/api/admin/zones?mapId=${encodeURIComponent(mapId)}`);
}

export async function fetchAdminRoutes(mapId: string): Promise<AdminRouteList | null> {
  if (!backendLive) return null;
  return req<AdminRouteList>(`/api/admin/routes?mapId=${encodeURIComponent(mapId)}`);
}

export async function moderateZone(
  zoneId: string,
  moderation: ModerationStatus
): Promise<void> {
  await req("/api/admin/zones", {
    method: "PATCH",
    body: JSON.stringify({ zoneId, moderation }),
  });
}

export async function setZoneHidden(zoneId: string, hidden: boolean): Promise<void> {
  await req("/api/admin/zones", {
    method: "PATCH",
    body: JSON.stringify({ zoneId, hidden }),
  });
}

export async function updateZoneFields(
  zoneId: string,
  fields: { name?: string; description?: string | null }
): Promise<void> {
  await req("/api/admin/zones", {
    method: "PATCH",
    body: JSON.stringify({ zoneId, ...fields }),
  });
}

export async function destroyZone(zoneId: string): Promise<void> {
  await req(`/api/admin/zones?zoneId=${encodeURIComponent(zoneId)}`, {
    method: "DELETE",
  });
}

export async function moderateRoute(
  routeId: string,
  moderation: ModerationStatus
): Promise<void> {
  await req("/api/admin/routes", {
    method: "PATCH",
    body: JSON.stringify({ routeId, moderation }),
  });
}

export async function setRouteHidden(routeId: string, hidden: boolean): Promise<void> {
  await req("/api/admin/routes", {
    method: "PATCH",
    body: JSON.stringify({ routeId, hidden }),
  });
}

export async function updateRouteFields(
  routeId: string,
  fields: { name?: string; description?: string | null }
): Promise<void> {
  await req("/api/admin/routes", {
    method: "PATCH",
    body: JSON.stringify({ routeId, ...fields }),
  });
}

export async function destroyRoute(routeId: string): Promise<void> {
  await req(`/api/admin/routes?routeId=${encodeURIComponent(routeId)}`, {
    method: "DELETE",
  });
}

// ---- Admin: bulk moderation (the moderation queue) ----
export type BatchModerationAction = "approve" | "reject" | "hide" | "restore";

export async function moderateSpotsBatch(
  mapId: string,
  ids: string[],
  action: BatchModerationAction
): Promise<void> {
  if (!backendLive || ids.length === 0) return;
  await req("/api/admin/spots/batch", {
    method: "POST",
    body: JSON.stringify({ mapId, ids, action }),
  });
}

export async function moderateZonesBatch(
  mapId: string,
  ids: string[],
  action: BatchModerationAction
): Promise<void> {
  if (!backendLive || ids.length === 0) return;
  await req("/api/admin/zones/batch", {
    method: "POST",
    body: JSON.stringify({ mapId, ids, action }),
  });
}

export async function moderateRoutesBatch(
  mapId: string,
  ids: string[],
  action: BatchModerationAction
): Promise<void> {
  if (!backendLive || ids.length === 0) return;
  await req("/api/admin/routes/batch", {
    method: "POST",
    body: JSON.stringify({ mapId, ids, action }),
  });
}

// ---- Admin: export (GeoJSON / CSV) ----
export async function exportMapBlob(
  mapId: string,
  format: "geojson" | "csv"
): Promise<void> {
  if (!backendLive) return;
  const auth = await authHeaders();
  const res = await fetch(
    `/api/admin/maps/export?mapId=${encodeURIComponent(mapId)}&format=${format}`,
    { headers: auth }
  );
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `HTTP ${res.status}`);
  }
  const blob = await res.blob();
  const disposition = res.headers.get("Content-Disposition") || "";
  const match = /filename="?([^";]+)/.exec(disposition);
  const filename = match?.[1] || `map-${mapId}.${format === "csv" ? "csv" : "geojson"}`;
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---- Admin: auto-moderation rules ----
export async function fetchAdminRules(
  mapId: string
): Promise<{ rules: { mapId: string; enabled: boolean; rules: ModerationRule[]; updatedBy: string | null; updatedAt: string } | null } | null> {
  if (!backendLive) return null;
  return req<{
    rules: { mapId: string; enabled: boolean; rules: ModerationRule[]; updatedBy: string | null; updatedAt: string } | null;
  }>(`/api/admin/maps/rules?mapId=${encodeURIComponent(mapId)}`);
}

export async function saveAdminRules(
  mapId: string,
  enabled: boolean,
  rules: ModerationRule[]
): Promise<{ ok: boolean; rules: { mapId: string; enabled: boolean; rules: ModerationRule[]; updatedBy: string | null; updatedAt: string } | null } | null> {
  if (!backendLive) return null;
  return req<{
    ok: boolean;
    rules: { mapId: string; enabled: boolean; rules: ModerationRule[]; updatedBy: string | null; updatedAt: string } | null;
  }>("/api/admin/maps/rules", {
    method: "PUT",
    body: JSON.stringify({ mapId, enabled, rules }),
  });
}

// ---- Admin: contributors ----
export async function fetchMapContributors(
  mapId: string
): Promise<MapContributorEntry[]> {
  if (!backendLive) return [];
  const res = await req<{ contributors: MapContributorEntry[] }>(
    `/api/admin/maps/contributors?mapId=${encodeURIComponent(mapId)}`
  );
  return res.contributors;
}

// ---- Admin: activity log (audit trail) ----
export interface ActivityEntryApi {
  _id?: string;
  mapId: string;
  actorId: string | null;
  action: string;
  targetType: "spot" | "zone" | "route" | "map";
  targetId?: string | null;
  targetName?: string | null;
  detail?: string | null;
  createdAt: string;
}

export interface ActivityFilter {
  action?: string;
  actorId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function fetchAdminActivity(
  mapId: string,
  limit?: number,
  filters?: ActivityFilter
): Promise<ActivityEntryApi[]> {
  if (!backendLive) return [];
  const params = new URLSearchParams({ mapId });
  if (limit) params.set("limit", String(limit));
  if (filters?.action) params.set("action", filters.action);
  if (filters?.actorId) params.set("actorId", filters.actorId);
  if (filters?.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters?.dateTo) params.set("dateTo", filters.dateTo);
  const res = await req<{ entries: ActivityEntryApi[] }>(`/api/admin/activity?${params.toString()}`);
  return res.entries;
}

// ---- Reports & bans ----
export type AdminReport = SpotReport;

export async function reportSpot(spotId: string, reason: string): Promise<{ ok: boolean; alreadyReported: boolean }> {
  if (!backendLive) return demoReportSpotFn(spotId, reason);
  return req<{ ok: boolean; alreadyReported: boolean }>("/api/spots/report", {
    method: "POST",
    body: JSON.stringify({ spotId, reason }),
  });
}

export async function fetchAdminReports(mapId: string, status: "open" | "resolved" = "open"): Promise<AdminReport[]> {
  if (!backendLive) return [];
  const res = await req<{ reports: AdminReport[] }>(
    `/api/admin/reports?mapId=${encodeURIComponent(mapId)}&status=${status}`
  );
  return res.reports;
}

export async function resolveReport(reportId: string): Promise<void> {
  if (!backendLive) return;
  await req("/api/admin/reports", { method: "PATCH", body: JSON.stringify({ reportId, action: "resolve" }) });
}

export async function fetchAdminBans(mapId: string): Promise<MapBan[]> {
  if (!backendLive) return [];
  const res = await req<{ bans: MapBan[] }>(`/api/admin/bans?mapId=${encodeURIComponent(mapId)}`);
  return res.bans;
}

export async function banUser(mapId: string, userId: string, reason: string): Promise<void> {
  if (!backendLive) return;
  await req("/api/admin/bans", { method: "POST", body: JSON.stringify({ mapId, userId, reason }) });
}

export async function unbanUser(mapId: string, userId: string): Promise<void> {
  if (!backendLive) return;
  await req(`/api/admin/bans?mapId=${encodeURIComponent(mapId)}&userId=${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

// ---- Profile (own contributions) ----
export async function fetchProfile(): Promise<ProfileData> {
  if (!backendLive) {
    return {
      user: {
        id: "",
        email: null,
        firstName: "",
        lastName: "",
        displayName: "",
        initials: "?",
        memberSince: null,
      },
      stats: { spots: 0, reviews: 0, comments: 0, photos: 0, votes: 0, helpfulReceived: 0, mapsOwned: 0 },
      maps: [],
      contributions: { spots: [], reviews: [], comments: [], photos: [] },
    };
  }
  return req<ProfileData>("/api/me");
}
