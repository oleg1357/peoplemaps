import { sanityConfigured } from "@/sanity/lib/client";
import { supabaseConfigured } from "./supabase";
import {
  addReview as localAddReview,
  updateReview as localUpdateReview,
  deleteReview as localDeleteReview,
  getSpotStatus as localGetStatus,
  setSpotStatus as localSetStatus,
  toggleHelpfulReview as localToggleVote,
  addComment as localAddComment,
  addSpotPhoto as localAddPhoto,
  isWatching as localIsWatching,
  toggleWatch as localToggleWatch,
  getSpotPhotosCount,
  getAllReviews,
  getAuthorName,
} from "./store";
import type { Spot, Review, ReviewComment, SpotPhoto, SpotStatus, SavedEntry, WatchEntry, ModerationStatus, MapDocument } from "./types";

// True when the backend (Mongo + Sanity) is wired. Uses public env flags so the
// client bundle can decide which experience to render. The API route handlers
// still independently guard on MONGODB_URI server-side.
export const backendLive =
  (process.env.NEXT_PUBLIC_BACKEND_LIVE === "1" ||
    process.env.NEXT_PUBLIC_BACKEND_LIVE === "true") &&
  sanityConfigured &&
  supabaseConfigured;

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      "Content-Type": "application/json",
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

// ---- Spots ----
export async function fetchMapSpots(mapId: string): Promise<Spot[]> {
  if (!backendLive) return [];
  return req<Spot[]>(`/api/spots?mapId=${encodeURIComponent(mapId)}`);
}

// Everything the map view needs in a single request.
export interface MapData {
  spots: Spot[];
  reviews: Review[];
  comments: ReviewComment[];
  photos: SpotPhoto[];
  watches: WatchEntry[];
  saved: SavedEntry[];
}

export async function fetchMapData(mapId: string): Promise<MapData> {
  if (!backendLive) {
    return { spots: [], reviews: [], comments: [], photos: [], watches: [], saved: [] };
  }
  return req<MapData>(`/api/map-data?mapId=${encodeURIComponent(mapId)}`);
}

// POST returns the created spot plus the updated public spot list for the map,
// so the caller can refresh in a single request.
export interface CreateSpotResult {
  spot: Spot;
  spots: Spot[];
}

export async function createSpot(input: Omit<Spot, "_id" | "createdAt">): Promise<CreateSpotResult> {
  if (!backendLive) throw new Error("backend not configured");
  return req<CreateSpotResult>("/api/spots", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function deleteSpot(spotId: string): Promise<void> {
  if (!backendLive) return;
  await req(`/api/spots?spotId=${encodeURIComponent(spotId)}`, { method: "DELETE" });
}

export async function fetchSpotById(spotId: string): Promise<Spot> {
  if (!backendLive) return {} as Spot;
  return req<Spot>(`/api/spots?spotId=${encodeURIComponent(spotId)}`);
}

// ---- Reviews ----
export async function fetchReviews(spotId: string): Promise<Review[]> {
  if (!backendLive) return [];
  return req<Review[]>(`/api/reviews?spotId=${encodeURIComponent(spotId)}`);
}

export async function addReview(spotId: string, score: number, review: string, userId?: string | null): Promise<Review | null> {
  if (!backendLive) {
    // fallback kept local (numeric id used by demo layer)
    localAddReview(Number(spotId), score, review, userId);
    return null;
  }
  return req<Review>("/api/reviews", {
    method: "POST",
    body: JSON.stringify({ spotId, score, review, user_fk: userId }),
  });
}

export async function updateReview(reviewId: string, review: string, score: number): Promise<void> {
  if (!backendLive) {
    localUpdateReview(Number(reviewId), review, score);
    return;
  }
  await req("/api/reviews", { method: "PATCH", body: JSON.stringify({ id: reviewId, review, score }) });
}

export async function deleteReview(reviewId: string): Promise<void> {
  if (!backendLive) {
    localDeleteReview(Number(reviewId));
    return;
  }
  await req(`/api/reviews?id=${encodeURIComponent(reviewId)}`, { method: "DELETE" });
}

// ---- Status ----
export async function fetchStatus(spotId: string): Promise<SpotStatus> {
  if (!backendLive) return localGetStatus(Number(spotId));
  return (await req<{ status: SpotStatus }>(`/api/spots/status?spotId=${encodeURIComponent(spotId)}`)).status;
}

export async function setStatus(spotId: string, status: SpotStatus): Promise<void> {
  if (!backendLive) {
    localSetStatus(Number(spotId), status);
    return;
  }
  await req("/api/spots/status", { method: "POST", body: JSON.stringify({ spotId, status }) });
}

// ---- Votes ----
export async function toggleHelpfulReview(reviewId: string, userId: string | null): Promise<{ count: number; voted: boolean }> {
  if (!backendLive) return localToggleVote(Number(reviewId), userId);
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
  if (!backendLive) return [];
  return req<ReviewComment[]>(`/api/comments?reviewId=${encodeURIComponent(reviewId)}`);
}

export async function addComment(reviewId: string, text: string, userId?: string | null): Promise<ReviewComment | null> {
  if (!backendLive) {
    localAddComment(Number(reviewId), text, userId);
    return null;
  }
  return req<ReviewComment>("/api/comments", { method: "POST", body: JSON.stringify({ reviewId, text, user_fk: userId }) });
}

// ---- Photos ----
export async function fetchPhotos(spotId: string): Promise<SpotPhoto[]> {
  if (!backendLive) return [];
  return req<SpotPhoto[]>(`/api/photos?spotId=${encodeURIComponent(spotId)}`);
}

export async function addSpotPhoto(spotId: string, dataUrl: string, userId?: string | null): Promise<SpotPhoto | null> {
  if (!backendLive) {
    localAddPhoto(Number(spotId), dataUrl, userId);
    return null;
  }
  return req<SpotPhoto>("/api/photos", { method: "POST", body: JSON.stringify({ spotId, dataUrl, user_fk: userId }) });
}

export async function getSpotPhotosCountApi(spotId: string): Promise<number> {
  if (!backendLive) return getSpotPhotosCount(Number(spotId));
  const photos = await fetchPhotos(spotId);
  return photos.length;
}

// ---- Watch ----
export async function isWatchingApi(spotId: string, userId?: string | null): Promise<boolean> {
  if (!backendLive) return localIsWatching(Number(spotId), userId);
  if (!userId) return false;
  const list = await req<Array<{ spotId: string }>>(`/api/watches?userId=${encodeURIComponent(userId)}`);
  return list.some((w) => String(w.spotId) === String(spotId));
}

export async function toggleWatchApi(spotId: string, userId?: string | null): Promise<boolean> {
  if (!backendLive) return localToggleWatch(Number(spotId), userId);
  if (!userId) return false;
  const res = await req<{ ok: boolean; on: boolean }>("/api/watches", {
    method: "POST",
    body: JSON.stringify({ spotId, userId }),
  });
  return res.on;
}

// ---- Saved (favourites) ----
export async function fetchSavedSpots(userId: string | null): Promise<SavedEntry[]> {
  if (!backendLive || !userId) return [];
  return req<SavedEntry[]>(`/api/saved?userId=${encodeURIComponent(userId)}`);
}

export async function toggleSaveApi(spotId: string, userId: string | null): Promise<boolean> {
  if (!backendLive || !userId) return false;
  const res = await req<{ ok: boolean; on: boolean }>("/api/saved", {
    method: "POST",
    body: JSON.stringify({ userId, spotId }),
  });
  return res.on;
}

// ---- Author name helpers (demo only falls back to local users) ----
export function authorName(user_fk: number | null | undefined | string): string {
  if (user_fk === null || user_fk === undefined) return "Anonymous";
  return getAuthorName(Number(user_fk));
}

// ---- Admin (map owners / global admins) ----
export interface AdminMapEntry extends MapDocument {
  spotTotal: number;
  spotPending: number;
  spotHidden: number;
}

export interface AdminMapsResponse {
  maps: AdminMapEntry[];
  owned: AdminMapEntry[];
  isAdmin: boolean;
}

export interface CreateMapInput {
  title: string;
  description?: string;
  isPublic?: "public" | "private";
}

export async function createMap(input: CreateMapInput): Promise<{ _id: string; title: string }> {
  if (!backendLive) throw new Error("backend not configured");
  return req<{ _id: string; title: string }>("/api/admin/maps", {
    method: "POST",
    body: JSON.stringify(input),
  });
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
  fields: Partial<Pick<Spot, "name" | "street" | "city" | "zip" | "lat" | "lng" | "status">>
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

// Convenience: author display for a Mongo spot (ownerName not stored on spot)
export { getAllReviews, getAuthorName };
