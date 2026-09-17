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
  allowDuplicateSpots?: boolean | null;
}

interface AddSpotFormProps {
  newName: string;
  setNewName: (v: string) => void;
  newStreet: string;
  setNewStreet: (v: string) => void;
  newCity: string;
  setNewCity: (v: string) => void;
  pickMarkerEmoji: string;
  pickMarkerColor: string;
  setNewMarker: (v: string | null) => void;
  setNewMarkerColor: (v: string | null) => void;
  setPriceLevel: (v: number | null) => void;
  setHoursNote: (v: string) => void;
  setTagsText: (v: string) => void;
  setTip: (v: string) => void;
  suggestedTags?: string;
  requireSpotFields?: string[];
  duplicateWarning?: string | null;
  activeMap: MapLike | null;
  onSubmit: (e: React.FormEvent) => void;
  onTagSuggestion?: (tag: string) => void;
}

function req(reqFields: string[] | undefined, field: string): boolean {
  return !!reqFields?.includes(field);
}

export function AddSpotForm({
  newName,
  setNewName,
  newStreet,
  setNewStreet,
  newCity,
  setNewCity,
  pickMarkerEmoji,
  pickMarkerColor,
  setNewMarker,
  setNewMarkerColor,
  setPriceLevel,
  setHoursNote,
  setTagsText,
  setTip,
  suggestedTags = "",
  requireSpotFields = [],
  duplicateWarning,
  activeMap,
  onSubmit,
  onTagSuggestion,
}: AddSpotFormProps) {
  const suggestionList = suggestedTags
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 12);
  return (
    <form
      onSubmit={onSubmit}
      className="map-form-card"
    >
      <Input
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        placeholder="Spot name"
      />
      <div className="mt-2 grid grid-cols-2 gap-2">
        <Input
          value={newStreet}
          onChange={(e) => setNewStreet(e.target.value)}
          placeholder={req(requireSpotFields, "street") ? "Street (required)" : "Street (optional)"}
        />
        <Input
          value={newCity}
          onChange={(e) => setNewCity(e.target.value)}
          placeholder={req(requireSpotFields, "city") ? "City (required)" : "City (optional)"}
        />
        <select
          onChange={(e) => setPriceLevel(e.target.value ? Number(e.target.value) : null)}
          title={req(requireSpotFields, "priceLevel") ? "Price level" : "Price level (optional)"}
          className={selectInputCls}
        >
          <option value="">
            {req(requireSpotFields, "priceLevel") ? "Price (required)" : "Price (optional)"}
          </option>
          <option value="0">$ — cheap</option>
          <option value="1">$$ — moderate</option>
          <option value="2">$$$ — upscale</option>
          <option value="3">$$$$ — premium</option>
        </select>
        <Input
          onChange={(e) => setHoursNote(e.target.value)}
          placeholder={
            req(requireSpotFields, "hoursNote")
              ? "Hours (required) e.g. Mon–Fri 08:00–18:00"
              : "Hours (optional) e.g. Mon–Fri 08:00–18:00"
          }
        />
        <Input
          onChange={(e) => setTagsText(e.target.value)}
          placeholder={req(requireSpotFields, "tags") ? "Tags (required, comma separated)" : "Tags (optional, comma separated)"}
          className="col-span-2"
        />
        <Textarea
          onChange={(e) => setTip(e.target.value)}
          rows={2}
          placeholder={req(requireSpotFields, "tip") ? "Insider tip (required), e.g. best time to visit" : "Insider tip (optional), e.g. best time to visit"}
          className="col-span-2"
        />
      </div>
      {suggestionList.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {suggestionList.map((t) => (
            <button
              type="button"
              key={t}
              onClick={() => onTagSuggestion?.(t)}
              className="rounded-full border bg-surface-2 px-2 py-0.5 text-xs text-muted-foreground transition hover:border-foreground/30 hover:text-foreground"
            >
              {t}
            </button>
          ))}
        </div>
      )}
      {duplicateWarning && (
        <div className="mt-1.5 rounded-md border border-destructive/40 bg-destructive/5 px-2.5 py-1.5 text-xs text-destructive">
          {duplicateWarning}
        </div>
      )}
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