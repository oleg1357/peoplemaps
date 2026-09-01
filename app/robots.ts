import { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

const origin = siteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/profile", "/login", "/signup", "/api/", "/studio/"],
      },
    ],
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
