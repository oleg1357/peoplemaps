"use client";

import type { MapBan } from "@/lib/types";

export default function AdminBansView({
  bans,
  loadingBans,
  error,
  banInput,
  setBanInput,
  banReason,
  setBanReason,
  banNotice,
  onBan,
  onUnban,
}: {
  bans: MapBan[];
  loadingBans: boolean;
  error: string;
  banInput: string;
  setBanInput: (v: string) => void;
  banReason: string;
  setBanReason: (v: string) => void;
  banNotice: string;
  onBan: () => void;
  onUnban: (b: MapBan) => void;
}) {
  return (
    <div className="admin-section">
      <h3>Bans</h3>
      <p className="muted">
        Banned users cannot add, edit or delete spots on this map.
      </p>
      {error && <p className="auth-error">{error}</p>}
      {banNotice && <p className="auth-success">{banNotice}</p>}
      <div className="admin-activity-filters">
        <input
          value={banInput}
          onChange={(e) => setBanInput(e.target.value)}
          placeholder="User id"
        />
        <input
          value={banReason}
          onChange={(e) => setBanReason(e.target.value)}
          placeholder="Reason (optional)"
        />
        <button type="button" className="action-btn2" onClick={onBan}>
          Ban user
        </button>
      </div>
      {loadingBans ? (
        <p className="muted">Loading bans…</p>
      ) : bans.length === 0 ? (
        <p className="empty-state">No bans on this map.</p>
      ) : (
        <ul className="admin-activity-list">
          {bans.map((b) => (
            <li key={b._id} className="admin-activity-row">
              <div style={{ flex: 1 }}>
                <strong>{b.userId}</strong>
                <div className="muted" style={{ fontSize: 12 }}>
                  {b.reason} · {new Date(b.createdAt).toLocaleString()}
                </div>
              </div>
              <button type="button" className="link-btn danger" onClick={() => onUnban(b)}>
                Unban
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
