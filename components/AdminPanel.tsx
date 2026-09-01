"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  fetchAdminMaps,
  fetchAdminSpots,
  createMap,
  moderateSpot,
  setSpotHidden,
  updateSpotFields,
  destroySpot,
  type AdminMapEntry,
  type AdminSpotList,
} from "@/lib/api-client";
import type { Spot } from "@/lib/types";
import {
  IconCheck,
  IconMapMarker,
  IconPlus,
  IconTrash,
  IconX,
} from "./icons";

interface EditState {
  spot: Spot;
}

export function AdminPanel() {
  const { user } = useAuth();
  const [maps, setMaps] = useState<AdminMapEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingMaps, setLoadingMaps] = useState(true);
  const [mapsError, setMapsError] = useState("");

  const [activeMap, setActiveMap] = useState<AdminMapEntry | null>(null);
  const [data, setData] = useState<AdminSpotList | null>(null);
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [error, setError] = useState("");

  const [edit, setEdit] = useState<EditState | null>(null);
  const [confirmDestroy, setConfirmDestroy] = useState<Spot | null>(null);

  const [creating, setCreating] = useState(false);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createPublic, setCreatePublic] = useState<"public" | "private">("public");
  const [createError, setCreateError] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

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
      await createMap({
        title: createTitle.trim(),
        description: createDesc.trim() || undefined,
        isPublic: createPublic,
      });
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
    if (activeMap) loadSpots(activeMap._id);
  }, [activeMap, loadSpots]);

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
            Create maps, moderate spot submissions, hide content, edit details and remove spots.
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
                  onClick={() => setActiveMap(m)}
                >
                  <span className="admin-map-tab-name">{m.title}</span>
                  {m.spotPending > 0 && (
                    <span className="admin-map-tab-badge">{m.spotPending}</span>
                  )}
                </button>
              ))}
            </div>

            {activeMap && (
              <div className="admin-section">
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
      </div>
    </div>
  );
}

function AdminSpotRow({
  spot,
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
