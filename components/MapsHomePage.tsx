"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Polygon, Polyline, Circle, CircleMarker } from "react-leaflet";
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
  deleteComment,
  addSpotPhoto,
  fetchPhotos,
  backendLive,
} from "@/lib/api-client";
import type { Review, ReviewComment, SpotPhoto, SpotPhotoMeta } from "@/lib/types";
import type { MapData } from "@/lib/api-client";

const CENTER: [number, number] = [55.6761, 12.5683];
const ZOOM = 12;

import { userIcon } from "@/lib/icons";
import {
  MARKER_PRESETS,
  DEFAULT_MARKER,
  getMarkerColor,
  resolveMarker,
  makeMarkerDivIcon,
} from "@/lib/markers";
import { SpotTooltip } from "./SpotTooltip";
import { IconLink, IconMapMarker } from "./icons";

const markerIconCache = new Map<string, L.Icon | L.DivIcon>();
function spotIconFor(emoji: string, color: string): L.Icon | L.DivIcon {
  const key = `${emoji}:${color}`;
  let icon = markerIconCache.get(key);
  if (!icon) {
    icon = makeMarkerDivIcon(emoji, color);
    markerIconCache.set(key, icon);
  }
  return icon;
}

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
  photos: SpotPhotoMeta[];
}

export function MapsHomePage({
  initialCenter,
  initialZoom,
}: {
  initialCenter?: [number, number];
  initialZoom?: number;
}) {
  const { theme } = useTheme();
  const [mapStyle, setMapStyle] = useState<MapStyle>("osm");
  const tiles = tileLayer(theme, mapStyle);
  const { userId, user } = useAuth();
  const { maps, activeMap, selectMap, spots, spotsLoading, addSpot, mapData, patchMapData, zones, routes, addZone, addRoute } =
    useMapData();
  const router = useRouter();
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialCenter ?? CENTER
  );
  const [mapZoom, setMapZoom] = useState(initialZoom ?? ZOOM);
  const onMapMove = useCallback((c: [number, number], z: number) => {
    setMapCenter(c);
    setMapZoom(z);
  }, []);
  const [viewCopied, setViewCopied] = useState(false);
  const [mapLinkCopied, setMapLinkCopied] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const viewTargetRef = useRef<{ center: [number, number]; zoom: number } | null>(
    null
  );

  const [selected, setSelected] = useState<Spot | null>(null);
  const [bundle, setBundle] = useState<DetailBundle | null>(null);
  const [status, setStatusState] = useState<SpotStatus>("unknown");
  const [reviewText, setReviewText] = useState("");
  const [reviewScore, setReviewScore] = useState(3);
  // Loaded photo bytes for a spot, keyed by spot id. Kept outside the bundle so
  // a lazy fetch doesn't clobber the reviews/comments already on screen.
  const [spotPhotos, setSpotPhotos] = useState<Record<string, SpotPhoto[]>>({});
  const [photosLoading, setPhotosLoading] = useState(false);
  // Reply drafts are keyed `${reviewId}:${parentCommentId}` ("root" = reply to
  // the review itself). replyTarget is the comment currently being replied to.
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [replyTarget, setReplyTarget] = useState<{
    reviewId: string;
    commentId: string | null;
  } | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<[number, number] | null>(null);
  const [newName, setNewName] = useState("");
  const [newMarker, setNewMarker] = useState<string | null>(null);
  const [newMarkerColor, setNewMarkerColor] = useState<string | null>(null);
  const [addError, setAddError] = useState("");
  // Zone/route drawing state.
  const [drawMode, setDrawMode] = useState<"zone" | "route" | null>(null);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [drawName, setDrawName] = useState("");
  const [drawDesc, setDrawDesc] = useState("");
  const [drawColor, setDrawColor] = useState<string>(DEFAULT_MARKER.color);
  const [drawError, setDrawError] = useState("");
  const flyTargetRef = useRef<[number, number] | null>(null);

  // Reset drawing whenever the active map changes.
  useEffect(() => {
    setDrawMode(null);
    setDrawPoints([]);
    setDrawName("");
    setDrawDesc("");
    setDrawError("");
    setAdding(false);
    setDraft(null);
  }, [activeMap?._id]);

  const pickMarkerEmoji =
    newMarker ?? activeMap?.defaultMarker ?? DEFAULT_MARKER.emoji;
  const pickMarkerColor =
    newMarkerColor ??
    resolveMarker(activeMap?.defaultMarker).color ??
    activeMap?.defaultMarkerColor ??
    DEFAULT_MARKER.color;

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
            author:
              c.authorName ||
              (c.user_fk ? `User ${c.user_fk.slice(0, 6)}` : "Anonymous"),
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
  }, [selected, mapData]);

  // Photo bytes are NOT in mapData (metadata only). Fetch them per spot the
  // first time its details open, then reuse the cache. Demo mode already has
  // the bytes, so only the live backend fetches on demand.
  useEffect(() => {
    if (!backendLive || !selected?._id) return;
    if (spotPhotos[selected._id]) return;
    const spotId = selected._id;
    let cancelled = false;
    setPhotosLoading(true);
    fetchPhotos(spotId)
      .then((arr) => {
        if (cancelled) return;
        setSpotPhotos((prev) => ({ ...prev, [spotId]: arr }));
      })
      .catch(() => {
        // ignore — the spot just shows no photos
      })
      .finally(() => {
        if (!cancelled) setPhotosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selected, spotPhotos]);

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

  const handleComment = async (reviewId: string, parentId: string | null) => {
    const key = `${reviewId}:${parentId ?? "root"}`;
    const text = commentDrafts[key]?.trim();
    if (!text) return;
    const authorName =
      user?.firstName && user?.lastName
        ? `${user.firstName} ${user.lastName}`.trim()
        : user?.firstName || user?.email || undefined;
    const created = await addComment(reviewId, text, {
      userId,
      parentId,
      authorName,
    });
    if (created) patchMapData((d) => ({ ...d, comments: [...d.comments, created] }));
    setCommentDrafts((d) => ({ ...d, [key]: "" }));
    setReplyTarget(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    patchMapData((d) => {
      const ids = new Set<string>([commentId]);
      // Expand the set to include every reply beneath the deleted comment.
      let changed = true;
      while (changed) {
        changed = false;
        d.comments.forEach((c) => {
          if (c.parentId && ids.has(c.parentId) && c._id && !ids.has(c._id)) {
            ids.add(c._id);
            changed = true;
          }
        });
      }
      return { ...d, comments: d.comments.filter((c) => !(c._id && ids.has(c._id))) };
    });
    if (replyTarget?.commentId === commentId) setReplyTarget(null);
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selected?._id) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const created = await addSpotPhoto(selected._id as string, String(reader.result), userId);
      if (created) {
        setSpotPhotos((prev) => ({
          ...prev,
          [selected._id as string]: [created, ...(prev[selected._id as string] ?? [])],
        }));
        patchMapData((d) => ({
          ...d,
          photos: [created, ...d.photos],
        }));
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const startDraw = (mode: "zone" | "route") => {
    // Drawing and spot-adding are mutually exclusive.
    setAdding(false);
    setDraft(null);
    setAddError("");
    setDrawError("");
    setDrawName("");
    setDrawDesc("");
    setDrawPoints((pts) => (drawMode === mode ? [] : pts));
    setDrawMode((m) => (m === mode ? null : mode));
  };

  const cancelDraw = () => {
    setDrawMode(null);
    setDrawPoints([]);
    setDrawName("");
    setDrawDesc("");
    setDrawError("");
  };

  const handleDrawPlace = (p: [number, number]) => {
    setDrawPoints((pts) => [...pts, p]);
  };

  const handleUndoPoint = () => {
    setDrawPoints((pts) => pts.slice(0, -1));
  };

  const saveDraw = async (type: "zone" | "route") => {
    setDrawError("");
    const name = drawName.trim();
    if (!name) {
      setDrawError(type === "zone" ? "Give the zone a name." : "Give the route a name.");
      return;
    }
    const minPoints = type === "zone" ? 3 : 2;
    if (drawPoints.length < minPoints) {
      setDrawError(
        type === "zone"
          ? "Click at least 3 points on the map to close the zone."
          : "Click at least 2 points on the map to draw the route."
      );
      return;
    }
    if (!userId) {
      setDrawError("You must be signed in to add a " + type + ".");
      return;
    }
    if (!activeMap) {
      setDrawError("No map selected. Pick a map from the dropdown before adding a " + type + ".");
      return;
    }
    try {
      if (type === "zone") {
        await addZone({
          mapId: activeMap._id,
          name,
          shape: "polygon",
          points: drawPoints,
          color: drawColor,
          description: drawDesc.trim() || null,
        });
      } else {
        await addRoute({
          mapId: activeMap._id,
          name,
          points: drawPoints,
          color: drawColor,
          description: drawDesc.trim() || null,
        });
      }
      cancelDraw();
    } catch (err) {
      console.error("saveDraw failed:", err);
      setDrawError(
        (err as Error).message?.includes("not-configured")
          ? "The database is not configured. Check MONGODB_URI / MONGODB_TIMEOUT_MS."
          : (err as Error).message || `Could not add ${type}. The database may be unreachable.`
      );
    }
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
      const spot = await addSpot({
        mapId: activeMap._id,
        name: newName.trim(),
        street: "",
        city: "",
        zip: 0,
        lat: draft[0],
        lng: draft[1],
        createdBy: userId,
        marker: pickMarkerEmoji,
        markerColor: pickMarkerColor,
      });
      setNewName("");
      setAdding(false);
      setDraft(null);
      if (spot) {
        // The create response already carries the full spot, so the details
        // popup opens immediately with its data — no extra request.
        openSpot(spot);
      }
    } catch (err) {
      setAddError(
        (err as Error).message?.includes("not-configured")
          ? "The database is not configured. Check MONGODB_URI / MONGODB_TIMEOUT_MS."
          : (err as Error).message || "Could not add spot. The database may be unreachable."
      );
    }
  };

  // Stable, shareable URL for a map. Uses the slug permalink
// (`/map/<slug>`) and falls back to the document id for maps without one.
  const buildPermalink = (map: { _id: string; slug?: string | null } | null, includeView: boolean) => {
    const origin = window.location.origin;
    const base = map
      ? map.slug
        ? `${origin}/map/${encodeURIComponent(map.slug)}`
        : `${origin}/map?map=${encodeURIComponent(map._id)}`
      : `${origin}/map`;
    return includeView
      ? `${base}?lat=${mapCenter[0].toFixed(5)}&lng=${mapCenter[1].toFixed(
          5
        )}&zoom=${mapZoom}`
      : base;
  };

  const copyViewLink = async () => {
    try {
      await navigator.clipboard.writeText(buildPermalink(activeMap, true));
      setViewCopied(true);
      setTimeout(() => setViewCopied(false), 2000);
    } catch {
      setViewCopied(false);
    }
  };

  const copyMapLink = async () => {
    try {
      await navigator.clipboard.writeText(buildPermalink(activeMap, false));
      setMapLinkCopied(true);
      setTimeout(() => setMapLinkCopied(false), 2000);
    } catch {
      setMapLinkCopied(false);
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
    <div className={`map-container ${drawMode ? "drawing" : ""}`}>
      {maps.length > 0 && (
        <div id="map-buttons" className="buttons" style={{ top: "calc(var(--header-h) + 6px)" }}>
          <select
            value={selected?.mapId || activeMap?._id || ""}
            onChange={(e) => {
              const id = e.target.value;
              const m = maps.find((x) => x._id === id);
              selectMap(id);
              if (m) router.replace(buildPermalink(m, true));
            }}
            style={{ padding: "6px 8px", borderRadius: 0, border: "1px solid var(--border)" }}
          >
            {(maps as Array<{ _id: string; title: string }>).map((m) => (
              <option key={m._id} value={m._id}>
                {m.title}
              </option>
            ))}
          </select>
          {activeMap && (
            <button
              type="button"
              className="map-ctrl-btn"
              onClick={copyMapLink}
              title="Copy permanent link to this map"
            >
              <IconLink size={16} />
              {mapLinkCopied ? "Copied!" : "Copy map link"}
            </button>
          )}
        </div>
      )}

      <button
        id="add-fab"
        type="button"
        className={adding ? "cancel" : ""}
        disabled={maps.length === 0}
        onClick={() => {
          setAddError("");
          cancelDraw();
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

      <button
        id="add-zone-fab"
        type="button"
        className={`draw-fab ${drawMode === "zone" ? "cancel" : ""}`}
        disabled={maps.length === 0}
        onClick={() => startDraw("zone")}
        title={maps.length === 0 ? "Create a map first (Map Admin) to add zones" : "Draw a zone (area) on the map"}
      >
        {drawMode === "zone" ? "✕ Cancel" : "Add zone"}
      </button>

      <button
        id="add-route-fab"
        type="button"
        className={`draw-fab ${drawMode === "route" ? "cancel" : ""}`}
        disabled={maps.length === 0}
        onClick={() => startDraw("route")}
        title={maps.length === 0 ? "Create a map first (Map Admin) to add routes" : "Draw a route (path) on the map"}
      >
        {drawMode === "route" ? "✕ Cancel" : "Add route"}
      </button>

      {maps.length === 0 && !adding && (
        <div id="map-note">
          No maps available yet. Create your first map from <a href="/admin">Map Admin</a>.
        </div>
      )}

      {activeMap?.welcomeMessage && (
        <div
          id="map-note"
          className="map-welcome"
          style={{
            borderColor: activeMap.accentColor ?? DEFAULT_MARKER.color,
          }}
        >
          {activeMap.welcomeMessage}
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
                            onClick={() =>
                              setReplyTarget({ reviewId: r._id as string, commentId: null })
                            }
                          >
                            Reply
                          </button>
                        )}
                        {r._id && Boolean(userId) && r.user_fk === userId && (
                          <button
                            type="button"
                            className="link-btn"
                            onClick={() => setEditing({ id: r._id as string, review: r.review, score: r.score })}
                          >
                            Edit
                          </button>
                        )}
                        {r._id && Boolean(userId) && r.user_fk === userId && (
                          <button type="button" className="link-btn danger" onClick={() => handleDeleteReview(r._id!)}>
                            Delete
                          </button>
                        )}
                      </div>
                      <div className="comments-section">
                        {(() => {
                          const byParent = new Map<
                            string,
                            (typeof r.comments)[number][]
                          >();
                          const roots: (typeof r.comments)[number][] = [];
                          r.comments.forEach((c) => {
                            if (c.parentId && c._id) {
                              let arr = byParent.get(c.parentId);
                              if (!arr) { arr = []; byParent.set(c.parentId, arr); }
                              arr.push(c);
                            } else {
                              roots.push(c);
                            }
                          });
                          const renderComment = (
                            c: (typeof r.comments)[number],
                            depth: number
                          ) => {
                            const children: (typeof r.comments)[number][] =
                              c._id ? (byParent.get(c._id) ?? []) : [];
                            const key = `${r._id}:${c._id ?? "root"}`;
                            const mine =
                              Boolean(userId) && c.user_fk === userId;
                            return (
                              <div
                                key={c._id}
                                className={`comment ${depth > 0 ? "reply" : ""}`}
                              >
                                <div className="comment-head">
                                  <strong>{c.author}</strong>
                                  <span className="comment-date">{c.date}</span>
                                  {mine && (
                                    <button
                                      type="button"
                                      className="link-btn danger"
                                      onClick={() => c._id && handleDeleteComment(c._id)}
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                                <p className="comment-text">{c.text}</p>
                                {r._id && (
                                  <button
                                    type="button"
                                    className="link-btn comment-reply-btn"
                                    onClick={() =>
                                      setReplyTarget({
                                        reviewId: r._id as string,
                                        commentId: c._id ?? null,
                                      })
                                    }
                                  >
                                    Reply
                                  </button>
                                )}
                                {r._id &&
                                  replyTarget?.reviewId === r._id &&
                                  replyTarget.commentId === c._id && (
                                    <div className="add-comment">
                                      <input
                                        autoFocus
                                        value={commentDrafts[key] || ""}
                                        onChange={(e) =>
                                          setCommentDrafts((d) => ({ ...d, [key]: e.target.value }))
                                        }
                                        onKeyDown={(e) => {
                                          if (e.key === "Enter") {
                                            e.preventDefault();
                                            handleComment(r._id as string, c._id ?? null);
                                          }
                                        }}
                                        placeholder="Write a reply…"
                                      />
                                      <button
                                        type="button"
                                        className="link-btn"
                                        onClick={() =>
                                          handleComment(r._id as string, c._id ?? null)
                                        }
                                      >
                                        Reply
                                      </button>
                                    </div>
                                  )}
                                {children.length > 0 && (
                                  <div className="comment-nested">
                                    {children.map((ch) =>
                                      renderComment(ch, depth + 1)
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          };
                          return (
                            <>
                              {roots.map((c) => renderComment(c, 0))}
                              {r.comments.length === 0 && (
                                <p className="italic muted">
                                  No comments yet.
                                </p>
                              )}
                              {r._id &&
                                replyTarget?.reviewId === r._id &&
                                replyTarget.commentId === null && (
                                  <div className="add-comment">
                                    <input
                                      autoFocus
                                      value={commentDrafts[`${r._id}:root`] || ""}
                                      onChange={(e) =>
                                        setCommentDrafts((d) => ({
                                          ...d,
                                          [`${r._id as string}:root`]: e.target.value,
                                        }))
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          e.preventDefault();
                                          handleComment(r._id as string, null);
                                        }
                                      }}
                                      placeholder="Write a reply…"
                                    />
                                    <button
                                      type="button"
                                      className="link-btn"
                                      onClick={() => handleComment(r._id as string, null)}
                                    >
                                      Reply
                                    </button>
                                  </div>
                                )}
                            </>
                          );
                        })()}
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
              {(() => {
                if (backendLive) {
                  const loaded = selected?._id ? spotPhotos[selected._id] ?? [] : [];
                  if (loaded.length === 0 && photosLoading) {
                    return <span className="italic">Loading photos…</span>;
                  }
                  return loaded.map((p) => (
                    <img key={p._id} src={p.dataUrl} alt="spot" className="spot-photo" />
                  ));
                }
                // Demo mode: mapData.photos already carry the image bytes.
                return (bundle.photos as SpotPhoto[]).map((p) => (
                  <img key={p._id} src={p.dataUrl} alt="spot" className="spot-photo" />
                ));
              })()}
            </div>
            <input type="file" accept="image/*" onChange={handlePhoto} />
          </div>
        </div>
      )}

      <MapContainer center={mapCenter} zoom={mapZoom} zoomSnap={0.5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution={tiles.attribution}
          url={tiles.url}
          subdomains={tiles.subdomains}
          maxZoom={tiles.maxZoom}
        />
        {adding && (
          <MapClickHandler onPlace={(p) => setDraft(p)} />
        )}
        {drawMode && (
          <MapClickHandler onPlace={handleDrawPlace} />
        )}
        {/* Zones: filled polygons or radius circles */}
        {zones.map((z) =>
          z.shape === "circle" && z.center && z.radius ? (
            <Circle
              key={z._id}
              center={z.center}
              radius={z.radius}
              pathOptions={{
                color: z.color || activeMap?.accentColor || DEFAULT_MARKER.color,
                fillColor: z.color || activeMap?.accentColor || DEFAULT_MARKER.color,
                fillOpacity: 0.15,
                weight: 2,
              }}
            >
              {(z.name || z.description) && (
                <Tooltip direction="top" offset={[0, -12]}>
                  <SpotTooltip name={z.name || "Zone"} hint={z.description || undefined} />
                </Tooltip>
              )}
            </Circle>
          ) : z.points && z.points.length >= 3 ? (
            <Polygon
              key={z._id}
              positions={z.points}
              pathOptions={{
                color: z.color || activeMap?.accentColor || DEFAULT_MARKER.color,
                fillColor: z.color || activeMap?.accentColor || DEFAULT_MARKER.color,
                fillOpacity: 0.15,
                weight: 2,
              }}
            >
              {(z.name || z.description) && (
                <Tooltip direction="top" offset={[0, -12]}>
                  <SpotTooltip name={z.name || "Zone"} hint={z.description || undefined} />
                </Tooltip>
              )}
            </Polygon>
          ) : null
        )}
        {/* Routes: polylines */}
        {routes.map((r) =>
          r.points && r.points.length >= 2 ? (
            <Polyline
              key={r._id}
              positions={r.points}
              pathOptions={{
                color: r.color || activeMap?.accentColor || DEFAULT_MARKER.color,
                weight: 3,
                opacity: 0.8,
              }}
            >
              {(r.name || r.description) && (
                <Tooltip direction="top" offset={[0, -12]}>
                  <SpotTooltip name={r.name || "Route"} hint={r.description || undefined} />
                </Tooltip>
              )}
            </Polyline>
          ) : null
        )}
        {spots.map((s) => {
          const base = resolveMarker(s.marker);
          return (
            <Marker
              key={s._id}
              position={[s.lat, s.lng]}
              icon={spotIconFor(
                base.emoji,
                s.markerColor ?? base.color ?? activeMap?.defaultMarkerColor ?? DEFAULT_MARKER.color
              )}
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
          );
        })}
        {draft && (
          <Marker
            position={draft}
            icon={spotIconFor(pickMarkerEmoji, getMarkerColor(pickMarkerColor))}
          >
            <Tooltip permanent direction="top" offset={[0, -16]}>
              <SpotTooltip name="New spot" hint="Click anywhere to move" />
            </Tooltip>
          </Marker>
        )}
        {/* Zone/route drawing preview */}
        {drawMode === "zone" && drawPoints.length === 2 && (
          <Polyline
            positions={drawPoints}
            pathOptions={{ color: drawColor, weight: 2, dashArray: "6 4", opacity: 0.7 }}
          />
        )}
        {drawMode === "zone" && drawPoints.length >= 3 && (
          <Polygon
            positions={[...drawPoints, drawPoints[0]]}
            pathOptions={{
              color: drawColor,
              weight: 2,
              dashArray: "6 4",
              fillColor: drawColor,
              fillOpacity: 0.12,
            }}
          />
        )}
        {drawMode === "route" && drawPoints.length >= 2 && (
          <Polyline
            positions={drawPoints}
            pathOptions={{ color: drawColor, weight: 3, dashArray: "6 4", opacity: 0.8 }}
          />
        )}
        {drawPoints.map((p, i) => (
          <CircleMarker
            key={i}
            center={p}
            radius={6}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: drawColor,
              fillOpacity: 1,
            }}
          />
        ))}
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
      )}

      {drawMode && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            saveDraw(drawMode as "zone" | "route");
          }}
          className="map-draw-card"
        >
          <strong>{drawMode === "zone" ? "Add zone" : "Add route"}</strong>
          <span className="draw-desc">
            {drawMode === "zone"
              ? `Click the map to place corners — ${drawPoints.length} placed, need at least 3.`
              : `Click the map to place points — ${drawPoints.length} placed, need at least 2.`}
          </span>
          <div className="map-draw-actions">
            <button type="button" className="link-btn" onClick={handleUndoPoint} disabled={drawPoints.length === 0}>
              Undo point
            </button>
            <button type="button" className="link-btn" onClick={cancelDraw}>
              Cancel
            </button>
          </div>
          <input
            value={drawName}
            onChange={(e) => setDrawName(e.target.value)}
            placeholder={`${drawMode === "zone" ? "Zone name" : "Route name"} (required)`}
          />
          <input
            value={drawDesc}
            onChange={(e) => setDrawDesc(e.target.value)}
            placeholder="Description (optional)"
          />
          <div className="map-draw-color">
            <span className="color-label">Color</span>
            <input
              type="color"
              value={drawColor}
              onChange={(e) => setDrawColor(e.target.value)}
              title="Color"
            />
            <input
              type="text"
              value={drawColor}
              onChange={(e) => { if (/^#[0-9a-fA-F]{3,8}$/.test(e.target.value)) setDrawColor(e.target.value); }}
              pattern="#[0-9a-fA-F]{3,8}"
              title="Hex color"
            />
          </div>
          {drawError && (
            <div className="draw-error">
              <strong>Could not add {drawMode}:</strong> {drawError}
            </div>
          )}
          <button
            type="submit"
            className="action-btn2"
            title={!drawName.trim() ? "Enter a name to save" : undefined}
          >
            Save {drawMode}
          </button>
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
