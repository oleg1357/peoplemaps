"use client";

import { useMemo, useState } from "react";
import type {
  AdminMapEntry,
  AdminSpotList,
  BatchModerationAction,
} from "@/lib/api-client";
import { backendLive } from "@/lib/api-client";
import type { Spot } from "@/lib/types";
import { AdminSpotRow } from "../AdminPanel";

type StatusFilter = "all" | "pending" | "approved" | "rejected" | "hidden";

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
  onBatch,
  creatorFilter,
  onClearCreatorFilter,
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
  onBatch: (action: BatchModerationAction, ids: string[]) => void;
  creatorFilter?: string | null;
  onClearCreatorFilter?: () => void;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");

  const allSpots = useMemo(() => data?.spots ?? [], [data]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allSpots.filter((spot) => {
      if (creatorFilter) {
        const key = spot.createdBy ?? null;
        const want = creatorFilter === "" ? null : creatorFilter;
        if (key !== want) return false;
      }
      if (statusFilter === "pending" && spot.moderation !== "pending") return false;
      if (statusFilter === "approved" && spot.moderation !== "approved") return false;
      if (statusFilter === "rejected" && spot.moderation !== "rejected") return false;
      if (statusFilter === "hidden" && !spot.hidden) return false;
      if (q) {
        const hay = [spot.name, spot.street, spot.city, (spot.tags ?? []).join(" "), spot.tip ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allSpots, creatorFilter, statusFilter, search]);

  const filteredIds = useMemo(() => filtered.map((s) => s._id as string), [filtered]);
  const allSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));

  const toggleAll = () => {
    setSelected((prev) => {
      if (allSelected) {
        const next = new Set(prev);
        filteredIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      filteredIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const runBatch = (action: BatchModerationAction) => {
    const ids = [...selected];
    if (ids.length === 0) return;
    onBatch(action, ids);
    setSelected(new Set());
  };

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

      {backendLive && allSpots.length > 0 && !loadingSpots && (
        <div className="admin-moderation-toolbar">
          <div className="admin-moderation-filters">
            <input
              type="search"
              className="admin-search"
              placeholder="Search name, city or tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            >
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="hidden">Hidden</option>
            </select>
          </div>

          {creatorFilter && (
            <span className="admin-filter-chip">
              Contributor: {creatorFilter || "Anonymous"}{" "}
              <button type="button" onClick={onClearCreatorFilter}>
                ✕
              </button>
            </span>
          )}

          <div className="admin-moderation-row">
            <label className="admin-check">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={filteredIds.length === 0}
              />
              Select {filtered.length} shown
            </label>
            <span className="muted">
              {selected.size > 0 && `${selected.size} selected`}
            </span>
            <button
              type="button"
              className="action-btn"
              disabled={selected.size === 0}
              onClick={() => runBatch("approve")}
            >
              Approve
            </button>
            <button
              type="button"
              className="action-btn reject"
              disabled={selected.size === 0}
              onClick={() => runBatch("reject")}
            >
              Reject
            </button>
            <button
              type="button"
              className="action-btn2"
              disabled={selected.size === 0}
              onClick={() => runBatch("hide")}
            >
              Hide
            </button>
            <button
              type="button"
              className="action-btn2"
              disabled={selected.size === 0}
              onClick={() => runBatch("restore")}
            >
              Restore
            </button>
          </div>
        </div>
      )}

      {loadingSpots ? (
        <p className="muted">Loading spots…</p>
      ) : (
        <>
          {data && filtered.length === 0 && (
            <p className="empty-state">
              {allSpots.length === 0
                ? "No spots on this map yet."
                : "No spots match the current filters."}
            </p>
          )}

          {filtered.length > 0 && (
            <ul className="admin-spot-list">
              {filtered.map((spot) => (
                <AdminSpotRow
                  key={spot._id}
                  spot={spot}
                  map={activeMap}
                  editing={edit?.spot._id === spot._id}
                  editSpot={edit?.spot ?? null}
                  selectable={backendLive}
                  selected={selected.has(spot._id as string)}
                  onToggleSelect={() => toggleOne(spot._id as string)}
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