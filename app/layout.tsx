import type { Metadata, Viewport } from "next";
import "./styles/base.css";
import "./styles/nav.css";
import "./styles/components.css";
import "./styles/map.css";
import "./styles/responsive.css";
import "./styles/home.css";
import "./styles/admin.css";
import "./styles/profile.css";
import "./styles/dashboard.css";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import { AppProviders } from "@/lib/AppProviders";
import { SiteLayout } from "@/components/SiteLayout";
import {
  SITE_NAME,
  SITE_DEFAULT_TITLE,
  SITE_DESCRIPTION,
  SITE_KEYWORDS,
  SITE_TWITTER_HANDLE,
  SITE_OG_IMAGE,
  siteUrl,
} from "@/lib/site";

const origin = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(origin),
  title: {
    default: SITE_DEFAULT_TITLE,
    template: `%s — ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  authors: [{ name: "PeopleMaps Community" }],
  generator: "Next.js",
  creator: "PeopleMaps",
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    url: origin,
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
    images: SITE_OG_IMAGE
      ? [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: SITE_NAME }]
      : undefined,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_DEFAULT_TITLE,
    description: SITE_DESCRIPTION,
    site: SITE_TWITTER_HANDLE,
    images: SITE_OG_IMAGE ? [SITE_OG_IMAGE] : undefined,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: origin,
  },
  category: "maps",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  // GEO / local-search hints
  other: {
    "geo.region": "DK-84",
    "geo.placename": "Copenhagen",
    "geo.position": "55.6761;12.5683",
    "ICBM": "55.6761, 12.5683",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: { media: "(prefers-color-scheme: light)", color: "#ffffff" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://a.tile.openstreetmap.org" />
        <link rel="dns-prefetch" href="https://a.tile.openstreetmap.org" />
      </head>
      <body>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem('peoplemaps_theme');var d=(t==='dark'||(t!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches));document.documentElement.setAttribute('data-theme',d?'dark':'light');}catch(e){}})();`,
          }}
        />
        <AppProviders>
          <SiteLayout>{children}</SiteLayout>
        </AppProviders>
      </body>
    </html>
  );
}
