// Color-ramp utilities for choropleth zone overlays. A numeric value per zone
// is mapped onto a color scale so filled polygons/circles can be compared at a
// glance (e.g. average rent, price level, average rating).

export interface ColorStop {
  offset: number; // 0..1 position on the ramp
  color: string; // hex
}

// Sequential blue → amber → red. Good for "lower is better" values like rent
// or price. Cool end = cheap/calm, warm end = expensive/busy.
export const RAMP_SEQUENTIAL: ColorStop[] = [
  { offset: 0, color: "#4BB0E8" }, // low value (blue = calm / cheap)
  { offset: 0.5, color: "#F0AD00" }, // mid value (amber)
  { offset: 1, color: "#E8796F" }, // high value (red = expensive / busy)
];

// Diverging red → amber → green. Reading direction matches the old
// RAMP_YELLOW_GREEN_RED name; "higher is better" values (e.g. ratings).
export const RAMP_DIVERGING: ColorStop[] = [
  { offset: 0, color: "#E8796F" }, // low (red)
  { offset: 0.5, color: "#F0AD00" }, // mid (amber)
  { offset: 1, color: "#61C67A" }, // high (green)
];

export type ColorRamp = ColorStop[];

export type ChoroplethRampName = "sequential" | "diverging";

// Map-name → actual ramp. Defaults to sequential (matches map/legend defaults).
export const RAMP_BY_NAME: Record<ChoroplethRampName, ColorRamp> = {
  sequential: RAMP_SEQUENTIAL,
  diverging: RAMP_DIVERGING,
};

export const RAMPS: { name: ChoroplethRampName; label: string; ramp: ColorRamp }[] = [
  { name: "sequential", label: "Sequential (cool → warm)", ramp: RAMP_SEQUENTIAL },
  { name: "diverging", label: "Diverging (red → green)", ramp: RAMP_DIVERGING },
];

// Backwards-compatible alias.
export const RAMP_YELLOW_GREEN_RED: ColorRamp = RAMP_SEQUENTIAL;
export const RAMP_GREEN_RED: ColorRamp = RAMP_DIVERGING;

// Which ramp to show by default for a given zone's values.
export const DEFAULT_RAMP: ColorRamp = RAMP_SEQUENTIAL;

export function rampByName(name: string | null | undefined): ColorRamp {
  return name === "diverging" ? RAMP_DIVERGING : RAMP_SEQUENTIAL;
}

// Interpolate a single hex color. Returns "#rrggbb".
function lerpHex(a: string, b: string, t: number): string {
  const parse = (h: string) => [
    parseInt(h.slice(1, 3), 16),
    parseInt(h.slice(3, 5), 16),
    parseInt(h.slice(5, 7), 16),
  ];
  const ca = parse(a);
  const cb = parse(b);
  const c = ca.map((v, i) => Math.round(v + (cb[i] - v) * t));
  const toHex = (n: number) => n.toString(16).padStart(2, "0");
  return `#${c.map(toHex).join("")}`;
}

// Map a value on [min, max] to a hex color on the ramp. Values outside the
// range are clamped. When min === max (or ramp is empty) the mid ramp color or
// a neutral gray is returned.
export function valueToColor(
  value: number,
  min: number,
  max: number,
  ramp: ColorRamp = DEFAULT_RAMP
): string {
  if (!ramp || ramp.length === 0) return "#9aa4a0";
  if (ramp.length === 1) return ramp[0].color;
  if (min === max || !Number.isFinite(value)) return midColor(ramp);
  const t = Math.max(0, Math.min(1, (value - min) / (max - min)));
  for (let i = 1; i < ramp.length; i++) {
    const lo = ramp[i - 1];
    const hi = ramp[i];
    if (t <= hi.offset) {
      const span = hi.offset - lo.offset || 1;
      return lerpHex(lo.color, hi.color, (t - lo.offset) / span);
    }
  }
  return ramp[ramp.length - 1].color;
}

function midColor(ramp: ColorRamp): string {
  return ramp[Math.floor((ramp.length - 1) / 2)].color;
}

// A CSS gradient string for the legend's color bar, built from the ramp stops.
export function rampGradient(ramp: ColorRamp = DEFAULT_RAMP): string {
  const stops = ramp
    .map((s) => `${s.color} ${Math.round(s.offset * 100)}%`)
    .join(", ");
  return `linear-gradient(90deg, ${stops})`;
}

// Nice-ish bucket labels for the legend. Splits [min, max] into `n` breaks.
export function legendTicks(
  min: number,
  max: number,
  n = 5,
  formatter: (v: number) => string = formatCompact
): { value: number; label: string }[] {
  if (min === max) return [{ value: min, label: formatter(min) }];
  const ticks: { value: number; label: string }[] = [];
  for (let i = 0; i < n; i++) {
    const v = min + ((max - min) * i) / (n - 1);
    ticks.push({ value: v, label: formatter(v) });
  }
  return ticks;
}

// Compact number formatting: 1200 -> "1.2k", fractions kept to 1 decimal.
export function formatCompact(v: number): string {
  if (Number.isInteger(v)) return String(v);
  if (Math.abs(v) >= 1000) {
    return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  }
  return v.toFixed(1);
}
