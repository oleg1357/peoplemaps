// Marker catalog + helpers. Leaflet-free so it can be imported both by the
// Sanity schema, API routes (server) and the map UI (client).

export interface MarkerPreset {
  id: string;
  emoji: string;
  label: string;
  color: string;
}

export const MARKER_PRESETS: MarkerPreset[] = [
  { id: "pin", emoji: "\uD83D\uDCCD", label: "Pin", color: "#D90368" },
  { id: "coffee", emoji: "\u2615", label: "Coffee", color: "#8B5A2B" },
  { id: "food", emoji: "\uD83C\uDF7D\uFE0F", label: "Food", color: "#C0392B" },
  { id: "shop", emoji: "\uD83D\uDECD\uFE0F", label: "Shop", color: "#7D3C98" },
  { id: "groceries", emoji: "\uD83D\uDED2", label: "Groceries", color: "#27AE60" },
  { id: "park", emoji: "\uD83C\uDF33", label: "Park", color: "#229954" },
  { id: "water", emoji: "\uD83D\uDCA7", label: "Water", color: "#2980B9" },
  { id: "highlight", emoji: "\u2B50", label: "Highlight", color: "#F1C40F" },
  { id: "hidden-gem", emoji: "\uD83D\uDC97", label: "Hidden gem", color: "#E74C3C" },
  { id: "music", emoji: "\uD83C\uDFB5", label: "Music", color: "#8E44AD" },
  { id: "sport", emoji: "\u26BD", label: "Sport", color: "#2E86C1" },
  { id: "art", emoji: "\uD83C\uDFA8", label: "Art", color: "#E67E22" },
  { id: "book", emoji: "\uD83D\uDCDA", label: "Books", color: "#34495E" },
  { id: "stay", emoji: "\uD83D\uDECF\uFE0F", label: "Stay", color: "#6C3483" },
  { id: "health", emoji: "\uD83D\uDC8A", label: "Health", color: "#148F77" },
  { id: "info", emoji: "\u2139\uFE0F", label: "Info", color: "#2471A3" },
];

export const DEFAULT_MARKER = MARKER_PRESETS[0];
export const DEFAULT_ACCENT = "#61C67A";
export const MARKER_COLORS = Array.from(
  new Set(MARKER_PRESETS.map((m) => m.color))
);

const HEX_COLOR = /^#[0-9a-fA-F]{3,8}$/;

export function getMarkerColor(
  color?: string | null,
  fallback = DEFAULT_MARKER.color
): string {
  return color && HEX_COLOR.test(color) ? color : fallback;
}

export function hasValidColor(color?: string | null): boolean {
  return Boolean(color && HEX_COLOR.test(color));
}

// Resolves the visual for a spot: prefer the spot's own marker, then the map's
// default marker/color, then the built-in defaults. Unknown emoji are rejected.
export function resolveMarker(
  emoji?: string | null,
  mapEmoji?: string | null,
  mapColor?: string | null
): { emoji: string; color: string } {
  const spotPreset = emoji && MARKER_PRESETS.find((m) => m.emoji === emoji);
  const mapPreset = mapEmoji && MARKER_PRESETS.find((m) => m.emoji === mapEmoji);
  const preset = spotPreset || mapPreset || DEFAULT_MARKER;
  return {
    emoji: preset.emoji,
    color: getMarkerColor(spotPreset ? spotPreset.color : mapColor, preset.color),
  };
}

// Server-side sanitizer for spots/maps: keeps only a known emoji (or null).
export function sanitizeMarkerEmoji(emoji?: string | null): string | null {
  if (!emoji) return null;
  return MARKER_PRESETS.some((m) => m.emoji === emoji) ? emoji : null;
}