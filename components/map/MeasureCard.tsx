"use client";

import type { Units } from "@/lib/geo";

interface MeasureCardProps {
  mode: "distance" | "area";
  points: [number, number][];
  result: string | null;
  canUndo: boolean;
  canRedo: boolean;
  units: Units;
  setUnits: (u: Units) => void;
  canSave: boolean;
  onSaveAsZone: () => void;
  onSaveAsRoute: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onClose: () => void;
}

// Floating readout for the transient measurement tools. Shows the live
// distance/area as points are clicked, offers undo/redo/clear/close, a metric/
// imperial switch, and saving the measured shape as a permanent zone/route.
export function MeasureCard({
  mode,
  points,
  result,
  canUndo,
  canRedo,
  units,
  setUnits,
  canSave,
  onSaveAsZone,
  onSaveAsRoute,
  onUndo,
  onRedo,
  onClear,
  onClose,
}: MeasureCardProps) {
  const isArea = mode === "area";
  const minHints = isArea
    ? "Click 3+ points, then read the area below."
    : "Click 2+ points, then read the distance below.";
  const needMore = isArea ? points.length < 3 : points.length < 2;
  return (
    <div className="measure-card">
      <div className="measure-card-top">
        <strong>{isArea ? "Measure area" : "Measure distance"}</strong>
        <button type="button" className="close-btn" onClick={onClose} title="Close measurement">
          ✕
        </button>
      </div>
      <span className="measure-hint">
        {points.length === 0
          ? minHints
          : `${points.length} point${points.length === 1 ? "" : "s"} placed`}
      </span>
      {result ? (
        <div className="measure-result">{result}</div>
      ) : (
        <div className="measure-result empty">—</div>
      )}
      <div className="measure-actions">
        <button type="button" className="link-btn" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="link-btn" onClick={onRedo} disabled={!canRedo}>
          Redo
        </button>
        <button type="button" className="link-btn" onClick={onClear} disabled={points.length === 0}>
          Clear
        </button>
      </div>
      <div className="measure-tools">
        <div className="measure-units">
          <button
            type="button"
            className={`unit-btn ${units === "metric" ? "active" : ""}`}
            onClick={() => setUnits("metric")}
          >
            m/km
          </button>
          <button
            type="button"
            className={`unit-btn ${units === "imperial" ? "active" : ""}`}
            onClick={() => setUnits("imperial")}
          >
            ft/mi
          </button>
        </div>
        {canSave && (
          <button type="button" className="save-meas-btn" onClick={isArea ? onSaveAsZone : onSaveAsRoute}>
            Save as {isArea ? "zone" : "route"}
          </button>
        )}
        {needMore && !canSave && (
          <span className="measure-more-hint">
            {isArea ? "3 pts needed" : "2 pts needed"}
          </span>
        )}
      </div>
    </div>
  );
}