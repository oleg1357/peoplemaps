"use client";

interface DrawFormProps {
  drawMode: "zone" | "route";
  drawPoints: [number, number][];
  drawUndo: [number, number][][];
  drawRedo: [number, number][][];
  drawName: string;
  setDrawName: (v: string) => void;
  drawDesc: string;
  setDrawDesc: (v: string) => void;
  drawColor: string;
  setDrawColor: (v: string) => void;
  // Optional choropleth value + trust count (zones only).
  drawValue: string;
  setDrawValue: (v: string) => void;
  drawCount: string;
  setDrawCount: (v: string) => void;
  drawError: string;
  handleUndoPoint: () => void;
  handleRedoPoint: () => void;
  cancelDraw: () => void;
  saveDraw: (type: "zone" | "route") => void;
}

export function DrawForm({
  drawMode,
  drawPoints,
  drawUndo,
  drawRedo,
  drawName,
  setDrawName,
  drawDesc,
  setDrawDesc,
  drawColor,
  setDrawColor,
  drawValue,
  setDrawValue,
  drawCount,
  setDrawCount,
  drawError,
  handleUndoPoint,
  handleRedoPoint,
  cancelDraw,
  saveDraw,
}: DrawFormProps) {
  const isZone = drawMode === "zone";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        saveDraw(drawMode);
      }}
      className="map-draw-card"
    >
      <strong>{drawMode === "zone" ? "Add zone" : "Add route"}</strong>
      <span className="draw-desc">
        {isZone
          ? `Click the map to place corners — ${drawPoints.length} placed, need at least 3.`
          : `Click the map to place points — ${drawPoints.length} placed, need at least 2.`}
      </span>
      <div className="map-draw-actions">
        <button type="button" className="link-btn" onClick={handleUndoPoint} disabled={drawUndo.length === 0}>
          Undo point
        </button>
        <button type="button" className="link-btn" onClick={handleRedoPoint} disabled={drawRedo.length === 0}>
          Redo point
        </button>
        <button type="button" className="link-btn" onClick={cancelDraw}>
          Cancel
        </button>
      </div>
      <input
        value={drawName}
        onChange={(e) => setDrawName(e.target.value)}
        placeholder={`${drawMode === "zone" ? "Zone name" : "Route name"} (required)`}
      />
      <input
        value={drawDesc}
        onChange={(e) => setDrawDesc(e.target.value)}
        placeholder="Description (optional)"
      />
      {isZone && (
        <div className="map-draw-value-row">
          <div className="map-draw-value">
            <span className="color-label">Value</span>
            <input
              type="number"
              step="any"
              min="0"
              value={drawValue}
              onChange={(e) => setDrawValue(e.target.value)}
              placeholder="e.g. 1500"
              title="Numeric value shown in the choropleth overlay (optional)"
            />
          </div>
          <div className="map-draw-value">
            <span className="color-label">Count</span>
            <input
              type="number"
              step="1"
              min="0"
              value={drawCount}
              onChange={(e) => setDrawCount(e.target.value)}
              placeholder="reports"
              title="How many submissions back this value (trust signal)"
            />
          </div>
        </div>
      )}
      <div className="map-draw-color">
        <span className="color-label">Color</span>
        <input
          type="color"
          value={drawColor}
          onChange={(e) => setDrawColor(e.target.value)}
          title="Color"
        />
        <input
          type="text"
          value={drawColor}
          onChange={(e) => { if (/^#[0-9a-fA-F]{3,8}$/.test(e.target.value)) setDrawColor(e.target.value); }}
          pattern="#[0-9a-fA-F]{3,8}"
          title="Hex color"
        />
      </div>
      {drawError && (
        <div className="draw-error">
          <strong>Could not add {drawMode}:</strong> {drawError}
        </div>
      )}
      <button
        type="submit"
        className="action-btn2"
        title={!drawName.trim() ? "Enter a name to save" : undefined}
      >
        Save {drawMode}
      </button>
    </form>
  );
}
