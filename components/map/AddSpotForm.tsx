"use client";

import { MARKER_PRESETS, DEFAULT_MARKER, getMarkerColor } from "@/lib/markers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { selectInputCls } from "@/lib/utils";

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
      className="absolute bottom-24 left-1/2 z-[1000] flex w-[min(360px,90vw)] -translate-x-1/2 flex-col gap-2.5 border border-border bg-surface p-4 text-ink shadow-(--shadow-lg)"
    >
      <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Spot name" />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <select onChange={(e) => setPriceLevel(e.target.value ? Number(e.target.value) : null)} title="Price level" className={selectInputCls}>
          <option value="">Price (optional)</option>
          <option value="0">$ — cheap</option>
          <option value="1">$$ — moderate</option>
          <option value="2">$$$ — upscale</option>
          <option value="3">$$$$ — premium</option>
        </select>
        <Input onChange={(e) => setHoursNote(e.target.value)} placeholder="Hours (optional) e.g. Mon–Fri 08:00–18:00" />
        <Input onChange={(e) => setTagsText(e.target.value)} placeholder="Tags (optional, comma separated)" />
        <Textarea onChange={(e) => setTip(e.target.value)} rows={2} placeholder="Insider tip (optional), e.g. best time to visit" className="col-span-2" />
      </div>
      {activeMap?.submissionNote && (
        <div
          className="border-l-[3px] bg-surface-2 px-3 py-1.5 text-xs leading-snug text-muted-foreground"
          style={{
            borderLeftColor: activeMap.accentColor ?? DEFAULT_MARKER.color,
          }}
        >
          {activeMap.submissionNote}
        </div>
      )}
      {activeMap?.collaborationMode === "invitedOnly" && (
        <div
          className="border-l-[3px] bg-surface-2 px-3 py-1.5 text-xs leading-snug text-muted-foreground"
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
      <div className="flex items-center gap-2">
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
        <Button type="submit" disabled={!newName.trim()}>
          Save spot
        </Button>
      </div>
    </form>
  );
}