"use client";

import { useMemo, useState } from "react";
import type { SpotMarker } from "@/lib/data";
import { SPOT_CATEGORIES, CATEGORY_LABELS } from "@/lib/data";
import type { SpotCategory } from "@/lib/data";
import { getAllSpotStatuses, getLatestReviewDate } from "@/lib/store";
import type { SpotStatus } from "@/lib/store";
import { Rating } from "./Rating";
import { IconHeart, IconSearch, IconX } from "./icons";

const RECENT_DAYS = 30;

function isRecent(dateStr: string | null): boolean {
  if (!dateStr) return false;
  const ms = Date.now() - new Date(dateStr + "T00:00:00").getTime();
  return Number.isFinite(ms) && ms / 86400000 <= RECENT_DAYS;
}

function statusLabel(status: SpotStatus): string {
  if (status === "open") return "Open";
  if (status === "closed") return "Closed";
  return "Unknown";
}

function distKm(
  a: [number, number],
  b: [number, number] | null
): number | null {
  if (!b) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a[0])) * Math.cos(toRad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export function PlacesSidebar({
  markers,
  open,
  mobile,
  userLocation,
  onClose,
  onSelect,
}: {
  markers: SpotMarker[];
  open: boolean;
  mobile: boolean;
  userLocation: [number, number] | null;
  onClose: () => void;
  onSelect: (m: SpotMarker) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"all" | "recent" | "near">("all");
  const [city, setCity] = useState<string>("all");
  const [category, setCategory] = useState<"all" | SpotCategory>("all");

  const cities = useMemo(
    () => Array.from(new Set(markers.map((m) => m.city))).sort(),
    [markers]
  );

  const rows = useMemo(() => {
    const statuses = getAllSpotStatuses();
    const q = query.trim().toLowerCase();
    const withMeta = markers.map((m) => {
      const last = getLatestReviewDate(m.id);
      return {
        marker: m,
        status: (statuses[m.id] ?? "unknown") as SpotStatus,
        last,
        recent: isRecent(last),
        distance: distKm(m.latlng, userLocation),
      };
    });

    let filtered = withMeta;
    if (q) {
      filtered = filtered.filter((r) =>
        `${r.marker.brand} ${r.marker.street} ${r.marker.city} ${r.marker.zip}`
          .toLowerCase()
          .includes(q)
      );
    }
    if (city !== "all") {
      filtered = filtered.filter((r) => r.marker.city === city);
    }
    if (category !== "all") {
      filtered = filtered.filter((r) => r.marker.category === category);
    }

    if (sort === "recent") {
      return filtered.sort((a, b) => {
        if (a.recent && !b.recent) return -1;
        if (!a.recent && b.recent) return 1;
        return (b.last ?? "").localeCompare(a.last ?? "");
      });
    }
    if (sort === "near") {
      return filtered.sort((a, b) => {
        const da = a.distance ?? Infinity;
        const db = b.distance ?? Infinity;
        return da - db;
      });
    }
    return filtered.sort((a, b) =>
      `${a.marker.brand} ${a.marker.city}`.localeCompare(
        `${b.marker.brand} ${b.marker.city}`
      )
    );
  }, [markers, query, sort, city, category, userLocation]);

  const select = (m: SpotMarker) => {
    onSelect(m);
    if (mobile) onClose();
  };

  return (
    <>
      {open && <div id="sidebar-backdrop" onClick={onClose} />}
      <aside id="places-sidebar" className={open ? "open" : ""}>
        <div id="places-head">
          <h2>Places ({markers.length})</h2>
          <button type="button" id="places-close" onClick={onClose} aria-label="Close list">
            <IconX size={18} />
          </button>
        </div>
        <div id="places-search">
          <IconSearch size={16} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, street or city"
          />
        </div>
        <div className="places-filters">
          <select
            className="places-select"
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="all">All cities</option>
            {cities.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select
            className="places-select"
            value={category}
            onChange={(e) => setCategory(e.target.value as "all" | SpotCategory)}
          >
            <option value="all">All categories</option>
            {SPOT_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div id="places-sort" className="toggle-group">
          <button
            type="button"
            className={`toggle-btn ${sort === "all" ? "active" : ""}`}
            onClick={() => setSort("all")}
          >
            All
          </button>
          <button
            type="button"
            className={`toggle-btn ${sort === "recent" ? "active" : ""}`}
            onClick={() => setSort("recent")}
          >
            Recent
          </button>
          <button
            type="button"
            className={`toggle-btn ${sort === "near" ? "active" : ""}`}
            onClick={() => setSort("near")}
          >
            Near me
          </button>
        </div>
        <ul id="places-list">
          {rows.map((r) => (
            <li key={r.marker.id}>
              <button type="button" className="place-row" onClick={() => select(r.marker)}>
                <span className={`status-dot ${r.status}`} title={statusLabel(r.status)} />
                <span className="place-info">
                  <span className="place-name">
                    {r.marker.brand}
                    {r.marker.is_saved === 1 && (
                      <IconHeart size={13} color="#D90368" />
                    )}
                  </span>
                  <span className="place-addr">
                    {r.marker.street}, {r.marker.city}
                    {r.distance !== null &&
                      r.distance !== undefined &&
                      Number.isFinite(r.distance) && (
                        <span className="place-dist">
                          {" · "}
                          {r.distance < 0.5
                            ? `${Math.round(r.distance * 1000)} m`
                            : `${r.distance.toFixed(1)} km`}
                        </span>
                      )}
                  </span>
                </span>
                <span className="place-meta">
                  {r.recent && <span className="recent-chip">Recent</span>}
                  <span className="place-score">
                    {parseFloat(String(r.marker.avgScore)).toFixed(1)}
                    <Rating value={r.marker.avgScore} readOnly small />
                  </span>
                </span>
              </button>
            </li>
          ))}
          {rows.length === 0 && (
            <li className="empty-state">No places match your search.</li>
          )}
        </ul>
      </aside>
    </>
  );
}