/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), camera=(), microphone=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.sanity.io https://cdn.sanity.io; style-src 'self' 'unsafe-inline' https://*.sanity.io https://cdn.sanity.io; img-src 'self' data: blob: https://*.sanity.io https://cdn.sanity.io https://i.ibb.co https://*.supabase.co https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://server.arcgisonline.com; font-src 'self' https://*.sanity.io https://cdn.sanity.io; connect-src 'self' https://*.sanity.io https://*.supabase.co wss://*.supabase.co; frame-src 'self' https://*.sanity.io https://*.supabase.co;",
          },
        ],
      },
      {
        // Static SEO assets can be cached aggressively
        source: "/sitemap.xml",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        source: "/robots.txt",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
      {
        source: "/llms.txt",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
