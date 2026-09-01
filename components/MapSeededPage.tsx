"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { useMapData } from "@/lib/MapContext";
import { MapPageClient } from "./MapPageClient";
import type { MapDocument } from "@/lib/types";

function SeededMapView() {
  const searchParams = useSearchParams();

  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const zoom = Number(searchParams.get("zoom"));

  const hasView =
    searchParams.has("lat") &&
    searchParams.has("lng") &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  return (
    <MapPageClient
      initialCenter={hasView ? [lat, lng] : undefined}
      initialZoom={Number.isFinite(zoom) && zoom > 0 ? zoom : undefined}
    />
  );
}

// Rendered by the permalink route. Registers the map (so private or just-created
// maps are selectable) and applies `?lat=&lng=&zoom=` view params when present.
export function MapSeededPage({ map }: { map: MapDocument }) {
  const { registerMap } = useMapData();

  useEffect(() => {
    if (map?._id) registerMap(map);
  }, [map, registerMap]);

  return (
    <Suspense fallback={null}>
      <SeededMapView />
    </Suspense>
  );
}