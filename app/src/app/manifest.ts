import type { MetadataRoute } from "next";
import { brandColors } from "@/theme/colors";
import { DEFAULT_DESCRIPTION, SITE_NAME } from "@/utils/metadata";

/**
 * Web App Manifest metadata route (#583).
 *
 * Served automatically by Next.js at `/manifest.webmanifest` so browsers and
 * Lighthouse recognize AudioBlocks as an installable PWA.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} Artist Dashboard`,
    short_name: SITE_NAME,
    description: DEFAULT_DESCRIPTION,
    start_url: "/dashboard/overview",
    scope: "/",
    display: "standalone",
    background_color: brandColors.background,
    theme_color: brandColors.primary,
    icons: [
      {
        src: "/icons/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512x512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
