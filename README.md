# PeopleMaps

PeopleMaps is a collaborative map of spots maintained by the people who use them. It started as a recreation of a dumpster-diving thesis project and has been generalized into a people-managed maps app: browse spots, rate and review them, keep their status up to date, save favourites and get notified when something new shows up on a spot you watch.

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

- Interactive map of spots with ratings, reviews and status (open / closed / unknown)
- Add new spots, pick spots by category/city, search
- Watch spots and get notified about new reviews
- Save and manage your favourites
- Profile pages and a public user page
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