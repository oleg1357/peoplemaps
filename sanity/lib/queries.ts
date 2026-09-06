import { defineQuery } from "next-sanity";

// Core document fields shared by every map query (server + client).
export const MAP_CORE_FIELDS = `
  _id,
  _createdAt,
  title,
  "slug": slug.current,
  description,
  ownerId,
  ownerName,
  isPublic,
  baseCenter,
  baseZoom`;

export const MAP_FIELDS = `,
  accentColor,
  defaultMarker,
  defaultMarkerColor,
  welcomeMessage,
  submissionNote,
  maxPhotosPerSpot,
  requireApproval,
  coverImage,
  contactEmail,
  website,
  allowReviews,
  allowComments,
  allowPhotos,
  collaborationMode,
  enableClustering,
  category,
  tags`;

// Full map document projection. Used by the server-side API routes (lib/admin.ts)
// so there is a single source of truth for which fields a map returns.
export const MAP_PROJECTION = `{
${MAP_CORE_FIELDS}
${MAP_FIELDS}
}`;

export const MAP_BY_ID_QUERY = defineQuery(`
  *[_id == $id][0]{
    ${MAP_CORE_FIELDS}
    ${MAP_FIELDS}
  }
`);

export const MAPS_BY_OWNER_QUERY = defineQuery(`
  *[_type == "map" && ownerId == $ownerId] | order(_createdAt desc) {
    ${MAP_CORE_FIELDS}
    ${MAP_FIELDS}
  }
`);

export const PUBLIC_MAPS_QUERY = defineQuery(`
  *[_type == "map" && isPublic == "public"] | order(_createdAt desc) {
    ${MAP_CORE_FIELDS}
    ${MAP_FIELDS}
  }
`);

export const ALL_MAPS_QUERY = defineQuery(`
  *[_type == "map"] | order(_createdAt desc) {
    ${MAP_CORE_FIELDS}
    ${MAP_FIELDS}
  }
`);
