"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { useMapData } from "@/lib/MapContext";
import { tileLayer } from "@/lib/tiles";
import type { Spot, SpotStatus } from "@/lib/types";
import {
  fetchReviews,
  fetchComments,
  fetchPhotos,
  addReview,
  updateReview,
  deleteReview,
  setStatus,
  toggleHelpfulReview,
  addComment,
  addSpotPhoto,
  isWatchingApi,
  toggleWatchApi,
  createSpot,
  fetchStatus,
  fetchSavedSpots,
  saveSpot,
  unsaveSpot,
} from "@/lib/api-client";
import type { Review, ReviewComment, SpotPhoto } from "@/lib/types";

const CENTER: [number, number] = [55.6761, 12.5683];
const ZOOM = 12;

const spotIcon = L.icon({
  iconUrl: "https://i.ibb.co/hL2mS5V/pin-3.png",
  iconSize: [40, 40],
  iconAnchor: [30, 30],
});

const draftIcon = L.divIcon({
  className: "cluster-icon",
  html: '<div style="width:22px;height:22px;border-radius:50%;background:#f0ad00;border:3px solid #fff"></div>',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

function FlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, Math.max(map.getZoom(), 15));
  }, [center, map]);
  return null;
}

interface DetailBundle {
  reviews: Array<Review & { author: string; comments: Array<ReviewComment & { author: string }> }>;
  photos: SpotPhoto[];
}

export function MapsHomePage() {
  const { theme } = useTheme();
  const tiles = tileLayer(theme);
  const { userId } = useAuth();
  const { maps, activeMap, selectMap, spots, spotsLoading, reloadSpots } =
    useMapData();

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
  const flyTargetRef = useRef<[number, number] | null>(null);

  const loadBundle = useCallback(
    async (spot: Spot) => {
      const [revs, photos] = await Promise.all([
        fetchReviews(spot._id as string),
        fetchPhotos(spot._id as string),
      ]);
      const reviews = await Promise.all(
        revs.map(async (r) => {
          const comments = await fetchComments(r._id as string);
          return {
            ...r,
            author: r.user_fk ? `User ${r.user_fk.slice(0, 6)}` : "Anonymous",
            comments: comments.map((c) => ({
              ...c,
              author: c.user_fk ? `User ${c.user_fk.slice(0, 6)}` : "Anonymous",
            })),
          };
        })
      );
      const savedEntries = userId ? await fetchSavedSpots(userId) : [];
      setBundle({ reviews, photos });
      setStatusState(await fetchStatus(spot._id as string));
      setWatching(await isWatchingApi(spot._id as string, userId));
      setSaved(savedEntries.some((e) => String(e.spotId) === String(spot._id)));
    },
    [userId]
  );

  useEffect(() => {
    if (selected) loadBundle(selected);
  }, [selected, loadBundle]);

  const openSpot = (spot: Spot) => {
    setSelected(spot);
    flyTargetRef.current = [spot.lat, spot.lng];
  };

  const handleSaveReview = async () => {
    if (!selected || !selected._id) return;
    await addReview(selected._id, reviewScore, reviewText, userId);
    setReviewText("");
    setReviewScore(3);
    await reloadDetails(selected);
  };

  const reloadDetails = async (spot: Spot) => {
    setBundle(null);
    await loadBundle(spot);
  };

  const handleStatus = async (s: SpotStatus) => {
    if (!selected?._id) return;
    await setStatus(selected._id, s);
    setStatusState(s);
  };

  const handleWatch = async () => {
    if (!selected?._id) return;
    const now = await toggleWatchApi(selected._id, userId);
    setWatching(now);
  };

  const handleSave = async () => {
    if (!selected?._id || !userId) return;
    if (saved) {
      await unsaveSpot(selected._id, userId);
    } else {
      await saveSpot(selected._id, "", userId);
    }
    setSaved(!saved);
  };

  const handleVote = async (reviewId: string) => {
    await toggleHelpfulReview(reviewId, userId);
    if (selected) reloadDetails(selected);
  };

  const handleEditReview = async (reviewId: string, review: string, score: number) => {
    await updateReview(reviewId, review, score);
    if (selected) reloadDetails(selected);
    setEditing(null);
  };

  const [editing, setEditing] = useState<{ id: string; review: string; score: number } | null>(null);

  const handleDeleteReview = async (reviewId: string) => {
    await deleteReview(reviewId);
    if (selected) reloadDetails(selected);
  };

  const handleComment = async (reviewId: string) => {
    const text = commentDrafts[reviewId]?.trim();
    if (!text) return;
    await addComment(reviewId, text, userId);
    setCommentDrafts((d) => ({ ...d, [reviewId]: "" }));
    if (selected) reloadDetails(selected);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected?._id) return;
    const reader = new FileReader();
    reader.onload = async () => {
      await addSpotPhoto(selected._id as string, String(reader.result), userId);
      if (selected) reloadDetails(selected);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleAddSpot = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!activeMap || !draft || !newName.trim()) return;
    await createSpot({
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
    reloadSpots();
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
        onClick={() => setAdding((a) => !a)}
      >
        {adding ? "Cancel" : "Add spot"}
      </button>

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
        <TileLayer attribution={tiles.attribution} url={tiles.url} />
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
            <Tooltip>
              <h3>{s.name}</h3>
            </Tooltip>
          </Marker>
        ))}
        {draft && (
          <Marker position={draft} icon={draftIcon}>
            <Tooltip permanent direction="top" offset={[0, -16]}>
              <h3>New spot</h3>
            </Tooltip>
          </Marker>
        )}
        <FlyTo center={flyTargetRef.current} />
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
