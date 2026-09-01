"use client";

import { IconMapMarker } from "./icons";

interface SpotTooltipProps {
  name: string;
  street?: string;
  city?: string;
  status?: "open" | "closed" | "unknown" | string;
  score?: number | null;
  hint?: string;
  tag?: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  closed: "Closed",
  unknown: "Unknown",
};

function ScoreFill({ value }: { value: number | null | undefined }) {
  if (value === null || value === undefined || !Number.isFinite(value)) {
    return <span className="spot-tip-score empty">No ratings yet</span>;
  }
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    const pct = Math.max(0, Math.min(1, value - (i - 1))) * 100;
    stars.push(
      <span key={i} className="spot-tip-star">
        <span className="spot-tip-star-bg">★</span>
        <span className="spot-tip-star-fill" style={{ width: `${pct}%` }}>
          ★
        </span>
      </span>
    );
  }
  return (
    <span className="spot-tip-score">
      <span className="spot-tip-stars">{stars}</span>
      <span className="spot-tip-num">{value.toFixed(1)}</span>
    </span>
  );
}

export function SpotTooltip({
  name,
  street,
  city,
  status,
  score,
  hint = "Click to view",
  tag,
}: SpotTooltipProps) {
  const statusKey =
    status === "open" || status === "closed" || status === "unknown"
      ? status
      : undefined;

  return (
    <div className="spot-tip">
      <div className="spot-tip-head">
        <p className="spot-tip-title">{name}</p>
        {statusKey && (
          <span className={`spot-tip-pill ${statusKey}`}>
            {STATUS_LABEL[statusKey]}
          </span>
        )}
      </div>

      {tag && <span className="spot-tip-tag">{tag}</span>}

      {(street || city) && (
        <div className="spot-tip-addr">
          <IconMapMarker size={12} />
          <span>
            {[street, city].filter(Boolean).join(", ")}
          </span>
        </div>
      )}

      {score !== undefined && <ScoreFill value={score ?? null} />}

      <div className="spot-tip-foot">
        <IconMapMarker size={11} />
        <span>{hint}</span>
      </div>
    </div>
  );
}
