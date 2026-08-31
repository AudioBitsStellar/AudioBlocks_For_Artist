# SEO and Social Sharing Metadata Guide

This guide explains how to add proper SEO and social sharing metadata to pages in the AudioBlocks application (resolves issue #156).

## Overview

All pages now include comprehensive metadata for:
- **Open Graph** (Facebook, LinkedIn, etc.)
- **Twitter Cards**
- **SEO optimization** (title, description, keywords)
- **Search engine directives** (robots, indexing)

## Quick Start

### For Standard Pages

Use the `generateMetadata()` helper in your page or layout file:

```typescript
import type { Metadata } from "next";
import { generateMetadata } from "@/utils/metadata";

export const metadata: Metadata = generateMetadata({
  title: "My Page Title",
  description: "A compelling description for search engines and social media",
  url: "/my-page",
  image: "/images/my-og-image.jpg", // Optional, defaults to logo
});
```

### For Music/Album Pages

Use specialized helpers for music content:

```typescript
import { generateMusicMetadata } from "@/utils/metadata";

export const metadata = generateMusicMetadata({
  title: "Song Title",
  artist: "Artist Name",
  description: "Optional description",
  coverArt: "/albums/cover.jpg",
  releaseDate: "2024-01-15",
  genre: "Electronic",
  url: "/music/song-id",
});
```

### For Album Pages

```typescript
import { generateAlbumMetadata } from "@/utils/metadata";

export const metadata = generateAlbumMetadata({
  title: "Album Title",
  artist: "Artist Name",
  description: "Album description",
  coverArt: "/albums/album-cover.jpg",
  releaseDate: "2024-01-15",
  trackCount: 12,
  url: "/albums/album-id",
});
```

### For Artist Profile Pages

```typescript
import { generateArtistMetadata } from "@/utils/metadata";

export const metadata = generateArtistMetadata({
  name: "Artist Name",
  bio: "Artist bio goes here...",
  profileImage: "/artists/profile.jpg",
  url: "/artists/artist-id",
});
```

## Generated Tags

Each metadata generation includes:

### Open Graph Tags
- `og:title` - Page title
- `og:description` - Page description
- `og:image` - Social sharing image (1200x630)
- `og:url` - Canonical page URL
- `og:type` - Content type (website, music.song, music.album)
- `og:site_name` - "AudioBlocks"
- `og:locale` - "en_US"

### Twitter Card Tags
- `twitter:card` - "summary_large_image"
- `twitter:title` - Page title
- `twitter:description` - Page description
- `twitter:image` - Social sharing image
- `twitter:creator` - Artist name (when applicable)

### SEO Tags
- `title` - Browser tab title
- `description` - Meta description
- `keywords` - Relevant keywords
- `robots` - Indexing directives
- `authors` - Content authors
- `creator` - Content creator
- `publisher` - "AudioBlocks"

## Image Requirements

### Social Sharing Images (OG Images)
- **Dimensions**: 1200x630 pixels (recommended)
- **Format**: PNG or JPG
- **File size**: Under 5MB
- **Location**: `/public/` directory
- **Fallback**: `/public/logo.png` is used when no image is specified

### Best Practices
1. Use high-quality, relevant images
2. Include text overlay sparingly (it may be cropped on some platforms)
3. Test previews using:
   - [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
   - [Twitter Card Validator](https://cards-dev.twitter.com/validator)
   - [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)

## Configuration

### Environment Variables

Set the base URL in your environment:

```env
NEXT_PUBLIC_BASE_URL=https://audioblocks.io
```

This is used to generate absolute URLs for Open Graph and Twitter Card images.

### Default Values

Default values are configured in `app/src/utils/metadata.ts`:

- `BASE_URL`: Defaults to `https://audioblocks.io`
- `DEFAULT_OG_IMAGE`: `/logo.png`
- `SITE_NAME`: "AudioBlocks"
- `DEFAULT_DESCRIPTION`: Generic site description

## Testing

### Local Testing
1. Run the development server
2. View page source to verify meta tags
3. Use browser extensions like "Meta SEO Inspector"

### Social Media Preview Testing
1. Deploy to staging/production
2. Use platform-specific validators:
   - Facebook: https://developers.facebook.com/tools/debug/
   - Twitter: https://cards-dev.twitter.com/validator
   - LinkedIn: https://www.linkedin.com/post-inspector/

### What to Check
- ✅ All required tags are present
- ✅ Images load correctly (absolute URLs)
- ✅ Titles are descriptive and under 60 characters
- ✅ Descriptions are compelling and under 160 characters
- ✅ Preview cards display properly on all platforms

## Examples

### Landing Page
```typescript
// app/src/app/page.tsx
export const metadata = generateMetadata({
  title: "AudioBlocks for Artists",
  description: "Mint, distribute & earn royalties on Stellar",
  url: "/",
});
```

### Dynamic Music Page
```typescript
// app/src/app/music/[id]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const song = await fetchSong(params.id);
  
  return generateMusicMetadata({
    title: song.title,
    artist: song.artist,
    description: song.description,
    coverArt: song.coverArtUrl,
    releaseDate: song.releaseDate,
    url: `/music/${params.id}`,
  });
}
```

### Profile Page
```typescript
// app/src/app/profile/[username]/page.tsx
export async function generateMetadata({ params }): Promise<Metadata> {
  const artist = await fetchArtist(params.username);
  
  return generateArtistMetadata({
    name: artist.name,
    bio: artist.bio,
    profileImage: artist.profileImageUrl,
    url: `/profile/${params.username}`,
  });
}
```

## Troubleshooting

### Images Not Showing in Previews
- Ensure images use absolute URLs starting with `https://`
- Verify images are publicly accessible
- Check image file sizes (should be under 5MB)
- Clear cache on social media validators

### Title Too Long
- Keep titles under 60 characters for best display
- Use the pipe separator: `Page Title | AudioBlocks`
- The utility automatically appends "| AudioBlocks" if not present

### Description Cut Off
- Keep descriptions between 120-160 characters
- Front-load important information
- Avoid trailing ellipses (platforms add them automatically)

## Additional Resources

- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [Next.js Metadata API](https://nextjs.org/docs/app/building-your-application/optimizing/metadata)
- [Google Search Central - Meta Tags](https://developers.google.com/search/docs/appearance/snippet)
