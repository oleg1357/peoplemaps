import { defineQuery } from "next-sanity";

export const MAP_BY_ID_QUERY = defineQuery(`
  *[_id == $id][0]{
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    description,
    ownerId,
    ownerName,
    isPublic,
    baseCenter,
    baseZoom
  }
`);

export const MAPS_BY_OWNER_QUERY = defineQuery(`
  *[_type == "map" && ownerId == $ownerId] | order(_createdAt desc) {
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    description,
    ownerId,
    ownerName,
    isPublic,
    baseCenter,
    baseZoom
  }
`);

export const PUBLIC_MAPS_QUERY = defineQuery(`
  *[_type == "map" && isPublic == "public"] | order(_createdAt desc) {
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    description,
    ownerId,
    ownerName,
    isPublic,
    baseCenter,
    baseZoom
  }
`);

export const ALL_MAPS_QUERY = defineQuery(`
  *[_type == "map"] | order(_createdAt desc) {
    _id,
    _createdAt,
    title,
    "slug": slug.current,
    description,
    ownerId,
    ownerName,
    isPublic,
    baseCenter,
    baseZoom
  }
`);
