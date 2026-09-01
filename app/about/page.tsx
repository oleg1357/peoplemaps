import type { Metadata } from "next";
import { AboutPage } from "@/components/AboutPage";
import { JsonLd } from "@/components/JsonLd";
import { SITE_NAME, siteUrl } from "@/lib/site";

const origin = siteUrl();

export const metadata: Metadata = {
  title: "About",
  description:
    "Why PeopleMaps exists and how it works — community-managed maps of the places that matter in your city.",
  alternates: { canonical: `${origin}/about` },
};

export default function About() {
  const aboutJsonLd = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: `About ${SITE_NAME}`,
    url: `${origin}/about`,
    inLanguage: "en",
  };
  return (
    <>
      <JsonLd data={aboutJsonLd} />
      <AboutPage />
    </>
  );
}
