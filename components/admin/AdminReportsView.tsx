"use client";

import { Button } from "@/components/ui/button";
import type { AdminReport } from "@/lib/api-client";

export default function AdminReportsView({
  reports,
  loadingReports,
  onResolve,
  canStaff,
}: {
  reports: AdminReport[];
  loadingReports: boolean;
  onResolve: (r: AdminReport) => void;
  canStaff: boolean;
}) {
  return (
    <div className="mt-4">
      <h3 className="mb-1 font-heading text-lg font-semibold">Reports</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Spots flagged by visitors. Resolve a report once it has been reviewed.
      </p>
      {loadingReports ? (
        <p className="text-sm text-muted-foreground">Loading reports…</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No open reports.</p>
      ) : (
        <ul>
          {reports.map((r) => (
            <li
              key={r._id}
              className="flex items-center gap-3 border-b border-border py-3 text-sm last:border-none"
            >
              <div className="min-w-0 flex-1">
                <strong className="font-medium">{r.spotName || "Unknown spot"}</strong>
                <div className="text-xs text-muted-foreground">
                  Reported by {r.reporterId.slice(0, 6)} · {new Date(r.createdAt).toLocaleString()}
                </div>
                <div className="italic text-foreground/80">“{r.reason}”</div>
              </div>
              {canStaff && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onResolve(r)}
                >
                  Resolve
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}