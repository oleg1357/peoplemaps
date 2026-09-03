"use client";

import { MARKER_PRESETS, DEFAULT_MARKER, getMarkerColor } from "@/lib/markers";

interface MapLike {
  _id: string;
  accentColor?: string | null;
  submissionNote?: string | null;
}

interface AddSpotFormProps {
  newName: string;
  setNewName: (v: string) => void;
  pickMarkerEmoji: string;
  pickMarkerColor: string;
  setNewMarker: (v: string | null) => void;
  setNewMarkerColor: (v: string | null) => void;
  activeMap: MapLike | null;
  onSubmit: (e: React.FormEvent) => void;
}

export function AddSpotForm({
  newName,
  setNewName,
  pickMarkerEmoji,
  pickMarkerColor,
  setNewMarker,
  setNewMarkerColor,
  activeMap,
  onSubmit,
}: AddSpotFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="map-draw-card"
    >
      <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Spot name" />
      {activeMap?.submissionNote && (
        <div
          className="map-submit-note"
          style={{
            borderLeftColor: activeMap.accentColor ?? DEFAULT_MARKER.color,
          }}
        >
          {activeMap.submissionNote}
        </div>
      )}
      <div className="marker-picker-inline">
        {MARKER_PRESETS.map((m) => (
          <button
            key={m.id}
            type="button"
            title={m.label}
            className={`marker-opt ${m.emoji === pickMarkerEmoji ? "active" : ""}`}
            onClick={() => {
              setNewMarker(m.emoji);
              setNewMarkerColor(m.color);
            }}
          >
            {m.emoji}
          </button>
        ))}
        <input
          type="color"
          value={getMarkerColor(pickMarkerColor)}
          onChange={(e) => setNewMarkerColor(e.target.value)}
          title="Custom color"
        />
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span
          className="pm-marker"
          style={{
            width: 28,
            height: 28,
            background: getMarkerColor(pickMarkerColor),
          }}
        >
          <span>{pickMarkerEmoji}</span>
        </span>
        <button type="submit" className="action-btn2" disabled={!newName.trim()}>
          Save spot
        </button>
      </div>
    </form>
  );
}
