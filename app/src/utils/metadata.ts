/**
 * SEO and Social Sharing Metadata Utilities
 *
 * Provides helpers for generating Open Graph and Twitter Card metadata
 * for all pages in the application (issue #156).
 */

import type { Metadata } from "next";

export interface PageMetadata {
  title: string;
  description: string;
  image?: string;
  url?: string;
  type?: "website" | "article" | "profile" | "music.song" | "music.album";
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
  /** Extra keywords merged with the site-wide defaults (deduplicated). */
  keywords?: string[];
  /** Absolute or site-relative canonical URL; defaults to `url`. */
  canonical?: string;
  /** When false, the page is served as `noindex` (thin/error pages). */
  indexable?: boolean;
}

/**
 * Base URL for the application (from environment or default)
 */
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://audioblocks.io";

/**
 * Default Open Graph image path
 */
export const DEFAULT_OG_IMAGE = "/logo.png";

/**
 * Site name constant
 */
export const SITE_NAME = "AudioBlocks";

/**
 * Default site description
 */
export const DEFAULT_DESCRIPTION =
  "Empower artists with blockchain technology. Manage music, track earnings, engage fans, and take control of your creative journey.";

/**
 * Generates complete Next.js Metadata object with Open Graph and Twitter Card tags.
 *
 * @param page - Page-specific metadata configuration
 * @returns Complete Metadata object for Next.js
 *
 * @example
 * ```ts
 * export const metadata = generateMetadata({
 *   title: "My Album",
 *   description: "Check out my latest album",
 *   image: "/albums/my-album.jpg",
 *   url: "/albums/123"
 * });
 * ```
 */
export function generateMetadata(page: PageMetadata): Metadata {
  const fullTitle = page.title.includes(SITE_NAME) ? page.title : `${page.title} | ${SITE_NAME}`;

  const imageUrl = page.image || DEFAULT_OG_IMAGE;
  const fullUrl = page.url ? `${BASE_URL}${page.url}` : BASE_URL;
  const canonical = page.canonical
    ? page.canonical.startsWith("http")
      ? page.canonical
      : `${BASE_URL}${page.canonical}`
    : fullUrl;
  const indexable = page.indexable ?? true;

  return {
    title: fullTitle,
    description: page.description,
    // Guards against the same profile being indexed under several URLs
    // (query strings, trailing slashes, http/https variants).
    alternates: { canonical },

    // Open Graph
    openGraph: {
      title: fullTitle,
      description: page.description,
      url: fullUrl,
      siteName: SITE_NAME,
      images: [
        {
          url: imageUrl.startsWith("http") ? imageUrl : `${BASE_URL}${imageUrl}`,
          width: 1200,
          height: 630,
          alt: page.title,
        },
      ],
      locale: "en_US",
      type: page.type || "website",
      ...(page.publishedTime && { publishedTime: page.publishedTime }),
      ...(page.modifiedTime && { modifiedTime: page.modifiedTime }),
    },

    // Twitter Card
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: page.description,
      images: [imageUrl.startsWith("http") ? imageUrl : `${BASE_URL}${imageUrl}`],
      ...(page.author && { creator: page.author }),
    },

    // Additional SEO
    keywords: Array.from(
      new Set([
        "music",
        "blockchain",
        "NFT",
        "artist dashboard",
        "Web3",
        "Stellar",
        "music rights",
        "royalties",
        ...(page.keywords ?? []),
      ])
    ),
    authors: page.author ? [{ name: page.author }] : [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,

    // Robots
    robots: {
      index: indexable,
      follow: true,
      googleBot: {
        index: indexable,
        follow: true,
        "max-video-preview": -1,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },

    // Verification (add your verification codes here when available)
    // verification: {
    //   google: "your-google-verification-code",
    //   yandex: "your-yandex-verification-code",
    // },
  };
}

/**
 * Generates metadata for music/album pages with specialized tags.
 *
 * @param params - Album or song specific parameters
 * @returns Complete Metadata object optimized for music content
 */
export function generateMusicMetadata(params: {
  title: string;
  artist: string;
  description?: string;
  coverArt?: string;
  releaseDate?: string;
  genre?: string;
  url?: string;
}): Metadata {
  const description =
    params.description || `Listen to ${params.title} by ${params.artist} on AudioBlocks`;

  return generateMetadata({
    title: `${params.title} - ${params.artist}`,
    description,
    image: params.coverArt,
    url: params.url,
    type: "music.song",
    publishedTime: params.releaseDate,
  });
}

/** Fields an artist public profile contributes to its page metadata. */
export interface ArtistMetadataParams {
  name: string;
  /** Public handle, used for the `@handle` keywords and `profile:username`. */
  handle?: string;
  bio?: string;
  profileImage?: string;
  url?: string;
  website?: string;
  twitter?: string;
  genres?: string[];
  songCount?: number;
  albumCount?: number;
  /** Set to false for degraded/empty profiles so they aren't indexed. */
  indexable?: boolean;
}

/** Clips text to a length search engines will actually display. */
function clamp(text: string, max: number): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Generates metadata for artist public profile pages (issue #421).
 *
 * Beyond the shared tags it adds what profile pages specifically need for
 * search/social: a canonical URL, `og:type: "profile"`, the artist's own name
 * and handle as keywords, a `profile:username` hint, and a description that
 * mentions the catalogue when it is known.
 *
 * @param params - Artist profile parameters
 * @returns Complete Metadata object for artist profiles
 */
export function generateArtistMetadata(params: ArtistMetadataParams): Metadata {
  const name = params.name.trim() || "Artist";
  const handle = params.handle?.trim().replace(/^@/, "");
  const catalogue = [
    typeof params.songCount === "number"
      ? `${params.songCount} song${params.songCount === 1 ? "" : "s"}`
      : null,
    typeof params.albumCount === "number"
      ? `${params.albumCount} album${params.albumCount === 1 ? "" : "s"}`
      : null,
  ].filter(Boolean);

  const description = clamp(
    params.bio?.trim() ||
      `${name}${handle ? ` (@${handle})` : ""} on AudioBlocks — listen to their music${
        catalogue.length ? `, explore ${catalogue.join(" and ")}` : ""
      }, and follow the artist on Stellar.`,
    160
  );

  const metadata = generateMetadata({
    title: name,
    description,
    image: params.profileImage,
    url: params.url,
    type: "profile",
    author: name,
    keywords: [name, handle ? `@${handle}` : null, ...(params.genres ?? [])].filter(
      (keyword): keyword is string => Boolean(keyword)
    ),
    indexable: params.indexable,
  });

  return {
    ...metadata,
    // Legacy profile hint understood by some crawlers/PBMs.
    other: handle ? { "profile:username": handle } : undefined,
  };
}

/**
 * Builds the `MusicGroup` JSON-LD graph for an artist public profile
 * (issue #421). Rendered as a `<script type="application/ld+json">` so
 * Google can show a rich artist result instead of a bare blue link.
 *
 * @returns A plain object ready to be serialized; `null` fields are omitted.
 */
export function generateArtistStructuredData(
  params: ArtistMetadataParams
): Record<string, unknown> {
  const name = params.name.trim() || "Artist";
  const handle = params.handle?.trim().replace(/^@/, "");
  const url = params.url
    ? params.url.startsWith("http")
      ? params.url
      : `${BASE_URL}${params.url}`
    : undefined;
  const image = params.profileImage
    ? params.profileImage.startsWith("http")
      ? params.profileImage
      : `${BASE_URL}${params.profileImage}`
    : undefined;

  const sameAs = [
    params.website,
    params.twitter && `https://x.com/${params.twitter.replace(/^@/, "")}`,
  ]
    .filter((link): link is string => Boolean(link))
    .map((link) => (link.startsWith("http") ? link : `https://${link}`));

  return {
    "@context": "https://schema.org",
    "@type": "MusicGroup",
    name,
    ...(handle ? { alternateName: `@${handle}` } : {}),
    ...(url ? { url } : {}),
    ...(image ? { image } : {}),
    ...(params.bio?.trim() ? { description: clamp(params.bio, 300) } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    ...(params.genres?.length ? { genre: params.genres } : {}),
    ...(typeof params.songCount === "number" ? { numberOfItems: params.songCount } : {}),
  };
}

/**
 * Generates metadata for album pages.
 *
 * @param params - Album specific parameters
 * @returns Complete Metadata object for album pages
 */
export function generateAlbumMetadata(params: {
  title: string;
  artist: string;
  description?: string;
  coverArt?: string;
  releaseDate?: string;
  trackCount?: number;
  url?: string;
}): Metadata {
  const trackInfo = params.trackCount
    ? ` • ${params.trackCount} track${params.trackCount !== 1 ? "s" : ""}`
    : "";

  const description =
    params.description ||
    `${params.title} by ${params.artist}${trackInfo}. Stream and collect on AudioBlocks.`;

  return generateMetadata({
    title: `${params.title} - ${params.artist}`,
    description,
    image: params.coverArt,
    url: params.url,
    type: "music.album",
    publishedTime: params.releaseDate,
    author: params.artist,
  });
}

/**
 * Default metadata for the root application
 */
export const defaultMetadata: Metadata = generateMetadata({
  title: "Artist Dashboard",
  description: DEFAULT_DESCRIPTION,
  image: DEFAULT_OG_IMAGE,
  url: "/",
});
