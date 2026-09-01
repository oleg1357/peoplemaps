"use client";

import dynamic from "next/dynamic";
import { backendLive } from "@/lib/api-client";

const SpotsPage = dynamic(
  () => import("@/components/SpotsPage").then((m) => m.SpotsPage),
  { ssr: false }
);

const MapsHomePage = dynamic(
  () => import("@/components/MapsHomePage").then((m) => m.MapsHomePage),
  { ssr: false }
);

export function MapPageClient() {
  return backendLive ? <MapsHomePage /> : <SpotsPage />;
}
