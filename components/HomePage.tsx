"use client";

import { useState } from "react";
import Link from "next/link";
import { PeopleMapsLogo } from "./Logo";
import { MapCard, type HomeMapCardData } from "./MapCard";
import { IconMapMarker } from "./icons";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "cn";

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

export function HomePage({ liveMaps = [] }: { liveMaps?: HomeMapCardData[] }) {
  // Public maps + their spot counts are resolved server-side (see app/page.tsx)
  // and passed in as props, so the homepage makes no client data requests.
  const allMaps = liveMaps;

  const [category, setCategory] = useState("");
  const filtered =
    category === "" ? allMaps : allMaps.filter((m) => (m.category ?? "") === category);

  return (
    <div className="page">
      <section className="mx-auto flex max-w-[760px] flex-col items-center px-6 pt-[72px] pb-14 text-center">
        <div className="animate-[home-logo-float_4s_ease-in-out_infinite] pb-6">
          <PeopleMapsLogo size={150} />
        </div>
        <h1 className="mt-0 mb-5 text-[2.6em] font-extrabold leading-[1.15] text-ink">
          Maps made by people, for people.
        </h1>
        <p className="mt-0 mb-8 max-w-[600px] text-[1.15em] leading-relaxed text-muted-foreground">
          PeopleMaps is a collaborative map of the places that matter in your
          city — hidden bakeries, community fridges, quiet spots to sit. Anyone
          can add a spot, rate it, and keep it up to date.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/map"
            prefetch={false}
            className={cn(
              buttonVariants({ size: "lg" }),
              "gap-2 px-6 text-base max-[480px]:w-full max-[480px]:justify-center"
            )}
          >
            <IconMapMarker size={18} /> Explore the map
          </Link>
          <Link
            href="/signup"
            prefetch={false}
            className={cn(
              buttonVariants({ variant: "outline", size: "lg" }),
              "px-6 text-base max-[480px]:w-full max-[480px]:justify-center"
            )}
          >
            Get started
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-[1080px] px-6 pt-6 pb-16">
        <h2 className="mt-0 mb-2 text-center text-[1.9em] font-bold">
          Maps filled by people
        </h2>
        <p className="mt-0 mb-8 text-center text-[1.05em] text-muted-foreground">
          A few maps created and kept fresh by the community.
        </p>
        <div className="mb-[18px] flex flex-wrap gap-2 px-6">
          {HOME_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-[13px] transition-all",
                category === c.value
                  ? "border-green bg-green text-white"
                  : "border-border bg-surface-2 text-muted-foreground hover:border-green hover:text-ink"
              )}
              onClick={() => setCategory(c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        <div className="grid gap-5 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))]">
          {filtered.map((m, i) => (
            <MapCard key={m.id} map={m} index={i} />
          ))}
        </div>
        {filtered.length === 0 && (
          <p className="mt-0 mb-0 text-center text-[1.05em] text-muted-foreground">
            No maps in this category yet.
          </p>
        )}
      </section>

      <section className="mx-auto max-w-[1080px] px-6 pt-4 pb-[72px]">
        <div className="rounded-[var(--radius-lg)] bg-[linear-gradient(135deg,var(--green-dark),var(--green-light))] px-8 py-12 text-center text-white shadow-(--shadow-lg)">
          <h2 className="mt-0 mb-3 text-[1.8em] font-bold">
            Have a spot worth sharing?
          </h2>
          <p className="mx-auto mt-0 mb-6 max-w-[520px] text-[1.05em] opacity-95">
            Add your favourite places, rate the ones you know, and help keep the
            map useful for everyone around you.
          </p>
          <Link
            href="/map"
            prefetch={false}
            className="inline-flex items-center justify-center rounded-lg bg-white px-[26px] py-[13px] text-base font-semibold text-green-dark transition-[filter] hover:brightness-95"
          >
            Add a spot to the map
          </Link>
        </div>
      </section>
    </div>
  );
}