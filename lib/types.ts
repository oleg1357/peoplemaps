// Shared types for the MongoDB-backed coordination + spots layer.

export type SpotStatus = "open" | "closed" | "unknown";

// Moderation state of a spot. New spots start as "pending" and must be
// approved (or rejected) by a map owner (or global admin) before they are
// visible on the public map.
export type ModerationStatus = "pending" | "approved" | "rejected";

// A single point/spot on a user's map. Belongs to a Sanity map document via mapId.
export interface Spot {
  _id?: string;
  mapId: string; // == Sanity map document _id
  name: string;
  street: string;
  city: string;
  zip: number;
  lat: number;
  lng: number;
  createdBy?: string | null; // supabase user id
  createdAt: string;
  status?: SpotStatus;
  // Marker look (emoji + color). Falls back to the map's defaults when unset.
  marker?: string | null;
  markerColor?: string | null;
  // Moderation / admin fields
  moderation?: ModerationStatus;
  hidden?: boolean;
  reviewedBy?: string | null; // supabase user id of the reviewer
  reviewedAt?: string | null;
  reviewNote?: string | null;
}

export interface Review {
  _id?: string;
  spotId: string;
  review: string;
  score: number;
  date: string;
  user_fk?: string | null; // supabase user id
}

export interface ReviewComment {
  _id?: string;
  reviewId: string;
  user_fk?: string | null; // supabase user id
  authorName?: string;
  // Reply to another comment on the same review. `undefined`/null = direct
  // reply to the review itself.
  parentId?: string | null;
  text: string;
  date: string;
}

export interface SpotPhoto {
  _id?: string;
  spotId: string;
  dataUrl: string;
  uploader_fk?: string | null;
  date: string;
}

// Lightweight photo descriptor used in list payloads (e.g. /api/map-data).
// The image bytes (`dataUrl`) are not shipped here — they are fetched per spot
// on demand so maps with many photos stay cheap to load.
export interface SpotPhotoMeta {
  _id?: string;
  spotId: string;
  date: string;
}

export type GeoPoint = [number, number];

// A filled area on the map (polygon or circle). Belongs to a Sanity map via mapId.
export interface Zone {
  _id?: string;
  mapId: string; // == Sanity map document _id
  name: string;
  // "polygon" uses `points`; "circle" uses `center` + `radius`.
  shape: "polygon" | "circle";
  points?: GeoPoint[]; // polygon vertices (lat,lng)
  center?: GeoPoint; // circle center (lat,lng)
  radius?: number; // circle radius in meters
  color?: string | null; // hex fill/stroke color
  description?: string | null;
  createdBy?: string | null; // supabase user id
  createdAt: string;
  // Moderation mirrors Spot so zones can be approved/rejected/hidden later.
  moderation?: ModerationStatus;
  hidden?: boolean;
}

// A path/route on the map (polyline). Belongs to a Sanity map via mapId.
export interface Route {
  _id?: string;
  mapId: string; // == Sanity map document _id
  name: string;
  points: GeoPoint[]; // ordered vertices (lat,lng)
  color?: string | null; // hex stroke color
  description?: string | null;
  createdBy?: string | null; // supabase user id
  createdAt: string;
  // Moderation mirrors Spot so routes can be approved/rejected/hidden later.
  moderation?: ModerationStatus;
  hidden?: boolean;
}

export interface ReviewVote {
  _id?: string;
  reviewId: string;
  userId: string;
}

// A designated moderator of a map. One document per (mapId, userId) pair.
// Moderators can review/edit/destroy spots but cannot change map settings,
// manage other moderators, or delete the map itself.
export interface MapRole {
  _id?: string;
  mapId: string; // Sanity map document _id
  userId: string; // Supabase user id of the moderator
  displayName?: string; // human-readable name captured at assignment time
  addedBy: string; // Supabase user id of the owner who assigned them
  addedAt: string; // ISO timestamp
}

// Sanity map document (the user-created map; points live in Mongo).
export interface MapDocument {
  _id: string;
  _createdAt?: string;
  title: string;
  // Unwrapped from Sanity's slug type (`slug.current`) by all queries.
  slug?: string | null;
  description?: string;
  ownerId?: string; // supabase user id of the map creator
  ownerName?: string;
  isPublic?: boolean;
  baseCenter?: { lat: number; lng: number };
  baseZoom?: number;
  // Map-owner settings
  accentColor?: string | null;
  defaultMarker?: string | null;
  defaultMarkerColor?: string | null;
  welcomeMessage?: string | null;
  submissionNote?: string | null;
  maxPhotosPerSpot?: number | null;
  requireApproval?: boolean | null;
}

// ---- Profile / "my contributions" (served by GET /api/me) ----

export interface ProfileUser {
  id: string;
  email: string | null;
  firstName: string;
  lastName: string;
  displayName: string;
  initials: string;
  memberSince: string | null; // ISO date
}

export interface ProfileStats {
  spots: number;
  reviews: number;
  comments: number;
  photos: number;
  votes: number;
  helpfulReceived: number;
  mapsOwned: number;
}

export interface OwnedMapSummary {
  _id: string;
  title: string;
  slug: string | null;
  accentColor: string | null;
  spotCount: number;
}

export interface ProfileSpotContribution {
  _id: string;
  mapId: string;
  mapTitle: string;
  mapSlug: string | null;
  name: string;
  city: string;
  status?: SpotStatus;
  moderation?: ModerationStatus;
  marker?: string | null;
  markerColor?: string | null;
  createdAt: string;
}

export interface ProfileReviewContribution {
  _id: string;
  spotId: string;
  spotName: string;
  mapId: string;
  mapTitle: string;
  mapSlug: string | null;
  score: number;
  review: string;
  date: string;
}

export interface ProfileCommentContribution {
  _id: string;
  spotId: string;
  spotName: string;
  reviewText: string;
  text: string;
  date: string;
}

export interface ProfilePhotoContribution {
  _id: string;
  spotId: string;
  spotName: string;
  mapId: string;
  mapSlug: string | null;
  dataUrl: string;
  date: string;
}

// A user-submitted flag on a spot, resolved by a moderator.
export interface SpotReport {
  _id?: string;
  spotId: string;
  mapId: string;
  reporterId: string;
  reason: string;
  spotName?: string;
  status: "open" | "resolved";
  createdAt: string;
  resolvedAt?: string | null;
}

// A user banned from contributing to a specific map.
export interface MapBan {
  _id?: string;
  mapId: string;
  userId: string;
  reason: string;
  bannedBy: string;
  createdAt: string;
}

export interface ProfileData {
  user: ProfileUser;
  stats: ProfileStats;
  maps: OwnedMapSummary[];
  contributions: {
    spots: ProfileSpotContribution[];
    reviews: ProfileReviewContribution[];
    comments: ProfileCommentContribution[];
    photos: ProfilePhotoContribution[];
  };
}
