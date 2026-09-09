"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="mt-4">
      <h3 className="mb-1 font-heading text-lg font-semibold">Moderators</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Designate people who can approve, edit and remove spots on this map.
        They cannot change map settings or manage other moderators.
      </p>

      <form className="mb-4" onSubmit={onAddModerator}>
        <AdminField label="Invite a moderator by email">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="email"
              value={moderatorEmail}
              onChange={(e) => setModeratorEmail(e.target.value)}
              placeholder="moderator@example.com"
              disabled={moderatorBusy}
              className="min-w-60 flex-1"
            />
            <Button
              type="submit"
              disabled={moderatorBusy || !moderatorEmail.trim()}
            >
              <IconUser size={15} />
              {moderatorBusy ? "Adding…" : "Add moderator"}
            </Button>
          </div>
        </AdminField>
      </form>

      {moderatorError && <p className="mb-2 text-sm text-destructive">{moderatorError}</p>}
      {moderatorNotice && (
        <p className="mb-2 text-sm text-green-dark">{moderatorNotice}</p>
      )}

      {loadingModerators ? (
        <p className="text-sm text-muted-foreground">Loading moderators…</p>
      ) : moderators.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No moderators yet. Add people by their account email.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {moderators.map((m) => (
            <li
              key={m.userId}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm shadow-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                <IconUser size={16} />
                <span className="font-semibold">{m.displayName || m.email || m.userId}</span>
                {m.displayName && m.displayName !== m.email && (
                  <span className="text-muted-foreground">{m.email}</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  Added {new Date(m.addedAt).toLocaleDateString()}
                </span>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onRemoveModerator(m.userId)}
                >
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}