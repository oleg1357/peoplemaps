"use client";

interface MeasureCardProps {
  mode: "distance" | "area";
  points: [number, number][];
  result: string | null;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onClear: () => void;
  onClose: () => void;
}

// Floating readout for the transient measurement tools. Shows the live
// distance/area as points are clicked and offers undo/redo/clear/close.
export function MeasureCard({
  mode,
  points,
  result,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onClear,
  onClose,
}: MeasureCardProps) {
  const isArea = mode === "area";
  const minHints = isArea ? "Click 3+ points, then read the area below." : "Click 2+ points, then read the distance below.";
  return (
    <div className="measure-card">
      <div className="measure-card-top">
        <strong>{isArea ? "Measure area" : "Measure distance"}</strong>
        <button type="button" className="close-btn" onClick={onClose} title="Close measurement">
          ✕
        </button>
      </div>
      <span className="measure-hint">
        {points.length === 0 ? minHints : `${points.length} point${points.length === 1 ? "" : "s"} placed`}
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
    </div>
  );
}