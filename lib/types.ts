// Shared types for the MongoDB-backed coordination + spots layer.

export type SpotStatus = "open" | "closed" | "unknown";

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
  user_fk?: string | null;
  authorName?: string;
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

export interface ReviewVote {
  _id?: string;
  reviewId: string;
  userId: string;
}

export interface SavedEntry {
  _id?: string;
  userId: string;
  spotId: string;
  note: string;
}

export interface WatchEntry {
  _id?: string;
  userId: string;
  spotId: string;
}

// Sanity map document (the user-created map; points live in Mongo).
export interface MapDocument {
  _id: string;
  _createdAt?: string;
  title: string;
  slug?: { current: string } | null;
  description?: string;
  ownerId?: string; // supabase user id of the map creator
  ownerName?: string;
  isPublic?: boolean;
  baseCenter?: { lat: number; lng: number };
  baseZoom?: number;
}
