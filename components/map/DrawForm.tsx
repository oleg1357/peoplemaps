"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
      className="map-form-card"
    >
      <strong className="text-[15px] font-bold">
        {drawMode === "zone" ? "Add zone" : "Add route"}
      </strong>
      <span className="text-xs leading-snug text-muted-foreground">
        {isZone
          ? `Click the map to place corners — ${drawPoints.length} placed, need at least 3.`
          : `Click the map to place points — ${drawPoints.length} placed, need at least 2.`}
      </span>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={handleUndoPoint} disabled={drawUndo.length === 0}>
          Undo point
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={handleRedoPoint} disabled={drawRedo.length === 0}>
          Redo point
        </Button>
        <Button type="button" variant="ghost" size="sm" onClick={cancelDraw}>
          Cancel
        </Button>
      </div>
      <Input
        value={drawName}
        onChange={(e) => setDrawName(e.target.value)}
        placeholder={`${drawMode === "zone" ? "Zone name" : "Route name"} (required)`}
      />
      <Input
        value={drawDesc}
        onChange={(e) => setDrawDesc(e.target.value)}
        placeholder="Description (optional)"
      />
      {isZone && (
        <div className="flex gap-2">
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Value</span>
            <Input
              type="number"
              step="any"
              min="0"
              value={drawValue}
              onChange={(e) => setDrawValue(e.target.value)}
              placeholder="e.g. 1500"
              title="Numeric value shown in the choropleth overlay (optional)"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <span className="text-xs text-muted-foreground">Count</span>
            <Input
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
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Color</span>
        <Input
          type="color"
          value={drawColor}
          onChange={(e) => setDrawColor(e.target.value)}
          title="Color"
          className="h-10 w-10 cursor-pointer p-1"
        />
        <Input
          type="text"
          value={drawColor}
          onChange={(e) => { if (/^#[0-9a-fA-F]{3,8}$/.test(e.target.value)) setDrawColor(e.target.value); }}
          pattern="#[0-9a-fA-F]{3,8}"
          title="Hex color"
          className="w-[92px] font-mono text-[13px]"
        />
      </div>
      {drawError && (
        <div className="text-xs text-destructive">
          <strong>Could not add {drawMode}:</strong> {drawError}
        </div>
      )}
      <Button
        type="submit"
        title={!drawName.trim() ? "Enter a name to save" : undefined}
      >
        Save {drawMode}
      </Button>
    </form>
  );
}