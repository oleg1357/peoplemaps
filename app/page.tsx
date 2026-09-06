import type { Metadata } from "next";
import { HomePage } from "@/components/HomePage";
import { JsonLd } from "@/components/JsonLd";
import type { HomeMapCardData } from "@/components/MapCard";
import { serverClient } from "@/sanity/lib/client";
import { PUBLIC_MAPS_QUERY } from "@/sanity/lib/queries";
import { coverImageUrl } from "@/sanity/lib/images";
import { getDb, COLLECTIONS } from "@/lib/mongodb";
import type { MapDocument, Spot } from "@/lib/types";
import {
  SITE_NAME,
  SITE_DEFAULT_TITLE,
  SITE_DESCRIPTION,
  SITE_TWITTER_HANDLE,
  siteUrl,
} from "@/lib/site";

const origin = siteUrl();

// Public maps + per-map spot counts are resolved here on the server (Sanity +
// Mongo) once and revalidated, so the homepage makes no client data requests.
export const revalidate = 300;

export const metadata: Metadata = {
  title: {
    absolute: SITE_DEFAULT_TITLE,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    url: origin,
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    site: SITE_TWITTER_HANDLE,
  },
  alternates: { canonical: origin },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: origin,
  logo: `${origin}/icon.svg`,
  sameAs: [],
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: origin,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  description: SITE_DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: SITE_NAME, url: origin },
  inLanguage: "en",
  about: "Community-managed maps and local places",
};

async function fetchLiveMaps(): Promise<HomeMapCardData[]> {
  try {
    if (!serverClient) return [];
    const maps = (await serverClient.fetch<MapDocument[]>(
      PUBLIC_MAPS_QUERY
    )) ?? [];

    // One aggregated Mongo call for the publicly visible spot totals (approved
    // or pre-moderation, not hidden) — matches what the map view shows.
    const counts: Record<string, number> = {};
    const db = await getDb();
    if (db) {
      const rows = await db
        .collection<Spot>(COLLECTIONS.spots)
        .aggregate<{ _id: string; count: number }>([
          {
            $match: {
              $or: [{ moderation: "approved" }, { moderation: { $exists: false } }],
              hidden: { $ne: true },
            },
          },
          { $group: { _id: "$mapId", count: { $sum: 1 } } },
        ])
        .toArray();
      for (const r of rows) counts[r._id] = r.count;
    }

    return maps.map((m) => ({
      id: m._id,
      slug: m.slug ?? undefined,
      title: m.title,
      description: m.description ?? "",
      ownerName: m.ownerName || "Community",
      spotCount: counts[m._id] ?? 0,
      accent: m.accentColor ?? undefined,
      coverUrl: coverImageUrl(m.coverImage),
      category: m.category ?? null,
      tags: m.tags ?? null,
    }));
  } catch {
    // If Sanity or Mongo are unavailable, fall back to the demo cards only.
    return [];
  }
}

export default async function Home() {
  const liveMaps = await fetchLiveMaps();
  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={webAppJsonLd} />
      <HomePage liveMaps={liveMaps} />
    </>
  );
}
