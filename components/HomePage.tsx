"use client";

import Link from "next/link";
import { backendLive } from "@/lib/api-client";
import { useMaps } from "@/sanity/lib/maps";
import { PeopleMapsLogo } from "./Logo";
import { MapCard, type HomeMapCardData } from "./MapCard";
import { IconMapMarker } from "./icons";

const DEMO_MAPS: HomeMapCardData[] = [
  {
    id: "cph-groceries",
    title: "Copenhagen Groceries",
    description:
      "The best supermarkets and discount shops across Copenhagen, rated by the people who shop there every day.",
    ownerName: "PeopleMaps Demo",
    spotCount: 12,
    accent: "#61C67A",
  },
  {
    id: "coffee",
    title: "Best Coffee in Copenhagen",
    description:
      "Third-wave coffee spots, hidden cafes and roasteries worth an extra stop on your commute.",
    ownerName: "Anna K.",
    spotCount: 8,
    accent: "#C99A5B",
  },
  {
    id: "parks",
    title: "Hidden Parks & Gardens",
    description:
      "Quiet green corners and pocket parks for a sunny lunch or a peaceful afternoon read.",
    ownerName: "Marcus L.",
    spotCount: 6,
    accent: "#4BB0E8",
  },
  {
    id: "streetfood",
    title: "Street Food Favorites",
    description:
      "The stalls and food markets locals actually queue for — plus what to order when you get there.",
    ownerName: "Sofia M.",
    spotCount: 10,
    accent: "#F0AD00",
  },
];

export function HomePage() {
  const { maps } = useMaps();

  const liveMaps: HomeMapCardData[] = (backendLive ? maps : []).map((m) => ({
    id: m._id,
    title: m.title,
    description: m.description ?? "",
    ownerName: m.ownerName || "Community",
    spotCount: 0,
  }));

  const allMaps = [...liveMaps, ...DEMO_MAPS];

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
          <Link href="/map" className="action-btn home-hero-cta">
            <IconMapMarker size={18} /> Explore the map
          </Link>
          <Link href="/signup" className="action-btn2">
            Get started
          </Link>
        </div>
      </section>

      <section className="home-maps">
        <h2 className="home-section-title">Maps filled by people</h2>
        <p className="home-section-sub muted">
          A few maps created and kept fresh by the community.
        </p>
        <div className="home-maps-grid">
          {allMaps.map((m, i) => (
            <MapCard key={m.id} map={m} index={i} />
          ))}
        </div>
      </section>

      <section className="home-cta">
        <div className="home-cta-inner">
          <h2>Have a spot worth sharing?</h2>
          <p>
            Add your favourite places, rate the ones you know, and help keep the
            map useful for everyone around you.
          </p>
          <Link href="/map" className="action-btn home-cta-btn">
            Add a spot to the map
          </Link>
        </div>
      </section>
    </div>
  );
}
