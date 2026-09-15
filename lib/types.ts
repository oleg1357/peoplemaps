// Shared types for the MongoDB-backed coordination + spots layer.

import type { MapCapability, MapRoleType } from "@/lib/roles";

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
  // Rich content: price level (0-3, like $ to $$$), opening hours as free text,
  // tags for discovery, and an insider tip ("best time to visit").
  priceLevel?: number | null;
  hoursNote?: string | null;
  tags?: string[] | null;
  tip?: string | null;
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
  // Helpful-vote aggregate + current viewer's vote, attached by /api/map-data.
  helpfulCount?: number;
  voted?: boolean;
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
  // Choropleth: numeric value mapped onto a color ramp. When set, the zone is
  // filled with a value-derived color instead of `color` (see lib/choropleth).
  value?: number | null;
  // Trust signals for choropleth overlays: how many submissions contributed to
  // `value`, and when the value was last updated.
  valueCount?: number | null;
  valueUpdatedAt?: string | null;
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

// A designated team member of a map. One document per (mapId, userId) pair.
// Roles grant capabilities (see lib/roles.ts): viewers are read-only, reviewers
// can approve/reject pending content, moderators get full content control.
// Fully granular PAM: an explicit `capabilities` array overrides the role
// preset, so an owner can grant any exact subset to a member.
// Legacy rows without a `role` field behave as "moderator".
export interface MapRole {
  _id?: string;
  mapId: string; // Sanity map document _id
  userId: string; // Supabase user id of the team member
  role?: MapRoleType; // viewer | reviewer | moderator (preset label)
  capabilities?: MapCapability[] | null; // explicit granular grants (overrides preset)
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
  // Sanity stores this as the string "public" / "private" (radio list), so the
  // type mirrors the document value rather than a boolean.
  isPublic?: "public" | "private";
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
  // New per-map settings
  coverImage?: { _type: string; asset?: { _ref?: string } } | null;
  contactEmail?: string | null;
  website?: string | null;
  allowReviews?: boolean | null;
  allowComments?: boolean | null;
  allowPhotos?: boolean | null;
  collaborationMode?: "anyone" | "loggedIn" | "invitedOnly" | null;
  enableClustering?: boolean | null;
  // Choropleth overlay settings. `choroplethRamp` picks the color scale used
  // to fill valued zones; `choroplethMetric` selects what auto-averages from
  // the spots inside a zone when the zone has no explicit `value`.
  choroplethRamp?: "sequential" | "diverging" | null;
  choroplethMetric?: "priceLevel" | "rating" | null;
  // Discovery: primary category + comma-separated tag keywords.
  category?: string | null;
  tags?: string | null;
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
  description?: string;
  accentColor: string | null;
  spotCount: number;
  coverUrl?: string | null;
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

// A single auto-moderation rule. When a new submission matches, it is
// auto-approved (trusted content) or auto-rejected (spam/off-topic) without
// waiting for a moderator. `field` selects which part of the submission is
// scanned; "any" covers name, tip, hours and tags together.
export interface ModerationRule {
  id: string; // client-generated stable id
  action: "approve" | "reject";
  field: "name" | "tip" | "tags" | "any";
  pattern: string; // case-insensitive substring
}

// Per-map auto-moderation configuration (stored in Mongo, unlike Sanity map
// settings). Reject rules win over approve rules when both match.
export interface MapRules {
  mapId: string;
  enabled: boolean;
  rules: ModerationRule[];
  updatedBy: string | null;
  updatedAt: string;
}

// Per-contributor aggregation for a map (from /api/admin/maps/contributors).
export interface MapContributorEntry {
  userId: string | null; // null = anonymous submission (map in "anyone" mode)
  spots: number;
  pending: number;
  approved: number;
  rejected: number;
  hidden: number;
  zones: number;
  routes: number;
  reviews: number;
  comments: number;
  photos: number;
  total: number;
  lastActive: string | null; // ISO date of their most recent contribution
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

// Per-user billing/profile row stored in Mongo (keyed by Supabase auth id).
// Feeds the free-tier map quota and gates the "private" visibility option.
export type PlanTier = "free" | "pro";

export type SubscriptionStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "paused"
  | "canceled";

export interface UserProfile {
  userId: string;
  plan: PlanTier;
  paddleCustomerId?: string | null;
  paddleSubscriptionId?: string | null;
  subscriptionStatus?: SubscriptionStatus | null;
  proSince?: string | null;
  updatedAt: string;
}
