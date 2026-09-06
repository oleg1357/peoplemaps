"use client";

import { MARKER_PRESETS, DEFAULT_MARKER, getMarkerColor } from "@/lib/markers";

interface MapLike {
  _id: string;
  accentColor?: string | null;
  submissionNote?: string | null;
  collaborationMode?: "anyone" | "loggedIn" | "invitedOnly" | null;
}

interface AddSpotFormProps {
  newName: string;
  setNewName: (v: string) => void;
  pickMarkerEmoji: string;
  pickMarkerColor: string;
  setNewMarker: (v: string | null) => void;
  setNewMarkerColor: (v: string | null) => void;
  setPriceLevel: (v: number | null) => void;
  setHoursNote: (v: string) => void;
  setTagsText: (v: string) => void;
  setTip: (v: string) => void;
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
  setPriceLevel,
  setHoursNote,
  setTagsText,
  setTip,
  activeMap,
  onSubmit,
}: AddSpotFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      className="map-draw-card"
    >
      <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Spot name" />
      <div className="spot-form-grid">
        <select onChange={(e) => setPriceLevel(e.target.value ? Number(e.target.value) : null)} title="Price level">
          <option value="">Price (optional)</option>
          <option value="0">$ — cheap</option>
          <option value="1">$$ — moderate</option>
          <option value="2">$$$ — upscale</option>
          <option value="3">$$$$ — premium</option>
        </select>
        <input onChange={(e) => setHoursNote(e.target.value)} placeholder="Hours (optional) e.g. Mon–Fri 08:00–18:00" />
        <input onChange={(e) => setTagsText(e.target.value)} placeholder="Tags (optional, comma separated)" />
        <textarea onChange={(e) => setTip(e.target.value)} rows={2} placeholder="Insider tip (optional), e.g. best time to visit" />
      </div>
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
      {activeMap?.collaborationMode === "invitedOnly" && (
        <div
          className="map-submit-note"
          style={{
            borderLeftColor: activeMap.accentColor ?? DEFAULT_MARKER.color,
          }}
        >
          This map only accepts spots from the owner and moderators.
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
