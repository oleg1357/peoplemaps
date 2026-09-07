"use client";

import { Suspense, useEffect } from "react";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useMapData } from "@/lib/MapContext";

const MapsHomePage = dynamic(
  () => import("@/components/MapsHomePage").then((m) => m.MapsHomePage),
  { ssr: false }
);

// Reads deep-link query params on the plain /map page:
//   ?add=1            -> open the add-spot form
//   ?map=<mapId>      -> select/register a specific map (incl. private ones
//                        via the admin fetch, so shared `?map=` permalinks
//                        for slug-less maps still work)
//   ?lat=&lng=&zoom=  -> initial map view (already served on /map/[slug])
//   ?spot=<spotId>    -> open + fly to a specific spot (profile deep-links)
function ParamsBridge({
  initialCenter,
  initialZoom,
}: {
  initialCenter?: [number, number];
  initialZoom?: number;
}) {
  const searchParams = useSearchParams();
  const { maps, selectMap, registerMap } = useMapData();

  const mapParam = searchParams.get("map");
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const zoom = Number(searchParams.get("zoom"));
  const hasView =
    searchParams.has("lat") &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);
  const add = searchParams.get("add") === "1";
  const spotParam = searchParams.get("spot");

  // Select/register the deep-linked map. Public maps are already in the list;
  // private or just-created maps require an auth fetch and then get registered
  // (same mechanism the /map/[slug] route uses server-side).
  useEffect(() => {
    if (!mapParam) return;
    const found = maps.find((m) => m._id === mapParam);
    if (found) {
      selectMap(mapParam);
      return;
    }
    let cancelled = false;
    fetch("/api/admin/maps")
      .then((r) => (r.ok ? r.json() : null))
      .then((res) => {
        if (cancelled || !res) return;
        const m = (res.maps ?? []).find((x: { _id: string }) => x._id === mapParam);
        if (m) registerMap(m);
      })
      .catch(() => {
        // The map just isn't available to this viewer — keep the default.
      });
    return () => {
      cancelled = true;
    };
  }, [mapParam, maps, selectMap, registerMap]);

  return (
    <MapsHomePage
      initialCenter={hasView ? [lat, lng] : initialCenter}
      initialZoom={
        Number.isFinite(zoom) && zoom > 0 ? zoom : initialZoom
      }
      initialAdd={add}
      initialSpotId={spotParam}
    />
  );
}

export function MapPageClient({
  initialCenter,
  initialZoom,
}: {
  initialCenter?: [number, number];
  initialZoom?: number;
}) {
  // Works in both modes: backend mode renders live data, demo mode renders the
  // seeded localStorage demo maps.
  return (
    <Suspense fallback={null}>
      <ParamsBridge initialCenter={initialCenter} initialZoom={initialZoom} />
    </Suspense>
  );
}