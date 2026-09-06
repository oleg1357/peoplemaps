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

  return (
    <Link href={href} className="home-map-card">
      <div
        className="home-map-card-accent"
        style={map.coverUrl ? undefined : { background: `linear-gradient(135deg, ${accent}, ${accent}88)` }}
      >
        {map.coverUrl ? (
          <img src={map.coverUrl} alt={map.title} className="home-map-card-cover" />
        ) : (
          <IconMapMarker size={34} color="#ffffff" />
        )}
      </div>
      <div className="home-map-card-body">
        <h3>{map.title}</h3>
        <p className="home-map-card-desc">{map.description}</p>
        {map.category && (
          <span className="home-map-card-category">
            {CATEGORY_LABELS[map.category] ?? map.category}
          </span>
        )}
        <div className="home-map-card-meta">
          <span className="home-map-card-stat">
            <IconMapMarker size={14} />
            {map.spotCount} spot{map.spotCount === 1 ? "" : "s"}
          </span>
          <span className="home-map-card-stat">
            <IconUser size={14} />
            {map.ownerName}
          </span>
        </div>
      </div>
      <span className="home-map-card-open">Open map</span>
    </Link>
  );
}
