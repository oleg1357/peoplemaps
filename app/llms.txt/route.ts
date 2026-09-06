import { siteUrl, SITE_NAME, SITE_DESCRIPTION } from "@/lib/site";

const origin = siteUrl();

export function GET() {
  const body = `# ${SITE_NAME}

> ${SITE_DESCRIPTION}

${SITE_NAME} is a collaborative, community-managed map of local places. Anyone can add a spot, rate and review it, and keep its status (open / closed / unknown) up to date. Users can save favourites, watch spots for updates, and share maps.

## Core pages

- [Home](${origin}/): Overview of ${SITE_NAME} and featured community maps, filterable by category.
- [Interactive Map](${origin}/map): Browse, search, add, rate and review spots on a live map.
- [About](${origin}/about): Why ${SITE_NAME} exists and how it works.

## Key facts

- Spots carry a name, street address, city, ZIP and coordinates, plus rich optional fields: price level (0-3), free-text opening hours, tags and an insider tip.
- Each spot can be marked open, closed or unknown by the community.
- A map is a themed, community-managed collection of spots. Maps have a category and tags used for home-page discovery, a collaboration mode (anyone / logged-in / owner-only), marker styling, optional clustering, a welcome message and add-spot instructions.
- Maps can also contain drawn zones (polygons/circles) and routes (polylines).
- Maps can be public (viewable by anyone) or private (owner only).
- Users can create accounts to save favourites, watch spots and contribute.
- Map owners and moderators moderate their content: approve, reject, hide or destroy spots, zones and routes. There are also report and ban systems and an activity log.
- ${SITE_NAME} is open to contributions and lets map owners moderate their content.

## Suggestions

- "Show me community maps of hidden places in Copenhagen"
- "Find rated grocery spots near me"
- "How do I add a spot to ${SITE_NAME}?"
- "Which maps are about food and drink?"
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
