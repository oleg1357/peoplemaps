"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <li className="flex flex-wrap items-center gap-x-2.5 gap-y-1 border-b border-border py-2 text-sm last:border-none">
      <span className="text-xs tabular-nums text-muted-foreground">{when}</span>
      <span className="font-semibold">{label}</span>
      {entry.targetName && (
        <span className="truncate text-[13px] text-foreground/80">{entry.targetName}</span>
      )}
      {entry.actorId && (
        <span className="text-muted-foreground">by {entry.actorId.slice(0, 8)}</span>
      )}
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
    <div className="mt-4">
      <h3 className="mb-1 font-heading text-lg font-semibold">Activity log</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Audit trail of moderation and management actions on this map.
      </p>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          value={activityAction}
          onValueChange={(v) => setActivityAction(v ?? "")}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All actions</SelectItem>
            {Object.keys(ACTION_LABELS).map((a) => (
              <SelectItem key={a} value={a}>
                {ACTION_LABELS[a]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={activityActorInput}
          onChange={(e) => setActivityActorInput(e.target.value)}
          placeholder="Actor id"
          title="Filter by actor id"
          className="w-40"
        />
        <Input
          type="date"
          value={activityDateFrom}
          onChange={(e) => setActivityDateFrom(e.target.value)}
          title="From date"
          className="w-40"
        />
        <Input
          type="date"
          value={activityDateTo}
          onChange={(e) => setActivityDateTo(e.target.value)}
          title="To date"
          className="w-40"
        />
        <Button type="button" size="sm" variant="outline" onClick={onApplyFilter}>
          Apply
        </Button>
        <Button type="button" size="sm" variant="link" onClick={onReset}>
          Reset
        </Button>
      </div>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      {loadingActivity ? (
        <p className="text-sm text-muted-foreground">Loading activity…</p>
      ) : activity.length === 0 ? (
        <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
      ) : (
        <ul className="max-h-120 overflow-y-auto">
          {activity.map((entry) => (
            <ActivityRow key={entry._id ?? `${entry.targetId}-${entry.createdAt}`} entry={entry} />
          ))}
        </ul>
      )}
    </div>
  );
}