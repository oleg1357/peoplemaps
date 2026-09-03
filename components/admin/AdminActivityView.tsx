"use client";

import type { ActivityEntryApi } from "@/lib/api-client";

const ACTION_LABELS: Record<string, string> = {
  "spot.create": "Spot added",
  "spot.approve": "Spot approved",
  "spot.reject": "Spot rejected",
  "spot.pending": "Spot marked pending",
  "spot.hide": "Spot hidden",
  "spot.restore": "Spot restored",
  "spot.edit": "Spot edited",
  "spot.edit_self": "Spot edited by author",
  "spot.destroy": "Spot destroyed",
  "zone.create": "Zone added",
  "zone.approve": "Zone approved",
  "zone.reject": "Zone rejected",
  "zone.pending": "Zone marked pending",
  "zone.hide": "Zone hidden",
  "zone.restore": "Zone restored",
  "zone.edit": "Zone edited",
  "zone.destroy": "Zone destroyed",
  "route.create": "Route added",
  "route.approve": "Route approved",
  "route.reject": "Route rejected",
  "route.pending": "Route marked pending",
  "route.hide": "Route hidden",
  "route.restore": "Route restored",
  "route.edit": "Route edited",
  "route.destroy": "Route destroyed",
  "report.resolve": "Report resolved",
  "ban.add": "User banned",
  "ban.remove": "Ban lifted",
};

function ActivityRow({ entry }: { entry: ActivityEntryApi }) {
  const when = new Date(entry.createdAt).toLocaleString();
  const label = ACTION_LABELS[entry.action] ?? entry.action;
  return (
    <li className="admin-activity-row">
      <span className="admin-activity-when">{when}</span>
      <span className="admin-activity-action">{label}</span>
      {entry.targetName && <span className="admin-activity-target">{entry.targetName}</span>}
      {entry.actorId && <span className="muted">by {entry.actorId.slice(0, 8)}</span>}
    </li>
  );
}

export default function AdminActivityView({
  activity,
  loadingActivity,
  error,
  activityAction,
  setActivityAction,
  activityActorInput,
  setActivityActorInput,
  activityDateFrom,
  setActivityDateFrom,
  activityDateTo,
  setActivityDateTo,
  onApplyFilter,
  onReset,
}: {
  activity: ActivityEntryApi[];
  loadingActivity: boolean;
  error: string;
  activityAction: string;
  setActivityAction: (v: string) => void;
  activityActorInput: string;
  setActivityActorInput: (v: string) => void;
  activityDateFrom: string;
  setActivityDateFrom: (v: string) => void;
  activityDateTo: string;
  setActivityDateTo: (v: string) => void;
  onApplyFilter: () => void;
  onReset: () => void;
}) {
  return (
    <div className="admin-section">
      <h3>Activity log</h3>
      <p className="muted">
        Audit trail of moderation and management actions on this map.
      </p>
      <div className="admin-activity-filters">
        <select
          value={activityAction}
          onChange={(e) => setActivityAction(e.target.value)}
          title="Filter by action"
        >
          <option value="">All actions</option>
          {Object.keys(ACTION_LABELS).map((a) => (
            <option key={a} value={a}>
              {ACTION_LABELS[a]}
            </option>
          ))}
        </select>
        <input
          value={activityActorInput}
          onChange={(e) => setActivityActorInput(e.target.value)}
          placeholder="Actor id"
          title="Filter by actor id"
        />
        <label>
          From <input type="date" value={activityDateFrom} onChange={(e) => setActivityDateFrom(e.target.value)} />
        </label>
        <label>
          To <input type="date" value={activityDateTo} onChange={(e) => setActivityDateTo(e.target.value)} />
        </label>
        <button type="button" className="action-btn2" onClick={onApplyFilter}>
          Apply
        </button>
        <button type="button" className="link-btn" onClick={onReset}>
          Reset
        </button>
      </div>
      {error && <p className="auth-error">{error}</p>}
      {loadingActivity ? (
        <p className="muted">Loading activity…</p>
      ) : activity.length === 0 ? (
        <p className="empty-state">No activity recorded yet.</p>
      ) : (
        <ul className="admin-activity-list">
          {activity.map((entry) => (
            <ActivityRow key={entry._id ?? `${entry.targetId}-${entry.createdAt}`} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}
