"use client";

import { useState } from "react";
import Link from "next/link";
import { PeopleMapsLogo } from "./Logo";
import { MapCard, type HomeMapCardData } from "./MapCard";
import { IconMapMarker } from "./icons";
import { backendLive } from "@/lib/api-client";

export const HOME_CATEGORIES: { value: string; label: string }[] = [
  { value: "", label: "All" },
  { value: "food", label: "Food & drink" },
  { value: "sights", label: "Sightseeing" },
  { value: "shopping", label: "Shopping" },
  { value: "outdoors", label: "Outdoors" },
  { value: "nightlife", label: "Nightlife" },
  { value: "arts", label: "Arts & culture" },
  { value: "sports", label: "Sports" },
  { value: "other", label: "Other" },
];

// Demo-mode cards. Ids match the seeded localStorage maps (lib/demo-data.ts) so
// "Open map" lands on the right map. Only shown when no backend is configured.
const DEMO_MAPS: HomeMapCardData[] = [
  {
    id: "demo-cph-groceries",
    title: "Copenhagen Groceries",
    description:
      "The best supermarkets and discount shops across Copenhagen, rated by the people who shop there every day.",
    ownerName: "PeopleMaps Demo",
    spotCount: 5,
    accent: "#61C67A",
    category: "shopping",
  },
  {
    id: "demo-coffee",
    title: "Best Coffee in Copenhagen",
    description:
      "Third-wave coffee spots, hidden cafes and roasteries worth an extra stop on your commute.",
    ownerName: "Anna K.",
    spotCount: 4,
    accent: "#C99A5B",
    category: "food",
  },
  {
    id: "demo-parks",
    title: "Hidden Parks & Gardens",
    description:
      "Quiet green corners and pocket parks for a sunny lunch or a peaceful afternoon read.",
    ownerName: "Marcus L.",
    spotCount: 3,
    accent: "#4BB0E8",
    category: "outdoors",
  },
  {
    id: "demo-streetfood",
    title: "Street Food Favorites",
    description:
      "The stalls and food markets locals actually queue for — plus what to order when you get there.",
    ownerName: "Sofia M.",
    spotCount: 3,
    accent: "#F0AD00",
    category: "food",
  },
];

export function HomePage({ liveMaps = [] }: { liveMaps?: HomeMapCardData[] }) {
  // Public maps + their spot counts are resolved server-side (see app/page.tsx)
  // and passed in as props, so the homepage makes no client data requests.
  // Demo cards only appear when the real backend isn't configured.
  const allMaps = backendLive ? liveMaps : DEMO_MAPS;

  const [category, setCategory] = useState("");
  const filtered =
    category === "" ? allMaps : allMaps.filter((m) => (m.category ?? "") === category);

  return (
    <div className="page home-page">
      <section className="home-hero">
        <div className="home-hero-logo">
          <PeopleMapsLogo size={150} />
        </div>
        <h1 className="home-hero-title">Maps made by people, for people.</h1>
        <p className="home-hero-sub">
          PeopleMaps is a collaborative map of the places that matter in your
          city — hidden bakeries, community fridges, quiet spots to sit. Anyone
          can add a spot, rate it, and keep it up to date.
        </p>
        <div className="home-hero-actions">
          <Link href="/map" className="action-btn home-hero-cta" prefetch={false}>
            <IconMapMarker size={18} /> Explore the map
          </Link>
          <Link href="/signup" className="action-btn2" prefetch={false}>
            Get started
          </Link>
        </div>
      </section>

      <section className="home-maps">
        <h2 className="home-section-title">Maps filled by people</h2>
        <p className="home-section-sub muted">
          A few maps created and kept fresh by the community.
        </p>
        <div className="home-map-filters">
          {HOME_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={`home-map-filter ${category === c.value ? "active" : ""}`}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="home-maps-grid">
          {filtered.map((m, i) => (
            <MapCard key={m.id} map={m} index={i} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="home-section-sub muted" style={{ textAlign: "center" }}>
            No maps in this category yet.
          </p>
        )}
      </section>

      <section className="home-cta">
        <div className="home-cta-inner">
          <h2>Have a spot worth sharing?</h2>
          <p>
            Add your favourite places, rate the ones you know, and help keep the
            map useful for everyone around you.
          </p>
          <Link href="/map" className="action-btn home-cta-btn" prefetch={false}>
            Add a spot to the map
          </Link>
        </div>
      </section>
    </div>
  );
}
