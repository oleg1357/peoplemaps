"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import {
  fetchAdminMaps,
  fetchAdminSpots,
  fetchAdminZones,
  fetchAdminRoutes,
  fetchAdminActivity,
  createMap,
  updateMapSettings,
  destroyMap,
  moderateSpot,
  setSpotHidden,
  updateSpotFields,
  destroySpot,
  moderateZone,
  setZoneHidden,
  updateZoneFields,
  destroyZone,
  moderateRoute,
  setRouteHidden,
  updateRouteFields,
  destroyRoute,
  fetchMapModerators,
  addMapModerator,
  removeMapModerator,
  fetchAdminReports,
  resolveReport,
  fetchAdminBans,
  banUser,
  unbanUser,
  type AdminMapEntry,
  type AdminSpotList,
  type AdminZoneList,
  type AdminRouteList,
  type ActivityEntryApi,
  type ActivityFilter,
  type AdminReport,
  type MapSettingsInput,
  type MapRoleEntry,
} from "@/lib/api-client";
import type { Spot, Zone, Route, MapBan } from "@/lib/types";
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
  IconX,
} from "./icons";
import AdminCreateMap from "./admin/AdminCreateMap";
import AdminSpotView from "./admin/AdminSpotView";
import AdminZonesView from "./admin/AdminZonesView";
import AdminActivityView from "./admin/AdminActivityView";
import AdminReportsView from "./admin/AdminReportsView";
import AdminBansView from "./admin/AdminBansView";
import AdminModeratorsView from "./admin/AdminModeratorsView";
import AdminSettingsView from "./admin/AdminSettingsView";

interface EditState {
  spot: Spot;
}

const DEFAULT_BASE = { lat: 55.6761, lng: 12.5683 };

export function MarkerPreview({
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

export function MarkerPicker({
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
  const [view, setView] = useState<"spots" | "zones" | "activity" | "reports" | "bans" | "settings" | "moderators">("spots");
  const [data, setData] = useState<AdminSpotList | null>(null);
  const [loadingSpots, setLoadingSpots] = useState(false);
  const [error, setError] = useState("");

  const [zoneData, setZoneData] = useState<AdminZoneList | null>(null);
  const [loadingZones, setLoadingZones] = useState(false);
  const [routeData, setRouteData] = useState<AdminRouteList | null>(null);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [activity, setActivity] = useState<ActivityEntryApi[]>([]);
  const [loadingActivity, setLoadingActivity] = useState(false);
  const [activityActorInput, setActivityActorInput] = useState("");
  const [activityAction, setActivityAction] = useState("");
  const [activityDateFrom, setActivityDateFrom] = useState("");
  const [activityDateTo, setActivityDateTo] = useState("");
  const [zoneEdit, setZoneEdit] = useState<Zone | null>(null);
  const [routeEdit, setRouteEdit] = useState<Route | null>(null);

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [bans, setBans] = useState<MapBan[]>([]);
  const [loadingBans, setLoadingBans] = useState(false);
  const [banInput, setBanInput] = useState("");
  const [banReason, setBanReason] = useState("");
  const [banNotice, setBanNotice] = useState("");

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

  const loadZones = useCallback(async (mapId: string) => {
    setLoadingZones(true);
    setError("");
    try {
      const list = await fetchAdminZones(mapId);
      setZoneData(list);
    } catch (e) {
      setError((e as Error).message || "Failed to load zones");
      setZoneData(null);
    } finally {
      setLoadingZones(false);
    }
  }, []);

  const loadRoutes = useCallback(async (mapId: string) => {
    setLoadingRoutes(true);
    try {
      const list = await fetchAdminRoutes(mapId);
      setRouteData(list);
    } catch (e) {
      setError((e as Error).message || "Failed to load routes");
      setRouteData(null);
    } finally {
      setLoadingRoutes(false);
    }
  }, []);

  const loadActivity = useCallback(async (mapId: string, filters?: ActivityFilter) => {
    setLoadingActivity(true);
    try {
      const entries = await fetchAdminActivity(mapId, 100, filters);
      setActivity(entries);
    } catch (e) {
      setError((e as Error).message || "Failed to load activity");
      setActivity([]);
    } finally {
      setLoadingActivity(false);
    }
  }, []);

  const applyActivityFilter = useCallback(() => {
    if (!activeMap) return;
    const filters: ActivityFilter = {};
    if (activityAction) filters.action = activityAction;
    const actor = activityActorInput.trim();
    if (actor) filters.actorId = actor;
    if (activityDateFrom) filters.dateFrom = new Date(activityDateFrom).toISOString();
    if (activityDateTo) filters.dateTo = new Date(activityDateTo).toISOString();
    loadActivity(activeMap._id, filters);
  }, [activeMap, activityAction, activityActorInput, activityDateFrom, activityDateTo, loadActivity]);

  const resetActivityFilter = useCallback(() => {
    setActivityAction("");
    setActivityActorInput("");
    setActivityDateFrom("");
    setActivityDateTo("");
    if (activeMap) loadActivity(activeMap._id);
  }, [activeMap, loadActivity]);

  useEffect(() => {
    if (activeMap && view === "zones") {
      loadZones(activeMap._id);
      loadRoutes(activeMap._id);
    }
  }, [activeMap, loadZones, loadRoutes, view]);

  useEffect(() => {
    if (activeMap && view === "activity") loadActivity(activeMap._id);
  }, [activeMap, loadActivity, view]);

  const loadReports = useCallback(async (mapId: string, status: "open" | "resolved" = "open") => {
    setLoadingReports(true);
    try {
      setReports(await fetchAdminReports(mapId, status));
    } catch (e) {
      setError((e as Error).message || "Failed to load reports");
      setReports([]);
    } finally {
      setLoadingReports(false);
    }
  }, []);

  const loadBans = useCallback(async (mapId: string) => {
    setLoadingBans(true);
    try {
      setBans(await fetchAdminBans(mapId));
    } catch (e) {
      setError((e as Error).message || "Failed to load bans");
      setBans([]);
    } finally {
      setLoadingBans(false);
    }
  }, []);

  useEffect(() => {
    if (activeMap && (view === "reports" || view === "bans")) {
      if (view === "reports") loadReports(activeMap._id);
      else loadBans(activeMap._id);
    }
  }, [activeMap, view, loadReports, loadBans]);

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
      isPublic: activeMap.isPublic === "private" ? "private" : "public",
      accentColor: activeMap.accentColor ?? DEFAULT_ACCENT,
      defaultMarker: activeMap.defaultMarker ?? DEFAULT_MARKER.emoji,
      defaultMarkerColor: activeMap.defaultMarkerColor ?? DEFAULT_MARKER.color,
      welcomeMessage: activeMap.welcomeMessage ?? "",
      submissionNote: activeMap.submissionNote ?? "",
      maxPhotosPerSpot: activeMap.maxPhotosPerSpot ?? 6,
      requireApproval: activeMap.requireApproval ?? true,
      baseCenter: activeMap.baseCenter ?? DEFAULT_BASE,
      baseZoom: activeMap.baseZoom ?? 12,
      contactEmail: activeMap.contactEmail ?? "",
      website: activeMap.website ?? "",
      allowReviews: activeMap.allowReviews ?? true,
      allowComments: activeMap.allowComments ?? true,
      allowPhotos: activeMap.allowPhotos ?? true,
      collaborationMode: activeMap.collaborationMode ?? "loggedIn",
      enableClustering: activeMap.enableClustering ?? false,
      category: activeMap.category ?? "",
      tags: activeMap.tags ?? "",
    });
  }, [activeMap?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const refresh = useCallback(async () => {
    if (!activeMap) return;
    await loadSpots(activeMap._id);
    if (view === "zones") {
      await loadZones(activeMap._id);
      await loadRoutes(activeMap._id);
    }
    if (view === "activity") await loadActivity(activeMap._id);
  }, [activeMap, loadSpots, loadZones, loadRoutes, loadActivity, view]);

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

  const handleZoneModerate = async (zone: Zone, moderation: "approved" | "rejected") => {
    try {
      await moderateZone(zone._id!, moderation);
    } catch (e) {
      setError((e as Error).message || "Action failed");
      return;
    }
    setZoneEdit(null);
    await refresh();
  };

  const handleZoneToggleHidden = async (zone: Zone) => {
    try {
      await setZoneHidden(zone._id!, !zone.hidden);
    } catch (e) {
      setError((e as Error).message || "Action failed");
      return;
    }
    await refresh();
  };

  const handleSaveZoneEdit = async () => {
    if (!zoneEdit) return;
    try {
      await updateZoneFields(zoneEdit._id!, {
        name: zoneEdit.name,
        description: zoneEdit.description ?? null,
      });
    } catch (e) {
      setError((e as Error).message || "Save failed");
      return;
    }
    setZoneEdit(null);
    await refresh();
  };

  const handleDestroyZone = async (zone: Zone) => {
    try {
      await destroyZone(zone._id!);
    } catch (e) {
      setError((e as Error).message || "Delete failed");
      return;
    }
    await refresh();
  };

  const handleRouteModerate = async (route: Route, moderation: "approved" | "rejected") => {
    try {
      await moderateRoute(route._id!, moderation);
    } catch (e) {
      setError((e as Error).message || "Action failed");
      return;
    }
    setRouteEdit(null);
    await refresh();
  };

  const handleRouteToggleHidden = async (route: Route) => {
    try {
      await setRouteHidden(route._id!, !route.hidden);
    } catch (e) {
      setError((e as Error).message || "Action failed");
      return;
    }
    await refresh();
  };

  const handleSaveRouteEdit = async () => {
    if (!routeEdit) return;
    try {
      await updateRouteFields(routeEdit._id!, {
        name: routeEdit.name,
        description: routeEdit.description ?? null,
      });
    } catch (e) {
      setError((e as Error).message || "Save failed");
      return;
    }
    setRouteEdit(null);
    await refresh();
  };

  const handleDestroyRoute = async (route: Route) => {
    try {
      await destroyRoute(route._id!);
    } catch (e) {
      setError((e as Error).message || "Delete failed");
      return;
    }
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

  const handleResolveReport = async (r: AdminReport) => {
    if (!r._id) return;
    await resolveReport(String(r._id));
    setReports((prev) => prev.filter((x) => x._id !== r._id));
  };

  const handleBan = async () => {
    if (!activeMap || !banInput.trim()) return;
    setBanNotice("");
    try {
      await banUser(activeMap._id, banInput.trim(), banReason.trim());
      setBanInput("");
      setBanReason("");
      setBanNotice("User banned.");
      await loadBans(activeMap._id);
    } catch (e) {
      setError((e as Error).message || "Failed to ban user");
    }
  };

  const handleUnban = async (b: MapBan) => {
    if (!activeMap) return;
    await unbanUser(activeMap._id, b.userId);
    await loadBans(activeMap._id);
  };

  if (!user) {
    return (
      <div className="admin-empty">
        <p>You must be signed in to manage maps.</p>
      </div>
    );
  }

  return (
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
          <AdminCreateMap
            createTitle={createTitle}
            createDesc={createDesc}
            createPublic={createPublic}
            createError={createError}
            createBusy={createBusy}
            onSubmit={handleCreateMap}
            setCreateTitle={setCreateTitle}
            setCreateDesc={setCreateDesc}
            setCreatePublic={setCreatePublic}
          />
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
                  <button
                    type="button"
                    className={`admin-inner-tab ${view === "zones" ? "active" : ""}`}
                    onClick={() => {
                      setView("zones");
                      setZoneEdit(null);
                      setRouteEdit(null);
                    }}
                  >
                    Zones &amp; routes
                  </button>
                  <button
                    type="button"
                    className={`admin-inner-tab ${view === "activity" ? "active" : ""}`}
                    onClick={() => setView("activity")}
                  >
                    Activity
                  </button>
                  <button
                    type="button"
                    className={`admin-inner-tab ${view === "reports" ? "active" : ""}`}
                    onClick={() => setView("reports")}
                  >
                    Reports
                  </button>
                  <button
                    type="button"
                    className={`admin-inner-tab ${view === "bans" ? "active" : ""}`}
                    onClick={() => setView("bans")}
                  >
                    Bans
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
                  <>
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
                    <AdminSpotView
                      activeMap={activeMap}
                      data={data}
                      loadingSpots={loadingSpots}
                      error={error}
                      edit={edit}
                      onStartEdit={(s) => {
                        setEdit({ spot: { ...s } });
                        setError("");
                      }}
                      onEditChange={(s) => setEdit({ spot: s })}
                      onCancelEdit={() => setEdit(null)}
                      onSaveEdit={handleSaveEdit}
                      onApprove={(spot) =>
                        spot.moderation === "pending" &&
                        handleModerate(spot, "approved")
                      }
                      onReject={(spot) =>
                        spot.moderation === "pending" &&
                        handleModerate(spot, "rejected")
                      }
                      onToggleHidden={(spot) => handleToggleHidden(spot)}
                      onDestroy={(spot) => setConfirmDestroy(spot)}
                    />
                  </>
                )}

                {view === "zones" && (
                  <AdminZonesView
                    zoneData={zoneData}
                    routeData={routeData}
                    loadingZones={loadingZones}
                    loadingRoutes={loadingRoutes}
                    error={error}
                    zoneEdit={zoneEdit}
                    setZoneEdit={setZoneEdit}
                    routeEdit={routeEdit}
                    setRouteEdit={setRouteEdit}
                    onStartZoneEdit={(z) => {
                      setZoneEdit({ ...z });
                      setError("");
                    }}
                    onSaveZoneEdit={handleSaveZoneEdit}
                    onApproveZone={(zone) =>
                      zone.moderation === "pending" &&
                      handleZoneModerate(zone, "approved")
                    }
                    onRejectZone={(zone) =>
                      zone.moderation === "pending" &&
                      handleZoneModerate(zone, "rejected")
                    }
                    onToggleZoneHidden={(zone) => handleZoneToggleHidden(zone)}
                    onDestroyZone={(zone) => handleDestroyZone(zone)}
                    onStartRouteEdit={(r) => {
                      setRouteEdit({ ...r });
                      setError("");
                    }}
                    onSaveRouteEdit={handleSaveRouteEdit}
                    onApproveRoute={(route) =>
                      route.moderation === "pending" &&
                      handleRouteModerate(route, "approved")
                    }
                    onRejectRoute={(route) =>
                      route.moderation === "pending" &&
                      handleRouteModerate(route, "rejected")
                    }
                    onToggleRouteHidden={(route) => handleRouteToggleHidden(route)}
                    onDestroyRoute={(route) => handleDestroyRoute(route)}
                  />
                )}

                {view === "activity" && (
                  <AdminActivityView
                    activity={activity}
                    loadingActivity={loadingActivity}
                    error={error}
                    activityAction={activityAction}
                    setActivityAction={setActivityAction}
                    activityActorInput={activityActorInput}
                    setActivityActorInput={setActivityActorInput}
                    activityDateFrom={activityDateFrom}
                    setActivityDateFrom={setActivityDateFrom}
                    activityDateTo={activityDateTo}
                    setActivityDateTo={setActivityDateTo}
                    onApplyFilter={applyActivityFilter}
                    onReset={resetActivityFilter}
                  />
                )}

                {view === "reports" && (
                  <AdminReportsView
                    reports={reports}
                    loadingReports={loadingReports}
                    onResolve={handleResolveReport}
                  />
                )}

                {view === "bans" && (
                  <AdminBansView
                    bans={bans}
                    loadingBans={loadingBans}
                    error={error}
                    banInput={banInput}
                    setBanInput={setBanInput}
                    banReason={banReason}
                    setBanReason={setBanReason}
                    banNotice={banNotice}
                    onBan={handleBan}
                    onUnban={handleUnban}
                  />
                )}

                {view === "moderators" && (
                  <AdminModeratorsView
                    moderators={moderators}
                    loadingModerators={loadingModerators}
                    moderatorEmail={moderatorEmail}
                    setModeratorEmail={setModeratorEmail}
                    moderatorBusy={moderatorBusy}
                    moderatorError={moderatorError}
                    moderatorNotice={moderatorNotice}
                    onAddModerator={handleAddModerator}
                    onRemoveModerator={handleRemoveModerator}
                  />
                )}

                {view === "settings" && draft && (
                  <AdminSettingsView
                    draft={draft}
                    setDraft={setDraft}
                    savingSettings={savingSettings}
                    settingsSaved={settingsSaved}
                    settingsError={settingsError}
                    onSubmit={handleSaveSettings}
                    onDeleteMap={() => setConfirmDeleteMap(true)}
                    activeMap={activeMap}
                  />
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
  );
}

export function AdminSpotRow({
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
          <h4>Rich content</h4>
          <AdminField label="Price level">
            <select
              value={editSpot.priceLevel === null || editSpot.priceLevel === undefined ? "" : editSpot.priceLevel}
              onChange={(e) =>
                onEditChange({
                  ...editSpot,
                  priceLevel: e.target.value ? Number(e.target.value) : null,
                })
              }
            >
              <option value="">Not set</option>
              <option value="0">$ — cheap</option>
              <option value="1">$$ — moderate</option>
              <option value="2">$$$ — upscale</option>
              <option value="3">$$$$ — premium</option>
            </select>
          </AdminField>
          <AdminField label="Hours">
            <input
              value={editSpot.hoursNote ?? ""}
              onChange={(e) =>
                onEditChange({ ...editSpot, hoursNote: e.target.value })
              }
              placeholder="e.g. Mon–Fri 08:00–18:00"
            />
          </AdminField>
          <AdminField label="Tags">
            <input
              value={(editSpot.tags ?? []).join(", ")}
              onChange={(e) =>
                onEditChange({
                  ...editSpot,
                  tags: e.target.value
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .slice(0, 8),
                })
              }
              placeholder="Comma separated"
            />
          </AdminField>
          <AdminField label="Insider tip">
            <textarea
              rows={2}
              value={editSpot.tip ?? ""}
              onChange={(e) =>
                onEditChange({ ...editSpot, tip: e.target.value })
              }
              placeholder="e.g. best time to visit"
            />
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
          {spot.priceLevel !== null && spot.priceLevel !== undefined && (
            <span className="admin-spot-meta-chip">
              {"$".repeat(Math.max(1, spot.priceLevel + 1))}
            </span>
          )}
          {spot.tags && spot.tags.length > 0 && (
            <span className="admin-spot-meta-chip">
              {spot.tags.join(", ")}
            </span>
          )}
          {spot.tip && <span className="admin-spot-meta-chip">💡 {spot.tip}</span>}
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

export function ZoneAdminRow({
  zone,
  editing,
  editZone,
  onStartEdit,
  onEditChange,
  onCancelEdit,
  onSaveEdit,
  onApprove,
  onReject,
  onToggleHidden,
  onDestroy,
}: {
  zone: Zone;
  editing: boolean;
  editZone: Zone | null;
  onStartEdit: (z: Zone) => void;
  onEditChange: (z: Zone) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onToggleHidden: () => void;
  onDestroy: () => void;
}) {
  const pending = zone.moderation === "pending";

  if (editing && editZone) {
    return (
      <li className="admin-spot edit">
        <div className="admin-edit-grid">
          <AdminField label="Name">
            <input
              value={editZone.name}
              onChange={(e) => onEditChange({ ...editZone, name: e.target.value })}
            />
          </AdminField>
          <AdminField label="Description">
            <input
              value={editZone.description ?? ""}
              onChange={(e) =>
                onEditChange({ ...editZone, description: e.target.value })
              }
            />
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
    <li className={`admin-spot ${pending ? "pending" : ""} ${zone.hidden ? "hidden" : ""}`}>
      <div className="admin-spot-main">
        <div className="admin-spot-title">
          <span
            className="admin-color-swatch"
            style={{ background: zone.color ? getMarkerColor(zone.color) : "#888" }}
          />
          <span className="admin-spot-name">{zone.name}</span>
          <span className="admin-spot-chip">{zone.shape}</span>
          <span className={`admin-spot-chip ${zone.moderation ?? "legacy"}`}>
            {zone.moderation ?? "visible"}
          </span>
          {zone.hidden && <span className="admin-spot-chip hidden">hidden</span>}
        </div>
        <div className="admin-spot-sub">
          {zone.shape === "polygon"
            ? `${zone.points?.length ?? 0} vertices`
            : `circle r=${Math.round(zone.radius ?? 0)}m`}
          {zone.createdAt && ` · ${new Date(zone.createdAt).toLocaleDateString()}`}
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
        <button type="button" className="action-btn2" onClick={() => onStartEdit(zone)}>
          Edit
        </button>
        <button type="button" className="action-btn2" onClick={onToggleHidden}>
          {zone.hidden ? "Restore" : "Hide"}
        </button>
        <button
          type="button"
          className="icon-btn danger"
          onClick={onDestroy}
          aria-label="Destroy zone"
        >
          <IconTrash size={16} />
        </button>
      </div>
    </li>
  );
}

export function RouteAdminRow({
  route,
  editing,
  editRoute,
  onStartEdit,
  onEditChange,
  onCancelEdit,
  onSaveEdit,
  onApprove,
  onReject,
  onToggleHidden,
  onDestroy,
}: {
  route: Route;
  editing: boolean;
  editRoute: Route | null;
  onStartEdit: (r: Route) => void;
  onEditChange: (r: Route) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onToggleHidden: () => void;
  onDestroy: () => void;
}) {
  const pending = route.moderation === "pending";

  if (editing && editRoute) {
    return (
      <li className="admin-spot edit">
        <div className="admin-edit-grid">
          <AdminField label="Name">
            <input
              value={editRoute.name}
              onChange={(e) => onEditChange({ ...editRoute, name: e.target.value })}
            />
          </AdminField>
          <AdminField label="Description">
            <input
              value={editRoute.description ?? ""}
              onChange={(e) =>
                onEditChange({ ...editRoute, description: e.target.value })
              }
            />
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
    <li className={`admin-spot ${pending ? "pending" : ""} ${route.hidden ? "hidden" : ""}`}>
      <div className="admin-spot-main">
        <div className="admin-spot-title">
          <span
            className="admin-color-swatch"
            style={{ background: route.color ? getMarkerColor(route.color) : "#888" }}
          />
          <span className="admin-spot-name">{route.name}</span>
          <span className="admin-spot-chip">route</span>
          <span className={`admin-spot-chip ${route.moderation ?? "legacy"}`}>
            {route.moderation ?? "visible"}
          </span>
          {route.hidden && <span className="admin-spot-chip hidden">hidden</span>}
        </div>
        <div className="admin-spot-sub">
          {`${route.points?.length ?? 0} points`}
          {route.createdAt && ` · ${new Date(route.createdAt).toLocaleDateString()}`}
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
        <button type="button" className="action-btn2" onClick={() => onStartEdit(route)}>
          Edit
        </button>
        <button type="button" className="action-btn2" onClick={onToggleHidden}>
          {route.hidden ? "Restore" : "Hide"}
        </button>
        <button
          type="button"
          className="icon-btn danger"
          onClick={onDestroy}
          aria-label="Destroy route"
        >
          <IconTrash size={16} />
        </button>
      </div>
    </li>
  );
}

export function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
