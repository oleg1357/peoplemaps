"use client";

import type { AdminMapEntry, AdminSpotList } from "@/lib/api-client";
import type { Spot } from "@/lib/types";
import { AdminSpotRow } from "../AdminPanel";

export default function AdminSpotView({
  activeMap,
  data,
  loadingSpots,
  error,
  edit,
  onStartEdit,
  onEditChange,
  onCancelEdit,
  onSaveEdit,
  onApprove,
  onReject,
  onToggleHidden,
  onDestroy,
}: {
  activeMap: AdminMapEntry;
  data: AdminSpotList | null;
  loadingSpots: boolean;
  error: string;
  edit: { spot: Spot } | null;
  onStartEdit: (s: Spot) => void;
  onEditChange: (s: Spot) => void;
  onCancelEdit: () => void;
  onSaveEdit: () => void;
  onApprove: (s: Spot) => void;
  onReject: (s: Spot) => void;
  onToggleHidden: (s: Spot) => void;
  onDestroy: (s: Spot) => void;
}) {
  return (
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
                  map={activeMap}
                  editing={edit?.spot._id === spot._id}
                  editSpot={edit?.spot ?? null}
                  onStartEdit={(s) => onStartEdit(s)}
                  onEditChange={onEditChange}
                  onCancelEdit={onCancelEdit}
                  onSaveEdit={onSaveEdit}
                  onApprove={() =>
                    spot.moderation === "pending" && onApprove(spot)
                  }
                  onReject={() =>
                    spot.moderation === "pending" && onReject(spot)
                  }
                  onToggleHidden={() => onToggleHidden(spot)}
                  onDestroy={() => onDestroy(spot)}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
