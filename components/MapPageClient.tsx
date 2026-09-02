"use client";

import dynamic from "next/dynamic";
import { backendLive } from "@/lib/api-client";

const MapsHomePage = dynamic(
  () => import("@/components/MapsHomePage").then((m) => m.MapsHomePage),
  { ssr: false }
);

export function MapPageClient({
  initialCenter,
  initialZoom,
}: {
  initialCenter?: [number, number];
  initialZoom?: number;
}) {
  if (!backendLive) {
    return (
      <p style={{ padding: 24 }}>
        The interactive map requires a configured backend. Check your environment
        variables.
      </p>
    );
  }
  return <MapsHomePage initialCenter={initialCenter} initialZoom={initialZoom} />;
}
