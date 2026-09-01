import { MetadataRoute } from "next";
import { serverClient } from "@/sanity/lib/client";
import { ALL_MAPS_QUERY } from "@/sanity/lib/queries";
import { siteUrl } from "@/lib/site";

const origin = siteUrl();

export const dynamic = "force-static";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const routes: MetadataRoute.Sitemap = [
    { url: origin, changeFrequency: "daily", priority: 1 },
    { url: `${origin}/map`, changeFrequency: "hourly", priority: 0.9 },
    { url: `${origin}/about`, changeFrequency: "monthly", priority: 0.5 },
  ];

  // Public Sanity maps (backend mode). Guarded so demo/local mode still builds.
  if (serverClient) {
    try {
      const maps = (await serverClient.fetch(ALL_MAPS_QUERY)) as Array<{
        _id: string;
        slug?: string;
        _updatedAt?: string;
      }>;
      maps.forEach((m) => {
        routes.push({
          url: m.slug
            ? `${origin}/map/${encodeURIComponent(m.slug)}`
            : `${origin}/map?map=${m._id}`,
          lastModified: m._updatedAt ?? new Date(),
          changeFrequency: "daily",
          priority: 0.7,
        });
      });
    } catch {
      // ignore — sitemap still serves static routes
    }
  }

  return routes;
}
