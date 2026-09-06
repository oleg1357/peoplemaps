"use client";

import type { AdminZoneList, AdminRouteList } from "@/lib/api-client";
import { backendLive } from "@/lib/api-client";
import type { Zone, Route } from "@/lib/types";
import { ZoneAdminRow, RouteAdminRow } from "../AdminPanel";

export default function AdminZonesView({
  zoneData,
  routeData,
  loadingZones,
  loadingRoutes,
  error,
  zoneEdit,
  setZoneEdit,
  routeEdit,
  setRouteEdit,
  onStartZoneEdit,
  onSaveZoneEdit,
  onApproveZone,
  onRejectZone,
  onToggleZoneHidden,
  onDestroyZone,
  onStartRouteEdit,
  onSaveRouteEdit,
  onApproveRoute,
  onRejectRoute,
  onToggleRouteHidden,
  onDestroyRoute,
  onApproveAllPendingZones,
  onRejectAllPendingZones,
  onApproveAllPendingRoutes,
  onRejectAllPendingRoutes,
}: {
  zoneData: AdminZoneList | null;
  routeData: AdminRouteList | null;
  loadingZones: boolean;
  loadingRoutes: boolean;
  error: string;
  zoneEdit: Zone | null;
  setZoneEdit: (z: Zone | null) => void;
  routeEdit: Route | null;
  setRouteEdit: (r: Route | null) => void;
  onStartZoneEdit: (z: Zone) => void;
  onSaveZoneEdit: () => void;
  onApproveZone: (z: Zone) => void;
  onRejectZone: (z: Zone) => void;
  onToggleZoneHidden: (z: Zone) => void;
  onDestroyZone: (z: Zone) => void;
  onStartRouteEdit: (r: Route) => void;
  onSaveRouteEdit: () => void;
  onApproveRoute: (r: Route) => void;
  onRejectRoute: (r: Route) => void;
  onToggleRouteHidden: (r: Route) => void;
  onDestroyRoute: (r: Route) => void;
  onApproveAllPendingZones: () => void;
  onRejectAllPendingZones: () => void;
  onApproveAllPendingRoutes: () => void;
  onRejectAllPendingRoutes: () => void;
}) {
  return (
    <div className="admin-section">
      <h3>Zones &amp; routes</h3>
      <p className="muted">
        Approve, hide, edit or remove the zones and routes people
        have drawn on this map.
      </p>
      <div className="admin-stat-row">
        <div className="admin-stat">
          <b>{zoneData?.total ?? "–"}</b>
          <span>Zones</span>
        </div>
        <div className="admin-stat pending">
          <b>{zoneData?.pending ?? "–"}</b>
          <span>Pending</span>
        </div>
        <div className="admin-stat hidden">
          <b>{zoneData?.hidden ?? "–"}</b>
          <span>Hidden</span>
        </div>
        <div className="admin-stat">
          <b>{routeData?.total ?? "–"}</b>
          <span>Routes</span>
        </div>
        <div className="admin-stat pending">
          <b>{routeData?.pending ?? "–"}</b>
          <span>Pending</span>
        </div>
        <div className="admin-stat hidden">
          <b>{routeData?.hidden ?? "–"}</b>
          <span>Hidden</span>
        </div>
      </div>

      {error && <p className="auth-error">{error}</p>}

      {loadingZones || loadingRoutes ? (
        <p className="muted">Loading zones and routes…</p>
      ) : (
        <>
          <h4 className="admin-subheading">Zones</h4>
          {backendLive && zoneData && (zoneData.pending > 0 || zoneData.zones.length > 0) && (
            <div className="admin-moderation-row" style={{ margin: "8px 0 12px" }}>
              {zoneData.pending > 0 && (
                <>
                  <button type="button" className="action-btn" onClick={onApproveAllPendingZones}>
                    Approve all {zoneData.pending} pending zones
                  </button>
                  <button type="button" className="action-btn reject" onClick={onRejectAllPendingZones}>
                    Reject all pending zones
                  </button>
                </>
              )}
            </div>
          )}
          {zoneData && zoneData.zones.length === 0 ? (
            <p className="empty-state">No zones on this map yet.</p>
          ) : (
            <ul className="admin-spot-list">
              {zoneData &&
                zoneData.zones.map((zone) => (
                  <ZoneAdminRow
                    key={zone._id}
                    zone={zone}
                    editing={zoneEdit?._id === zone._id}
                    editZone={zoneEdit ?? null}
                    onStartEdit={onStartZoneEdit}
                    onEditChange={setZoneEdit}
                    onCancelEdit={() => setZoneEdit(null)}
                    onSaveEdit={onSaveZoneEdit}
                    onApprove={() =>
                      zone.moderation === "pending" && onApproveZone(zone)
                    }
                    onReject={() =>
                      zone.moderation === "pending" && onRejectZone(zone)
                    }
                    onToggleHidden={() => onToggleZoneHidden(zone)}
                    onDestroy={() => onDestroyZone(zone)}
                  />
                ))}
            </ul>
          )}

          <h4 className="admin-subheading">Routes</h4>
          {backendLive && routeData && (routeData.pending > 0 || routeData.routes.length > 0) && (
            <div className="admin-moderation-row" style={{ margin: "8px 0 12px" }}>
              {routeData.pending > 0 && (
                <>
                  <button type="button" className="action-btn" onClick={onApproveAllPendingRoutes}>
                    Approve all {routeData.pending} pending routes
                  </button>
                  <button type="button" className="action-btn reject" onClick={onRejectAllPendingRoutes}>
                    Reject all pending routes
                  </button>
                </>
              )}
            </div>
          )}
          {routeData && routeData.routes.length === 0 ? (
            <p className="empty-state">No routes on this map yet.</p>
          ) : (
            <ul className="admin-spot-list">
              {routeData &&
                routeData.routes.map((route) => (
                  <RouteAdminRow
                    key={route._id}
                    route={route}
                    editing={routeEdit?._id === route._id}
                    editRoute={routeEdit ?? null}
                    onStartEdit={onStartRouteEdit}
                    onEditChange={setRouteEdit}
                    onCancelEdit={() => setRouteEdit(null)}
                    onSaveEdit={onSaveRouteEdit}
                    onApprove={() =>
                      route.moderation === "pending" && onApproveRoute(route)
                    }
                    onReject={() =>
                      route.moderation === "pending" && onRejectRoute(route)
                    }
                    onToggleHidden={() => onToggleRouteHidden(route)}
                    onDestroy={() => onDestroyRoute(route)}
                  />
                ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}