# Service Layer Architecture

This directory contains React Query hooks and API client services for AudioBlocks For Artist.

For full API endpoint documentation, parameter definitions, and response shapes, see:
[docs/SERVICE_LAYER_API.md](../../docs/SERVICE_LAYER_API.md)

## Summary of Services

| Service | File | Description |
|---|---|---|
| Album Service | `albumService.ts` | Artist album fetching and collection listing |
| Analytics Service | `analyticsService.ts` | Streaming metrics, listener trends, geographic analytics |
| Artist Service | `artistServices.ts` | Artist profile retrieval and update mutations |
| Auth Service | `authService.ts` | Login, signup, and logout operations |
| Earnings Service | `earningsService.ts` | Revenue summaries and payout history |
| Events Service | `eventsService.ts` | Event management, creation, and updates |
| Merch Service | `merchService.ts` | Merch inventory and drop lifecycle management |
| Message Service | `messageService.ts` | Direct messaging and fan interaction chats |
| Notification Preferences | `notificationPreferences.ts` | User email and push notification settings |
| On-Chain Service | `onchainService.ts` | Soroban contract calls, song minting, and wallet transfers |
| Overview Service | `overviewService.ts` | Dashboard metrics and activity feeds |
| Royalty Distribution | `royaltyDistributionService.ts` | Multi-party royalty splitting |
| Scheduled Release | `scheduledReleaseService.ts` | Release scheduling |
| Upload Service | `uploadService.ts` | Chunked audio uploads, cover art, and finalization |
| Verification Service | `verificationService.ts` | Artist verification requests |
