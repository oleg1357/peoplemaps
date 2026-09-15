"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { selectInputCls } from "@/lib/utils";
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
  updateMapModerator,
  removeMapModerator,
  fetchAdminReports,
  resolveReport,
  fetchAdminBans,
  banUser,
  unbanUser,
  moderateSpotsBatch,
  moderateZonesBatch,
  moderateRoutesBatch,
  exportMapBlob,
  fetchMapContributors,
  fetchBillingStatus,
  createCheckoutSession,
  createPortalSession,
  backendLive,
  type AdminMapEntry,
  type AdminSpotList,
  type AdminZoneList,
  type AdminRouteList,
  type ActivityEntryApi,
  type ActivityFilter,
  type AdminReport,
  type BillingStatus,
  type MapSettingsInput,
  type MapRoleEntry,
  type BatchModerationAction,
} from "@/lib/api-client";
import type { Spot, Zone, Route, MapBan, MapContributorEntry } from "@/lib/types";
import {
  ALL_CAPABILITIES,
  ROLE_CAPABILITIES,
  type MapCapability,
} from "@/lib/roles";
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
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import AdminCreateMap from "./admin/AdminCreateMap";
import AdminSpotView from "./admin/AdminSpotView";
import AdminZonesView from "./admin/AdminZonesView";
import AdminActivityView from "./admin/AdminActivityView";
import AdminReportsView from "./admin/AdminReportsView";
import AdminBansView from "./admin/AdminBansView";
import AdminModeratorsView from "./admin/AdminModeratorsView";
import AdminSettingsView from "./admin/AdminSettingsView";
import AdminContributorsView from "./admin/AdminContributorsView";

interface EditState {
  spot: Spot;
}

const DEFAULT_BASE = { lat: 55.6761, lng: 12.5683 };

export { selectInputCls };

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

export function AdminPanel({ initialMapId }: { initialMapId?: string | null }) {
  const { user } = useAuth();
  const [maps, setMaps] = useState<AdminMapEntry[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingMaps, setLoadingMaps] = useState(true);
  const [mapsError, setMapsError] = useState("");

  const [activeMap, setActiveMap] = useState<AdminMapEntry | null>(null);
  const [view, setView] = useState<"spots" | "zones" | "activity" | "reports" | "bans" | "settings" | "moderators" | "contributors">("spots");
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
  const [moderatorBusy, setModeratorBusy] = useState(false);
  const [moderatorError, setModeratorError] = useState("");
  const [moderatorNotice, setModeratorNotice] = useState("");

  const [creatorFilter, setCreatorFilter] = useState<string | null>(null);
  const [contributors, setContributors] = useState<MapContributorEntry[]>([]);
  const [loadingContributors, setLoadingContributors] = useState(false);

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

  // Free-tier quota + subscription state.
  const [billing, setBilling] = useState<BillingStatus>({
    plan: "free",
    isPaid: !backendLive,
    subscriptionStatus: null,
    publicMapCount: 0,
    freePublicLimit: 3,
    paddleConfigured: false,
  });
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [manageBusy, setManageBusy] = useState(false);

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
        setActiveMap((prev) => {
          const requested =
            prev && res.maps.some((m) => m._id === prev._id)
              ? prev
              : initialMapId
                ? res.maps.find((m) => m._id === initialMapId) ?? res.maps[0]
                : res.maps[0];
          return requested;
        });
      } else {
        setActiveMap(null);
      }
    } catch {
      setMapsError("Could not load your maps. Are you a map owner?");
      setLoadingMaps(false);
    }
  }, [initialMapId]);

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
        if (res.maps.length > 0) {
          const target = initialMapId
            ? res.maps.find((m) => m._id === initialMapId)
            : undefined;
          setActiveMap(target ?? res.maps[0]);
        } else setActiveMap(null);
      })
      .catch(() => {
        if (!active) return;
        setMapsError("Could not load your maps. Are you a map owner?");
        setLoadingMaps(false);
      });
    return () => {
      active = false;
    };
  }, [user, initialMapId]);

  // Load the free-tier quota + subscription state once signed in.
  useEffect(() => {
    if (!user || !backendLive) return;
    let active = true;
    fetchBillingStatus()
      .then((b) => {
        if (!active) return;
        setBilling(b);
      })
      .catch(() => {
        if (!active) return;
        // Keep the free defaults on failure; the server still enforces limits.
      });
    return () => {
      active = false;
    };
  }, [user]);

  // Redirect the user to Paddle hosted checkout to subscribe to Pro.
  const handleUpgrade = async () => {
    if (upgradeBusy) return;
    setUpgradeBusy(true);
    setCreateError("");
    try {
      const { url } = await createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      setCreateError((err as Error).message || "Could not start checkout.");
    } finally {
      setUpgradeBusy(false);
    }
  };

  // Open Paddle's customer portal to cancel / update payment details.
  const handleManageSubscription = async () => {
    if (manageBusy) return;
    setManageBusy(true);
    try {
      const { url } = await createPortalSession();
      window.location.href = url;
    } catch (err) {
      setCreateError((err as Error).message || "Could not open billing.");
    } finally {
      setManageBusy(false);
    }
  };

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

  // Capabilities derived from the caller's standing on the active map. Owners
  // and global admins have everything; the admin-maps API surfaces the caller's
  // exact (fully granular) grants as `activeMap.caps` — see lib/roles.ts.
  const caps: readonly MapCapability[] =
    activeMap?.caps ??
    (isAdmin || !activeMap?.role || activeMap.role === "owner"
      ? ALL_CAPABILITIES
      : ROLE_CAPABILITIES[activeMap.role]);
  const canExport = caps.includes("export");
  const canApprove = caps.includes("approve");
  const canModerate = caps.includes("moderate");
  const canStaff = caps.includes("staff");

  const loadModerators = useCallback(async (mapId: string) => {
    setLoadingModerators(true);
    setModeratorError("");
    try {
      const res = await fetchMapModerators(mapId);
      setModerators(res?.members ?? []);
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

  const loadContributors = useCallback(async (mapId: string) => {
    setLoadingContributors(true);
    try {
      setContributors(await fetchMapContributors(mapId));
    } catch (e) {
      setError((e as Error).message || "Failed to load contributors");
      setContributors([]);
    } finally {
      setLoadingContributors(false);
    }
  }, []);

  useEffect(() => {
    if (activeMap && view === "contributors") loadContributors(activeMap._id);
  }, [activeMap, view, loadContributors]);

  const handleAddModerator = async (
    email: string,
    role: import("@/lib/roles").MapRoleType,
    capabilities?: MapCapability[]
  ) => {
    if (!activeMap || !email.trim() || moderatorBusy) return;
    setModeratorBusy(true);
    setModeratorError("");
    setModeratorNotice("");
    try {
      const res = await addMapModerator(
        activeMap._id,
        email.trim(),
        role,
        capabilities
      );
      setModerators(res.members);
      setModeratorNotice("Team member added.");
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

  const handleUpdateModerator = async (
    userId: string,
    patch: { role: import("@/lib/roles").MapRoleType; capabilities: MapCapability[] }
  ) => {
    if (!activeMap) return;
    setModeratorError("");
    setModeratorNotice("");
    try {
      const res = await updateMapModerator(activeMap._id, userId, patch);
      setModerators(res.members);
      setModeratorNotice("Team member updated.");
    } catch (err) {
      setModeratorError((err as Error).message || "Failed to update team member.");
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

  const runPendingBatch = async (
    fn: (mapId: string, ids: string[], action: BatchModerationAction) => Promise<void>,
    ids: string[],
    action: BatchModerationAction
  ) => {
    if (!activeMap || ids.length === 0) return;
    setError("");
    try {
      await fn(activeMap._id, ids, action);
      await refresh();
    } catch (e) {
      setError((e as Error).message || "Batch action failed");
    }
  };

  const handleBatchSpots = (action: BatchModerationAction, ids: string[]) =>
    runPendingBatch(moderateSpotsBatch, ids, action);

  const pendingZoneIds = () =>
    (zoneData?.zones ?? [])
      .filter((z) => z.moderation === "pending")
      .map((z) => z._id as string);
  const pendingRouteIds = () =>
    (routeData?.routes ?? [])
      .filter((r) => r.moderation === "pending")
      .map((r) => r._id as string);

  const handleApproveAllPendingZones = () =>
    runPendingBatch(moderateZonesBatch, pendingZoneIds(), "approve");
  const handleRejectAllPendingZones = () =>
    runPendingBatch(moderateZonesBatch, pendingZoneIds(), "reject");
  const handleApproveAllPendingRoutes = () =>
    runPendingBatch(moderateRoutesBatch, pendingRouteIds(), "approve");
  const handleRejectAllPendingRoutes = () =>
    runPendingBatch(moderateRoutesBatch, pendingRouteIds(), "reject");

  const handleExport = async (format: "geojson" | "csv") => {
    if (!activeMap) return;
    try {
      await exportMapBlob(activeMap._id, format);
    } catch (e) {
      setError((e as Error).message || "Export failed");
    }
  };

  const handleFilterByCreator = (userId: string | null) => {
    setCreatorFilter(userId === null ? "" : userId);
    setView("spots");
    setEdit(null);
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
        <div className="admin-head flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <h1 className="font-heading text-2xl font-bold tracking-tight">Map Admin</h1>
            <p className="text-sm text-muted-foreground">
              Create maps, moderate spots, customise markers and manage settings.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setCreating((c) => !c);
              setCreateError("");
            }}
          >
            <IconPlus size={16} /> {creating ? "Cancel" : "Create map"}
          </Button>
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
            isPaid={billing.isPaid}
            publicMapCount={billing.publicMapCount}
            freePublicLimit={billing.freePublicLimit}
            upgradeBusy={upgradeBusy}
            onUpgrade={handleUpgrade}
            manageBusy={manageBusy}
            onManage={handleManageSubscription}
          />
        )}

        {createdMap && (
          <div className="flex items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
            <IconLink size={16} />
            <code className="truncate">{permalink(createdMap)}</code>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="ml-auto shrink-0"
              onClick={() => copyLink(permalink(createdMap))}
            >
              {copied ? "Copied!" : "Copy link"}
            </Button>
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
            <div className="mb-4 flex flex-wrap gap-2">
              {maps.map((m) => (
                <button
                  key={m._id}
                  type="button"
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    activeMap?._id === m._id
                      ? "border-transparent bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground hover:border-primary"
                  }`}
                  onClick={() => {
                    setActiveMap(m);
                    setView("spots");
                    setEdit(null);
                    setCreatorFilter(null);
                  }}
                >
                  <MarkerPreview
                    emoji={m.defaultMarker}
                    color={m.defaultMarkerColor}
                    size={18}
                  />
                  {m.title}
                  {m.role && m.role !== "owner" && (
                    <span
                      className={`rounded-full px-1.5 py-px text-[10px] font-bold tracking-wider uppercase ${
                        activeMap?._id === m._id
                          ? "bg-white/20 text-white"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {m.role}
                    </span>
                  )}
                  {m.spotPending > 0 && (
                    <span
                      className={`min-w-5 rounded-full px-1.5 text-center text-[11px] font-bold ${
                        activeMap?._id === m._id
                          ? "bg-white/25 text-white"
                          : "bg-primary text-primary-foreground"
                      }`}
                    >
                      {m.spotPending}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {activeMap && (
              <>
                <div className="mb-4 flex flex-wrap gap-1 border-b">
                  <button
                    type="button"
                    className={`-mb-px border-b-2 px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                      view === "spots"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => {
                      setView("spots");
                      setEdit(null);
                    }}
                  >
                    Spots
                  </button>
                  <button
                    type="button"
                    className={`-mb-px border-b-2 px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                      view === "zones"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
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
                    className={`-mb-px border-b-2 px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                      view === "activity"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setView("activity")}
                  >
                    Activity
                  </button>
                  <button
                    type="button"
                    className={`-mb-px border-b-2 px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                      view === "reports"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setView("reports")}
                  >
                    Reports
                  </button>
                  <button
                    type="button"
                    className={`-mb-px border-b-2 px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                      view === "bans"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setView("bans")}
                  >
                    Bans
                  </button>
                  <button
                    type="button"
                    className={`-mb-px border-b-2 px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                      view === "contributors"
                        ? "border-primary text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setView("contributors")}
                  >
                    Contributors
                  </button>
                  {canManageMap && (
                    <button
                      type="button"
                      className={`-mb-px border-b-2 px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                        view === "moderators"
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setView("moderators")}
                    >
                      Moderators
                    </button>
                  )}
                  {canManageMap && (
                    <button
                      type="button"
                      className={`-mb-px border-b-2 px-2.5 py-1.5 text-sm font-semibold transition-colors ${
                        view === "settings"
                          ? "border-primary text-foreground"
                          : "border-transparent text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setView("settings")}
                    >
                      Settings
                    </button>
                  )}
                </div>

                {view === "spots" && (
                  <>
                    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card px-3 py-2 text-sm shadow-sm">
                      <span className="text-muted-foreground">Permalink:</span>
                      <code className="truncate">{permalink(activeMap)}</code>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="ml-auto shrink-0"
                        onClick={() => copyLink(permalink(activeMap))}
                      >
                        {copied ? "Copied!" : "Copy"}
                      </Button>
                      {backendLive && canExport && (
                        <>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleExport("geojson")}
                          >
                            Export GeoJSON
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleExport("csv")}
                          >
                            Export CSV
                          </Button>
                        </>
                      )}
                    </div>
                    <AdminSpotView
                      activeMap={activeMap}
                      data={data}
                      loadingSpots={loadingSpots}
                      error={error}
                      edit={edit}
                      creatorFilter={creatorFilter}
                      onClearCreatorFilter={() => setCreatorFilter(null)}
                      onBatch={handleBatchSpots}
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
                      canApprove={canApprove}
                      canModerate={canModerate}
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
                    onApproveAllPendingZones={handleApproveAllPendingZones}
                    onRejectAllPendingZones={handleRejectAllPendingZones}
                    onApproveAllPendingRoutes={handleApproveAllPendingRoutes}
                    onRejectAllPendingRoutes={handleRejectAllPendingRoutes}
                    canApprove={canApprove}
                    canModerate={canModerate}
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
                    canStaff={canStaff}
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
                    canStaff={canStaff}
                  />
                )}

                {view === "moderators" && (
                  <AdminModeratorsView
                    moderators={moderators}
                    loadingModerators={loadingModerators}
                    moderatorBusy={moderatorBusy}
                    moderatorError={moderatorError}
                    moderatorNotice={moderatorNotice}
                    onAddModerator={handleAddModerator}
                    onRemoveModerator={handleRemoveModerator}
                    onUpdateModerator={handleUpdateModerator}
                  />
                )}

                {view === "contributors" && (
                  <AdminContributorsView
                    contributors={contributors}
                    loading={loadingContributors}
                    error={error}
                    onFilterByCreator={handleFilterByCreator}
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
          <Dialog open onOpenChange={(open) => !open && setConfirmDestroy(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Destroy this spot?</DialogTitle>
                <DialogDescription>
                  This permanently deletes <b>{confirmDestroy.name}</b> and all
                  of its reviews, photos and comments. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDestroy(null)}
                >
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={handleDestroy}>
                  <IconTrash size={15} /> Destroy
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {confirmDeleteMap && activeMap && (
          <Dialog
            open
            onOpenChange={(open) => !open && setConfirmDeleteMap(false)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete “{activeMap.title}”?</DialogTitle>
                <DialogDescription>
                  This permanently deletes the map and every spot, review, photo
                  and comment on it. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDeleteMap(false)}
                >
                  Cancel
                </Button>
                <Button type="button" variant="destructive" onClick={handleDeleteMap}>
                  <IconTrash size={15} /> Delete map
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
  );
}

export function AdminSpotRow({
  spot,
  map,
  editing,
  editSpot,
  selectable,
  selected,
  onToggleSelect,
  onStartEdit,
  onEditChange,
  onCancelEdit,
  onSaveEdit,
  onApprove,
  onReject,
  onToggleHidden,
  onDestroy,
  canApprove,
  canModerate,
}: {
  spot: Spot;
  map: AdminMapEntry;
  editing: boolean;
  editSpot: Spot | null;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  onStartEdit: (s: Spot) => void;
  onEditChange: (s: Spot) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onToggleHidden: () => void;
  onDestroy: () => void;
  canApprove?: boolean;
  canModerate?: boolean;
}) {
  const pending = spot.moderation === "pending";

  if (editing && editSpot) {
    return (
      <li className="admin-spot edit">
        <div className="admin-edit-grid">
          <AdminField label="Name">
            <Input
              value={editSpot.name}
              onChange={(e) => onEditChange({ ...editSpot, name: e.target.value })}
            />
          </AdminField>
          <AdminField label="Street">
            <Input
              value={editSpot.street}
              onChange={(e) => onEditChange({ ...editSpot, street: e.target.value })}
            />
          </AdminField>
          <AdminField label="City">
            <Input
              value={editSpot.city}
              onChange={(e) => onEditChange({ ...editSpot, city: e.target.value })}
            />
          </AdminField>
          <AdminField label="ZIP">
            <Input
              type="number"
              value={editSpot.zip}
              onChange={(e) => onEditChange({ ...editSpot, zip: Number(e.target.value) })}
            />
          </AdminField>
          <AdminField label="Lat">
            <Input
              type="number"
              step="any"
              value={editSpot.lat}
              onChange={(e) => onEditChange({ ...editSpot, lat: Number(e.target.value) })}
            />
          </AdminField>
          <AdminField label="Lng">
            <Input
              type="number"
              step="any"
              value={editSpot.lng}
              onChange={(e) => onEditChange({ ...editSpot, lng: Number(e.target.value) })}
            />
          </AdminField>
          <AdminField label="Status">
            <select
              className={selectInputCls}
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
              className={selectInputCls}
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
            <Input
              value={editSpot.hoursNote ?? ""}
              onChange={(e) =>
                onEditChange({ ...editSpot, hoursNote: e.target.value })
              }
              placeholder="e.g. Mon–Fri 08:00–18:00"
            />
          </AdminField>
          <AdminField label="Tags">
            <Input
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
            <Textarea
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
          <Button type="button" size="sm" onClick={onSaveEdit}>
            <IconCheck size={15} /> Save
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancelEdit}>
            Cancel
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className={`admin-spot ${pending ? "pending" : ""} ${spot.hidden ? "hidden" : ""}`}>
      <div className="admin-spot-main">
        {selectable && (
          <label className="admin-select-check" onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              checked={Boolean(selected)}
              onChange={onToggleSelect}
              aria-label={`Select ${spot.name}`}
            />
          </label>
        )}
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
        {pending && canApprove !== false && (
          <>
            <Button type="button" size="sm" onClick={onApprove}>
              <IconCheck size={15} /> Approve
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={onReject}>
              <IconX size={15} /> Reject
            </Button>
          </>
        )}
        {canModerate !== false && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onStartEdit(spot)}
            >
              Edit
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onToggleHidden}
            >
              {spot.hidden ? "Restore" : "Hide"}
            </Button>
            <Button
              type="button"
              size="icon-sm"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onDestroy}
              aria-label="Destroy spot"
            >
              <IconTrash size={16} />
            </Button>
          </>
        )}
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
  canApprove,
  canModerate,
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
  canApprove?: boolean;
  canModerate?: boolean;
}) {
  const pending = zone.moderation === "pending";

  if (editing && editZone) {
    return (
      <li className="admin-spot edit">
        <div className="admin-edit-grid">
          <AdminField label="Name">
            <Input
              value={editZone.name}
              onChange={(e) => onEditChange({ ...editZone, name: e.target.value })}
            />
          </AdminField>
          <AdminField label="Description">
            <Input
              value={editZone.description ?? ""}
              onChange={(e) =>
                onEditChange({ ...editZone, description: e.target.value })
              }
            />
          </AdminField>
        </div>
        <div className="admin-row-actions">
          <Button type="button" size="sm" onClick={onSaveEdit}>
            <IconCheck size={15} /> Save
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancelEdit}>
            Cancel
          </Button>
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
        {pending && canApprove !== false && (
          <>
            <Button type="button" size="sm" onClick={onApprove}>
              <IconCheck size={15} /> Approve
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={onReject}>
              <IconX size={15} /> Reject
            </Button>
          </>
        )}
        {canModerate !== false && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onStartEdit(zone)}
            >
              Edit
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onToggleHidden}>
              {zone.hidden ? "Restore" : "Hide"}
            </Button>
          </>
        )}
        {canModerate !== false && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDestroy}
            aria-label="Destroy zone"
          >
            <IconTrash size={16} />
          </Button>
        )}
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
  canApprove,
  canModerate,
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
  canApprove?: boolean;
  canModerate?: boolean;
}) {
  const pending = route.moderation === "pending";

  if (editing && editRoute) {
    return (
      <li className="admin-spot edit">
        <div className="admin-edit-grid">
          <AdminField label="Name">
            <Input
              value={editRoute.name}
              onChange={(e) => onEditChange({ ...editRoute, name: e.target.value })}
            />
          </AdminField>
          <AdminField label="Description">
            <Input
              value={editRoute.description ?? ""}
              onChange={(e) =>
                onEditChange({ ...editRoute, description: e.target.value })
              }
            />
          </AdminField>
        </div>
        <div className="admin-row-actions">
          <Button type="button" size="sm" onClick={onSaveEdit}>
            <IconCheck size={15} /> Save
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={onCancelEdit}>
            Cancel
          </Button>
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
        {pending && canApprove !== false && (
          <>
            <Button type="button" size="sm" onClick={onApprove}>
              <IconCheck size={15} /> Approve
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={onReject}>
              <IconX size={15} /> Reject
            </Button>
          </>
        )}
        {canModerate !== false && (
          <>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onStartEdit(route)}
            >
              Edit
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={onToggleHidden}>
              {route.hidden ? "Restore" : "Hide"}
            </Button>
          </>
        )}
        {canModerate !== false && (
          <Button
            type="button"
            size="icon-sm"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            onClick={onDestroy}
            aria-label="Destroy route"
          >
            <IconTrash size={16} />
          </Button>
        )}
      </div>
    </li>
  );
}

export function AdminField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted-foreground">
      <span>{label}</span>
      {children}
    </label>
  );
}
