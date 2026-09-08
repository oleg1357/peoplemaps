# Choropleth layer ideas (saved for later)

**Status: implemented** — auto-aggregated zone values, map-level ramp settings,
value capture in the draw form, a real layer panel and a heatmap layer have all
landed since. The remaining follow-ups are admin UI surfaces (below).

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
- **Color ramp utility** (`lib/choropleth.ts`): `valueToColor()`, two named
  ramps (`sequential` blue→amber→red, `diverging` red→amber→green),
  `RAMP_BY_NAME`, `rampGradient()`, `legendTicks()` and `formatCompact()`.
- **Legend component** (`components/map/Legend.tsx`): floating legend bar with
  title, gradient, min/max labels and a trust footnote; takes the active ramp.
- **Map rendering** (`components/MapsHomePage.tsx`): valued zones are filled by
  `value` color (opacity raised to 0.5, border matches), tooltips show the
  value, and a legend appears when choropleth is on and data is available.
- **Auto-aggregation** (`lib/geo.ts`): `aggregateZoneValues()` computes the zone
  value from the spots inside it (`pointInPolygon` / `pointInCircle`); explicit
  `zone.value` always wins. The metric (`priceLevel` | `rating`) is a per-map
  setting (`MapDocument.choroplethMetric`).
- **Map-level ramp setting** (`MapDocument.choroplethRamp`, Sanity schema +
  queries + demo seed): served from Sanity, overridable live in the layer panel.
- **Layer panel** (`components/map/LayerPanel.tsx`): spots / zones / routes
  toggles, choropleth toggle with a ramp picker, and a heatmap toggle —
  replaces the MapToolbar checkboxes.
- **Heatmap** (`components/map/HeatOverlay.tsx`): canvas heat via `leaflet.heat`
  (lazy-loaded so SSR never touches it), with a grid-density circle fallback.
- **Toolbar** (`components/map/MapToolbar.tsx`): a "Layers" button opens the
  layer panel; the choropleth checkbox moved into the panel.
- **Value capture** (`components/map/DrawForm.tsx`): the zone draw form collects
  an optional numeric `value` + report count, persisted by `saveDraw`.
- **Measurement polish**: per-segment distance labels, a follow-mouse preview
  with live total, metric/imperial units, and "save as zone/route" from the
  measure card.
- **API** (`app/api/zones/route.ts`): sanitises optional `value` / `valueCount` /
  `valueUpdatedAt` on zone creation.
- **Demo seed** (`lib/demo-data.ts`): two valued zones + a shared range + map
  ramp/metric settings.

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

- Admin zone moderation views do not yet surface the new `value*` fields.
- The per-map ramp/metric settings are not editable from the admin "edit map"
  form (they are set in Sanity today), and new zones drawn on the map inherit
  no auto-value until the next aggregation pass.

