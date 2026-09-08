# Choropleth layer ideas (saved for later)

**Status: mostly implemented** — see the checklist below. The core data model,
color ramp, legend and map rendering are done in demo + backend modes. Remaining
gaps are listed at the end.

**Source inspiration:** Reddit r/copenhagen post — "Made a map of what rent
actually costs in every [neighborhood] in Copenhagen"
(https://www.reddit.com/r/copenhagen/comments/1w6zwob/)
Could not be scraped directly; saved from general analysis of such maps.

## Concept

A **choropleth layer type** — extends the planned layer management system.
Instead of plain visibility toggles, the map can color-encode zone polygons
by a numeric value (e.g. average rent, average rating, price level) mapped
onto a color ramp.

## Why it fits PeopleMaps

- We already render zone polygons, support per-map layers, and have a
  `SpotTooltip`-style infobox.
- A rent/price/rating overlay is exactly a "user-created data overlay" layer.
- The community model (anonymous submissions + moderation) matches how such
  rent maps gather data.

## What's implemented

- **Zone data model** (`lib/types.ts`): optional `value`, `valueCount` and
  `valueUpdatedAt` fields on `Zone`.
- **Color ramp utility** (`lib/choropleth.ts`): `valueToColor()`, two ramps
  (yellow-green-red default + green-red), `rampGradient()`, `legendTicks()`
  and `formatCompact()`.
- **Legend component** (`components/map/Legend.tsx`): floating legend bar with
  title, gradient, min/max labels and a trust footnote.
- **Map rendering** (`components/MapsHomePage.tsx`): valued zones are filled by
  `value` color (opacity raised to 0.5, border matches), tooltips show the
  value, and a legend appears when choropleth is on and data is available.
- **Toolbar toggle** (`components/map/MapToolbar.tsx`): a "Choropleth" checkbox
  that disables itself when no zone has a value.
- **API** (`app/api/zones/route.ts`): sanitises optional `value` / `valueCount` /
  `valueUpdatedAt` on zone creation.
- **Demo seed** (`lib/demo-data.ts`): two valued zones + a shared range.

## Proposed pieces (from earlier layer discussion)

- [x] Zone layers get an optional numeric `value` per zone + color ramp.
- [x] Layer panel gets a **Legend** toggle and a color-scale subtype.
- [x] Layer types: spots, zones, routes, plus this choropleth zone variant.
- [~] Reuse existing `Zone` polygon rendering and `MapLayer` filters.
- [x] Show aggregate counts per area (like spot review counts) to build trust:
      "N reports" per neighborhood.
- [~] Surface methodology/caveats via existing `welcomeMessage` / `submissionNote`
      and per-zone `description`.
- [x] Add an interactive legend in `MapsHomePage`.

## Data fields to consider (inspired by rent maps)

- [x] average value (rent / price / rating)  -> `Zone.value`
- [x] count of submissions (trust signal)     -> `Zone.valueCount`
- [x] "as of" timestamp (freshness)           -> `Zone.valueUpdatedAt`
- [x] color ramp (e.g. green → red or sequential scale)

## Remaining gaps / follow-ups

- A dedicated color-ramp/legend subtype in the layer panel (the current legend
  is title + gradient; a per-map default ramp selector is not yet exposed).
- Per-zone value capture UI (the draw form does not yet collect a numeric
  value; values are set via the API/demo seed).
- Map-level default ramp setting (`MapDocument` has no ramp field yet).
- Admin zone moderation views do not yet surface the new `value*` fields.

