import type { Theme } from "./ThemeContext";

export type MapStyle = "osm" | "satellite" | "dark";

// OpenStreetMap tile server
const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

// CARTO basemaps (dark_all handles dark mode)
const CARTO_DARK_URL =
  "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png";

// ESRI World Imagery for satellite view
const SATELLITE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>';
const ESRI_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics";

export interface TileSet {
  url: string;
  attribution: string;
  subdomains: string;
  maxZoom: number;
}

const LAYERS: Record<MapStyle, { light: string; dark: string | null }> = {
  osm: {
    light: OSM_URL,
    dark: null, // OSM has no dark variant; fall back to CARTO dark
  },
  satellite: {
    light: SATELLITE_URL,
    dark: SATELLITE_URL,
  },
  dark: {
    light: CARTO_DARK_URL,
    dark: CARTO_DARK_URL,
  },
};

const ATTRIBUTIONS: Record<MapStyle, string> = {
  osm: OSM_ATTRIBUTION,
  satellite: ESRI_ATTRIBUTION,
  dark: CARTO_ATTRIBUTION,
};

export function tileLayer(theme: Theme, style: MapStyle = "osm"): TileSet {
  const cfg = LAYERS[style];
  const url = cfg.dark && theme === "dark" ? cfg.dark : cfg.light;
  return {
    url,
    attribution: ATTRIBUTIONS[style],
    subdomains: style === "osm" ? "abc" : "abcd",
    maxZoom: 19,
  };
}

export const MAP_STYLES: { value: MapStyle; label: string }[] = [
  { value: "osm", label: "Streets" },
  { value: "satellite", label: "Satellite" },
  { value: "dark", label: "Dark" },
];