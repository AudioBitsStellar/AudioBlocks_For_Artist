import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Standalone output enables Docker builds with .next/standalone (#521).
  // The Dockerfile runner stage copies this instead of .next, avoiding
  // the need to bundle node_modules or public/ — smaller image, faster deploys.
  output: "standalone",
  images: {
    // PERF-06: no placeholder hosts in production. Unsplash and picsum were
    // here because the mock data used their URLs; `next/image` happily
    // optimised and cached those third-party requests from real deployments.
    // Cover art is uploaded to our own storage and served from the app's
    // origin, so the optimizer needs no remote allow-list at all. A genuinely
    // new remote host is a deliberate entry here, reviewed like any other
    // origin the browser is told to trust.
    remotePatterns: [],
    unoptimized: false,
  },
  async headers() {
    return [
      {
        // Static assets built with content hashes are immutable and can be cached indefinitely
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Optimized images are cached with stale-while-revalidate
        source: "/_next/image/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
      {
        // Static public assets
        source: "/(images|icons|fonts|audio)/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  disableLogger: true,
  automaticVercelMonitors: true,
});
