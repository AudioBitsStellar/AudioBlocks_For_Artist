# Service Layer & API Endpoints Documentation

This document provides complete documentation for the frontend service layer located at `app/src/services/`. The service layer encapsulates API endpoints, HTTP requests, payload and response shapes, and React Query custom hooks used throughout AudioBlocks For Artist.

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Service Modules](#service-modules)
   - [1. Album Service (`albumService.ts`)](#1-album-service-albumservicets)
   - [2. Analytics Service (`analyticsService.ts`)](#2-analytics-service-analyticsservicets)
   - [3. Artist Service (`artistServices.ts`)](#3-artist-service-artistservicets)
   - [4. Auth Service (`authService.ts`)](#4-auth-service-authservicets)
   - [5. Earnings Service (`earningsService.ts`)](#5-earnings-service-earningsservicets)
   - [6. Events Service (`eventsService.ts`)](#6-events-service-eventsservicets)
   - [7. Merch Service (`merchService.ts`)](#7-merch-service-merchservicets)
   - [8. Message Service (`messageService.ts`)](#8-message-service-messageservicets)
   - [9. Notification Preferences Service (`notificationPreferences.ts`)](#9-notification-preferences-service-notificationpreferencests)
   - [10. On-chain Service (`onchainService.ts`)](#10-on-chain-service-onchainservicets)
   - [11. Overview Service (`overviewService.ts`)](#11-overview-service-overviewservicets)
   - [12. Royalty Distribution Service (`royaltyDistributionService.ts`)](#12-royalty-distribution-service-royaltydistributionservicets)
   - [13. Scheduled Release Service (`scheduledReleaseService.ts`)](#13-scheduled-release-service-scheduledreleaseservicets)
   - [14. Upload Service (`uploadService.ts`)](#14-upload-service-uploadservicets)
   - [15. Verification Service (`verificationService.ts`)](#15-verification-service-verificationservicets)
3. [Standard Error Handling & Toast Normalization](#standard-error-handling--toast-normalization)

---

## Architecture Overview

All services utilize custom React Query abstractions (`useGet`, `usePost`, `usePut`, `useDelete`) built on top of an Axios instance (`@/api/axios`). API endpoint constants are stored in `@/api/api-endpoint.ts`.

- **Caching & Stale Times**: Queries default to cached responses with configurable `staleTime`.
- **Mock Data Fallbacks**: Surfaces check `featureFlags` (`@/lib/featureFlags.ts`) when API endpoints are not yet deployed or in preview environments.
- **Normalization**: Errors are normalized through `normalizeError` to guarantee status code handling (400, 401, 403, 404, 422, 500) and toast notifications.

---

## Service Modules

### 1. Album Service (`albumService.ts`)

Manages fetching artist album collections.

#### Hooks & Endpoints

##### `useGetAlbums(enabled?: boolean)`
- **Endpoint**: `GET /api/v1/albums`
- **Params**: `enabled` (boolean, default `true`) — controls query execution.
- **Cache Stale Time**: 2 minutes (`1000 * 60 * 2`).
- **Response Shape**: `AlbumsResponse`
  ```typescript
  interface Album {
    id: string | number;
    title: string;
    artistName?: string;
    artist?: string;
    coverArtUrl?: string;
    releaseDate?: string;
    trackCount?: number;
    type?: string;
  }
  interface AlbumsResponse {
    data: Album[];
    message?: string;
  }
  ```

---

### 2. Analytics Service (`analyticsService.ts`)

Provides streaming analytics, play trends, and demographic metrics.

#### Hooks & Endpoints

##### `useGetAnalyticsSummary()`
- **Endpoint**: `GET /api/v1/analytics/summary`
- **Response Shape**:
  ```typescript
  interface AnalyticsSummaryResponse {
    totalPlays: number;
    uniqueListeners: number;
    totalRevenue: number;
    topTrack: string;
  }
  ```

##### `useGetAnalyticsPlayTrends(period: "7d" | "30d" | "90d" | "1y")`
- **Endpoint**: `GET /api/v1/analytics/trends?period={period}`
- **Response Shape**:
  ```typescript
  interface PlayTrendPoint {
    date: string;
    plays: number;
  }
  interface AnalyticsPlayTrendsResponse {
    trends: PlayTrendPoint[];
  }
  ```

##### `useGetAnalyticsGeographic()`
- **Endpoint**: `GET /api/v1/analytics/geographic`
- **Response Shape**: Array of regional listener breakdowns:
  ```typescript
  interface GeoMetric {
    country: string;
    listeners: number;
    percentage: number;
  }
  ```

---

### 3. Artist Service (`artistServices.ts`)

Handles artist profile queries and profile updates.

#### Hooks & Endpoints

##### `useGetArtistProfile(enabled: boolean)`
- **Endpoint**: `GET /api/v1/user/profile`
- **Cache Stale Time**: `0` (refetched on mount).
- **Response Shape**:
  ```typescript
  interface AuthUser {
    id: string;
    name: string;
    email: string;
    bio?: string;
    avatarUrl?: string;
    verified?: boolean;
    socials?: Record<string, string>;
  }
  interface ArtistProfileResponse {
    user: AuthUser;
  }
  ```

##### `useUpdateArtistProfile()`
- **Endpoint**: `PUT /api/v1/user/profile`
- **Payload Shape**: `updateProfilePayload`
  ```typescript
  interface updateProfilePayload {
    name?: string;
    bio?: string;
    avatarUrl?: string;
    socials?: Record<string, string>;
  }
  ```
- **Response Shape**: `{ message?: string }`

---

### 4. Auth Service (`authService.ts`)

Handles authentication authentication operations: signup, login, session termination.

#### Hooks & Endpoints

##### `useLogin()`
- **Endpoint**: `POST /api/v1/auth/login`
- **Payload**: `{ email: string; password: string }`
- **Response**: `{ token: string; user: AuthUser }`

##### `useSignup()`
- **Endpoint**: `POST /api/v1/auth/signup`
- **Payload**: `{ email: string; password: string; name: string }`
- **Response**: `{ message: string; user: AuthUser }`

##### `useLogout()`
- **Endpoint**: `POST /api/v1/auth/logout`
- **Response**: `{ message: string }`

---

### 5. Earnings Service (`earningsService.ts`)

Retrieves revenue, royalty metrics, and monthly payout history.

#### Hooks & Endpoints

##### `useGetEarnings(enabled?: boolean)`
- **Endpoint**: `GET /api/v1/artist/earnings`
- **Response Shape**: `EarningsData`
  ```typescript
  interface EarningsData {
    totalEarnings: number;
    monthOverMonthChange: number;
    payoutHistory: {
      id: string;
      month: string;
      amount: number;
      status: "completed" | "pending";
    }[];
  }
  ```

---

### 6. Events Service (`eventsService.ts`)

Manages ticketed events, show schedules, and check-ins.

#### Hooks & Endpoints

##### `useGetEvents()`
- **Endpoint**: `GET /api/v1/events`
- **Response Shape**: `EventItem[]`

##### `useCreateEvent()`
- **Endpoint**: `POST /api/v1/events`
- **Payload**:
  ```typescript
  interface CreateEventPayload {
    title: string;
    price: string;
    tickets: string;
    date: string;
    time: string;
    image: string;
    description?: string;
  }
  ```

##### `useUpdateEvent(id: number | string)`
- **Endpoint**: `PUT /api/v1/events/{id}`

##### `useDeleteEvent(id: number | string)`
- **Endpoint**: `DELETE /api/v1/events/{id}`

---

### 7. Merch Service (`merchService.ts`)

Handles merchandise inventory, drop listings, and pricing.

#### Hooks & Endpoints

##### `useGetMerches()`
- **Endpoint**: `GET /api/v1/merch`
- **Response Shape**:
  ```typescript
  interface MerchItem {
    id: number;
    title: string;
    detail: string;
    date: string;
    time: string;
    price: string;
    image: string;
  }
  interface MerchResponse {
    items: MerchItem[];
    metrics: { label: string; value: string; descriptor: string; gradient: string }[];
  }
  ```

##### `useCreateMerch()`
- **Endpoint**: `POST /api/v1/merch`

##### `useUpdateMerch(id: number)`
- **Endpoint**: `PUT /api/v1/merch/{id}`

##### `useDeleteMerch(id: number)`
- **Endpoint**: `DELETE /api/v1/merch/{id}`

---

### 8. Message Service (`messageService.ts`)

Supports direct messaging and fan chat communications.

#### Hooks & Endpoints

##### `useGetConversations()`
- **Endpoint**: `GET /api/v1/messages/conversations`

##### `useGetMessages(conversationId: string)`
- **Endpoint**: `GET /api/v1/messages/{conversationId}`

##### `useSendMessage()`
- **Endpoint**: `POST /api/v1/messages/send`
- **Payload**: `{ conversationId: string; content: string }`

##### `useMarkRead()`
- **Endpoint**: `POST /api/v1/messages/read`
- **Payload**: `{ conversationId: string }`

---

### 9. Notification Preferences Service (`notificationPreferences.ts`)

Manages user email and push notification toggles.

#### Hooks & Endpoints

##### `useGetNotificationPreferences()`
- **Endpoint**: `GET /api/v1/user/notifications/preferences`

##### `useUpdateNotificationPreferences()`
- **Endpoint**: `PUT /api/v1/user/notifications/preferences`
- **Payload**:
  ```typescript
  interface NotificationPreferencesPayload {
    emailAlerts: boolean;
    pushNotifications: boolean;
    marketingEmails: boolean;
  }
  ```

---

### 10. On-Chain Service (`onchainService.ts`)

Interacts with Soroban smart contracts for track minting, profile setup, and asset transfers on Stellar.

#### Hooks & Endpoints

##### `useGetOnchainProfile()`
- **Endpoint**: `GET /api/v1/onchain/profile`

##### `useSetupOnchainProfile()`
- **Endpoint**: `POST /api/v1/onchain/setup`
- **Payload**: `{ publicKey: string; artistHandle: string }`

##### `useMintSong()`
- **Endpoint**: `POST /api/v1/onchain/mint`
- **Payload**: `{ songId: string; title: string; ipfsCid: string }`

##### `useTransferSong()`
- **Endpoint**: `POST /api/v1/onchain/transfer`
- **Payload**: `{ songId: string; recipientPublicKey: string }`

---

### 11. Overview Service (`overviewService.ts`)

Provides high-level dashboard metrics (KPIs, recent activity).

#### Hooks & Endpoints

##### `useGetOverviewSummary()`
- **Endpoint**: `GET /api/v1/overview/summary`

##### `useGetOverviewActivity()`
- **Endpoint**: `GET /api/v1/overview/activity`

---

### 12. Royalty Distribution Service (`royaltyDistributionService.ts`)

Distributes streaming royalties among collaborators.

#### Hooks & Endpoints

##### `useGetRoyaltyDistributions()`
- **Endpoint**: `GET /api/v1/royalties/distributions`

##### `useDistributeRoyalties()`
- **Endpoint**: `POST /api/v1/royalties/distribute`
- **Payload**: `{ songId: string; splits: { recipient: string; percentage: number }[] }`

---

### 13. Scheduled Release Service (`scheduledReleaseService.ts`)

Schedules future track and album releases.

#### Hooks & Endpoints

##### `useGetScheduledReleases()`
- **Endpoint**: `GET /api/v1/releases/scheduled`

##### `useScheduleRelease()`
- **Endpoint**: `POST /api/v1/releases/schedule`
- **Payload**: `{ trackId: string; releaseDate: string }`

---

### 14. Upload Service (`uploadService.ts`)

Handles chunked audio file uploads, cover image processing, and IPFS metadata assembly.

#### Hooks & Endpoints

##### `useUploadChunk()`
- **Endpoint**: `POST /api/v1/upload/chunk`
- **Payload**: `FormData` (`fileId`, `chunkIndex`, `chunk`)

##### `useUploadCover()`
- **Endpoint**: `POST /api/v1/upload/cover`
- **Payload**: `FormData` (`fileId`, `cover`)

##### `useFinalizeUpload()`
- **Endpoint**: `POST /api/v1/upload/finalize`
- **Payload**: `{ fileId: string; totalChunks: number; title: string; description: string; genre: string; composers: string; coverArtPath: string }`
- **Response**: `FinalizeSongResponse` `{ data: { id: string; ipfsHash?: string } }`

---

### 15. Verification Service (`verificationService.ts`)

Handles artist identity and account verification requests.

#### Hooks & Endpoints

##### `useGetVerificationStatus()`
- **Endpoint**: `GET /api/v1/verification/status`

##### `useSubmitVerification()`
- **Endpoint**: `POST /api/v1/verification/apply`
- **Payload**: `{ legalName: string; documentType: string; documentUrl: string }`

---

## Standard Error Handling & Toast Normalization

All service layer errors are processed through `normalizeError` to guarantee:
- Unified status code extraction (`status` number, `message` string)
- Idempotency to prevent toast duplications on React Query background refetches
- Integration with `useHandleError` for status-code specific error toasts.
