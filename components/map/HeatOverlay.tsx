"use client";

import { useEffect, useRef, useState } from "react";
// Importing leaflet here is safe: the runner only touches the DOM in the
// browser, and we load it lazily so Next.js never executes it during SSR.
import L from "leaflet";
import { Circle, useMap } from "react-leaflet";

export interface HeatPoint {
  pos: [number, number];
  v: number; // intensity 0..1
}

// Canvas heat layer when the lightweight leaflet.heat plugin is available;
// falls back to a coarse grid of translucent circles otherwise. Both live on
// top of the base tiles under the point markers.
export function HeatOverlay({ points }: { points: HeatPoint[] }) {
  const map = useMap();
  const [pluginActive, setPluginActive] = useState<boolean | null>(null);
  const layerRef = useRef<L.HeatLayer | null>(null);
  const pointsRef = useRef(points);
  pointsRef.current = points;

  useEffect(() => {
    let active = true;
    let heat: L.HeatLayer | null = null;
    (async () => {
      try {
        await import("leaflet.heat");
      } catch {
        if (active) setPluginActive(false);
        return;
      }
      if (!active) return;
      heat = L.heatLayer(
        pointsRef.current.map((p) => [p.pos[0], p.pos[1], p.v] as [number, number, number]),
        {
          radius: 22,
          blur: 16,
          minOpacity: 0.3,
          max: 1,
        }
      );
      heat.addTo(map);
      layerRef.current = heat;
      setPluginActive(true);
    })();
    return () => {
      active = false;
      if (heat) map.removeLayer(heat);
      layerRef.current = null;
    };
  }, [map]);

  useEffect(() => {
    layerRef.current?.setLatLngs(
      points.map((p) => [p.pos[0], p.pos[1], p.v] as [number, number, number])
    );
  }, [points]);

  if (pluginActive === false) {
    return (
      <>
        {points.map((p, i) => (
          <Circle
            key={i}
            center={[p.pos[0], p.pos[1]]}
            radius={Math.max(80, p.v * 260)}
            pathOptions={{
              color: "transparent",
              weight: 0,
              fillColor: `rgba(255, 150, 0, ${0.1 + p.v * 0.35})`,
              fillOpacity: 0.4,
            }}
          />
        ))}
      </>
    );
  }
  return null;
}