# PeopleMaps

PeopleMaps is a collaborative map of spots maintained by the people who use them. It started as a recreation of a dumpster-diving thesis project and has been generalized into a people-managed maps app: browse spots, rate and review them, keep their status up to date, and mark helpful reviews.

## Tech stack

- **Next.js 16** (App Router) with TypeScript
- **Leaflet / react-leaflet** for the interactive maps
- **MongoDB** backend (option 1) with a REST API in `app/api`
- **Supabase** for authentication (session cookie / Bearer JWT)
- **Sanity** for content/Studio configuration
- **localStorage** demo mode — no backend needed

## Modes

- **Backend mode** — set `NEXT_PUBLIC_BACKEND_LIVE=1` and provide MongoDB, Supabase and Sanity credentials (see `.env.local.example`). The home page is powered by the API routes and auth
- **Demo mode** — the default. Data lives in `localStorage` and is seeded on first load

Both modes share the same UI components; the `backendLive` flag in `lib/api-client.ts` decides which data source the map follows.

## Features

- Interactive map of spots (Leaflet / react-leaflet) with ratings, reviews, status (open / closed / unknown) and rich detail fields — price level, opening hours, tags and insider tips
- Add new spots, search by name/city/street/tags, and pick a marker icon and colour
- Community tools: rate and review, comment on reviews, upload photos, and vote on "helpful" reviews
- Collaborative maps with zones (polygons/circles) and routes (polylines) drawn on the map
- Choropleth zone overlay: color-encode zones by a numeric value (rent/price/rating) with a legend, trust counts and freshness. Zone values auto-aggregate from the spots inside each zone (or from a hand-entered value in the draw form), and the metric + color ramp are per-map settings
- Layer panel: independent toggles for spots / zones / routes, the choropleth overlay with a live ramp picker, and a value heatmap (canvas via `leaflet.heat`, grid fallback)
- Measurement tools: click-to-measure distance and area straight on the map (transient, nothing saved) with segment labels, a follow-mouse preview, metric/imperial units, and "save as zone/route"
- Per-map configuration: category + tags for discovery, collaboration modes (anyone / logged-in / owner & moderators only), clustering, welcome message and add-spot instructions, contact/website links
- Moderation: map owners and moderators can approve, reject, hide or destroy spots, zones and routes; report and ban systems; an activity/audit log
- Billing: free users can create up to 3 public maps (private maps gated to Pro subscribers) with Paddle hosted checkout + customer billing portal
- Cover images per map, permalink slugs and a public profile / "my contributions" page
- Home-page discovery with category filtering
- Light/dark theme

## Demo account

- **Email:** `demo@peoplemaps.app`
- **Password:** `demo123`

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000. All data is seeded into `localStorage` in demo mode.

### Scripts

- `npm run dev` — start the dev server
- `npm run build` — production build
- `npm run lint` — ESLint

## Project structure

```
app/            Next.js pages and API routes
components/     React components (map, sidebar, reviews, forms, ...)
lib/            data model, localStorage store, API client, auth/theme context
sanity/         Sanity Studio schemas and config
```