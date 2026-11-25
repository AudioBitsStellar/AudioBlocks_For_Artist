import type { RemotePattern } from "next/dist/shared/lib/image-config";

const DEFAULT_IPFS_GATEWAY_HOST = "gateway.pinata.cloud";

/**
 * Extracts a clean hostname from an env var value (accepts bare hostnames like
 * `cdn.audioblocks.io` or full URLs like `https://cdn.audioblocks.io/`).
 * Rejects wildcards, empty values, and malformed hosts so arbitrary origins
 * are never accidentally allow-listed.
 */
export function parseAllowedImageHost(raw?: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.includes("*")) return null;

  try {
    const url = new URL(trimmed.includes("://") ? trimmed : `https://${trimmed}`);
    const hostname = url.hostname.toLowerCase();
    if (!hostname || hostname.includes("*") || !/^[a-z0-9.-]+$/.test(hostname)) {
      return null;
    }
    return hostname;
  } catch {
    return null;
  }
}

/**
 * Builds the `images.remotePatterns` allow-list for `next/image` (#581).
 *
 * - `NEXT_PUBLIC_ASSET_CDN_HOST`: S3 bucket or CloudFront host for cover art and avatars.
 * - `NEXT_PUBLIC_IPFS_GATEWAY_HOST`: IPFS gateway host (defaults to `gateway.pinata.cloud`),
 *   restricted strictly to `/ipfs/**`.
 * - Arbitrary hosts remain rejected.
 */
export function buildImageRemotePatterns(
  env: Record<string, string | undefined> = process.env
): RemotePattern[] {
  const patterns: RemotePattern[] = [];

  const assetCdnHost = parseAllowedImageHost(env.NEXT_PUBLIC_ASSET_CDN_HOST);
  if (assetCdnHost) {
    patterns.push({
      protocol: "https",
      hostname: assetCdnHost,
      pathname: "/**",
    });
  }

  const ipfsHost =
    parseAllowedImageHost(env.NEXT_PUBLIC_IPFS_GATEWAY_HOST) ?? DEFAULT_IPFS_GATEWAY_HOST;
  patterns.push({
    protocol: "https",
    hostname: ipfsHost,
    pathname: "/ipfs/**",
  });

  return patterns;
}
