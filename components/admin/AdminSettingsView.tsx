"use client";

import type { MapSettingsInput } from "@/lib/api-client";
import {
  MARKER_COLORS,
  DEFAULT_MARKER,
  DEFAULT_ACCENT,
  getMarkerColor,
} from "@/lib/markers";
import { IconTrash } from "../icons";
import { MarkerPicker, AdminField } from "../AdminPanel";

const DEFAULT_BASE = { lat: 55.6761, lng: 12.5683 };

export default function AdminSettingsView({
  draft,
  setDraft,
  savingSettings,
  settingsSaved,
  settingsError,
  onSubmit,
  onDeleteMap,
}: {
  draft: MapSettingsInput;
  setDraft: (d: MapSettingsInput) => void;
  savingSettings: boolean;
  settingsSaved: boolean;
  settingsError: string;
  onSubmit: (e: React.FormEvent) => void;
  onDeleteMap: () => void;
}) {
  return (
    <form className="admin-section" onSubmit={onSubmit}>
      <h3>Map settings</h3>
      <div className="admin-edit-grid">
        <AdminField label="Title">
          <input
            value={draft.title ?? ""}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </AdminField>
        <AdminField label="Visibility">
          <select
            value={draft.isPublic ?? "public"}
            onChange={(e) =>
              setDraft({
                ...draft,
                isPublic: e.target.value as "public" | "private",
              })
            }
          >
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
        </AdminField>
        <AdminField label="Description">
          <input
            value={draft.description ?? ""}
            onChange={(e) => setDraft({ ...draft, description: e.target.value })}
          />
        </AdminField>
        <AdminField label="Accent color">
          <div className="marker-picker-colors">
            {MARKER_COLORS.map((c) => (
              <button
                type="button"
                key={c}
                className={`swatch ${draft.accentColor === c ? "active" : ""}`}
                style={{ background: c }}
                onClick={() => setDraft({ ...draft, accentColor: c })}
              />
            ))}
            <input
              type="color"
              value={getMarkerColor(draft.accentColor ?? DEFAULT_ACCENT)}
              onChange={(e) => setDraft({ ...draft, accentColor: e.target.value })}
              title="Custom color"
            />
          </div>
        </AdminField>
      </div>

      <div className="admin-panel-group">
        <MarkerPicker
          emoji={draft.defaultMarker ?? DEFAULT_MARKER.emoji}
          color={draft.defaultMarkerColor ?? DEFAULT_MARKER.color}
          onEmoji={(e) => setDraft({ ...draft, defaultMarker: e })}
          onColor={(c) => setDraft({ ...draft, defaultMarkerColor: c })}
        />
      </div>

      <div className="admin-panel-group">
        <h4>Behavior</h4>
        <AdminField label="Default map center (lat)">
          <input
            type="number"
            step="any"
            value={draft.baseCenter?.lat ?? DEFAULT_BASE.lat}
            onChange={(e) =>
              setDraft({
                ...draft,
                baseCenter: {
                  lat: Number(e.target.value),
                  lng: draft.baseCenter?.lng ?? DEFAULT_BASE.lng,
                },
              })
            }
          />
        </AdminField>
        <AdminField label="Default map center (lng)">
          <input
            type="number"
            step="any"
            value={draft.baseCenter?.lng ?? DEFAULT_BASE.lng}
            onChange={(e) =>
              setDraft({
                ...draft,
                baseCenter: {
                  lat: draft.baseCenter?.lat ?? DEFAULT_BASE.lat,
                  lng: Number(e.target.value),
                },
              })
            }
          />
        </AdminField>
        <AdminField label="Default zoom">
          <input
            type="number"
            min={3}
            max={18}
            value={draft.baseZoom ?? 12}
            onChange={(e) => setDraft({ ...draft, baseZoom: Number(e.target.value) })}
          />
        </AdminField>
        <AdminField label="Max photos per spot (0-12)">
          <input
            type="number"
            min={0}
            max={12}
            value={draft.maxPhotosPerSpot ?? 6}
            onChange={(e) =>
              setDraft({ ...draft, maxPhotosPerSpot: Number(e.target.value) })
            }
          />
        </AdminField>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={draft.requireApproval ?? true}
            onChange={(e) => setDraft({ ...draft, requireApproval: e.target.checked })}
          />
          Require your approval for new spots
        </label>
      </div>

      <div className="admin-panel-group">
        <h4>Text for visitors</h4>
        <AdminField label="Welcome message">
          <textarea
            rows={3}
            value={draft.welcomeMessage ?? ""}
            onChange={(e) => setDraft({ ...draft, welcomeMessage: e.target.value })}
            placeholder="Short banner shown on the map, e.g. “Help keep this map fresh!”"
          />
        </AdminField>
        <AdminField label="Add-spot instructions">
          <textarea
            rows={2}
            value={draft.submissionNote ?? ""}
            onChange={(e) => setDraft({ ...draft, submissionNote: e.target.value })}
            placeholder="Tip shown in the add-spot form, e.g. “Please include opening hours.”"
          />
        </AdminField>
      </div>

      {settingsError && <p className="auth-error">{settingsError}</p>}
      {settingsSaved && (
        <p className="muted" style={{ color: "var(--green)" }}>
          Settings saved.
        </p>
      )}
      <div className="admin-row-actions">
        <button
          type="submit"
          className="action-btn"
          disabled={savingSettings}
        >
          {savingSettings ? "Saving…" : "Save settings"}
        </button>
      </div>

      <div className="admin-danger-zone">
        <div>
          <strong>Danger zone</strong>
          <p className="muted">
            Delete the map, all its spots, reviews, photos and
            comments. This cannot be undone.
          </p>
        </div>
        <button type="button" className="action-btn danger" onClick={onDeleteMap}>
          <IconTrash size={15} /> Delete map
        </button>
      </div>
    </form>
  );
}
