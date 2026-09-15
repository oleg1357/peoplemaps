"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, Polygon, Polyline, Circle, CircleMarker } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-markercluster";
import L from "leaflet";
import { useTheme } from "@/lib/ThemeContext";
import { useAuth } from "@/lib/AuthContext";
import { useMapData } from "@/lib/MapContext";
import { tileLayer } from "@/lib/tiles";
import type { MapStyle } from "@/lib/tiles";
import type { Spot, SpotStatus } from "@/lib/types";
import type { Zone } from "@/lib/types";
import {
  valueToColor,
  RAMP_BY_NAME,
  type ChoroplethRampName,
} from "@/lib/choropleth";
import {
  polylineLength,
  polygonArea,
  formatDistance,
  formatArea,
  aggregateZoneValues,
  segmentMidpoint,
  haversineDistance,
} from "@/lib/geo";
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
  deleteSpot,
  updateOwnSpot,
  backendLive,
} from "@/lib/api-client";
import type { SpotPhoto } from "@/lib/types";
import type { MapData } from "@/lib/api-client";

const CENTER: [number, number] = [55.6761, 12.5683];
const ZOOM = 12;

import { userIcon } from "@/lib/leaflet-icons";
import {
  DEFAULT_MARKER,
  getMarkerColor,
  resolveMarker,
  makeMarkerDivIcon,
} from "@/lib/markers";
import { SpotTooltip } from "./SpotTooltip";
import { IconLink, IconRuler } from "./icons";
import { SpotDetailPanel, type SpotDetailBundle } from "./map/SpotDetailPanel";
import { MapToolbar } from "./map/MapToolbar";
import { Legend } from "./map/Legend";
import { MeasureCard } from "./map/MeasureCard";
import { LayerPanel } from "./map/LayerPanel";
import { HeatOverlay } from "./map/HeatOverlay";
import { AddSpotForm } from "./map/AddSpotForm";
import { DrawForm } from "./map/DrawForm";

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

export function MapsHomePage({
  initialCenter,
  initialZoom,
  initialAdd,
  initialSpotId,
}: {
  initialCenter?: [number, number];
  initialZoom?: number;
  initialAdd?: boolean;
  initialSpotId?: string | null;
}) {
  const { theme } = useTheme();
  const [mapStyle, setMapStyle] = useState<MapStyle>("osm");
  const tiles = tileLayer(theme, mapStyle);
  const { userId, user } = useAuth();
  const { maps, activeMap, selectMap, spots, spotsLoading, addSpot, mapData, patchMapData, zones, routes, addZone, addRoute } =
    useMapData();
  const router = useRouter();
  const baseCenter = activeMap?.baseCenter;
  // "anyone" maps let anonymous visitors contribute; every other mode requires
  // a signed-in account. (Moderator/owner-only restrictions on "invitedOnly"
  // maps are enforced server-side.)
  const canContribute = !!(userId || activeMap?.collaborationMode === "anyone");
  const baseZoom = activeMap?.baseZoom;
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialCenter ?? (baseCenter ? [baseCenter.lat, baseCenter.lng] : CENTER)
  );
  const [mapZoom, setMapZoom] = useState(initialZoom ?? (baseZoom ?? ZOOM));
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
  const [bundle, setBundle] = useState<SpotDetailBundle | null>(null);
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
  const [newPriceLevel, setNewPriceLevel] = useState<number | null>(null);
  const [newHoursNote, setNewHoursNote] = useState("");
  const [newTagsText, setNewTagsText] = useState("");
  const [newTip, setNewTip] = useState("");
  const [addError, setAddError] = useState("");
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  // Zone/route drawing state.
  const [drawMode, setDrawMode] = useState<"zone" | "route" | null>(null);
  const [drawPoints, setDrawPoints] = useState<[number, number][]>([]);
  const [drawUndo, setDrawUndo] = useState<[number, number][][]>([]);
  const [drawRedo, setDrawRedo] = useState<[number, number][][]>([]);
  const [drawName, setDrawName] = useState("");
  const [drawDesc, setDrawDesc] = useState("");
  const [drawColor, setDrawColor] = useState<string>(DEFAULT_MARKER.color);
  const [drawValue, setDrawValue] = useState("");
  const [drawCount, setDrawCount] = useState("");
  const [drawError, setDrawError] = useState("");
  // Map search & layer filters.
  const [searchQuery, setSearchQuery] = useState("");
  const [showSpots, setShowSpots] = useState(true);
  const [showZones, setShowZones] = useState(true);
  const [showRoutes, setShowRoutes] = useState(true);
  // Choropleth: when on, zones with a numeric `value` are filled by value
  // color instead of their own `color`, and a legend is shown.
  const [choropleth, setChoropleth] = useState(true);
  // Layer panel + heatmap overlay.
  const [layersOpen, setLayersOpen] = useState(false);
  const [heatmap, setHeatmap] = useState(false);
  // Measurement mode: click points on the map to read distance (2+ points) or
  // area (3+ points). Transient — nothing is persisted.
  const [measureMode, setMeasureMode] = useState<"distance" | "area" | null>(null);
  const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
  const [measureUndo, setMeasureUndo] = useState<[number, number][][]>([]);
  const [measureRedo, setMeasureRedo] = useState<[number, number][][]>([]);
  const [measureUnits, setMeasureUnits] = useState<"metric" | "imperial">("metric");
  const [measureHover, setMeasureHover] = useState<[number, number] | null>(null);
  // Tag & rating filters (public map). Tag filter selects spots carrying a tag;
  // rating filter shows only spots meeting a minimum average review score.
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [minRating, setMinRating] = useState(0);
  // Search jump: when a query has matches, fly to the first/last-selected result.
  const [searchFlyId, setSearchFlyId] = useState<string | null>(null);
  const flyTargetRef = useRef<[number, number] | null>(null);

  // Reset drawing whenever the active map changes.
  useEffect(() => {
    setDrawMode(null);
    setDrawPoints([]);
    setDrawUndo([]);
    setDrawRedo([]);
    setDrawName("");
    setDrawDesc("");
    setDrawError("");
    setMeasureMode(null);
    setMeasurePoints([]);
    setMeasureUndo([]);
    setMeasureRedo([]);
    setAdding(false);
    setDraft(null);
    // Fly to the map's configured base center/zoom when switching maps.
    if (baseCenter) {
      viewTargetRef.current = {
        center: [baseCenter.lat, baseCenter.lng],
        zoom: baseZoom ?? ZOOM,
      };
    }
  }, [activeMap?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening the page via ?add=1 (the nav "+ Add spot" CTA) pre-opens the
  // add-spot flow. Requires a signed-in user (or an "anyone" map).
  useEffect(() => {
    if (!initialAdd) return;
    setDrawMode(null);
    setDrawPoints([]);
    setAddError("");
    if (!canContribute) {
      setAddError("You must be signed in to add a spot.");
      return;
    }
    setAdding(true);
  }, [initialAdd, canContribute]);

  const pickMarkerEmoji =
    newMarker ?? activeMap?.defaultMarker ?? DEFAULT_MARKER.emoji;
  const pickMarkerColor =
    newMarkerColor ??
    resolveMarker(activeMap?.defaultMarker).color ??
    activeMap?.defaultMarkerColor ??
    DEFAULT_MARKER.color;

  // Average rating per spot, so map tooltips and the rating filter can use the
  // community score without an extra fetch per marker.
  const avgBySpot = useMemo(() => {
    const sums = new Map<string, { total: number; count: number }>();
    for (const r of mapData.reviews) {
      if (!Number.isFinite(r.score)) continue;
      const cur = sums.get(r.spotId) ?? { total: 0, count: 0 };
      cur.total += r.score;
      cur.count += 1;
      sums.set(r.spotId, cur);
    }
    const out = new Map<string, number>();
    for (const [spotId, v] of sums) {
      if (v.count > 0) out.set(spotId, v.total / v.count);
    }
    return out;
  }, [mapData.reviews]);

  // Search/filter derived views. A spot matches when the query is a
  // case-insensitive substring of its name, city, street or tags.
  const q = searchQuery.trim().toLowerCase();
  const searchableSpots = q
    ? spots.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.city?.toLowerCase().includes(q) ||
          s.street?.toLowerCase().includes(q) ||
          (s.tags ?? []).some((t) => t.toLowerCase().includes(q))
      )
    : spots;

  // Tag & rating filters apply on top of the search. A spot must carry the
  // selected tag (if any) and, when a minimum rating is set, have reviews
  // averaging at least that score and at least one score.
  const tagFiltered = tagFilter
    ? searchableSpots.filter((s) => (s.tags ?? []).includes(tagFilter))
    : searchableSpots;
  const ratingFiltered =
    minRating > 0
      ? tagFiltered.filter((s) => {
          const avg = avgBySpot.get(s._id ?? "");
          return avg !== undefined && avg >= minRating;
        })
      : tagFiltered;
  const visibleSpots = useMemo(
    () => (showSpots ? ratingFiltered : []),
    [showSpots, ratingFiltered]
  );
  const visibleZones = showZones ? zones : [];
  const visibleRoutes = showRoutes ? routes : [];

  // Choropleth overlay: zones are filled by a numeric `value` mapped onto a
  // color ramp. Values can be set manually (`zone.value`) or auto-derived from
  // the spots inside each zone (`aggregateZoneValues`), controlled by the map's
  // `choroplethMetric`. The ramp can be switched live (per-map default or a
  // local override via the layer panel).
  const CHOROPLETH_METRIC: "priceLevel" | "rating" =
    activeMap?.choroplethMetric === "rating" ? "rating" : "priceLevel";
  const [choroplethRampName, setChoroplethRampName] = useState<ChoroplethRampName>(
    activeMap?.choroplethRamp === "diverging" ? "diverging" : "sequential"
  );
  // Synchronize the ramp selector when switching maps (Sanity settings are the
  // source of truth until the user overrides them).
  useEffect(() => {
    setChoroplethRampName(activeMap?.choroplethRamp === "diverging" ? "diverging" : "sequential");
  }, [activeMap?._id, activeMap?.choroplethRamp]);
  const choroplethRamp = RAMP_BY_NAME[choroplethRampName];

  // Augment zones with auto-computed values so the overlay stays meaningful
  // even before anyone hand-enters numbers. Explicit `value` always wins.
  const zoneStats = useMemo(
    () => aggregateZoneValues(zones, spots, avgBySpot, CHOROPLETH_METRIC),
    [zones, spots, avgBySpot, CHOROPLETH_METRIC]
  );
  const valuedZones = useMemo(() => {
    const explicit = new Set(zones.filter((z) => Number.isFinite(z.value)));
    return zones.map((z) => {
      if (explicit.has(z)) return z;
      const stats = zoneStats.get(z._id ?? "");
      if (!stats) return z;
      return { ...z, value: stats.value, valueCount: stats.count };
    });
  }, [zones, zoneStats]);
  const hasChoroplethData = valuedZones.some((z) => Number.isFinite(z.value));
  // Heatmap is usable once any visible spot carries a price level or rating.
  const heatmapReady = showSpots && spots.some((s) => {
    const pl = s.priceLevel ?? 0;
    return pl >= 1 || (avgBySpot.get(s._id ?? "") ?? 0) > 0;
  });
  // Intensity points for the heat layer — same metric as the choropleth.
  const heatPoints = useMemo(() => {
    if (!heatmapReady) return [];
    const denom = CHOROPLETH_METRIC === "rating" ? 5 : 4;
    return visibleSpots
      .map((s) => {
        const raw =
          CHOROPLETH_METRIC === "rating"
            ? (avgBySpot.get(s._id ?? "") ?? 0)
            : (s.priceLevel ?? 0);
        return { pos: [s.lat, s.lng] as [number, number], v: Math.max(0, Math.min(1, raw / denom)) };
      })
      .filter((d) => d.v > 0);
  }, [heatmapReady, visibleSpots, avgBySpot, CHOROPLETH_METRIC]);
  const chloroplethValued = useMemo(
    () => valuedZones.filter((z) => Number.isFinite(z.value)),
    [valuedZones]
  );
  const choroplethRange = useMemo(() => {
    let lo = Infinity;
    let hi = -Infinity;
    for (const z of valuedZones) {
      if (!Number.isFinite(z.value)) continue;
      if ((z.value ?? NaN) < lo) lo = z.value!;
      if ((z.value ?? NaN) > hi) hi = z.value!;
    }
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return null;
    return lo === hi ? { min: lo - 0.5, max: hi + 0.5 } : { min: lo, max: hi };
  }, [valuedZones]);
  const zoneFillColor = useCallback(
    (z: Zone): string => {
      if (choropleth && choroplethRange && Number.isFinite(z.value)) {
        return valueToColor(z.value!, choroplethRange.min, choroplethRange.max, choroplethRamp);
      }
      return z.color || activeMap?.accentColor || DEFAULT_MARKER.color;
    },
    [choropleth, choroplethRange, choroplethRamp, activeMap?.accentColor]
  );

  // The most common tags on this map, capped so the chip row stays compact.
  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of spots) {
      for (const t of s.tags ?? []) {
        const key = t.trim().toLowerCase();
        if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 12)
      .map(([tag]) => tag);
  }, [spots]);

  // When the user types a search, fly to the best match and remember its id so
  // When the user types a search, fly to the best match and remember its id so
  // a repeated/edited query re-centers without double-flying on every render.
  const searchBest = q && searchableSpots.length > 0 ? searchableSpots[0] : null;
  const searchBestId = searchBest?._id ?? null;
  const searchBestPos: [number, number] | null = searchBest
    ? [searchBest.lat, searchBest.lng]
    : null;
  useEffect(() => {
    if (!searchBestId || searchBestId === searchFlyId) return;
    setSearchFlyId(searchBestId);
    if (searchBestPos) flyTargetRef.current = searchBestPos;
    setSelected(searchBest!);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchBestId, searchBestPos, searchFlyId]);

  const loadBundle = (spot: Spot, data: MapData): SpotDetailBundle => {
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
    const scores = reviews.map((r) => r.score).filter((n) => Number.isFinite(n));
    const avgScore = scores.length
      ? scores.reduce((a, b) => a + b, 0) / scores.length
      : null;
    return {
      reviews,
      photos: data.photos.filter((p) => p.spotId === spot._id),
      avgScore,
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

  const openSpot = useCallback((spot: Spot) => {
    setSelected(spot);
    flyTargetRef.current = [spot.lat, spot.lng];
  }, []);

  // Deep-link: `?spot=<id>` opens + flies to that spot once its data loads.
  // (Spots arrive asynchronously, so wait until the target exists in the list.)
  const initialSpotHandled = useRef(false);
  useEffect(() => {
    if (!initialSpotId || initialSpotHandled.current) return;
    const target = spots.find((s) => s._id === initialSpotId);
    if (!target) return;
    initialSpotHandled.current = true;
    openSpot(target);
  }, [initialSpotId, spots, openSpot]);

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
    const res = await toggleHelpfulReview(reviewId, userId);
    if (res) {
      patchMapData((d) => ({
        ...d,
        reviews: d.reviews.map((r) =>
          r._id === reviewId
            ? { ...r, helpfulCount: res.count, voted: res.voted }
            : r
        ),
      }));
    }
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

  // Author edit of their own spot (name/address/marker/color).
  const [editingSpot, setEditingSpot] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStreet, setEditStreet] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editZip, setEditZip] = useState(0);
  const [editMarker, setEditMarker] = useState<string | null>(null);
  const [editMarkerColor, setEditMarkerColor] = useState<string | null>(null);
  const [editPriceLevel, setEditPriceLevel] = useState<number | null>(null);
  const [editHoursNote, setEditHoursNote] = useState("");
  const [editTagsText, setEditTagsText] = useState("");
  const [editTip, setEditTip] = useState("");
  const [editSpotError, setEditSpotError] = useState("");

  // Report a spot for moderator review.
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDone, setReportDone] = useState(false);

  const handleDeleteReview = async (reviewId: string) => {
    await deleteReview(reviewId);
    patchMapData((d) => ({
      ...d,
      reviews: d.reviews.filter((r) => r._id !== reviewId),
      comments: d.comments.filter((c) => c.reviewId !== reviewId),
    }));
  };

  const startEditSpot = (spot: Spot) => {
    setEditName(spot.name);
    setEditStreet(spot.street ?? "");
    setEditCity(spot.city ?? "");
    setEditZip(spot.zip ? Number(spot.zip) : 0);
    setEditMarker(spot.marker ?? null);
    setEditMarkerColor(spot.markerColor ?? null);
    setEditPriceLevel(spot.priceLevel ?? null);
    setEditHoursNote(spot.hoursNote ?? "");
    setEditTagsText((spot.tags ?? []).join(", "));
    setEditTip(spot.tip ?? "");
    setEditSpotError("");
    setEditingSpot(true);
  };

  const handleSaveOwnSpot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected?._id) return;
    setEditSpotError("");
    const updated = await updateOwnSpot(selected._id, {
      name: editName.trim(),
      street: editStreet.trim(),
      city: editCity.trim(),
      zip: editZip,
      marker: editMarker,
      markerColor: editMarkerColor,
      priceLevel: editPriceLevel,
      hoursNote: editHoursNote.trim(),
      tags: editTagsText.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
      tip: editTip.trim(),
    });
    if (!updated) {
      setEditSpotError("Could not save your changes.");
      return;
    }
    patchMapData((d) => ({
      ...d,
      spots: d.spots.map((s) => (s._id === selected._id ? updated : s)),
    }));
    setSelected(updated);
    setEditingSpot(false);
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

  const handleDeleteSpot = async () => {
    if (!selected?._id) return;
    if (!confirm("Delete this spot permanently?")) return;
    await deleteSpot(selected._id);
    patchMapData((d) => ({
      ...d,
      spots: d.spots.filter((s) => s._id !== selected._id),
      reviews: d.reviews.filter((r) => r.spotId !== selected._id),
      comments: d.comments.filter((c) =>
        !d.reviews.some((r) => r._id === c.reviewId && r.spotId === selected._id)
      ),
    }));
    setSelected(null);
  };

  const startDraw = (mode: "zone" | "route") => {
    // Drawing and spot-adding are mutually exclusive.
    setAdding(false);
    setDraft(null);
    setAddError("");
    setDrawError("");
    setDrawName("");
    setDrawDesc("");
    setDrawValue("");
    setDrawCount("");
    setDrawPoints((pts) => (drawMode === mode ? [] : pts));
    setDrawUndo([]);
    setDrawRedo([]);
    // Measuring is excluded while drawing.
    setMeasureMode(null);
    setMeasurePoints([]);
    setMeasureUndo([]);
    setMeasureRedo([]);
    setDrawMode((m) => (m === mode ? null : mode));
  };

  const cancelDraw = () => {
    setDrawMode(null);
    setDrawPoints([]);
    setDrawUndo([]);
    setDrawRedo([]);
    setDrawName("");
    setDrawDesc("");
    setDrawValue("");
    setDrawCount("");
    setDrawError("");
  };

  const handleDrawPlace = (p: [number, number]) => {
    setDrawPoints((pts) => {
      setDrawUndo((u) => [...u, pts]);
      setDrawRedo([]);
      return [...pts, p];
    });
  };

  const handleUndoPoint = () => {
    if (drawUndo.length === 0) return;
    const previous = drawUndo[drawUndo.length - 1];
    setDrawRedo((redoStack) => [...redoStack, drawPoints]);
    setDrawPoints(previous);
    setDrawUndo((undoStack) => undoStack.slice(0, -1));
  };

  const handleRedoPoint = () => {
    if (drawRedo.length === 0) return;
    const next = drawRedo[drawRedo.length - 1];
    setDrawUndo((undoStack) => [...undoStack, drawPoints]);
    setDrawPoints(next);
    setDrawRedo((redoStack) => redoStack.slice(0, -1));
  };

  // ---- Measurement mode ----

  const startMeasure = (mode: "distance" | "area") => {
    // Measuring is mutually exclusive with drawing and spot-adding.
    setAdding(false);
    setDraft(null);
    setDrawMode(null);
    setDrawPoints([]);
    setDrawError("");
    setMeasurePoints([]);
    setMeasureUndo([]);
    setMeasureRedo([]);
    setMeasureMode((m) => (m === mode ? null : mode));
  };

  const cancelMeasure = () => {
    setMeasureMode(null);
    setMeasurePoints([]);
    setMeasureUndo([]);
    setMeasureRedo([]);
    setMeasureHover(null);
  };

  const handleMeasurePlace = (p: [number, number]) => {
    setMeasurePoints((pts) => {
      setMeasureUndo((u) => [...u, pts]);
      setMeasureRedo([]);
      return [...pts, p];
    });
  };

  const handleMeasureUndo = () => {
    if (measureUndo.length === 0) return;
    const previous = measureUndo[measureUndo.length - 1];
    setMeasureRedo((redoStack) => [...redoStack, measurePoints]);
    setMeasurePoints(previous);
    setMeasureUndo((undoStack) => undoStack.slice(0, -1));
  };

  const handleMeasureRedo = () => {
    if (measureRedo.length === 0) return;
    const next = measureRedo[measureRedo.length - 1];
    setMeasureUndo((undoStack) => [...undoStack, measurePoints]);
    setMeasurePoints(next);
    setMeasureRedo((redoStack) => redoStack.slice(0, -1));
  };

  const onMeasureHover = useCallback((p: [number, number] | null) => {
    setMeasureHover(p);
  }, []);

  // Live measurement readout for the current mode.
  const measureResult = useMemo(() => {
    if (!measureMode || measurePoints.length < 2) return null;
    if (measureMode === "distance") {
      return formatDistance(polylineLength(measurePoints), measureUnits);
    }
    if (measureMode === "area" && measurePoints.length >= 3) {
      return formatArea(polygonArea(measurePoints), measureUnits);
    }
    return null;
  }, [measureMode, measurePoints, measureUnits]);

  // Per-segment labels for the distance mode (each segment's length at its
  // midpoint), plus a live total line to the cursor.
  const measureSegments = useMemo(() => {
    if (measureMode !== "distance" || measurePoints.length < 2) return [];
    const segs: { midpoint: [number, number]; label: string }[] = [];
    for (let i = 1; i < measurePoints.length; i++) {
      segs.push({
        midpoint: segmentMidpoint(measurePoints[i - 1], measurePoints[i]),
        label: formatDistance(
          haversineDistance(measurePoints[i - 1], measurePoints[i]),
          measureUnits
        ),
      });
    }
    return segs;
  }, [measureMode, measurePoints, measureUnits]);

  // Persisting a finished measurement: distance → route, area → zone. Does a
  // light validation mirroring saveDraw and reuses the map's drawing color.
  const saveMeasurement = async (type: "zone" | "route") => {
    const label = type === "zone" ? "Measured area" : "Measured path";
    if (!activeMap) return;
    if (!canContribute) {
      setDrawError("You must be signed in to save a " + type + ".");
      return;
    }
    try {
      if (type === "zone") {
        await addZone({
          mapId: activeMap._id,
          name: label,
          shape: "polygon",
          points: measurePoints,
          color: activeMap.accentColor ?? DEFAULT_MARKER.color,
          description: "Created from a map measurement.",
        });
      } else {
        await addRoute({
          mapId: activeMap._id,
          name: label,
          points: measurePoints,
          color: activeMap.accentColor ?? DEFAULT_MARKER.color,
          description: "Created from a map measurement.",
        });
      }
      cancelMeasure();
    } catch (err) {
      console.error("saveMeasurement failed:", err);
      setDrawError((err as Error).message || `Could not save ${type}.`);
    }
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
    if (!canContribute) {
      setDrawError("You must be signed in to add a " + type + ".");
      return;
    }
    if (!activeMap) {
      setDrawError("No map selected. Pick a map from the dropdown before adding a " + type + ".");
      return;
    }
    try {
      if (type === "zone") {
        const valueNum = drawValue.trim() === "" ? null : Number(drawValue);
        const countNum = drawCount.trim() === "" ? null : Math.round(Number(drawCount));
        await addZone({
          mapId: activeMap._id,
          name,
          shape: "polygon",
          points: drawPoints,
          color: drawColor,
          description: drawDesc.trim() || null,
          value:
            valueNum !== null && Number.isFinite(valueNum)
              ? valueNum
              : null,
          valueCount:
            countNum !== null && Number.isFinite(countNum) && countNum >= 0
              ? countNum
              : null,
          valueUpdatedAt:
            valueNum !== null && Number.isFinite(valueNum)
              ? new Date().toISOString()
              : null,
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
    if (!activeMap || !draft || !newName.trim()) return;
    if (!canContribute) {
      setAddError("You must be signed in to add a spot.");
      return;
    }
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
        priceLevel: newPriceLevel,
        hoursNote: newHoursNote.trim(),
        tags: newTagsText.split(",").map((t) => t.trim()).filter(Boolean).slice(0, 8),
        tip: newTip.trim(),
      });
      setNewName("");
      setNewPriceLevel(null);
      setNewHoursNote("");
      setNewTagsText("");
      setNewTip("");
      setAdding(false);
      setDraft(null);
      if (spot) {
        // The create response already carries the full spot, so the details
        // popup opens immediately with its data — no extra request.
        openSpot(spot);
        if (activeMap.requireApproval !== false) {
          setSubmitMsg("Your spot has been submitted and is pending review.");
          setTimeout(() => setSubmitMsg(null), 5000);
        }
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
    const slugBase = map?.slug
      ? `${origin}/map/${encodeURIComponent(map.slug)}`
      : null;
    const idBase = map ? `${origin}/map?map=${encodeURIComponent(map._id)}` : null;
    const base = slugBase ?? idBase ?? `${origin}/map`;
    const view = includeView
      ? `${(slugBase ? "?" : "&")}lat=${mapCenter[0].toFixed(5)}&lng=${mapCenter[1].toFixed(
          5
        )}&zoom=${mapZoom}`
      : "";
    return base + view;
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
    <div className={`map-container ${drawMode || measureMode ? "drawing" : ""}`}>
      {maps.length > 0 && (
        <div id="map-buttons" className="buttons">
          <select
            className="map-select"
            value={selected?.mapId || activeMap?._id || ""}
            onChange={(e) => {
              const id = e.target.value;
              const m = maps.find((x) => x._id === id);
              selectMap(id);
              if (m) router.replace(buildPermalink(m, true));
            }}
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
          cancelMeasure();
          if (!canContribute) {
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

      <button
        id="measure-distance-fab"
        type="button"
        className={`draw-fab measure-fab ${measureMode === "distance" ? "cancel" : ""}`}
        onClick={() => startMeasure("distance")}
        title="Measure distance between points"
      >
        {measureMode === "distance" ? (
          "✕ Cancel"
        ) : (
          <>
            <IconRuler size={15} />
            Measure distance
          </>
        )}
      </button>

      <button
        id="measure-area-fab"
        type="button"
        className={`draw-fab measure-fab ${measureMode === "area" ? "cancel" : ""}`}
        onClick={() => startMeasure("area")}
        title="Measure the area of a drawn shape"
      >
        {measureMode === "area" ? "✕ Cancel" : "Measure area"}
      </button>

      {maps.length === 0 && !adding && (
        <div id="map-note">
          No maps available yet. Create your first map from <a href="/dashboard">your dashboard</a>.
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

      <MapToolbar
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        layersOpen={layersOpen}
        onToggleLayers={() => setLayersOpen((v) => !v)}
        mapStyle={mapStyle}
        setMapStyle={setMapStyle}
        onCenterOnMe={centerOnMe}
        onCopyView={copyViewLink}
        viewCopied={viewCopied}
      />

      {layersOpen && (
        <LayerPanel
          showSpots={showSpots}
          setShowSpots={setShowSpots}
          showZones={showZones}
          setShowZones={setShowZones}
          showRoutes={showRoutes}
          setShowRoutes={setShowRoutes}
          choropleth={choropleth}
          setChoropleth={setChoropleth}
          hasChoroplethData={hasChoroplethData}
          heatmap={heatmap}
          setHeatmap={setHeatmap}
          heatmapReady={heatmapReady}
          rampName={choroplethRampName}
          setRampName={setChoroplethRampName}
          metric={CHOROPLETH_METRIC}
          onClose={() => setLayersOpen(false)}
        />
      )}

      {(topTags.length > 0 || minRating > 0 || tagFilter) && (
        <div className="map-filter-bar">
          {topTags.length > 0 && (
            <div className="map-filter-chips">
              <span className="map-filter-label">Tags</span>
              {topTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className={`map-filter-chip ${tagFilter === tag ? "active" : ""}`}
                  onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                >
                  #{tag}
                </button>
              ))}
              {tagFilter && (
                <button
                  type="button"
                  className="map-filter-clear"
                  onClick={() => setTagFilter(null)}
                >
                  Clear tags
                </button>
              )}
            </div>
          )}
          {topTags.length > 0 && <span className="map-filter-divider" />}
          <div className="map-rating-filter">
            <span className="map-filter-label">Min rating</span>
            {[0, 1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`map-star-btn ${minRating === n ? "active" : ""}`}
                onClick={() => setMinRating(n)}
                title={n === 0 ? "Show all spots" : `Only spots rated ${n}★ or higher`}
              >
                {n === 0 ? "All" : `${n}★+`}
              </button>
            ))}
          </div>
        </div>
      )}

      {selected && bundle && (
        <SpotDetailPanel
          selected={selected}
          bundle={bundle}
          status={status}
          onStatus={handleStatus}
          userId={userId}
          allowReviews={activeMap?.allowReviews ?? true}
          allowComments={activeMap?.allowComments ?? true}
          allowPhotos={activeMap?.allowPhotos ?? true}
          editingSpot={editingSpot}
          setEditingSpot={setEditingSpot}
          startEditSpot={startEditSpot}
          handleSaveOwnSpot={handleSaveOwnSpot}
          editName={editName}
          setEditName={setEditName}
          editStreet={editStreet}
          setEditStreet={setEditStreet}
          editCity={editCity}
          setEditCity={setEditCity}
          editZip={editZip}
          setEditZip={setEditZip}
          editMarker={editMarker}
          setEditMarker={setEditMarker}
          editMarkerColor={editMarkerColor}
          setEditMarkerColor={setEditMarkerColor}
          editPriceLevel={editPriceLevel}
          setEditPriceLevel={setEditPriceLevel}
          editHoursNote={editHoursNote}
          setEditHoursNote={setEditHoursNote}
          editTagsText={editTagsText}
          setEditTagsText={setEditTagsText}
          editTip={editTip}
          setEditTip={setEditTip}
          editSpotError={editSpotError}
          editing={editing}
          setEditing={setEditing}
          reviewText={reviewText}
          setReviewText={setReviewText}
          reviewScore={reviewScore}
          setReviewScore={setReviewScore}
          handleSaveReview={handleSaveReview}
          handleVote={handleVote}
          handleDeleteReview={handleDeleteReview}
          handleEditReview={handleEditReview}
          commentDrafts={commentDrafts}
          setCommentDrafts={setCommentDrafts}
          replyTarget={replyTarget}
          setReplyTarget={setReplyTarget}
          handleComment={handleComment}
          handleDeleteComment={handleDeleteComment}
          spotPhotos={spotPhotos}
          photosLoading={photosLoading}
          handlePhoto={handlePhoto}
          reporting={reporting}
          setReporting={setReporting}
          reportReason={reportReason}
          setReportReason={setReportReason}
          reportDone={reportDone}
          setReportDone={setReportDone}
          handleDeleteSpot={handleDeleteSpot}
          onClose={() => setSelected(null)}
        />
      )}

      <MapContainer center={mapCenter} zoom={mapZoom} zoomSnap={0.5} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution={tiles.attribution}
          url={tiles.url}
          subdomains={tiles.subdomains}
          maxZoom={tiles.maxZoom}
        />
        {heatmap && heatPoints.length > 0 && <HeatOverlay points={heatPoints} />}
        {adding && (
          <MapClickHandler onPlace={(p) => setDraft(p)} />
        )}
        {drawMode && (
          <MapClickHandler onPlace={handleDrawPlace} />
        )}
        {measureMode && (
          <MapClickHandler onPlace={handleMeasurePlace} />
        )}
        {/* Zones: filled polygons or radius circles */}
        {visibleZones.map((z) => {
          const fill = zoneFillColor(z);
          const isValued = choropleth && Number.isFinite(z.value);
          return z.shape === "circle" && z.center && z.radius ? (
            <Circle
              key={z._id}
              center={z.center}
              radius={z.radius}
              pathOptions={{
                color: isValued ? fill : z.color || activeMap?.accentColor || DEFAULT_MARKER.color,
                fillColor: fill,
                fillOpacity: isValued ? 0.5 : 0.15,
                weight: isValued ? 2 : 2,
              }}
            >
              {(z.name || z.description) && (
                <Tooltip direction="top" offset={[0, -12]}>
                  <SpotTooltip
                    name={z.name || "Zone"}
                    hint={z.description || undefined}
                    extra={isValued && typeof z.value === "number" ? `Value: ${z.value}` : undefined}
                  />
                </Tooltip>
              )}
            </Circle>
          ) : z.points && z.points.length >= 3 ? (
            <Polygon
              key={z._id}
              positions={z.points}
              pathOptions={{
                color: isValued ? fill : z.color || activeMap?.accentColor || DEFAULT_MARKER.color,
                fillColor: fill,
                fillOpacity: isValued ? 0.5 : 0.15,
                weight: 2,
              }}
            >
              {(z.name || z.description) && (
                <Tooltip direction="top" offset={[0, -12]}>
                  <SpotTooltip
                    name={z.name || "Zone"}
                    hint={z.description || undefined}
                    extra={isValued && typeof z.value === "number" ? `Value: ${z.value}` : undefined}
                  />
                </Tooltip>
              )}
            </Polygon>
          ) : null;
        })}
        {/* Routes: polylines */}
        {visibleRoutes.map((r) =>
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
        {activeMap?.enableClustering ? (
          <MarkerClusterGroup>
            {visibleSpots.map((s) => {
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
                      score={avgBySpot.get(s._id ?? "") ?? null}
                      hint="Click to view details"
                      priceLevel={s.priceLevel}
                      tags={s.tags ?? undefined}
                      tip={s.tip}
                    />
                  </Tooltip>
                </Marker>
              );
            })}
          </MarkerClusterGroup>
        ) : (
          visibleSpots.map((s) => {
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
                    score={avgBySpot.get(s._id ?? "") ?? null}
                    hint="Click to view details"
                    priceLevel={s.priceLevel}
                    tags={s.tags ?? undefined}
                    tip={s.tip}
                  />
                </Tooltip>
              </Marker>
            );
          })
        )}
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
        {/* Measurement preview */}
        {measureMode === "distance" && measurePoints.length >= 2 && (
          <Polyline
            positions={measurePoints}
            pathOptions={{ color: "#C99A5B", weight: 3, opacity: 0.85 }}
          />
        )}
        {measureMode === "area" && measurePoints.length >= 2 && (
          <Polyline
            positions={measurePoints}
            pathOptions={{ color: "#C99A5B", weight: 2, dashArray: "6 4", opacity: 0.7 }}
          />
        )}
        {measureMode === "area" && measurePoints.length >= 3 && (
          <Polygon
            positions={[...measurePoints, measurePoints[0]]}
            pathOptions={{
              color: "#C99A5B",
              weight: 2,
              fillColor: "#C99A5B",
              fillOpacity: 0.18,
            }}
          />
        )}
        {measurePoints.map((p, i) => (
          <CircleMarker
            key={i}
            center={p}
            radius={5}
            pathOptions={{
              color: "#fff",
              weight: 2,
              fillColor: "#C99A5B",
              fillOpacity: 1,
            }}
          />
        ))}
        {measureSegments.map((seg, i) => (
          <CircleMarker
            key={`seg-${i}`}
            center={seg.midpoint}
            radius={4}
            pathOptions={{
              color: "#C99A5B",
              weight: 1,
              fillColor: "#fff",
              fillOpacity: 1,
            }}
          >
            <Tooltip permanent direction="top" offset={[0, -10]} className="measure-live-tip">
              <span className="measure-live-label">{seg.label}</span>
            </Tooltip>
          </CircleMarker>
        ))}
        {measureMode &&
          measureHover &&
          measurePoints.length >= 1 && (
            <Polyline
              positions={[measurePoints[measurePoints.length - 1], measureHover]}
              pathOptions={{ color: "#C99A5B", weight: 2, dashArray: "4 4", opacity: 0.5 }}
            >
              <Tooltip permanent direction="top" offset={[0, -12]} className="measure-live-tip">
                <span className="measure-live-label">
                  {formatDistance(
                    haversineDistance(measurePoints[measurePoints.length - 1], measureHover),
                    measureUnits
                  )}
                </span>
              </Tooltip>
            </Polyline>
          )}
        {measureMode === "area" &&
          measureHover &&
          measurePoints.length >= 3 && (
            <Polyline
              positions={[measureHover, measurePoints[0]]}
              pathOptions={{ color: "#C99A5B", weight: 2, dashArray: "4 4", opacity: 0.5 }}
            />
          )}
        {userLocation && !adding && (
          <Marker position={userLocation} icon={userIcon} />
        )}
        <ViewWatcher onMove={onMapMove} />
        <FlyTo center={flyTargetRef.current} />
        <FlyToView target={viewTargetRef.current} />
        {measureMode && (
          <MapHoverHandler onHover={onMeasureHover} />
        )}
      </MapContainer>

      {choropleth && choroplethRange && chloroplethValued.length > 0 && (
        <div className="choropleth-legend-wrap">
          <Legend
            title={CHOROPLETH_METRIC === "rating" ? "Avg rating" : "Price level"}
            min={choroplethRange.min}
            max={choroplethRange.max}
            ramp={choroplethRamp}
            footnote={`${chloroplethValued.length} zone${chloroplethValued.length === 1 ? "" : "s"} with data`}
          />
        </div>
      )}

      {measureMode && (
        <div className="measure-card-wrap">
          <MeasureCard
            mode={measureMode}
            points={measurePoints}
            result={measureResult}
            canUndo={measureUndo.length > 0}
            canRedo={measureRedo.length > 0}
            units={measureUnits}
            setUnits={setMeasureUnits}
            canSave={Boolean(
              canContribute &&
                activeMap &&
                measurePoints.length >= (measureMode === "area" ? 3 : 2)
            )}
            onSaveAsZone={() => saveMeasurement("zone")}
            onSaveAsRoute={() => saveMeasurement("route")}
            onUndo={handleMeasureUndo}
            onRedo={handleMeasureRedo}
            onClear={() => setMeasurePoints([])}
            onClose={cancelMeasure}
          />
        </div>
      )}

      {adding && (
        <AddSpotForm
          newName={newName}
          setNewName={setNewName}
          pickMarkerEmoji={pickMarkerEmoji}
          pickMarkerColor={pickMarkerColor}
          setNewMarker={setNewMarker}
          setNewMarkerColor={setNewMarkerColor}
          setPriceLevel={setNewPriceLevel}
          setHoursNote={setNewHoursNote}
          setTagsText={setNewTagsText}
          setTip={setNewTip}
          activeMap={activeMap}
          onSubmit={handleAddSpot}
        />
      )}

      {submitMsg && (
        <div className="map-submit-msg" style={{ borderColor: activeMap?.accentColor ?? DEFAULT_MARKER.color }}>
          {submitMsg}
        </div>
      )}

      {drawMode && (
        <DrawForm
          drawMode={drawMode}
          drawPoints={drawPoints}
          drawUndo={drawUndo}
          drawRedo={drawRedo}
          drawName={drawName}
          setDrawName={setDrawName}
          drawDesc={drawDesc}
          setDrawDesc={setDrawDesc}
          drawColor={drawColor}
          setDrawColor={setDrawColor}
          drawValue={drawValue}
          setDrawValue={setDrawValue}
          drawCount={drawCount}
          setDrawCount={setDrawCount}
          drawError={drawError}
          handleUndoPoint={handleUndoPoint}
          handleRedoPoint={handleRedoPoint}
          cancelDraw={cancelDraw}
          saveDraw={saveDraw}
        />
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

function MapHoverHandler({ onHover }: { onHover: (latlng: [number, number] | null) => void }) {
  const map = useMap();
  useEffect(() => {
    const move = (e: L.LeafletMouseEvent) => onHover([e.latlng.lat, e.latlng.lng]);
    const out = () => onHover(null);
    map.on("mousemove", move);
    map.on("mouseout", out);
    return () => {
      map.off("mousemove", move);
      map.off("mouseout", out);
    };
  }, [map, onHover]);
  return null;
}
