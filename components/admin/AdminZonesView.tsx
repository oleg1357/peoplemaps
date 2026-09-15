"use client";

import type { AdminZoneList, AdminRouteList } from "@/lib/api-client";
import { backendLive } from "@/lib/api-client";
import type { Zone, Route } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { ZoneAdminRow, RouteAdminRow } from "../AdminPanel";

function StatCard({ value, label, tone }: { value: number | string; label: string; tone?: "warning" | "danger" }) {
  return (
    <div className="flex flex-col gap-1 rounded-lg border bg-card p-3.5 shadow-sm">
      <b className={`text-2xl leading-none ${tone === "warning" ? "text-warning" : tone === "danger" ? "text-danger" : ""}`}>
        {value}
      </b>
      <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
    </div>
  );
}

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
  canApprove,
  canModerate,
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
  canApprove: boolean;
  canModerate: boolean;
}) {
  return (
    <div className="mt-4">
      <h3 className="mb-1 font-heading text-lg font-semibold">Zones &amp; routes</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Approve, hide, edit or remove the zones and routes people have drawn on
        this map.
      </p>
      <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard value={zoneData?.total ?? "–"} label="Zones" />
        <StatCard value={zoneData?.pending ?? "–"} label="Pending" tone="warning" />
        <StatCard value={zoneData?.hidden ?? "–"} label="Hidden" tone="danger" />
        <StatCard value={routeData?.total ?? "–"} label="Routes" />
        <StatCard value={routeData?.pending ?? "–"} label="Pending" tone="warning" />
        <StatCard value={routeData?.hidden ?? "–"} label="Hidden" tone="danger" />
      </div>

      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      {loadingZones || loadingRoutes ? (
        <p className="text-sm text-muted-foreground">Loading zones and routes…</p>
      ) : (
        <>
          <h4 className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Zones
          </h4>
          {backendLive && zoneData && (zoneData.pending > 0 || zoneData.zones.length > 0) && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {zoneData.pending > 0 && canApprove && (
                <>
                  <Button type="button" size="sm" onClick={onApproveAllPendingZones}>
                    Approve all {zoneData.pending} pending zones
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={onRejectAllPendingZones}>
                    Reject all pending zones
                  </Button>
                </>
              )}
            </div>
          )}
          {zoneData && zoneData.zones.length === 0 ? (
            <p className="text-sm text-muted-foreground">No zones on this map yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
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
                    canApprove={canApprove}
                    canModerate={canModerate}
                  />
                ))}
            </ul>
          )}

          <h4 className="mt-6 mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Routes
          </h4>
          {backendLive && routeData && (routeData.pending > 0 || routeData.routes.length > 0) && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {routeData.pending > 0 && canApprove && (
                <>
                  <Button type="button" size="sm" onClick={onApproveAllPendingRoutes}>
                    Approve all {routeData.pending} pending routes
                  </Button>
                  <Button type="button" size="sm" variant="destructive" onClick={onRejectAllPendingRoutes}>
                    Reject all pending routes
                  </Button>
                </>
              )}
            </div>
          )}
          {routeData && routeData.routes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No routes on this map yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
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
                    canApprove={canApprove}
                    canModerate={canModerate}
                  />
                ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}