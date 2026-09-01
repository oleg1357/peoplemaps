"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  fetchAdminMaps,
  fetchAdminSpots,
  createMap,
  updateMapSettings,
  destroyMap,
  moderateSpot,
  setSpotHidden,
  updateSpotFields,
  destroySpot,
  fetchMapModerators,
  addMapModerator,
  removeMapModerator,
  type AdminMapEntry,
  type AdminSpotList,
  type MapSettingsInput,
  type MapRoleEntry,
} from "@/lib/api-client";
import type { Spot } from "@/lib/types";
import {
  MARKER_PRESETS,
  MARKER_COLORS,
  DEFAULT_MARKER,
  DEFAULT_ACCENT,
  getMarkerColor,
} from "@/lib/markers";
import {
  IconCheck,
  IconLink,
  IconMapMarker,
  IconPlus,
  IconTrash,
  IconUser,
  IconX,
} from "./icons";

interface EditState {
  spot: Spot;
}

const DEFAULT_BASE = { lat: 55.6761, lng: 12.5683 };

function MarkerPreview({
  emoji,
  color,
  size = 26,
}: {
  emoji?: string | null;
  color?: string | null;
  size?: number;
}) {
  return (
    <span
      className="pm-marker"
      style={{
        width: size,
        height: size,
        background: getMarkerColor(color, DEFAULT_MARKER.color),
      }}
    >
      <span>{emoji || DEFAULT_MARKER.emoji}</span>
    </span>
  );
}

function MarkerPicker({
  emoji,
  color,
  onEmoji,
  onColor,
}: {
  emoji: string;
  color: string;
  onEmoji: (e: string) => void;
  onColor: (c: string) => void;
}) {
  return (
    <div className="marker-picker">
      <div className="admin-field">
        <span>Marker icon</span>
        <div className="marker-picker-grid">
          {MARKER_PRESETS.map((m) => (
            <button
              type="button"
              key={m.id}
              title={m.label}
              className={`marker-opt ${m.emoji === emoji ? "active" : ""}`}
              onClick={() => onEmoji(m.emoji)}
            >
              {m.emoji}
            </button>
          ))}
        </div>
      </div>
      <div className="admin-field">
        <span>Marker color</span>
        <div className="marker-picker-colors">
          {MARKER_COLORS.map((c) => (
            <button
              type="button"
              key={c}
              title={c}
              className={`swatch ${c === color ? "active" : ""}`}
              style={{ background: c }}
              onClick={() => onColor(c)}
            />
          ))}
          <input
            type="color"
            value={getMarkerColor(color)}
            onChange={(e) => onColor(e.target.value)}
            title="Custom color"
          />
        </div>
      </div>
      <div className="marker-preview-row">
        <span className="muted">Preview:</span>
        <MarkerPreview emoji={emoji} color={color} size={34} />
      </div>
    </div>
  );
}

export function AdminPanel() {
  const { user } = useAuth();
  const [maps, setMaps] = useState<AdminMapEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingMaps, setLoadingMaps] = useState(true);
  const [mapsError, setMapsError] = useState("");

  const [activeMap, setActiveMap] = useState<AdminMapEntry | null>(null);
  const [view, setView] = useState<"spots" | "settings" | "moderators">("spots");
  const [data, setData] = useState<AdminSpotList | null>(null);
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [error, setError] = useState("");

  const [moderators, setModerators] = useState<MapRoleEntry[]>([]);
  const [loadingModerators, setLoadingModerators] = useState(false);
  const [moderatorEmail, setModeratorEmail] = useState("");
  const [moderatorBusy, setModeratorBusy] = useState(false);
  const [moderatorError, setModeratorError] = useState("");
  const [moderatorNotice, setModeratorNotice] = useState("");

  const [edit, setEdit] = useState<EditState | null>(null);
  const [confirmDestroy, setConfirmDestroy] = useState<Spot | null>(null);
  const [confirmDeleteMap, setConfirmDeleteMap] = useState(false);

  const [creating, setCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createPublic, setCreatePublic] = useState<"public" | "private">("public");
  const [createError, setCreateError] = useState("");
  const [createBusy, setCreateBusy] = useState(false);
  const [createdMap, setCreatedMap] = useState<{ _id: string; slug: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  const [draft, setDraft] = useState<MapSettingsInput | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  const copyLink = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const permalink = (m: { _id: string; slug?: string | null }) =>
    m.slug
      ? `${window.location.origin}/map/${encodeURIComponent(m.slug)}`
      : `${window.location.origin}/map?map=${encodeURIComponent(m._id)}`;

  const loadMaps = useCallback(async () => {
    setLoadingMaps(true);
    try {
      const res = await fetchAdminMaps();
      setMaps(res.maps);
      setIsAdmin(res.isAdmin);
      setLoadingMaps(false);
      if (res.maps.length > 0) {
        setActiveMap((prev) =>
          prev && res.maps.some((m) => m._id === prev._id) ? prev : res.maps[0]
        );
      } else {
        setActiveMap(null);
      }
    } catch {
      setMapsError("Could not load your maps. Are you a map owner?");
      setLoadingMaps(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    let active = true;
    setLoadingMaps(true);
    fetchAdminMaps()
      .then((res) => {
        if (!active) return;
        setMaps(res.maps);
        setIsAdmin(res.isAdmin);
        setLoadingMaps(false);
        if (res.maps.length > 0) setActiveMap(res.maps[0]);
        else setActiveMap(null);
      })
      .catch(() => {
        if (!active) return;
        setMapsError("Could not load your maps. Are you a map owner?");
        setLoadingMaps(false);
      });
    return () => {
      active = false;
    };
  }, [user]);

  const handleCreateMap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim() || createBusy) return;
    setCreateBusy(true);
    setCreateError("");
    try {
      const created = await createMap({
        title: createTitle.trim(),
        description: createDesc.trim() || undefined,
        isPublic: createPublic,
      });
      setCreatedMap({ _id: created._id, slug: created.slug });
      setCreateTitle("");
      setCreateDesc("");
      setCreating(false);
      await loadMaps();
    } catch (err) {
      setCreateError((err as Error).message || "Failed to create map.");
    } finally {
      setCreateBusy(false);
    }
  };

  const loadSpots = useCallback(async (mapId: string) => {
    setLoadingSpots(true);
    setError("");
    try {
      const list = await fetchAdminSpots(mapId);
      setData(list);
    } catch (e) {
      setError((e as Error).message || "Failed to load spots");
      setData(null);
    } finally {
      setLoadingSpots(false);
    }
  }, []);

  useEffect(() => {
    if (activeMap && view === "spots") loadSpots(activeMap._id);
  }, [activeMap, loadSpots, view]);

  // True when this user can change map settings / manage moderators / delete
  // the map: the map's owner or a global admin.
  const canManageMap = isAdmin || activeMap?.role === "owner";

  const loadModerators = useCallback(async (mapId: string) => {
    setLoadingModerators(true);
    setModeratorError("");
    try {
      const res = await fetchMapModerators(mapId);
      setModerators(res?.moderators ?? []);
    } catch (e) {
      setModeratorError((e as Error).message || "Failed to load moderators.");
      setModerators([]);
    } finally {
      setLoadingModerators(false);
    }
  }, []);

  useEffect(() => {
    if (activeMap && view === "moderators") loadModerators(activeMap._id);
  }, [activeMap, view, loadModerators]);

  const handleAddModerator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMap || !moderatorEmail.trim() || moderatorBusy) return;
    setModeratorBusy(true);
    setModeratorError("");
    setModeratorNotice("");
    try {
      const res = await addMapModerator(activeMap._id, moderatorEmail.trim());
      setModerators(res.moderators);
      setModeratorEmail("");
      setModeratorNotice("Moderator added.");
    } catch (err) {
      setModeratorError((err as Error).message || "Failed to add moderator.");
    } finally {
      setModeratorBusy(false);
    }
  };

  const handleRemoveModerator = async (userId: string) => {
    if (!activeMap) return;
    setModeratorError("");
    setModeratorNotice("");
    try {
      await removeMapModerator(activeMap._id, userId);
      setModerators((prev) => prev.filter((m) => m.userId !== userId));
      setModeratorNotice("Moderator removed.");
    } catch (err) {
      setModeratorError((err as Error).message || "Failed to remove moderator.");
    }
  };

  // Seed the settings form whenever the active map changes.
  useEffect(() => {
    if (!activeMap) return;
    setDraft({
      title: activeMap.title,
      description: activeMap.description ?? "",
      isPublic: activeMap.isPublic ? "public" : "private",
      accentColor: activeMap.accentColor ?? DEFAULT_ACCENT,
      defaultMarker: activeMap.defaultMarker ?? DEFAULT_MARKER.emoji,
      defaultMarkerColor: activeMap.defaultMarkerColor ?? DEFAULT_MARKER.color,
      welcomeMessage: activeMap.welcomeMessage ?? "",
      submissionNote: activeMap.submissionNote ?? "",
      maxPhotosPerSpot: activeMap.maxPhotosPerSpot ?? 6,
      requireApproval: activeMap.requireApproval ?? true,
      baseCenter: activeMap.baseCenter ?? DEFAULT_BASE,
      baseZoom: activeMap.baseZoom ?? 12,
    });
  }, [activeMap?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    if (!activeMap) return;
    await loadSpots(activeMap._id);
  }, [activeMap, loadSpots]);

  const handleModerate = async (spot: Spot, moderation: "approved" | "rejected") => {
    try {
      await moderateSpot(spot._id!, moderation);
    } catch (e) {
      setError((e as Error).message || "Action failed");
      return;
    }
    setEdit(null);
    await refresh();
  };

  const handleToggleHidden = async (spot: Spot) => {
    try {
      await setSpotHidden(spot._id!, !spot.hidden);
    } catch (e) {
      setError((e as Error).message || "Action failed");
      return;
    }
    await refresh();
  };

  const handleSaveEdit = async () => {
    if (!edit) return;
    try {
      await updateSpotFields(edit.spot._id!, edit.spot);
    } catch (e) {
      setError((e as Error).message || "Save failed");
      return;
    }
    setEdit(null);
    await refresh();
  };

  const handleDestroy = async () => {
    if (!confirmDestroy) return;
    try {
      await destroySpot(confirmDestroy._id!);
    } catch (e) {
      setError((e as Error).message || "Delete failed");
      return;
    }
    setConfirmDestroy(null);
    await refresh();
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeMap || !draft) return;
    setSavingSettings(true);
    setSettingsError("");
    setSettingsSaved(false);
    try {
      const updated = await updateMapSettings(activeMap._id, draft);
      if (updated) {
        setMaps((prev) =>
          prev.map((m) => (m._id === updated._id ? { ...m, ...updated } : m))
        );
        setSettingsSaved(true);
        setTimeout(() => setSettingsSaved(false), 2500);
      }
    } catch (err) {
      setSettingsError((err as Error).message || "Failed to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleDeleteMap = async () => {
    if (!activeMap) return;
    setSettingsError("");
    try {
      await destroyMap(activeMap._id);
      setConfirmDeleteMap(false);
      await loadMaps();
      setView("spots");
    } catch (err) {
      setSettingsError((err as Error).message || "Failed to delete map.");
      setConfirmDeleteMap(false);
    }
  };

  if (!user) {
    return (
      <div className="page">
        <div className="admin-empty">
          <p>You must be signed in to manage maps.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="admin-shell">
        <div className="admin-head">
          <h1>Map Admin</h1>
          <p className="muted">
            Create maps, moderate spots, customise markers and manage settings.
          </p>
          <button
            type="button"
            className="action-btn admin-create-btn"
            onClick={() => {
              setCreating((c) => !c);
              setCreateError("");
            }}
          >
            <IconPlus size={16} /> {creating ? "Cancel" : "Create map"}
          </button>
        </div>

        {creating && (
          <form className="admin-create-map" onSubmit={handleCreateMap}>
            <h3>Create a new map</h3>
            <label className="admin-field">
              <span>Title</span>
              <input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="e.g. Best Coffee in Copenhagen"
              />
            </label>
            <label className="admin-field">
              <span>Description (optional)</span>
              <input
                value={createDesc}
                onChange={(e) => setCreateDesc(e.target.value)}
                placeholder="What is this map about?"
              />
            </label>
            <label className="admin-field">
              <span>Visibility</span>
              <select
                value={createPublic}
                onChange={(e) => setCreatePublic(e.target.value as "public" | "private")}
              >
                <option value="public">Public — anyone can view</option>
                <option value="private">Private — owner only</option>
              </select>
            </label>
            {createError && <p className="auth-error">{createError}</p>}
            <button type="submit" className="action-btn" disabled={createBusy || !createTitle.trim()}>
              {createBusy ? "Creating…" : "Create map"}
            </button>
          </form>
        )}

        {createdMap && (
          <div className="admin-permalink">
            <IconLink size={16} />
            <code>{permalink(createdMap)}</code>
            <button
              type="button"
              className="action-btn"
              onClick={() => copyLink(permalink(createdMap))}
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>
        )}

        {loadingMaps ? (
          <p className="muted">Loading your maps…</p>
        ) : maps.length === 0 ? (
          <div className="admin-empty">
            <IconMapMarker size={32} />
            <p>
              {mapsError ||
                (isAdmin
                  ? "No maps found. Create a map to get started."
                  : "You don't own any maps yet.")}
            </p>
          </div>
        ) : (
          <>
            <div className="admin-map-tabs">
              {maps.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  className={`admin-map-tab ${activeMap?._id === m._id ? "active" : ""}`}
                  onClick={() => {
                    setActiveMap(m);
                    setView("spots");
                    setEdit(null);
                  }}
                >
                  <span className="admin-map-tab-name">
                    <MarkerPreview
                      emoji={m.defaultMarker}
                      color={m.defaultMarkerColor}
                      size={18}
                    />
                    {m.title}
                  </span>
                  {m.role === "moderator" && (
                    <span className="admin-map-tab-chip">moderator</span>
                  )}
                  {m.spotPending > 0 && (
                    <span className="admin-map-tab-badge">{m.spotPending}</span>
                  )}
                </button>
              ))}
            </div>

            {activeMap && (
              <>
                <div className="admin-inner-tabs">
                  <button
                    type="button"
                    className={`admin-inner-tab ${view === "spots" ? "active" : ""}`}
                    onClick={() => {
                      setView("spots");
                      setEdit(null);
                    }}
                  >
                    Spots
                  </button>
                  {canManageMap && (
                    <button
                      type="button"
                      className={`admin-inner-tab ${view === "moderators" ? "active" : ""}`}
                      onClick={() => setView("moderators")}
                    >
                      Moderators
                    </button>
                  )}
                  {canManageMap && (
                    <button
                      type="button"
                      className={`admin-inner-tab ${view === "settings" ? "active" : ""}`}
                      onClick={() => setView("settings")}
                    >
                      Settings
                    </button>
                  )}
                </div>

                {view === "spots" && (
                  <div className="admin-section">
                    <div className="admin-permalink-row">
                      <span className="muted">Permalink:</span>
                      <code>{permalink(activeMap)}</code>
                      <button
                        type="button"
                        className="link-btn"
                        onClick={() => copyLink(permalink(activeMap))}
                      >
                        {copied ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <div className="admin-stat-row">
                      <div className="admin-stat">
                        <b>{data?.total ?? "–"}</b>
                        <span>Total</span>
                      </div>
                      <div className="admin-stat pending">
                        <b>{data?.pending ?? "–"}</b>
                        <span>Pending</span>
                      </div>
                      <div className="admin-stat hidden">
                        <b>{data?.hidden ?? "–"}</b>
                        <span>Hidden</span>
                      </div>
                    </div>

                    {error && <p className="auth-error">{error}</p>}

                    {loadingSpots ? (
                      <p className="muted">Loading spots…</p>
                    ) : (
                      <>
                        {data && data.spots.length === 0 && (
                          <p className="empty-state">No spots on this map yet.</p>
                        )}

                        {data && data.spots.length > 0 && (
                          <ul className="admin-spot-list">
                            {data.spots.map((spot) => (
                              <AdminSpotRow
                                key={spot._id}
                                spot={spot}
                                map={activeMap}
                                editing={edit?.spot._id === spot._id}
                                editSpot={edit?.spot ?? null}
                                onStartEdit={(s) => {
                                  setEdit({ spot: { ...s } });
                                  setError("");
                                }}
                                onEditChange={(s) => setEdit({ spot: s })}
                                onCancelEdit={() => setEdit(null)}
                                onSaveEdit={handleSaveEdit}
                                onApprove={() =>
                                  spot.moderation === "pending" &&
                                  handleModerate(spot, "approved")
                                }
                                onReject={() =>
                                  spot.moderation === "pending" &&
                                  handleModerate(spot, "rejected")
                                }
                                onToggleHidden={() => handleToggleHidden(spot)}
                                onDestroy={() => setConfirmDestroy(spot)}
                              />
                            ))}
                          </ul>
                        )}
                      </>
                    )}
                  </div>
                )}

                {view === "moderators" && (
                  <div className="admin-section">
                    <h3>Moderators</h3>
                    <p className="muted">
                      Designate people who can approve, edit and remove spots on
                      this map. They cannot change map settings or manage other
                      moderators.
                    </p>

                    <form className="admin-moderator-add" onSubmit={handleAddModerator}>
                      <AdminField label="Invite a moderator by email">
                        <div className="admin-moderator-add-row">
                          <input
                            type="email"
                            value={moderatorEmail}
                            onChange={(e) => setModeratorEmail(e.target.value)}
                            placeholder="moderator@example.com"
                            disabled={moderatorBusy}
                          />
                          <button
                            type="submit"
                            className="action-btn"
                            disabled={moderatorBusy || !moderatorEmail.trim()}
                          >
                            <IconUser size={15} />
                            {moderatorBusy ? "Adding…" : "Add moderator"}
                          </button>
                        </div>
                      </AdminField>
                    </form>

                    {moderatorError && <p className="auth-error">{moderatorError}</p>}
                    {moderatorNotice && (
                      <p className="muted" style={{ color: "var(--green)" }}>
                        {moderatorNotice}
                      </p>
                    )}

                    {loadingModerators ? (
                      <p className="muted">Loading moderators…</p>
                    ) : moderators.length === 0 ? (
                      <p className="empty-state">
                        No moderators yet. Add people by their account email.
                      </p>
                    ) : (
                      <ul className="admin-moderator-list">
                        {moderators.map((m) => (
                          <li key={m.userId} className="admin-moderator-row">
                            <div className="admin-moderator-info">
                              <IconUser size={16} />
                              <span className="admin-moderator-name">
                                {m.displayName || m.email || m.userId}
                              </span>
                              {m.displayName && m.displayName !== m.email && (
                                <span className="muted">{m.email}</span>
                              )}
                            </div>
                            <div className="admin-row-actions">
                              <span className="muted">
                                Added{" "}
                                {new Date(m.addedAt).toLocaleDateString()}
                              </span>
                              <button
                                type="button"
                                className="action-btn2"
                                onClick={() => handleRemoveModerator(m.userId)}
                              >
                                Remove
                              </button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {view === "settings" && draft && (
                  <form className="admin-section" onSubmit={handleSaveSettings}>
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
                        disabled={savingSettings || !activeMap}
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
                      <button
                        type="button"
                        className="action-btn danger"
                        onClick={() => setConfirmDeleteMap(true)}
                      >
                        <IconTrash size={15} /> Delete map
                      </button>
                    </div>
                  </form>
                )}
              </>
            )}
          </>
        )}

        {confirmDestroy && (
          <div className="admin-modal">
            <div className="admin-modal-card">
              <h3>Destroy this spot?</h3>
              <p>
                This permanently deletes <b>{confirmDestroy.name}</b> and all of
                its reviews, photos and comments. This cannot be undone.
              </p>
              <div className="admin-modal-actions">
                <button type="button" className="action-btn2" onClick={() => setConfirmDestroy(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="action-btn danger"
                  onClick={handleDestroy}
                >
                  <IconTrash size={15} /> Destroy
                </button>
              </div>
            </div>
          </div>
        )}

        {confirmDeleteMap && activeMap && (
          <div className="admin-modal">
            <div className="admin-modal-card">
              <h3>Delete “{activeMap.title}”?</h3>
              <p>
                This permanently deletes the map and every spot, review, photo
                and comment on it. This cannot be undone.
              </p>
              <div className="admin-modal-actions">
                <button type="button" className="action-btn2" onClick={() => setConfirmDeleteMap(false)}>
                  Cancel
                </button>
                <button type="button" className="action-btn danger" onClick={handleDeleteMap}>
                  <IconTrash size={15} /> Delete map
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminSpotRow({
  spot,
  map,
  editing,
  editSpot,
  onStartEdit,
  onEditChange,
  onCancelEdit,
  onSaveEdit,
  onApprove,
  onReject,
  onToggleHidden,
  onDestroy,
}: {
  spot: Spot;
  map: AdminMapEntry;
  editing: boolean;
  editSpot: Spot | null;
  onStartEdit: (s: Spot) => void;
  onEditChange: (s: Spot) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onToggleHidden: () => void;
  onDestroy: () => void;
}) {
  const pending = spot.moderation === "pending";

  if (editing && editSpot) {
    return (
      <li className="admin-spot edit">
        <div className="admin-edit-grid">
          <AdminField label="Name">
            <input
              value={editSpot.name}
              onChange={(e) => onEditChange({ ...editSpot, name: e.target.value })}
            />
          </AdminField>
          <AdminField label="Street">
            <input
              value={editSpot.street}
              onChange={(e) => onEditChange({ ...editSpot, street: e.target.value })}
            />
          </AdminField>
          <AdminField label="City">
            <input
              value={editSpot.city}
              onChange={(e) => onEditChange({ ...editSpot, city: e.target.value })}
            />
          </AdminField>
          <AdminField label="ZIP">
            <input
              type="number"
              value={editSpot.zip}
              onChange={(e) => onEditChange({ ...editSpot, zip: Number(e.target.value) })}
            />
          </AdminField>
          <AdminField label="Lat">
            <input
              type="number"
              step="any"
              value={editSpot.lat}
              onChange={(e) => onEditChange({ ...editSpot, lat: Number(e.target.value) })}
            />
          </AdminField>
          <AdminField label="Lng">
            <input
              type="number"
              step="any"
              value={editSpot.lng}
              onChange={(e) => onEditChange({ ...editSpot, lng: Number(e.target.value) })}
            />
          </AdminField>
          <AdminField label="Status">
            <select
              value={editSpot.status ?? "unknown"}
              onChange={(e) =>
                onEditChange({
                  ...editSpot,
                  status: e.target.value as Spot["status"],
                })
              }
            >
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="unknown">Unknown</option>
            </select>
          </AdminField>
        </div>

        <div className="admin-panel-group">
          <MarkerPicker
            emoji={editSpot.marker ?? map.defaultMarker ?? DEFAULT_MARKER.emoji}
            color={
              editSpot.markerColor ??
              (MARKER_PRESETS.find((m) => m.emoji === editSpot.marker)?.color ??
                map.defaultMarkerColor ??
                DEFAULT_MARKER.color)
            }
            onEmoji={(e) => onEditChange({ ...editSpot, marker: e })}
            onColor={(c) => onEditChange({ ...editSpot, markerColor: c })}
          />
        </div>

        <div className="admin-row-actions">
          <button type="button" className="action-btn" onClick={onSaveEdit}>
            <IconCheck size={15} /> Save
          </button>
          <button type="button" className="action-btn2" onClick={onCancelEdit}>
            Cancel
          </button>
        </div>
      </li>
    );
  }

  return (
    <li className={`admin-spot ${pending ? "pending" : ""} ${spot.hidden ? "hidden" : ""}`}>
      <div className="admin-spot-main">
        <div className="admin-spot-title">
          <MarkerPreview
            emoji={spot.marker ?? map.defaultMarker}
            color={
              spot.markerColor ??
              (MARKER_PRESETS.find((m) => m.emoji === spot.marker)?.color ??
                map.defaultMarkerColor)
            }
            size={22}
          />
          <span className="admin-spot-name">{spot.name}</span>
          <span className={`admin-spot-chip ${spot.moderation ?? "legacy"}`}>
            {spot.moderation ?? "visible"}
          </span>
          {spot.hidden && <span className="admin-spot-chip hidden">hidden</span>}
        </div>
        <div className="admin-spot-sub">
          {[spot.street, spot.city].filter(Boolean).join(", ") ||
            "No address"}
          {spot.createdAt &&
            ` · ${new Date(spot.createdAt).toLocaleDateString()}`}
        </div>
      </div>

      <div className="admin-row-actions">
        {pending && (
          <>
            <button type="button" className="action-btn" onClick={onApprove}>
              <IconCheck size={15} /> Approve
            </button>
            <button type="button" className="action-btn reject" onClick={onReject}>
              <IconX size={15} /> Reject
            </button>
          </>
        )}
        <button type="button" className="action-btn2" onClick={() => onStartEdit(spot)}>
          Edit
        </button>
        <button
          type="button"
          className="action-btn2"
          onClick={onToggleHidden}
        >
          {spot.hidden ? "Restore" : "Hide"}
        </button>
        <button type="button" className="icon-btn danger" onClick={onDestroy} aria-label="Destroy spot">
          <IconTrash size={16} />
        </button>
      </div>
    </li>
  );
}

function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}