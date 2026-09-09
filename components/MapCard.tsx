"use client";

import Link from "next/link";
import { IconMapMarker, IconUser } from "./icons";

export interface HomeMapCardData {
  id: string;
  slug?: string;
  title: string;
  description: string;
  ownerName: string;
  spotCount: number;
  accent?: string;
  coverUrl?: string | null;
  category?: string | null;
  tags?: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  food: "Food & drink",
  sights: "Sightseeing",
  shopping: "Shopping",
  outdoors: "Outdoors",
  nightlife: "Nightlife",
  arts: "Arts & culture",
  sports: "Sports",
  other: "Other",
};

export function MapCard({
  map,
  index,
}: {
  map: HomeMapCardData;
  index: number;
}) {
  const hues = ["#61C67A", "#69D57C", "#4BB0E8", "#F0AD00", "#E8796F"];
  const accent = map.accent ?? hues[index % hues.length];
  // Sluggable maps get a permalink; everything else deep-links to the shared
  // /map page with `?map=<id>` (which the map page resolves against its list).
  const href = map.slug
    ? `/map/${encodeURIComponent(map.slug)}`
    : map.id
      ? `/map?map=${encodeURIComponent(map.id)}`
      : "/map";

  // prefetch={false}: the target is the heavy client-side /map/[slug] page, and
  // prefetching each visible card would execute the dynamic route on Vercel for
  // every homepage visit (~15 extra serverless requests). No navigation benefit.
  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-border bg-surface shadow-(--shadow-sm) transition-all duration-200 hover:-translate-y-1 hover:shadow-(--shadow-lg)"
      prefetch={false}
    >
      <div
        className="flex h-24 items-center justify-center overflow-hidden"
        style={map.coverUrl ? undefined : { background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
      >
        {map.coverUrl ? (
          <img src={map.coverUrl} alt={map.title} className="h-full w-full object-cover" />
        ) : (
          <IconMapMarker size={34} color="#ffffff" />
        )}
      </div>
      <div className="px-[18px] pb-3 pt-4">
        <h3 className="mt-0 mb-2 text-[1.2em] font-bold text-ink">{map.title}</h3>
        <p className="mt-0 mb-4 text-[0.95em] leading-relaxed text-muted-foreground">{map.description}</p>
        {map.category && (
          <span className="mb-2.5 inline-block rounded-full border border-border bg-surface-2 px-2.5 py-[2px] text-[11px] font-semibold uppercase tracking-wider text-green-dark">
            {CATEGORY_LABELS[map.category] ?? map.category}
          </span>
        )}
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <IconMapMarker size={14} />
            {map.spotCount} spot{map.spotCount === 1 ? "" : "s"}
          </span>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground">
            <IconUser size={14} />
            {map.ownerName}
          </span>
        </div>
      </div>
      <span className="mt-auto border-t border-border bg-surface-2 px-[18px] py-3 text-sm font-semibold text-green-dark transition-colors group-hover:bg-green/10">
        Open map
      </span>
    </Link>
  );
}