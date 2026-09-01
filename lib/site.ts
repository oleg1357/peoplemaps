// Central site metadata used across SEO features (metadata, sitemap,
// robots, Open Graph, structured data).
//
// Override the canonical origin in production via NEXT_PUBLIC_SITE_URL,
// e.g. NEXT_PUBLIC_SITE_URL=https://peoplemaps.app
export const SITE_NAME = "PeopleMaps";
export const SITE_TAGLINE = "People-managed maps of the places that matter";

export function siteUrl(): string {
  const fromEnv =
    typeof process !== "undefined" ? process.env.NEXT_PUBLIC_SITE_URL : "";
  return fromEnv ? fromEnv.replace(/\/+$/, "") : "http://localhost:3000";
}

export const SITE_DESCRIPTION =
  "A collaborative map of places maintained by people — add spots, rate and review them, keep statuses up to date, save favourites and share maps with your city.";

export const SITE_DEFAULT_TITLE = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const SITE_KEYWORDS = [
  "peoplemaps",
  "community map",
  "collaborative map",
  "local spots",
  "city map",
  "ratings and reviews",
  "open source map",
  "hidden gems",
  "places near me",
];

export const SITE_TWITTER_HANDLE = "@peoplemaps";

// Open Graph image. Place a real image at public/og.png (1200x630) when
// available; currently falls back to null so Next renders the default.
export const SITE_OG_IMAGE = "/og.png";
