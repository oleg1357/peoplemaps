import type { Metadata } from "next";
import { HomePage } from "@/components/HomePage";
import { JsonLd } from "@/components/JsonLd";
import {
  SITE_NAME,
  SITE_DEFAULT_TITLE,
  SITE_DESCRIPTION,
  SITE_TWITTER_HANDLE,
  siteUrl,
} from "@/lib/site";

const origin = siteUrl();

export const metadata: Metadata = {
  title: {
    absolute: SITE_DEFAULT_TITLE,
  },
  description: SITE_DESCRIPTION,
  openGraph: {
    type: "website",
    url: origin,
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    siteName: SITE_NAME,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    site: SITE_TWITTER_HANDLE,
  },
  alternates: { canonical: origin },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: origin,
  logo: `${origin}/icon.svg`,
  sameAs: [],
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: origin,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Any",
  description: SITE_DESCRIPTION,
  offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  publisher: { "@type": "Organization", name: SITE_NAME, url: origin },
  inLanguage: "en",
  about: "Community-managed maps and local places",
};

export default function Home() {
  return (
    <>
      <JsonLd data={organizationJsonLd} />
      <JsonLd data={webAppJsonLd} />
      <HomePage />
    </>
  );
}
