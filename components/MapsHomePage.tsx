"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { useMapData } from "@/lib/MapContext";
import { tileLayer, MAP_STYLES } from "@/lib/tiles";
import type { MapStyle } from "@/lib/tiles";
import type { Spot, SpotStatus } from "@/lib/types";
import {
  addReview,
  updateReview,
  deleteReview,
  setStatus,
  toggleHelpfulReview,
  addComment,
  addSpotPhoto,
  toggleWatchApi,
  toggleSaveApi,
} from "@/lib/api-client";
import type { Review, ReviewComment, SpotPhoto } from "@/lib/types";
import type { MapData } from "@/lib/api-client";

const CENTER: [number, number] = [55.6761, 12.5683];
const ZOOM = 12;

import { spotIcon, userIcon, draftIcon } from "@/lib/icons";
import { SpotTooltip } from "./SpotTooltip";
import { IconLink, IconMapMarker } from "./icons";

function FlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, Math.max(map.getZoom(), 15));
  }, [center, map]);
  return null;
}

function ViewWatcher({
  onMove,
}: {
  onMove: (center: [number, number], zoom: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const report = () => {
      const c = map.getCenter();
      onMove([c.lat, c.lng], map.getZoom());
    };
    map.on("zoomend", report);
    map.on("moveend", report);
    report();
    return () => {
      map.off("zoomend", report);
      map.off("moveend", report);
    };
  }, [map, onMove]);
  return null;
}

function FlyToView({
  target,
}: {
  target: { center: [number, number]; zoom: number } | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo(target.center, target.zoom, { duration: 1.2 });
  }, [target, map]);
  return null;
}

interface DetailBundle {
  reviews: Array<Review & { author: string; comments: Array<ReviewComment & { author: string }> }>;
  photos: SpotPhoto[];
}

export function MapsHomePage() {
  const { theme } = useTheme();
  const [mapStyle, setMapStyle] = useState<MapStyle>("osm");
  const tiles = tileLayer(theme, mapStyle);
  const { userId } = useAuth();
  const { maps, activeMap, selectMap, spots, spotsLoading, addSpot, mapData, patchMapData } =
    useMapData();
  const [mapCenter, setMapCenter] = useState<[number, number]>(CENTER);
  const [mapZoom, setMapZoom] = useState(ZOOM);
  const onMapMove = useCallback((c: [number, number], z: number) => {
    setMapCenter(c);
    setMapZoom(z);
  }, []);
  const [viewCopied, setViewCopied] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const viewTargetRef = useRef<{ center: [number, number]; zoom: number } | null>(
    null
  );

  const [selected, setSelected] = useState<Spot | null>(null);
  const [bundle, setBundle] = useState<DetailBundle | null>(null);
  const [status, setStatusState] = useState<SpotStatus>("unknown");
  const [watching, setWatching] = useState(false);
  const [saved, setSaved] = useState(false);
  const [reviewText, setReviewText] = useState("");
  const [reviewScore, setReviewScore] = useState(3);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const [newName, setNewName] = useState("");
  const [addError, setAddError] = useState("");
  const flyTargetRef = useRef<[number, number] | null>(null);

  const loadBundle = (spot: Spot, data: MapData): DetailBundle => {
    const reviews = data.reviews
      .filter((r) => r.spotId === spot._id)
      .map((r) => ({
        ...r,
        author: r.user_fk ? `User ${r.user_fk.slice(0, 6)}` : "Anonymous",
        comments: data.comments
          .filter((c) => c.reviewId === r._id)
          .map((c) => ({
            ...c,
            author: c.user_fk ? `User ${c.user_fk.slice(0, 6)}` : "Anonymous",
          })),
      }));
    return {
      reviews,
      photos: data.photos.filter((p) => p.spotId === spot._id),
    };
  };

  useEffect(() => {
    const current = selected
      ? mapData.spots.find((s) => s._id === selected._id) ?? selected
      : null;
    setBundle(current ? loadBundle(current, mapData) : null);
    setStatusState(current?.status ?? "unknown");
    setWatching(
      Boolean(
        current &&
          mapData.watches.some((w) => String(w.spotId) === String(current._id))
      )
    );
    setSaved(
      Boolean(
        current &&
          mapData.saved.some((e) => String(e.spotId) === String(current._id))
      )
    );
  }, [selected, mapData]);

  const openSpot = (spot: Spot) => {
    setSelected(spot);
    flyTargetRef.current = [spot.lat, spot.lng];
  };

  const handleSaveReview = async () => {
    if (!selected || !selected._id) return;
    const created = await addReview(selected._id, reviewScore, reviewText, userId);
    if (created) patchMapData((d) => ({ ...d, reviews: [created, ...d.reviews] }));
    setReviewText("");
    setReviewScore(3);
  };

  const handleStatus = async (s: SpotStatus) => {
    if (!selected?._id) return;
    await setStatus(selected._id, s);
    patchMapData((d) => ({
      ...d,
      spots: d.spots.map((sp) => (sp._id === selected._id ? { ...sp, status: s } : sp)),
    }));
  };

  const handleWatch = async () => {
    if (!selected?._id || !userId) return;
    const spotId = selected._id;
    const now = await toggleWatchApi(spotId, userId);
    patchMapData((d) =>
      now
        ? {
            ...d,
            watches: [
              ...d.watches.filter((w) => String(w.spotId) !== String(spotId)),
              { userId, spotId },
            ],
          }
        : {
            ...d,
            watches: d.watches.filter((w) => String(w.spotId) !== String(spotId)),
          }
    );
  };

  const handleSave = async () => {
    if (!selected?._id || !userId) return;
    const spotId = selected._id;
    const on = await toggleSaveApi(spotId, userId);
    patchMapData((d) =>
      on
        ? {
            ...d,
            saved: [
              ...d.saved.filter((e) => String(e.spotId) !== String(spotId)),
              { userId, spotId, note: "" },
            ],
          }
        : {
            ...d,
            saved: d.saved.filter((e) => String(e.spotId) !== String(spotId)),
          }
    );
  };

  const handleVote = async (reviewId: string) => {
    await toggleHelpfulReview(reviewId, userId);
  };

  const handleEditReview = async (reviewId: string, review: string, score: number) => {
    await updateReview(reviewId, review, score);
    patchMapData((d) => ({
      ...d,
      reviews: d.reviews.map((r) => (r._id === reviewId ? { ...r, review, score } : r)),
    }));
    setEditing(null);
  };

  const [editing, setEditing] = useState<{ id: string; review: string; score: number } | null>(null);

  const handleDeleteReview = async (reviewId: string) => {
    await deleteReview(reviewId);
    patchMapData((d) => ({
      ...d,
      reviews: d.reviews.filter((r) => r._id !== reviewId),
      comments: d.comments.filter((c) => c.reviewId !== reviewId),
    }));
  };

  const handleComment = async (reviewId: string) => {
    const text = commentDrafts[reviewId]?.trim();
    if (!text) return;
    const created = await addComment(reviewId, text, userId);
    if (created) patchMapData((d) => ({ ...d, comments: [...d.comments, created] }));
    setCommentDrafts((d) => ({ ...d, [reviewId]: "" }));
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected?._id) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const created = await addSpotPhoto(selected._id as string, String(reader.result), userId);
      if (created) patchMapData((d) => ({ ...d, photos: [created, ...d.photos] }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddSpot = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setAddError("");
    if (!userId) {
      setAddError("You must be signed in to add a spot.");
      return;
    }
    if (!activeMap || !draft || !newName.trim()) return;
    try {
      await addSpot({
        mapId: activeMap._id,
        name: newName.trim(),
        street: "",
        city: "",
        zip: 0,
        lat: draft[0],
        lng: draft[1],
        createdBy: userId,
      });
      setNewName("");
      setAdding(false);
      setDraft(null);
    } catch (err) {
      setAddError(
        (err as Error).message?.includes("not-configured")
          ? "The database is not configured. Check MONGODB_URI / MONGODB_TIMEOUT_MS."
          : (err as Error).message || "Could not add spot. The database may be unreachable."
      );
    }
  };

  const copyViewLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/?lat=${mapCenter[0].toFixed(5)}&lng=${mapCenter[
          1
        ].toFixed(5)}&zoom=${mapZoom}`
      );
      setViewCopied(true);
      setTimeout(() => setViewCopied(false), 2000);
    } catch {
      setViewCopied(false);
    }
  };

  const centerOnMe = () => {
    const set = (c: [number, number]) => {
      setUserLocation(c);
      viewTargetRef.current = { center: c, zoom: 15 };
    };
    if (userLocation) {
      set(userLocation);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => set([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      );
    }
  };

  return (
    <div className="map-container">
      {maps.length > 0 && (
        <div id="map-buttons" className="buttons" style={{ top: "calc(var(--header-h) + 6px)" }}>
          <select
            value={selected?.mapId || activeMap?._id || ""}
            onChange={(e) => selectMap(e.target.value)}
            style={{ padding: "6px 8px", borderRadius: 6, border: "1px solid #ccc" }}
          >
            {(maps as Array<{ _id: string; title: string }>).map((m) => (
              <option key={m._id} value={m._id}>
                {m.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <button
        id="add-fab"
        type="button"
        className={adding ? "cancel" : ""}
        disabled={maps.length === 0}
        onClick={() => {
          setAddError("");
          if (!userId) {
            setAddError("You must be signed in to add a spot.");
            return;
          }
          setAdding((a) => !a);
        }}
        title={maps.length === 0 ? "Create a map first (Map Admin) to add spots" : undefined}
      >
        {adding ? "Cancel" : "Add spot"}
      </button>

      {maps.length === 0 && !adding && (
        <div id="map-note">
          No maps available yet. Create your first map from <a href="/admin">Map Admin</a>.
        </div>
      )}

      {addError && (
        <div id="map-note-error">
          <strong>Could not add spot:</strong> {addError}
        </div>
      )}

      <div id="map-controls">
        <select
          id="map-style-select"
          className="places-select"
          value={mapStyle}
          onChange={(e) => setMapStyle(e.target.value as MapStyle)}
          title="Map style"
        >
          {MAP_STYLES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          className="map-ctrl-btn"
          onClick={centerOnMe}
          title="Center on my location"
        >
          <IconMapMarker size={16} /> Near me
        </button>
        <button
          type="button"
          className="map-ctrl-btn"
          onClick={copyViewLink}
          title="Copy link to this map view"
        >
          <IconLink size={16} />
          {viewCopied ? "Copied!" : "Share view"}
        </button>
      </div>

      {selected && bundle && (
        <div id="details">
          <div className="details-top">
            <button type="button" id="closeDetails" className="close-btn" onClick={() => setSelected(null)}>
              Close
            </button>
            <div className="flex">
              <h2 style={{ margin: 0 }}>{selected.name}</h2>
            </div>
            <p style={{ margin: "6px 0 0" }}>
              {selected.street || "No address"} {selected.city && `, ${selected.city}`}
            </p>
            <div className="status-row">
              <div className="status-control">
                {(["open", "closed", "unknown"] as SpotStatus[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`status-btn ${s} ${status === s ? "active" : ""}`}
                    onClick={() => handleStatus(s)}
                  >
                    {s === "open" ? "Open" : s === "closed" ? "Closed" : "Unknown"}
                  </button>
                ))}
              </div>
              <div className="status-actions">
                <button
                  type="button"
                  className={`copy-link save ${saved ? "saved" : ""}`}
                  onClick={handleSave}
                >
                  {saved ? "Saved" : "Save"}
                </button>
                <button
                  type="button"
                  className={`copy-link watch ${watching ? "watching" : ""}`}
                  onClick={handleWatch}
                >
                  {watching ? "Watching" : "Watch"}
                </button>
              </div>
            </div>
          </div>

          <div id="details-content">
            {!editing ? (
              <>
                <h3>Add a review</h3>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="How was your visit?"
                  rows={2}
                  style={{ width: "100%" }}
                />
                <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "8px 0" }}>
                  <span>Score</span>
                  <select value={reviewScore} onChange={(e) => setReviewScore(Number(e.target.value))}>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="action-btn2" onClick={handleSaveReview}>
                    Submit review
                  </button>
                </div>

                <div id="reviews-box">
                  {bundle.reviews.map((r) => (
                    <div id="reviews" key={r._id}>
                      <div className="review-head">
                        <span className="review-score">{r.score}/5</span>
                        <span className="review-author">{r.author}</span>
                        <span id="review-date">{r.date}</span>
                      </div>
                      <p style={{ margin: "6px 0" }}>{r.review || <span className="italic">No review</span>}</p>
                      <div className="review-actions">
                        <button type="button" className="helpful-btn" onClick={() => r._id && handleVote(r._id)}>
                          Helpful
                        </button>
                        {r._id && (
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setEditing({ id: r._id as string, review: r.review, score: r.score })}
                          >
                            Edit
                          </button>
                        )}
                        {r._id && (
                          <button type="button" className="link-btn danger" onClick={() => handleDeleteReview(r._id!)}>
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="comments-section">
                        {r.comments.map((c) => (
                          <div key={c._id} className="comment">
                            <strong>{c.author}</strong>: {c.text} <span>({c.date})</span>
                          </div>
                        ))}
                        {r._id && (
                          <div className="add-comment">
                            <input
                              value={commentDrafts[r._id] || ""}
                              onChange={(e) => setCommentDrafts((d) => ({ ...d, [r._id as string]: e.target.value }))}
                              placeholder="Reply…"
                            />
                            <button type="button" className="link-btn" onClick={() => handleComment(r._id!)}>
                              Reply
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                  {bundle.reviews.length === 0 && (
                    <p className="italic">No reviews yet — be the first!</p>
                  )}
                </div>
              </>
            ) : (
              <div>
                <h3>Edit review</h3>
                <textarea
                  value={editing.review}
                  onChange={(e) => setEditing({ ...editing, review: e.target.value })}
                  rows={2}
                  style={{ width: "100%" }}
                />
                <select
                  value={editing.score}
                  onChange={(e) => setEditing({ ...editing, score: Number(e.target.value) })}
                >
                  {[1, 2, 3, 4, 5].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <button type="button" className="action-btn2" onClick={() => handleEditReview(editing.id, editing.review, editing.score)}>
                  Save
                </button>
                <button type="button" className="link-btn" onClick={() => setEditing(null)}>
                  Cancel
                </button>
              </div>
            )}

            <h3 style={{ marginTop: 16 }}>Photos ({bundle.photos.length})</h3>
            <div className="photos-grid">
              {bundle.photos.map((p) => (
                <img key={p._id} src={p.dataUrl} alt="spot" className="spot-photo" />
              ))}
            </div>
            <input type="file" accept="image/*" onChange={handlePhoto} />
          </div>
        </div>
      )}

      <MapContainer center={CENTER} zoom={ZOOM} zoomSnap={0.5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution={tiles.attribution}
          url={tiles.url}
          subdomains={tiles.subdomains}
          maxZoom={tiles.maxZoom}
        />
        {adding && (
          <MapClickHandler onPlace={(p) => setDraft(p)} />
        )}
        {spots.map((s) => (
          <Marker
            key={s._id}
            position={[s.lat, s.lng]}
            icon={spotIcon}
            eventHandlers={{ click: () => openSpot(s) }}
          >
            <Tooltip direction="top" offset={[0, -12]}>
              <SpotTooltip
                name={s.name}
                street={s.street}
                city={s.city}
                status={s.status}
                hint="Click to view details"
              />
            </Tooltip>
          </Marker>
        ))}
        {draft && (
          <Marker position={draft} icon={draftIcon}>
            <Tooltip permanent direction="top" offset={[0, -16]}>
              <SpotTooltip name="New spot" hint="Click anywhere to move" />
            </Tooltip>
          </Marker>
        )}
        {userLocation && !adding && (
          <Marker position={userLocation} icon={userIcon} />
        )}
        <ViewWatcher onMove={onMapMove} />
        <FlyTo center={flyTargetRef.current} />
        <FlyToView target={viewTargetRef.current} />
      </MapContainer>

      {adding && (
        <form
          onSubmit={handleAddSpot}
          style={{
            position: "absolute",
            bottom: 90,
            left: "50%",
            transform: "translateX(-50%)",
            background: "#fff",
            padding: 12,
            borderRadius: 8,
            boxShadow: "0 2px 12px rgba(0,0,0,.2)",
            display: "flex",
            gap: 8,
            zIndex: 1000,
          }}
        >
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Spot name" />
          <button type="submit" className="action-btn2">Save spot</button>
        </form>
      )}

      {spotsLoading && <p style={{ position: "absolute", top: "var(--header-h)", right: 10 }}>Loading spots…</p>}
    </div>
  );
}

function MapClickHandler({ onPlace }: { onPlace: (latlng: [number, number]) => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = (e: L.LeafletMouseEvent) => onPlace([e.latlng.lat, e.latlng.lng]);
    map.on("click", handler);
    return () => {
      map.off("click", handler);
    };
  }, [map, onPlace]);
  return null;
}
