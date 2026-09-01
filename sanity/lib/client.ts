import { createClient } from "next-sanity";

// Guards everything by env presence so the app still runs before keys are added.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2026-02-01";

export const sanityConfigured = Boolean(projectId);

export const client = sanityConfigured
  ? createClient({
      projectId: projectId as string,
      dataset,
      apiVersion,
      useCdn: false,
    })
  : null;

export const serverClient = sanityConfigured
  ? createClient({
      projectId: projectId as string,
      dataset,
      apiVersion,
      useCdn: false,
      token: process.env.SANITY_API_READ_TOKEN,
    })
  : null;

// Server-side client with write access. Used to create/update map documents,
// e.g. POST /api/admin/maps. Requires a write-capable API token in
// SANITY_API_WRITE_TOKEN; the read token can NOT create documents.
export const writeClient = sanityConfigured && process.env.SANITY_API_WRITE_TOKEN
  ? createClient({
      projectId: projectId as string,
      dataset,
      apiVersion,
      useCdn: false,
      token: process.env.SANITY_API_WRITE_TOKEN,
    })
  : null;
