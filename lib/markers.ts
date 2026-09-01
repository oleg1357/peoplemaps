import L from "leaflet";
import type { MarkerPreset } from "./markers-data";

export * from "./markers-data";

// Leaflet divIcon renderer for a marker (emoji on a colored pin disc).
// Icons are cheap to create but MapsHomePage caches them per `emoji:color`.
export function makeMarkerDivIcon(
  emoji: string,
  color: string,
  size = 38
): L.DivIcon {
  return L.divIcon({
    className: "pm-marker-wrap",
    html: `<div class="pm-marker" style="width:${size}px;height:${size}px;background:${color}"><span>${emoji}</span></div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size - 4],
    popupAnchor: [0, -size],
    tooltipAnchor: [0, -(size - 6)],
  });
}

export type { MarkerPreset };