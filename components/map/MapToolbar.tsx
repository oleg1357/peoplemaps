"use client";

import { MAP_STYLES } from "@/lib/tiles";
import type { MapStyle } from "@/lib/tiles";
import { IconLink, IconMapMarker } from "../icons";

interface MapToolbarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  showSpots: boolean;
  setShowSpots: (v: boolean) => void;
  showZones: boolean;
  setShowZones: (v: boolean) => void;
  showRoutes: boolean;
  setShowRoutes: (v: boolean) => void;
  mapStyle: MapStyle;
  setMapStyle: (v: MapStyle) => void;
  onCenterOnMe: () => void;
  onCopyView: () => void;
  viewCopied: boolean;
}

export function MapToolbar({
  searchQuery,
  setSearchQuery,
  showSpots,
  setShowSpots,
  showZones,
  setShowZones,
  showRoutes,
  setShowRoutes,
  mapStyle,
  setMapStyle,
  onCenterOnMe,
  onCopyView,
  viewCopied,
}: MapToolbarProps) {
  return (
    <div id="map-controls">
      <input
        id="map-search"
        type="search"
        placeholder="Search spots…"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="places-select"
        style={{ padding: "6px 8px", borderRadius: 0, border: "1px solid var(--border)", maxWidth: 180 }}
      />
      <label className="layer-toggle" title="Toggle spots">
        <input type="checkbox" checked={showSpots} onChange={(e) => setShowSpots(e.target.checked)} />
        Spots
      </label>
      <label className="layer-toggle" title="Toggle zones">
        <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} />
        Zones
      </label>
      <label className="layer-toggle" title="Toggle routes">
        <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} />
        Routes
      </label>
      <select
        id="map-style-select"
        className="places-select"
        value={mapStyle}
        onChange={(e) => setMapStyle(e.target.value as MapStyle)}
        title="Map style"
      >
        {MAP_STYLES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        className="map-ctrl-btn"
        onClick={onCenterOnMe}
        title="Center on my location"
      >
        <IconMapMarker size={16} /> Near me
      </button>
      <button
        type="button"
        className="map-ctrl-btn"
        onClick={onCopyView}
        title="Copy link to this map view"
      >
        <IconLink size={16} />
        {viewCopied ? "Copied!" : "Share view"}
      </button>
    </div>
  );
}
