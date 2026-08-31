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
  type?: "website" | "article" | "music.song" | "music.album";
  author?: string;
  publishedTime?: string;
  modifiedTime?: string;
}

/**
 * Base URL for the application (from environment or default)
 */
export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "https://audioblocks.io";

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
  const fullTitle = page.title.includes(SITE_NAME)
    ? page.title
    : `${page.title} | ${SITE_NAME}`;
  
  const imageUrl = page.image || DEFAULT_OG_IMAGE;
  const fullUrl = page.url ? `${BASE_URL}${page.url}` : BASE_URL;

  return {
    title: fullTitle,
    description: page.description,
    
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
    keywords: [
      "music",
      "blockchain",
      "NFT",
      "artist dashboard",
      "Web3",
      "Stellar",
      "music rights",
      "royalties",
    ],
    authors: page.author ? [{ name: page.author }] : [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    
    // Robots
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
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
    params.description ||
    `Listen to ${params.title} by ${params.artist} on AudioBlocks`;

  return generateMetadata({
    title: `${params.title} - ${params.artist}`,
    description,
    image: params.coverArt,
    url: params.url,
    type: "music.song",
    publishedTime: params.releaseDate,
  });
}

/**
 * Generates metadata for artist profile pages.
 * 
 * @param params - Artist profile parameters
 * @returns Complete Metadata object for artist profiles
 */
export function generateArtistMetadata(params: {
  name: string;
  bio?: string;
  profileImage?: string;
  url?: string;
}): Metadata {
  const description =
    params.bio ||
    `${params.name}'s official artist profile on AudioBlocks. Discover their music, stats, and more.`;

  return generateMetadata({
    title: params.name,
    description,
    image: params.profileImage,
    url: params.url,
    type: "website",
    author: params.name,
  });
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
