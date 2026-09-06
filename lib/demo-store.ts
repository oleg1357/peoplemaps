// localStorage-backed demo store. Mirrors the API surface in lib/api-client.ts
// so components behave identically when no backend (MongoDB + Sanity + Supabase)
// is configured. Every function is async to match the network path, and data is
// seeded from lib/demo-data.ts on first use, then persisted to localStorage.

import {
  DEMO_MAPS,
  DEMO_SPOTS,
  DEMO_REVIEWS,
  DEMO_COMMENTS,
  DEMO_PHOTOS,
  DEMO_ZONES,
  DEMO_ROUTES,
} from "./demo-data";
import type {
  Spot,
  Zone,
  Route,
  Review,
  ReviewComment,
  SpotPhoto,
  SpotStatus,
  SpotReport,
} from "./types";
import type { MapData } from "./api-client";

const LS = {
  spots: "peoplemaps_demo_spots",
  reviews: "peoplemaps_demo_reviews",
  comments: "peoplemaps_demo_comments",
  photos: "peoplemaps_demo_photos",
  zones: "peoplemaps_demo_zones",
  routes: "peoplemaps_demo_routes",
  votes: "peoplemaps_demo_votes",
  reports: "peoplemaps_demo_reports",
} as const;

function readCollection<T>(key: string, seed: T[]): T[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return seed;
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as T[]) : seed;
  } catch {
    return seed;
  }
}

function writeCollection<T>(key: string, value: T[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full / blocked — the in-memory result still works this session
  }
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// Demo user id is stored by lib/auth-store under the same key (`"1"`).
function currentUserId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("peoplemaps_user_id");
}

function spots(): Spot[] {
  return readCollection<Spot>(LS.spots, DEMO_SPOTS);
}
function reviews(): Review[] {
  return readCollection<Review>(LS.reviews, DEMO_REVIEWS);
}
function comments(): ReviewComment[] {
  return readCollection<ReviewComment>(LS.comments, DEMO_COMMENTS);
}
function photos(): SpotPhoto[] {
  return readCollection<SpotPhoto>(LS.photos, DEMO_PHOTOS);
}
function zones(): Zone[] {
  return readCollection<Zone>(LS.zones, DEMO_ZONES);
}
function routes(): Route[] {
  return readCollection<Route>(LS.routes, DEMO_ROUTES);
}
function votes(): { reviewId: string; userId: string }[] {
  return readCollection(LS.votes, []);
}

const saveSpots = (v: Spot[]) => writeCollection(LS.spots, v);
const saveReviews = (v: Review[]) => writeCollection(LS.reviews, v);
const saveComments = (v: ReviewComment[]) => writeCollection(LS.comments, v);
const savePhotos = (v: SpotPhoto[]) => writeCollection(LS.photos, v);
const saveZones = (v: Zone[]) => writeCollection(LS.zones, v);
const saveRoutes = (v: Route[]) => writeCollection(LS.routes, v);
const saveVotes = (v: { reviewId: string; userId: string }[]) => writeCollection(LS.votes, v);
const saveReports = (v: SpotReport[]) => writeCollection(LS.reports, v);

function isPublic<T extends { moderation?: string; hidden?: boolean }>(doc: T): boolean {
  return (doc.moderation === "approved" || !doc.moderation) && doc.hidden !== true;
}

function helpfulCountFor(reviewId: string): number {
  return votes().filter((v) => v.reviewId === reviewId).length;
}

function votedBy(reviewId: string, userId: string | null): boolean {
  return Boolean(userId && votes().some((v) => v.reviewId === reviewId && v.userId === userId));
}

// ---- Map data (single batched request, mirrors GET /api/map-data) ----

export async function demoFetchMapData(mapId: string): Promise<MapData> {
  const userId = currentUserId();
  const allSpots = spots();
  const mapSpots = allSpots
    .filter((s) => s.mapId === mapId && isPublic(s))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((s) => ({ ...s, _id: s._id! }));

  const mapZones = zones()
    .filter((z) => z.mapId === mapId && isPublic(z))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const mapRoutes = routes()
    .filter((r) => r.mapId === mapId && isPublic(r))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const spotIds = mapSpots.map((s) => s._id);
  const reviewCol = reviews();
  const mapReviews = reviewCol
    .filter((r) => r._id && spotIds.includes(r.spotId))
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((r) => ({
      ...r,
      helpfulCount: helpfulCountFor(r._id!),
      voted: votedBy(r._id!, userId),
    }));

  const reviewIds = mapReviews.map((r) => r._id!);
  const mapComments = comments()
    .filter((c) => c.reviewId && reviewIds.includes(c.reviewId))
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  // Demo-mode payloads keep the photo bytes so detail panels render immediately
  // (the live backend ships metadata only and fetches bytes lazily).
  const mapPhotos = photos().filter((p) => spotIds.includes(p.spotId));

  return {
    spots: mapSpots,
    reviews: mapReviews,
    comments: mapComments,
    photos: mapPhotos,
    zones: mapZones,
    routes: mapRoutes,
  };
}

// ---- Spots ----

export async function demoFetchMapSpots(mapId: string): Promise<Spot[]> {
  const data = await demoFetchMapData(mapId);
  return data.spots;
}

export async function demoFetchSpotById(spotId: string): Promise<Spot | null> {
  return spots().find((s) => s._id === spotId) ?? null;
}

export async function demoCreateSpot(
  input: Omit<Spot, "_id" | "createdAt">
): Promise<{ spot: Spot; spots: Spot[] }> {
  const spot: Spot = {
    ...input,
    _id: uid("spot"),
    createdAt: new Date().toISOString(),
    moderation: "approved",
    hidden: false,
  };
  saveSpots([spot, ...spots()]);
  const data = await demoFetchMapData(input.mapId);
  return { spot, spots: data.spots };
}

export async function demoUpdateOwnSpot(
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
  const all = spots();
  const idx = all.findIndex((s) => s._id === spotId);
  if (idx === -1) return null;
  const updated: Spot = { ...all[idx], ...fields };
  const next = [...all];
  next[idx] = updated;
  saveSpots(next);
  return updated;
}

export async function demoDeleteSpot(spotId: string): Promise<void> {
  const revs = reviews().filter((r) => r.spotId === spotId);
  const revIds = revs.map((r) => r._id!).filter(Boolean);
  saveSpots(spots().filter((s) => s._id !== spotId));
  saveReviews(reviews().filter((r) => r.spotId !== spotId));
  saveComments(comments().filter((c) => !revIds.includes(c.reviewId || "")));
  savePhotos(photos().filter((p) => p.spotId !== spotId));
  saveVotes(votes().filter((v) => !revIds.includes(v.reviewId)));
}

// ---- Zones & routes ----

export async function demoCreateZone(
  input: Omit<Zone, "_id" | "createdAt">
): Promise<{ zone: Zone; zones: Zone[] }> {
  const zone: Zone = {
    ...input,
    _id: uid("zone"),
    createdAt: new Date().toISOString(),
    moderation: "approved",
    hidden: false,
  };
  saveZones([zone, ...zones()]);
  const data = await demoFetchMapData(input.mapId);
  return { zone, zones: data.zones };
}

export async function demoCreateRoute(
  input: Omit<Route, "_id" | "createdAt">
): Promise<{ route: Route; routes: Route[] }> {
  const route: Route = {
    ...input,
    _id: uid("route"),
    createdAt: new Date().toISOString(),
    moderation: "approved",
    hidden: false,
  };
  saveRoutes([route, ...routes()]);
  const data = await demoFetchMapData(input.mapId);
  return { route, routes: data.routes };
}

// ---- Reviews ----

export async function demoFetchReviews(spotId: string): Promise<Review[]> {
  const userId = currentUserId();
  return reviews()
    .filter((r) => r.spotId === spotId)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .map((r) => ({
      ...r,
      helpfulCount: helpfulCountFor(r._id!),
      voted: votedBy(r._id!, userId),
    }));
}

export async function demoAddReview(
  spotId: string,
  score: number,
  review: string,
  userId?: string | null
): Promise<Review | null> {
  const spot = spots().find((s) => s._id === spotId);
  if (!spot) return null;
  const doc: Review = {
    _id: uid("review"),
    spotId,
    review,
    score: Math.max(0, Math.min(5, Math.round(Number(score) || 0))),
    date: new Date().toISOString().slice(0, 10),
    user_fk: userId ?? currentUserId(),
    helpfulCount: 0,
    voted: false,
  };
  saveReviews([doc, ...reviews()]);
  return doc;
}

export async function demoUpdateReview(
  reviewId: string,
  review: string,
  score: number
): Promise<void> {
  saveReviews(
    reviews().map((r) =>
      r._id === reviewId
        ? { ...r, review, score: Math.max(0, Math.min(5, Math.round(Number(score) || 0))) }
        : r
    )
  );
}

export async function demoDeleteReview(reviewId: string): Promise<void> {
  saveReviews(reviews().filter((r) => r._id !== reviewId));
  saveComments(comments().filter((c) => c.reviewId !== reviewId));
  saveVotes(votes().filter((v) => v.reviewId !== reviewId));
}

// ---- Comments ----

export async function demoFetchComments(reviewId: string): Promise<ReviewComment[]> {
  return comments()
    .filter((c) => c.reviewId === reviewId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function demoAddComment(
  reviewId: string,
  text: string,
  opts: { userId?: string | null; parentId?: string | null; authorName?: string } = {}
): Promise<ReviewComment | null> {
  const doc: ReviewComment = {
    _id: uid("comment"),
    reviewId,
    text,
    date: new Date().toISOString().slice(0, 10),
    user_fk: opts.userId ?? currentUserId(),
    authorName: opts.authorName,
    parentId: opts.parentId ?? null,
  };
  if (doc.parentId) {
    const parent = comments().find((c) => c._id === doc.parentId && c.reviewId === reviewId);
    if (!parent) return null;
  }
  saveComments([...comments(), doc]);
  return doc;
}

export async function demoDeleteComment(commentId: string): Promise<void> {
  const col = comments();
  const ids = new Set<string>([commentId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const c of col) {
      if (c.parentId && ids.has(c.parentId) && c._id && !ids.has(c._id)) {
        ids.add(c._id);
        changed = true;
      }
    }
  }
  saveComments(col.filter((c) => !(c._id && ids.has(c._id))));
}

// ---- Status ----

export async function demoFetchStatus(spotId: string): Promise<SpotStatus> {
  return spots().find((s) => s._id === spotId)?.status ?? "unknown";
}

export async function demoSetStatus(spotId: string, status: SpotStatus): Promise<void> {
  saveSpots(spots().map((s) => (s._id === spotId ? { ...s, status } : s)));
}

// ---- Votes ----

export async function demoToggleHelpfulReview(
  reviewId: string,
  userId: string | null
): Promise<{ count: number; voted: boolean }> {
  if (!userId) {
    return { count: helpfulCountFor(reviewId), voted: false };
  }
  const col = votes();
  const existing = col.find((v) => v.reviewId === reviewId && v.userId === userId);
  const next = existing
    ? col.filter((v) => v !== existing)
    : [...col, { reviewId, userId }];
  saveVotes(next);
  return { count: next.filter((v) => v.reviewId === reviewId).length, voted: !existing };
}

// ---- Photos ----

export async function demoFetchPhotos(spotId: string): Promise<SpotPhoto[]> {
  return photos()
    .filter((p) => p.spotId === spotId)
    .sort((a, b) => (a.date < b.date ? 1 : -1));
}

export async function demoAddSpotPhoto(
  spotId: string,
  dataUrl: string,
  userId?: string | null
): Promise<SpotPhoto | null> {
  const all = photos();
  const existing = all.filter((p) => p.spotId === spotId);
  const spot = spots().find((s) => s._id === spotId);
  const map = DEMO_MAPS.find((m) => m._id === spot?.mapId);
  const max = map?.maxPhotosPerSpot ?? 6;
  const doc: SpotPhoto = {
    _id: uid("photo"),
    spotId,
    dataUrl,
    date: new Date().toISOString().slice(0, 10),
    uploader_fk: userId ?? currentUserId(),
  };
  let next = [doc, ...existing];
  if (max > 0 && next.length > max) {
    next = next.slice(0, max);
  }
  savePhotos(next);
  return doc;
}

// ---- Reports ----

export async function demoReportSpot(
  spotId: string,
  reason: string
): Promise<{ ok: boolean; alreadyReported: boolean }> {
  const reports = readCollection<SpotReport>(LS.reports, []);
  const s = spots().find((x) => x._id === spotId);
  const reporterId = currentUserId() ?? "guest";
  const existing = reports.find(
    (r) => r.spotId === spotId && r.reporterId === reporterId && r.status === "open"
  );
  if (existing) return { ok: false, alreadyReported: true };
  saveReports([
    ...reports,
    {
      _id: uid("report"),
      spotId,
      mapId: s?.mapId ?? "",
      reporterId,
      reason,
      spotName: s?.name,
      status: "open",
      createdAt: new Date().toISOString(),
    },
  ]);
  return { ok: true, alreadyReported: false };
}