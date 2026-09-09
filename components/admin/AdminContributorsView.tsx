"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  if (loading) return <p className="mt-4 text-sm text-muted-foreground">Loading contributors…</p>;

  return (
    <div className="mt-4">
      <h3 className="mb-1 font-heading text-lg font-semibold">Contributors</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        How much each person has contributed to this map. Click a row to review
        that person&apos;s spots in the queue.
      </p>

      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      {contributors.length === 0 ? (
        <p className="text-sm text-muted-foreground">No contributions yet on this map.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contributor</TableHead>
                <TableHead className="text-right">Spots</TableHead>
                <TableHead className="text-right">Pending</TableHead>
                <TableHead className="text-right">Rejected</TableHead>
                <TableHead className="text-right">Hidden</TableHead>
                <TableHead className="text-right">Zones</TableHead>
                <TableHead className="text-right">Routes</TableHead>
                <TableHead className="text-right">Reviews</TableHead>
                <TableHead className="text-right">Comments</TableHead>
                <TableHead className="text-right">Photos</TableHead>
                <TableHead className="text-right">Last active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contributors.map((c) => (
                <TableRow
                  key={c.userId ?? "anonymous"}
                  className="cursor-pointer"
                  onClick={() => onFilterByCreator(c.userId)}
                  title="Review this contributor's spots"
                >
                  <TableCell>
                    <b>{c.userId ? c.userId.slice(0, 8) : "Anonymous"}</b>
                    <span className="text-muted-foreground"> · {c.total} total</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{c.spots}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.pending}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.rejected}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.hidden}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.zones}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.routes}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.reviews}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.comments}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.photos}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {c.lastActive
                      ? new Date(c.lastActive).toLocaleDateString()
                      : "–"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}