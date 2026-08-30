import type { Theme } from "./ThemeContext";

const OSM_URL = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION =
  '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors';

export function tileLayer(_theme: Theme): { url: string; attribution: string } {
  return { url: OSM_URL, attribution: OSM_ATTRIBUTION };
}