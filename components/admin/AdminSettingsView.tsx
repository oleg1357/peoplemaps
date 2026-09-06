"use client";

import { useState } from "react";
import type { MapSettingsInput } from "@/lib/api-client";
import {
  uploadCoverImage,
  removeCoverImage,
} from "@/lib/api-client";
import { backendLive } from "@/lib/api-client";
import {
  MARKER_COLORS,
  DEFAULT_MARKER,
  DEFAULT_ACCENT,
  getMarkerColor,
} from "@/lib/markers";
import { IconTrash } from "../icons";
import { MarkerPicker, AdminField } from "../AdminPanel";
import { coverImageUrl } from "@/sanity/lib/images";
import AutoModerationSection from "./AutoModerationSection";
import type { MapDocument } from "@/lib/types";

const DEFAULT_BASE = { lat: 55.6761, lng: 12.5683 };

export default function AdminSettingsView({
  draft,
  setDraft,
  savingSettings,
  settingsSaved,
  settingsError,
  onSubmit,
  onDeleteMap,
  activeMap,
}: {
  draft: MapSettingsInput;
  setDraft: (d: MapSettingsInput) => void;
  savingSettings: boolean;
  settingsSaved: boolean;
  settingsError: string;
  onSubmit: (e: React.FormEvent) => void;
  onDeleteMap: () => void;
  activeMap: MapDocument | null;
}) {
  const [coverUploading, setCoverUploading] = useState(false);
  const [coverMsg, setCoverMsg] = useState("");

  const coverUrl = activeMap?.coverImage ? coverImageUrl(activeMap.coverImage) : null;

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeMap) return;
    setCoverUploading(true);
    setCoverMsg("");
    try {
      const res = await uploadCoverImage(activeMap._id, file);
      setCoverMsg(res?.ok ? "Cover image uploaded." : "Upload failed.");
    } catch (err) {
      setCoverMsg((err as Error).message || "Upload failed.");
    } finally {
      setCoverUploading(false);
      e.target.value = "";
    }
  };

  const handleCoverRemove = async () => {
    if (!activeMap) return;
    setCoverMsg("");
    try {
      const res = await removeCoverImage(activeMap._id);
      setCoverMsg(res?.ok ? "Cover image removed." : "Remove failed.");
    } catch (err) {
      setCoverMsg((err as Error).message || "Remove failed.");
    }
  };

  return (
    <>
    <form className="admin-section" onSubmit={onSubmit}>
      <h3>Map settings</h3>
      <div className="admin-panel-group">
        <h4>Cover image</h4>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Cover"
              style={{ width: 120, height: 80, objectFit: "cover", border: "1px solid var(--border)" }}
            />
          ) : (
            <span className="muted">No cover image yet.</span>
          )}
          {backendLive && (
            <>
              <label className="action-btn2" style={{ cursor: "pointer" }}>
                {coverUploading ? "Uploading…" : coverUrl ? "Replace" : "Upload"}
                <input
                  type="file"
                  accept="image/*"
                  style={{ display: "none" }}
                  disabled={coverUploading}
                  onChange={handleCoverUpload}
                />
              </label>
              {coverUrl && (
                <button type="button" className="action-btn2 danger" onClick={handleCoverRemove}>
                  Remove
                </button>
              )}
            </>
          )}
        </div>
        {coverMsg && <p className="muted">{coverMsg}</p>}
      </div>
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
        <AdminField label="Who can add spots">
          <select
            value={draft.collaborationMode ?? "loggedIn"}
            onChange={(e) =>
              setDraft({
                ...draft,
                collaborationMode: e.target.value as
                  | "anyone"
                  | "loggedIn"
                  | "invitedOnly",
              })
            }
          >
            <option value="anyone">Anyone (no login required)</option>
            <option value="loggedIn">Logged-in users</option>
            <option value="invitedOnly">Owner &amp; moderators only</option>
          </select>
        </AdminField>
      </div>

      <div className="admin-panel-group">
        <h4>Discovery</h4>
        <AdminField label="Category">
          <select
            value={draft.category ?? ""}
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          >
            <option value="">No category</option>
            <option value="food">Food &amp; drink</option>
            <option value="sights">Sightseeing</option>
            <option value="shopping">Shopping</option>
            <option value="outdoors">Outdoors</option>
            <option value="nightlife">Nightlife</option>
            <option value="arts">Arts &amp; culture</option>
            <option value="sports">Sports</option>
            <option value="other">Other</option>
          </select>
        </AdminField>
        <AdminField label="Tags">
          <input
            value={draft.tags ?? ""}
            onChange={(e) => setDraft({ ...draft, tags: e.target.value })}
            placeholder="e.g. hidden gems, family friendly, dog friendly"
          />
        </AdminField>
      </div>

      <div className="admin-panel-group">
        <h4>Content toggles</h4>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={draft.allowReviews ?? true}
            onChange={(e) => setDraft({ ...draft, allowReviews: e.target.checked })}
          />
          Allow visitors to add reviews
        </label>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={draft.allowComments ?? true}
            onChange={(e) => setDraft({ ...draft, allowComments: e.target.checked })}
          />
          Allow visitors to comment on reviews
        </label>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={draft.allowPhotos ?? true}
            onChange={(e) => setDraft({ ...draft, allowPhotos: e.target.checked })}
          />
          Allow visitors to upload photos
        </label>
        <label className="admin-check">
          <input
            type="checkbox"
            checked={draft.enableClustering ?? false}
            onChange={(e) => setDraft({ ...draft, enableClustering: e.target.checked })}
          />
          Cluster nearby markers on the map
        </label>
      </div>

      <div className="admin-panel-group">
        <h4>Contact &amp; links</h4>
        <AdminField label="Contact email">
          <input
            type="email"
            value={draft.contactEmail ?? ""}
            onChange={(e) => setDraft({ ...draft, contactEmail: e.target.value })}
            placeholder="hello@example.com"
          />
        </AdminField>
        <AdminField label="Website">
          <input
            type="url"
            value={draft.website ?? ""}
            onChange={(e) => setDraft({ ...draft, website: e.target.value })}
            placeholder="https://example.com"
          />
        </AdminField>
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

    {backendLive && activeMap && (
      <div className="admin-section">
        <AutoModerationSection mapId={activeMap._id} backendLive={backendLive} />
      </div>
    )}
    </>
  );
}
