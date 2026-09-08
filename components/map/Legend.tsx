"use client";

import { rampGradient, legendTicks, DEFAULT_RAMP, type ColorRamp } from "@/lib/choropleth";

interface LegendProps {
  title: string;
  min: number;
  max: number;
  ramp?: ColorRamp;
  // Optional count / freshness footnote (e.g. "N submissions").
  footnote?: string;
}

// Floating legend bar for a choropleth zone overlay. Shows the color ramp with
// min/max labels, a title and an optional trust footnote (counts / as-of date).
export function Legend({
  title,
  min,
  max,
  ramp = DEFAULT_RAMP,
  footnote,
}: LegendProps) {
  const ticks = legendTicks(min, max, 5);
  return (
    <div className="choropleth-legend">
      <div className="choropleth-legend-title">{title}</div>
      <div
        className="choropleth-legend-bar"
        style={{ background: rampGradient(ramp) }}
      />
      <div className="choropleth-legend-labels">
        <span>{ticks[0]?.label ?? min}</span>
        <span>{ticks[ticks.length - 1]?.label ?? max}</span>
      </div>
      {footnote && <div className="choropleth-legend-footnote">{footnote}</div>}
    </div>
  );
}
