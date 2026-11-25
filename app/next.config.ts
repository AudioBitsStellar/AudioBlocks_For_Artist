import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import { buildImageRemotePatterns } from "./src/lib/imageHosts";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Standalone output enables Docker builds with .next/standalone (#521).
  // The Dockerfile runner stage copies this instead of .next, avoiding
  // the need to bundle node_modules or public/ — smaller image, faster deploys.
  output: "standalone",
  images: {
    // PERF-06 / #581: allow only configured S3/CloudFront asset CDN and IPFS
    // gateway hosts (restricted to /ipfs/**); never allow placeholder or
    // arbitrary remote hosts.
    remotePatterns: buildImageRemotePatterns(process.env),
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
