import { describe, expect, it } from "vitest";
import { buildImageRemotePatterns, parseAllowedImageHost } from "./imageHosts";

describe("imageHosts (#581)", () => {
  it("normalizes bare hostnames and full URLs while rejecting wildcards and invalid hosts", () => {
    expect(parseAllowedImageHost("audioblocks-media.s3.amazonaws.com")).toBe(
      "audioblocks-media.s3.amazonaws.com"
    );
    expect(parseAllowedImageHost("https://CDN.AudioBlocks.io/covers/")).toBe("cdn.audioblocks.io");
    expect(parseAllowedImageHost("*.amazonaws.com")).toBeNull();
    expect(parseAllowedImageHost("")).toBeNull();
    expect(parseAllowedImageHost("   ")).toBeNull();
  });

  it("allows configured S3/CDN and IPFS gateway hosts with /ipfs/** restriction", () => {
    const patterns = buildImageRemotePatterns({
      NEXT_PUBLIC_ASSET_CDN_HOST: "audioblocks-media.s3.amazonaws.com",
      NEXT_PUBLIC_IPFS_GATEWAY_HOST: "gateway.pinata.cloud",
    });

    expect(patterns).toEqual([
      {
        protocol: "https",
        hostname: "audioblocks-media.s3.amazonaws.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/ipfs/**",
      },
    ]);
  });

  it("defaults IPFS gateway to gateway.pinata.cloud and rejects arbitrary hosts", () => {
    const patterns = buildImageRemotePatterns({});
    expect(patterns).toEqual([
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud",
        pathname: "/ipfs/**",
      },
    ]);
    expect(patterns.some((p) => p.hostname === "evil.example.com")).toBe(false);
    expect(patterns.some((p) => p.hostname === "*")).toBe(false);
  });
});
