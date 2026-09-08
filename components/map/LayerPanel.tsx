"use client";

import { RAMP_BY_NAME, rampGradient, type ChoroplethRampName } from "@/lib/choropleth";

interface LayerPanelProps {
  showSpots: boolean;
  setShowSpots: (v: boolean) => void;
  showZones: boolean;
  setShowZones: (v: boolean) => void;
  showRoutes: boolean;
  setShowRoutes: (v: boolean) => void;
  choropleth: boolean;
  setChoropleth: (v: boolean) => void;
  hasChoroplethData: boolean;
  heatmap: boolean;
  setHeatmap: (v: boolean) => void;
  heatmapReady: boolean;
  rampName: ChoroplethRampName;
  setRampName: (n: ChoroplethRampName) => void;
  metric: "priceLevel" | "rating";
  onClose: () => void;
}

const RAMP_OPTIONS: { value: ChoroplethRampName; label: string }[] = [
  { value: "sequential", label: "Sequential" },
  { value: "diverging", label: "Diverging" },
];

// Floating "Layers" panel: per-layer visibility, the choropleth overlay plus
// its color ramp, and the heatmap toggle. Replaces the old toolbar checkboxes.
export function LayerPanel({
  showSpots,
  setShowSpots,
  showZones,
  setShowZones,
  showRoutes,
  setShowRoutes,
  choropleth,
  setChoropleth,
  hasChoroplethData,
  heatmap,
  setHeatmap,
  heatmapReady,
  rampName,
  setRampName,
  metric,
  onClose,
}: LayerPanelProps) {
  return (
    <div className="layer-panel">
      <div className="layer-panel-top">
        <strong>Layers</strong>
        <button type="button" className="close-btn" onClick={onClose} title="Close layers">
          ✕
        </button>
      </div>

      <label className="layer-row" title="Toggle spots">
        <input type="checkbox" checked={showSpots} onChange={(e) => setShowSpots(e.target.checked)} />
        <span>Spots</span>
      </label>
      <label className="layer-row" title="Toggle zones">
        <input type="checkbox" checked={showZones} onChange={(e) => setShowZones(e.target.checked)} />
        <span>Zones</span>
      </label>
      <label className="layer-row" title="Toggle routes">
        <input type="checkbox" checked={showRoutes} onChange={(e) => setShowRoutes(e.target.checked)} />
        <span>Routes</span>
      </label>

      <div className="layer-divider" />

      <label
        className={`layer-row ${hasChoroplethData ? "" : "layer-row-disabled"}`}
        title={
          hasChoroplethData
            ? "Color zones by value"
            : "Zones have no numeric values to color by"
        }
      >
        <input
          type="checkbox"
          checked={choropleth}
          disabled={!hasChoroplethData}
          onChange={(e) => setChoropleth(e.target.checked)}
        />
        <span>Choropleth ({metric === "rating" ? "rating" : "price"})</span>
      </label>

      {hasChoroplethData && (
        <div className="ramp-picker">
          <div className="ramp-options">
            {RAMP_OPTIONS.map((o) => (
              <button
                key={o.value}
                type="button"
                className={`ramp-btn ${rampName === o.value ? "active" : ""}`}
                onClick={() => setRampName(o.value)}
                title={o.label}
              >
                <span className="ramp-swatch" style={{ background: rampGradient(RAMP_BY_NAME[o.value]) }} />
              </button>
            ))}
          </div>
          <span className="ramp-label">
            {metric === "rating" ? "Avg rating" : "Price level"} ramp
          </span>
        </div>
      )}

      <label
        className={`layer-row ${heatmapReady ? "" : "layer-row-disabled"}`}
        title={heatmapReady ? "Density heatmap of spot values" : "Add spots with a price/rating to color the heatmap"}
      >
        <input
          type="checkbox"
          checked={heatmap}
          disabled={!heatmapReady}
          onChange={(e) => setHeatmap(e.target.checked)}
        />
        <span>Heatmap</span>
      </label>
    </div>
  );
}