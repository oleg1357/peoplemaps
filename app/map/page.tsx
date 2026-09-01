import type { Metadata } from "next";
import { MapPageClient } from "@/components/MapPageClient";
import { MapProvider } from "@/lib/MapContext";
import { SITE_DESCRIPTION, siteUrl } from "@/lib/site";

const origin = siteUrl();

export const metadata: Metadata = {
  title: "Interactive Map",
  description: SITE_DESCRIPTION,
  alternates: { canonical: `${origin}/map` },
};

export default function MapPage() {
  return (
    <MapProvider>
      <MapPageClient />
    </MapProvider>
  );
}
