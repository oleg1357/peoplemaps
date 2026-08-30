"use client";

import { useEffect, useCallback, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useAuth, useNotificationSync } from "@/lib/AuthContext";
import { useTheme } from "@/lib/ThemeContext";
import { tileLayer } from "@/lib/tiles";
import {
  getSpotMarkers,
  getSpotDetails,
  getSavedSpots,
  getSpotStatus,
  setSpotStatus,
  getLatestReviewDate,
  toggleHelpfulReview,
  deleteReview,
  isWatching,
  toggleWatch,
  getSpotPhotosCount,
  getNewSpotAuthor,
  getAuthorName,
} from "@/lib/store";
import type { SpotStatus } from "@/lib/store";
import type { SpotMarker } from "@/lib/data";
import { Rating } from "./Rating";
import {
  IconHeart,
  IconLink,
  IconThumbsUp,
  IconList,
  IconBell,
  IconComment,
} from "./icons";
import { ReviewsForm } from "./ReviewsForm";
import { FavouritesForm } from "./FavouritesForm";
import { CommentsSection } from "./CommentsSection";
import { PhotosSection } from "./PhotosSection";
import { AddSpotMapHandler, AddSpotPanel, addMarkerIcon } from "./AddSpot";
import { PlacesSidebar } from "./PlacesSidebar";

const CENTER: [number, number] = [55.6761, 12.5683];
const ZOOM = 12;

const spotIcon = L.icon({
  iconUrl: "https://i.ibb.co/hL2mS5V/pin-3.png",
  iconSize: [40, 40],
  iconAnchor: [30, 30],
});

const userIcon = L.divIcon({
  className: "userLocation",
  html: '<div style="width:20px;height:20px;border-radius:50%;background:#2986ce;border:3px solid white;box-shadow:0 0 8px rgba(0,0,0,0.4)"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

interface DetailsReview {
  id: number;
  review: string;
  score: number;
  date: string;
  user_fk: number | null;
  authorName: string;
  helpful: number;
  helpfulVoted: boolean;
  comments: {
    id: number;
    user_fk: number | null;
    authorName: string;
    text: string;
    date: string;
  }[];
}

interface DetailsData {
  reviews: DetailsReview[];
  photos: { id: number; dataUrl: string }[];
}

function FlyTo({ center }: { center: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.flyTo(center, Math.max(map.getZoom(), 15));
    }
  }, [center, map]);
  return null;
}

interface ClusterRow {
  center: [number, number];
  count: number;
  items: SpotMarker[];
}

function clusterMarkers(
  markers: SpotMarker[],
  zoom: number
): Array<SpotMarker | ClusterRow> {
  if (zoom >= 13) return markers;
  const grid: Record<string, ClusterRow> = {};
  const size = 0.04;
  markers.forEach((m) => {
    const gx = Math.floor(m.latlng[0] / size);
    const gy = Math.floor(m.latlng[1] / size);
    const key = `${gx}:${gy}`;
    if (!grid[key]) {
      grid[key] = { center: [m.latlng[0], m.latlng[1]], count: 0, items: [] };
    }
    grid[key].items.push(m);
    grid[key].count += 1;
    const c = grid[key].center;
    c[0] = (c[0] * (grid[key].count - 1) + m.latlng[0]) / grid[key].count;
    c[1] = (c[1] * (grid[key].count - 1) + m.latlng[1]) / grid[key].count;
  });
  const out: Array<SpotMarker | ClusterRow> = [];
  Object.values(grid).forEach((row) => {
    if (row.count === 1) out.push(row.items[0]);
    else out.push(row);
  });
  return out;
}

function ZoomWatcher({
  onZoom,
}: {
  onZoom: (z: number) => void;
}) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onZoom(map.getZoom());
    map.on("zoomend", handler);
    onZoom(map.getZoom());
    return () => {
      map.off("zoomend", handler);
    };
  }, [map, onZoom]);
  return null;
}

const clusterIcon = (count: number) =>
  L.divIcon({
    className: "cluster-icon",
    html: `<div class="cluster-badge">${count}</div>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

const STATUS_OPTIONS: SpotStatus[] = ["open", "closed", "unknown"];

function statusLabel(s: SpotStatus): string {
  if (s === "open") return "Open";
  if (s === "closed") return "Closed";
  return "Unknown";
}

export function SpotsPage() {
  const { userId } = useAuth();
  const { theme } = useTheme();
  const tiles = tileLayer(theme);
  const [markers, setMarkers] = useState<SpotMarker[]>([]);
  const [filterMode, setFilterMode] = useState<"all" | "favourites">("all");
  const [details, setDetails] = useState<SpotMarker | null>(null);
  const [detailsData, setDetailsData] = useState<DetailsData | null>(null);
  const [spotStatus, setSpotStatusState] = useState<SpotStatus>("unknown");
  const [showReview, setShowReview] = useState(false);
  const [editingReview, setEditingReview] = useState<{
    id: number;
    review: string;
    score: number;
  } | null>(null);
  const [favClicked, setFavClicked] = useState(false);
  const [copied, setCopied] = useState(false);
  const [watching, setWatching] = useState(false);
  const [foundBy, setFoundBy] = useState<number | null>(null);
  const [photoCount, setPhotoCount] = useState(0);
  const [reviewLimit, setReviewLimit] = useState(5);
  const [openComments, setOpenComments] = useState<Set<number>>(new Set());
  const [zoom, setZoom] = useState(12);
  const onZoom = useCallback((z: number) => setZoom(z), []);

  const clusterRows = useMemo(
    () => clusterMarkers(markers, zoom),
    [markers, zoom]
  );
  const [sidebarOpen, setSidebarOpen] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof navigator !== "undefined" &&
      !/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) &&
      window.innerWidth > 480
  );
  const [mobile, setMobile] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [locationDenied, setLocationDenied] = useState(false);
  const [addMode, setAddMode] = useState(false);
  const [addDraft, setAddDraft] = useState<[number, number] | null>(null);
  const flyTarget = useRef<[number, number] | null>(null);
  const locRef = useRef<string | null>(null);

  useNotificationSync();

  useEffect(() => {
    setMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
  }, []);

  useEffect(() => {
    setMarkers(getSpotMarkers(userId));
  }, [userId]);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("add") === "1"
    ) {
      setAddMode(true);
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const loc = new URLSearchParams(window.location.search).get("loc");
    if (loc) locRef.current = loc;
  }, []);

  useEffect(() => {
    if (locRef.current === null || markers.length === 0) return;
    const m = markers.find((x) => String(x.id) === locRef.current);
    if (m) {
      openDetails(m);
      window.history.replaceState(null, "", window.location.pathname);
    }
    locRef.current = null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markers]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        (err) => {
          console.log(err.message);
          setLocationDenied(true);
        }
      );
    } else {
      setLocationDenied(true);
    }
  }, []);

  const foundByName = useMemo(
    () => (foundBy !== null ? getAuthorName(foundBy) : null),
    [foundBy]
  );

  const lastActivity = details ? getLatestReviewDate(details.id) : null;

  const refreshMarkers = (mode: "all" | "favourites" = filterMode) => {
    setMarkers(
      mode === "all"
        ? getSpotMarkers(userId)
        : getSavedSpots(userId).map((s) => ({
            id: s.spot_fk,
            latlng: [s.lat, s.lng],
            brand: s.name,
            city: s.city,
            street: s.street,
            zip: s.zip,
            avgScore: s.avgScore,
            date: "",
            is_saved: 1,
            note: s.note,
          }))
    );
  };

  const refreshDetails = () => {
    if (!details) return;
    const data = getSpotDetails(details.id, userId);
    setDetailsData(data);
    setSpotStatusState(getSpotStatus(details.id));
    setWatching(isWatching(details.id, userId));
    setFoundBy(getNewSpotAuthor(details.id));
    setPhotoCount(getSpotPhotosCount(details.id));
    const avg =
      data.reviews.length === 0
        ? 0
        : data.reviews.reduce((s, r) => s + r.score, 0) / data.reviews.length;
    setDetails((d) => (d ? { ...d, avgScore: avg } : d));
  };

  const openDetails = (m: SpotMarker) => {
    setDetails(m);
    setShowReview(false);
    setFavClicked(false);
    setEditingReview(null);
    setCopied(false);
    setReviewLimit(5);
    setOpenComments(new Set());
    setSpotStatusState(getSpotStatus(m.id));
    setWatching(isWatching(m.id, userId));
    setFoundBy(getNewSpotAuthor(m.id));
    setPhotoCount(getSpotPhotosCount(m.id));
    setDetailsData(getSpotDetails(m.id, userId));
    flyTarget.current = m.latlng;
  };

  const showFavourites = () => {
    setFilterMode("favourites");
    setDetails(null);
    setDetailsData(null);
    refreshMarkers("favourites");
  };

  const showAll = () => {
    setFilterMode("all");
    setDetails(null);
    setDetailsData(null);
    refreshMarkers("all");
  };

  const handleFavouriteSaved = () => {
    setFavClicked(false);
    refreshDetails();
    refreshMarkers();
  };

  const handleAdded = () => {
    refreshMarkers();
  };

  const toggleAddMode = () => {
    if (addMode) {
      setAddMode(false);
      setAddDraft(null);
    } else {
      setAddMode(true);
      setDetails(null);
      setDetailsData(null);
    }
  };

  const handleStatus = (s: SpotStatus) => {
    if (!details) return;
    setSpotStatus(details.id, s);
    setSpotStatusState(s);
  };

  const handleVote = (reviewId: number) => {
    toggleHelpfulReview(reviewId, userId);
    refreshDetails();
  };

  const handleWatch = () => {
    if (!details) return;
    toggleWatch(details.id, userId);
    refreshDetails();
  };

  const toggleComments = (reviewId: number) => {
    setOpenComments((prev) => {
      const next = new Set(prev);
      if (next.has(reviewId)) next.delete(reviewId);
      else next.add(reviewId);
      return next;
    });
  };

  const handleDeleteReview = (reviewId: number) => {
    deleteReview(reviewId);
    refreshDetails();
    refreshMarkers();
  };

  const copyLink = async () => {
    if (!details) return;
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/?loc=${details.id}`
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const reviewDone = () => {
    setShowReview(false);
    setEditingReview(null);
    refreshDetails();
    refreshMarkers();
  };

  return (
    <div className="map-container">
      {userId && (
        <div id="map-buttons" className="buttons">
          <div className="toggle-group">
            <button
              type="button"
              className={`toggle-btn ${filterMode === "all" ? "active view-active" : ""}`}
              onClick={showAll}
            >
              All places
            </button>
            <button
              type="button"
              className={`toggle-btn ${filterMode === "favourites" ? "active view-active" : ""}`}
              onClick={showFavourites}
            >
              Your favourites
            </button>
          </div>
        </div>
      )}

      <button
        id="list-fab"
        type="button"
        className={sidebarOpen ? "cancel" : ""}
        onClick={() => setSidebarOpen((o) => !o)}
      >
        <IconList size={16} />
        {sidebarOpen ? "Close list" : "Places list"}
      </button>

      <button
        id="add-fab"
        type="button"
        className={addMode ? "cancel" : ""}
        onClick={toggleAddMode}
      >
        {addMode ? "Cancel" : "Add spot"}
      </button>

      {details && detailsData && (
        <div id="details">
          <div className="details-top">
            <button type="button" id="closeDetails" className="close-btn" onClick={() => setDetails(null)}>
              Close
            </button>
            <div className="flex">
              <h2 style={{ margin: 0 }}>{details.brand}</h2>
              <img id="spot-icon" src="https://i.ibb.co/hL2mS5V/pin-3.png" alt="spot" />
            </div>
            <div className="flex">
              <h4 style={{ margin: "0 6px 0 0" }}>
                {parseFloat(String(details.avgScore)).toFixed(1)}
              </h4>
              <Rating value={details.avgScore} readOnly />
            </div>
            <p style={{ margin: "6px 0 0" }}>
              {details.street}, {details.city}
            </p>
            <div className="status-row">
              <div className="status-control">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className={`status-btn ${s} ${spotStatus === s ? "active" : ""}`}
                    onClick={() => handleStatus(s)}
                  >
                    {statusLabel(s)}
                  </button>
                ))}
              </div>
              <div className="status-actions">
                <button
                  type="button"
                  className={`copy-link watch ${watching ? "watching" : ""}`}
                  onClick={handleWatch}
                >
                  <IconBell size={14} />
                  {watching ? "Watching" : "Watch"}
                </button>
                <button type="button" className="copy-link" onClick={copyLink}>
                  <IconLink size={14} />
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>
            <p className="last-activity">
              Last found: {lastActivity ?? "no records yet"}
              {foundBy !== null && (
                <>
                  {" · "}Added by{" "}
                  <a href={`/users/${foundBy}`} onClick={(e) => e.stopPropagation()}>
                    {foundByName}
                  </a>
                </>
              )}
              {photoCount > 0 && <> · {photoCount} photo{photoCount === 1 ? "" : "s"}</>}
            </p>
            {userId && <PhotosSection spotId={details.id} photos={detailsData.photos} onUploaded={refreshDetails} />}
          </div>
          {!showReview && !favClicked && (
            <div id="details-content">
              <div className="flex" id="details-btns">
                <button type="button" className="action-btn2" onClick={() => { setEditingReview(null); setShowReview(true); }}>
                  Add review
                </button>
                {userId && (
                  <>
                    {details.is_saved === null ? (
                      <button
                        type="button"
                        className="add-btn"
                        onClick={() => setFavClicked(true)}
                      >
                        + Add to favourite
                      </button>
                    ) : (
                      <span id="saved">
                        <IconHeart size={18} color="#D90368" /> Added to favourites
                      </span>
                    )}
                  </>
                )}
              </div>
              {details.is_saved === 1 && filterMode === "favourites" && (
                <div>
                  <h2 style={{ marginBottom: 4 }}>My personal note</h2>
                  <p style={{ margin: 0 }}>{details.note}</p>
                </div>
              )}
              {!(
                details.is_saved === 1 && filterMode === "favourites"
              ) && (
                <div id="reviews-box">
                  {detailsData.reviews.slice(0, reviewLimit).map((r) => (
                    <div id="reviews" key={r.id}>
                      <div className="review-head">
                        <span className="review-score">
                          {r.score} <Rating value={r.score} readOnly small />
                        </span>
                        <span className="review-author">
                          {r.user_fk !== null ? (
                            <a href={`/users/${r.user_fk}`}>{r.authorName}</a>
                          ) : (
                            r.authorName
                          )}
                        </span>
                        <span id="review-date">{r.date}</span>
                      </div>
                      <p style={{ margin: "6px 0" }}>
                        {r.review || <span className="italic">No review</span>}
                      </p>
                      <div className="review-actions">
                        <button
                          type="button"
                          className={`helpful-btn ${r.helpfulVoted ? "voted" : ""}`}
                          onClick={() => handleVote(r.id)}
                        >
                          <IconThumbsUp size={13} />
                          Helpful · {r.helpful}
                        </button>
                        <button
                          type="button"
                          className="link-btn"
                          onClick={() => toggleComments(r.id)}
                        >
                          <IconComment size={13} />
                          {openComments.has(r.id) ? "Hide" : "Reply"} ·{" "}
                          {r.comments.length}
                        </button>
                        {r.user_fk === Number(userId) && (
                          <>
                            <button
                              type="button"
                              className="link-btn"
                              onClick={() => {
                                setEditingReview({ id: r.id, review: r.review, score: r.score });
                                setShowReview(true);
                              }}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="link-btn danger"
                              onClick={() => handleDeleteReview(r.id)}
                            >
                              Delete
                            </button>
                          </>
                        )}
                      </div>
                      {openComments.has(r.id) && (
                        <CommentsSection
                          reviewId={r.id}
                          comments={r.comments}
                          onCommented={refreshDetails}
                        />
                      )}
                    </div>
                  ))}
                  {detailsData.reviews.length > reviewLimit && (
                    <button
                      type="button"
                      className="load-more"
                      onClick={() => setReviewLimit((n) => n + 5)}
                    >
                      Load more reviews
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {showReview && (
            <div id="details-content">
              <ReviewsForm
                spotId={details.id}
                userId={userId}
                initial={editingReview ?? undefined}
                onDone={reviewDone}
              />
            </div>
          )}
          {favClicked && (
            <div id="details-content">
              <FavouritesForm
                spotId={details.id}
                onDone={handleFavouriteSaved}
              />
            </div>
          )}
        </div>
      )}

      <MapContainer
        center={CENTER}
        zoom={ZOOM}
        zoomSnap={0.5}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution={tiles.attribution}
          url={tiles.url}
        />
        {addMode && (
          <AddSpotMapHandler
            enabled={addMode}
            onPlace={(latlng) => setAddDraft(latlng)}
          />
        )}
        <ZoomWatcher onZoom={onZoom} />
        {clusterRows.map((row) => {
          if ("count" in row) {
            return (
              <Marker
                key={`c-${row.center[0]}-${row.center[1]}`}
                position={row.center}
                icon={clusterIcon(row.count)}
                eventHandlers={{
                  click: () => {
                    if (!addMode) openDetails(row.items[0]);
                  },
                }}
              >
                <Tooltip>
                  <h3>{row.count} spots here</h3>
                </Tooltip>
              </Marker>
            );
          }
          return (
            <Marker
              key={row.id}
              position={row.latlng}
              icon={spotIcon}
              eventHandlers={{
                click: () => {
                  if (!addMode) openDetails(row);
                },
              }}
            >
              <Tooltip>
                <h3>{row.brand} — {row.street}</h3>
              </Tooltip>
            </Marker>
          );
        })}
        {addDraft && (
          <Marker position={addDraft} icon={addMarkerIcon}>
            <Tooltip permanent direction="top" offset={[0, -16]}>
              <h3>New spot</h3>
            </Tooltip>
          </Marker>
        )}
        {!locationDenied && userLocation && (
          <Marker position={userLocation} icon={userIcon} />
        )}
        <FlyTo center={flyTarget.current} />
      </MapContainer>

      {addMode && (
        <AddSpotPanel
          draft={addDraft}
          userId={userId}
          onCancel={toggleAddMode}
          onPosted={handleAdded}
        />
      )}

      <PlacesSidebar
        markers={markers}
        open={sidebarOpen}
        mobile={mobile}
        userLocation={userLocation}
        onClose={() => setSidebarOpen(false)}
        onSelect={openDetails}
      />
    </div>
  );
}