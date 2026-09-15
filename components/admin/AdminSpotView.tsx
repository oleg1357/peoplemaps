"use client";

import { useMemo, useState } from "react";
import type {
  AdminMapEntry,
  AdminSpotList,
  BatchModerationAction,
} from "@/lib/api-client";
import { backendLive } from "@/lib/api-client";
import type { Spot } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  canApprove,
  canModerate,
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
  canApprove: boolean;
  canModerate: boolean;
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
    <div className="mt-4">
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="flex flex-col gap-1 rounded-lg border bg-card p-3.5 shadow-sm">
          <b className="text-2xl leading-none">{data?.total ?? "–"}</b>
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Total
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border bg-card p-3.5 shadow-sm">
          <b className="text-2xl leading-none text-warning">{data?.pending ?? "–"}</b>
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Pending
          </span>
        </div>
        <div className="flex flex-col gap-1 rounded-lg border bg-card p-3.5 shadow-sm">
          <b className="text-2xl leading-none text-danger">{data?.hidden ?? "–"}</b>
          <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            Hidden
          </span>
        </div>
      </div>

      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      {backendLive && allSpots.length > 0 && !loadingSpots && (
        <div className="mb-4 rounded-lg border bg-card p-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="search"
              placeholder="Search name, city or tags…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="min-w-52 flex-1"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter((v || "all") as StatusFilter)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="hidden">Hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {creatorFilter && (
            <span className="mt-2.5 inline-flex items-center gap-2 rounded-full border bg-muted px-3 py-1 text-sm font-semibold">
              Contributor: {creatorFilter || "Anonymous"}
              <button
                type="button"
                onClick={onClearCreatorFilter}
                className="leading-none font-bold text-muted-foreground hover:text-destructive"
              >
                ✕
              </button>
            </span>
          )}

          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                disabled={filteredIds.length === 0}
                className="size-4 accent-[var(--green)]"
              />
              Select {filtered.length} shown
            </label>
            {selected.size > 0 && (
              <span className="text-sm text-muted-foreground">
                {selected.size} selected
              </span>
            )}
            <Button
              type="button"
              size="sm"
              disabled={selected.size === 0 || !canApprove}
              onClick={() => runBatch("approve")}
            >
              Approve
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={selected.size === 0 || !canApprove}
              onClick={() => runBatch("reject")}
            >
              Reject
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={selected.size === 0 || !canModerate}
              onClick={() => runBatch("hide")}
            >
              Hide
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={selected.size === 0 || !canModerate}
              onClick={() => runBatch("restore")}
            >
              Restore
            </Button>
          </div>
        </div>
      )}

      {loadingSpots ? (
        <p className="text-sm text-muted-foreground">Loading spots…</p>
      ) : (
        <>
          {data && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground">
              {allSpots.length === 0
                ? "No spots on this map yet."
                : "No spots match the current filters."}
            </p>
          )}

          {filtered.length > 0 && (
            <ul className="flex flex-col gap-2.5">
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