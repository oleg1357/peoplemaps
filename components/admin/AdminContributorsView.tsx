"use client";

import type { MapContributorEntry } from "@/lib/types";

export default function AdminContributorsView({
  contributors,
  loading,
  error,
  onFilterByCreator,
}: {
  contributors: MapContributorEntry[];
  loading: boolean;
  error: string;
  onFilterByCreator: (userId: string | null) => void;
}) {
  if (loading) return <p className="muted">Loading contributors…</p>;

  return (
    <div className="admin-section">
      <h3>Contributors</h3>
      <p className="muted">
        How much each person has contributed to this map. Click a row to review
        that person&apos;s spots in the queue.
      </p>

      {error && <p className="auth-error">{error}</p>}

      {contributors.length === 0 ? (
        <p className="empty-state">No contributions yet on this map.</p>
      ) : (
        <table className="admin-table">
          <thead>
            <tr>
              <th>Contributor</th>
              <th className="num">Spots</th>
              <th className="num">Pending</th>
              <th className="num">Rejected</th>
              <th className="num">Hidden</th>
              <th className="num">Zones</th>
              <th className="num">Routes</th>
              <th className="num">Reviews</th>
              <th className="num">Comments</th>
              <th className="num">Photos</th>
              <th className="num">Last active</th>
            </tr>
          </thead>
          <tbody>
            {contributors.map((c) => (
              <tr
                key={c.userId ?? "anonymous"}
                style={{ cursor: "pointer" }}
                onClick={() => onFilterByCreator(c.userId)}
                title="Review this contributor's spots"
              >
                <td>
                  <b>{c.userId ? c.userId.slice(0, 8) : "Anonymous"}</b>
                  <span className="muted"> · {c.total} total</span>
                </td>
                <td className="num">{c.spots}</td>
                <td className="num">{c.pending}</td>
                <td className="num">{c.rejected}</td>
                <td className="num">{c.hidden}</td>
                <td className="num">{c.zones}</td>
                <td className="num">{c.routes}</td>
                <td className="num">{c.reviews}</td>
                <td className="num">{c.comments}</td>
                <td className="num">{c.photos}</td>
                <td className="num">
                  {c.lastActive
                    ? new Date(c.lastActive).toLocaleDateString()
                    : "–"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}