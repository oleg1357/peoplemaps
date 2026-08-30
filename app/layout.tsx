import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/lib/AppProviders";
import { SiteLayout } from "@/components/SiteLayout";

export const metadata: Metadata = {
  title: "PeopleMaps - People-Managed Maps",
  description:
    "A collaborative map of places maintained by people — add spots, rate and review them, keep them up to date.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
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