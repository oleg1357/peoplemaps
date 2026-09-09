"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
    <div className="mt-4">
      <h3 className="mb-1 font-heading text-lg font-semibold">Bans</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Banned users cannot add, edit or delete spots on this map.
      </p>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      {banNotice && <p className="mb-2 text-sm text-green-dark">{banNotice}</p>}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Input
          value={banInput}
          onChange={(e) => setBanInput(e.target.value)}
          placeholder="User id"
          className="w-48"
        />
        <Input
          value={banReason}
          onChange={(e) => setBanReason(e.target.value)}
          placeholder="Reason (optional)"
          className="w-56"
        />
        <Button type="button" size="sm" variant="outline" onClick={onBan}>
          Ban user
        </Button>
      </div>
      {loadingBans ? (
        <p className="text-sm text-muted-foreground">Loading bans…</p>
      ) : bans.length === 0 ? (
        <p className="text-sm text-muted-foreground">No bans on this map.</p>
      ) : (
        <ul>
          {bans.map((b) => (
            <li
              key={b._id}
              className="flex items-center gap-3 border-b border-border py-3 text-sm last:border-none"
            >
              <div className="min-w-0 flex-1">
                <strong className="font-medium">{b.userId}</strong>
                <div className="text-xs text-muted-foreground">
                  {b.reason} · {new Date(b.createdAt).toLocaleString()}
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="link"
                className="h-auto px-0 text-destructive"
                onClick={() => onUnban(b)}
              >
                Unban
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}