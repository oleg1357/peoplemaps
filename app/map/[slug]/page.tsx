import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { cache } from "react";
import { getMap, getMapBySlug, isGlobalAdmin } from "@/lib/admin";
import { getServerSupabase } from "@/lib/supabase-server";
import { MapSeededPage } from "@/components/MapSeededPage";
import { MapProvider } from "@/lib/MapContext";
import type { MapDocument } from "@/lib/types";
import { SITE_DESCRIPTION, siteUrl } from "@/lib/site";

const origin = siteUrl();

// Wrapped in React's `cache()` so generateMetadata and the page body share a
// single Sanity lookup per request instead of resolving the map twice.
const resolveMap = cache(
  async (slug: string): Promise<MapDocument | null> => {
    if (!slug) return null;
    // Prefer a stable permalink slug; also accept the Sanity _id directly so old
    // `?map=<id>` links keep working when copied to `/map/<id>`.
    return (await getMapBySlug(slug)) ?? (await getMap(slug));
  }
);

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const map = await resolveMap(slug);
  if (!map) return { title: "Map not found" };
  const url = map.slug
    ? `${origin}/map/${map.slug}`
    : `${origin}/map?map=${encodeURIComponent(map._id)}`;
  return {
    title: `${map.title} — map`,
    description: map.description || SITE_DESCRIPTION,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: `${map.title} — PeopleMaps`,
      description: map.description || SITE_DESCRIPTION,
    },
  };
}

export default async function MapPermalinkPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const map = await resolveMap(slug);
  if (!map) notFound();

  // Private maps are only viewable (via permalink) by their owner or global
  // admins. Public maps are open to everyone.
  if (String(map.isPublic) !== "public") {
    let allowed = false;
    const sb = await getServerSupabase();
    if (sb) {
      const {
        data: { user },
      } = await sb.auth.getUser();
      allowed = Boolean(user && (user.id === map.ownerId || isGlobalAdmin(user.id)));
    } else {
      // No auth configured — treat everything as open.
      allowed = true;
    }
    if (!allowed) {
      return (
        <div className="page">
          <div className="admin-empty">
            <p>
              This map is private. If it&apos;s yours,{" "}
              <Link href="/login" prefetch={false}>sign in</Link> to view it.
            </p>
          </div>
        </div>
      );
    }
  }

  return (
    <MapProvider>
      <MapSeededPage map={map} />
    </MapProvider>
  );
}