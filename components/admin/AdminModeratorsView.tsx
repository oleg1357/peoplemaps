"use client";

import type { MapRoleEntry } from "@/lib/api-client";
import { IconUser } from "../icons";
import { AdminField } from "../AdminPanel";

export default function AdminModeratorsView({
  moderators,
  loadingModerators,
  moderatorEmail,
  setModeratorEmail,
  moderatorBusy,
  moderatorError,
  moderatorNotice,
  onAddModerator,
  onRemoveModerator,
}: {
  moderators: MapRoleEntry[];
  loadingModerators: boolean;
  moderatorEmail: string;
  setModeratorEmail: (v: string) => void;
  moderatorBusy: boolean;
  moderatorError: string;
  moderatorNotice: string;
  onAddModerator: (e: React.FormEvent) => void;
  onRemoveModerator: (userId: string) => void;
}) {
  return (
    <div className="admin-section">
      <h3>Moderators</h3>
      <p className="muted">
        Designate people who can approve, edit and remove spots on
        this map. They cannot change map settings or manage other
        moderators.
      </p>

      <form className="admin-moderator-add" onSubmit={onAddModerator}>
        <AdminField label="Invite a moderator by email">
          <div className="admin-moderator-add-row">
            <input
              type="email"
              value={moderatorEmail}
              onChange={(e) => setModeratorEmail(e.target.value)}
              placeholder="moderator@example.com"
              disabled={moderatorBusy}
            />
            <button
              type="submit"
              className="action-btn"
              disabled={moderatorBusy || !moderatorEmail.trim()}
            >
              <IconUser size={15} />
              {moderatorBusy ? "Adding…" : "Add moderator"}
            </button>
          </div>
        </AdminField>
      </form>

      {moderatorError && <p className="auth-error">{moderatorError}</p>}
      {moderatorNotice && (
        <p className="muted" style={{ color: "var(--green)" }}>
          {moderatorNotice}
        </p>
      )}

      {loadingModerators ? (
        <p className="muted">Loading moderators…</p>
      ) : moderators.length === 0 ? (
        <p className="empty-state">
          No moderators yet. Add people by their account email.
        </p>
      ) : (
        <ul className="admin-moderator-list">
          {moderators.map((m) => (
            <li key={m.userId} className="admin-moderator-row">
              <div className="admin-moderator-info">
                <IconUser size={16} />
                <span className="admin-moderator-name">
                  {m.displayName || m.email || m.userId}
                </span>
                {m.displayName && m.displayName !== m.email && (
                  <span className="muted">{m.email}</span>
                )}
              </div>
              <div className="admin-row-actions">
                <span className="muted">
                  Added{" "}
                  {new Date(m.addedAt).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  className="action-btn2"
                  onClick={() => onRemoveModerator(m.userId)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
