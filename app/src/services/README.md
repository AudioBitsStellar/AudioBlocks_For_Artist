# Service Layer Architecture

This directory contains React Query hooks and API client services for AudioBlocks For Artist.

Cache freshness windows and invalidation rules are defined centrally in
[`api/cachePolicy.ts`](../api/cachePolicy.ts) — see
[Caching Strategy](../../docs/SERVICE_LAYER_API.md#caching-strategy).

For full API endpoint documentation, parameter definitions, and response shapes, see:
[docs/SERVICE_LAYER_API.md](../../docs/SERVICE_LAYER_API.md)

## Summary of Services

| Service | File | Description |
|---|---|---|
| Album Service | `albumService.ts` | Artist album/EP fetching, listing and creation (see "Album / EP creation" below) |
| Analytics Service | `analyticsService.ts` | Streaming metrics, listener trends, geographic analytics |
| Artist Service | `artistServices.ts` | Artist profile retrieval and update mutations |
| Auth Service | `authService.ts` | Login, signup, and logout operations |
| Contract Upgrade | `contractUpgradeService.ts` | Soroban smart contract WASM upgrades and contract info |
| Earnings Service | `earningsService.ts` | Revenue summaries and payout history |
| Events Service | `eventsService.ts` | Event management, creation, and updates |
| Merch Service | `merchService.ts` | Merch inventory and drop lifecycle management |
| Message Service | `messageService.ts` | Direct messaging and fan interaction chats |
| Notification Preferences | `notificationPreferences.ts` | User email and push notification settings |
| Notification Service | `notificationService.ts` | Bell feed: listing, sorting, mute filtering and read state |
| On-Chain Service | `onchainService.ts` | Soroban contract calls, song minting, and wallet transfers |
| On-Chain Stats Service | `onchainStatsService.ts` | Horizon-derived account activity summary for `/dashboard/onchain-stats` |
| Overview Service | `overviewService.ts` | Dashboard metrics and activity feeds |
| Quality Check Service | `qualityCheckService.ts` | AI master-review scoring, verdicts and result notifications |
| Royalty Distribution | `royaltyDistributionService.ts` | Multi-party royalty splitting |
| Scheduled Release | `scheduledReleaseService.ts` | Release scheduling |
| Track Service | `trackService.ts` | Track edits with optimistic UI updates and rollback |
| Track Visibility | `trackVisibilityService.ts` | Public/unlisted/private rules, the artist's choice, and catalog filtering |
| Upload Service | `uploadService.ts` | Chunked audio uploads, cover art, and finalization |
| Verification Service | `verificationService.ts` | Artist verification requests |

## Album / EP creation

The artist upload page (`/dashboard/upload-music` → **Add Album / EP**) uses a
three-step flow (`components/musicUpload/ReleaseFlow.tsx`): **Details → Tracks →
Review**. Draft logic lives in `utils/releaseDraft.ts`.

| Type  | Tracks |
|-------|--------|
| EP    | 2–6    |
| Album | 7–30   |

`useCreateAlbum().mutateAsync(formData)` sends `POST /artist/albums` as
multipart form data built by `buildReleaseFormData`:

| Field           | Notes |
|-----------------|-------|
| `releaseType`   | `album` or `ep` |
| `albumTitle`    | Release title |
| `genre`         | One of `MUSIC_GENRES` |
| `purchasePrice` | Optional, non-negative number as a string |
| `releaseDate`   | Optional `yyyy-mm-dd`, not in the past |
| `cover`         | Cover image file |
| `songs`         | One entry per track, in release order |
| `trackTitles`   | JSON array of track titles, same order as `songs` |
| `songTitle`     | First track title (kept for backward compatibility) |

