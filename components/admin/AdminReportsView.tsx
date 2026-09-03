"use client";

import type { AdminReport } from "@/lib/api-client";

export default function AdminReportsView({
  reports,
  loadingReports,
  onResolve,
}: {
  reports: AdminReport[];
  loadingReports: boolean;
  onResolve: (r: AdminReport) => void;
}) {
  return (
    <div className="admin-section">
      <h3>Reports</h3>
      <p className="muted">
        Spots flagged by visitors. Resolve a report once it has been
        reviewed.
      </p>
      {loadingReports ? (
        <p className="muted">Loading reports…</p>
      ) : reports.length === 0 ? (
        <p className="empty-state">No open reports.</p>
      ) : (
        <ul className="admin-activity-list">
          {reports.map((r) => (
            <li key={r._id} className="admin-activity-row">
              <div style={{ flex: 1 }}>
                <strong>{r.spotName || "Unknown spot"}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  Reported by {r.reporterId.slice(0, 6)} · {new Date(r.createdAt).toLocaleString()}
                </div>
                <div style={{ fontStyle: "italic" }}>“{r.reason}”</div>
              </div>
              <button
                type="button"
                className="action-btn2"
                onClick={() => onResolve(r)}
              >
                Resolve
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
