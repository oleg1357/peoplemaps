"use client";

import { MAP_STYLES } from "@/lib/tiles";
import type { MapStyle } from "@/lib/tiles";
import { IconLink, IconMapMarker, IconLayers } from "../icons";

interface MapToolbarProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  layersOpen: boolean;
  onToggleLayers: () => void;
  mapStyle: MapStyle;
  setMapStyle: (v: MapStyle) => void;
  onCenterOnMe: () => void;
  onCopyView: () => void;
  viewCopied: boolean;
}

export function MapToolbar({
  searchQuery,
  setSearchQuery,
  layersOpen,
  onToggleLayers,
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
      <button
        type="button"
        className={`map-ctrl-btn ${layersOpen ? "active" : ""}`}
        onClick={onToggleLayers}
        title="Toggle layers"
      >
        <IconLayers size={16} /> Layers
      </button>
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