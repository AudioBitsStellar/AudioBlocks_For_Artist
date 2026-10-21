# Artist dashboard ↔ backend API contract map

This page lists every endpoint constant in
[`app/src/api/api-endpoint.ts`](../app/src/api/api-endpoint.ts) and every
client service that keeps its data in `localStorage` instead of calling the
backend. It shows whether each dashboard call has a matching backend route, so
gaps are visible before anyone builds on them.

**Backend reference:** `AudioBitsStellar/AudioBlock_Backend` at commit
`74403b2b6c7ce465a4cb05c98965a56d3ac0f740` (`main`, checked 2026-10-19). The
client base URL is `NEXT_PUBLIC_API_BASE_URL` (default
`http://localhost:3000/api`), so the backend routes below are shown with the
`/api` prefix.

This was checked by reading the backend's `src/app.ts` mount table and its
`src/routes/*` files. Nothing was executed. Treat the status as a snapshot, and
re-check when either side changes.

## Status values

| Status | Meaning |
|---|---|
| `ok` | The client path has a matching backend route on the same mount. |
| `path mismatch` | A backend route exists for the same feature under a different path or prefix. |
| `exists but unmounted` | The router file exists in `src/routes/` but `app.ts` never imports or mounts it, so the endpoint returns 404. |
| `missing on backend` | No backend route implements this endpoint. |

## Endpoint constants

### Auth and users

| Constant | Client path | Backend route | Status | Linked issue |
|---|---|---|---|---|
| `AUTH_ENDPOINTS.REGISTER_EMAIL` | `/auth/register-email` | `POST /api/auth/register-email` | ok | — |
| `AUTH_ENDPOINTS.LOGIN_EMAIL` | `/auth/login-email` | `POST /api/auth/login-email` | ok | — |
| `USER_ENDPOINTS.PROFILE` | `/users/profile` | `GET /api/users/profile` | ok | — |
| `USER_ENDPOINTS.UPDATE_PROFILE` | `/artist/update-profile` | `PATCH /api/artist/update-profile` | ok (confirm the client sends PATCH) | — |

### Uploads and songs

| Constant | Client path | Backend route | Status | Linked issue |
|---|---|---|---|---|
| `ARTIST_UPLOAD_ENDPOINTS.UPLOAD_COVER` | `/song/upload/cover` | `POST /api/song/upload/cover` | ok | — |
| `ARTIST_UPLOAD_ENDPOINTS.UPLOAD_CHUNK` | `/song/upload/chunk` | `POST /api/song/upload/chunk` | ok | — |
| `ARTIST_UPLOAD_ENDPOINTS.UPLOAD_SONG` | `/song/upload/finalize` | `POST /api/song/upload/finalize` | ok | — |
| `ARTIST_UPLOAD_ENDPOINTS.TRANSCRIBE_LYRICS` | `/song/upload/transcribe-lyrics` | — | missing on backend | none yet |
| `SONG_ENDPOINTS.UPDATE` | `/song/:id` | `PATCH /api/song/:id` | ok | — |
| `SONG_ENDPOINTS.TAGS` | `/song/:id/tags` | — (`TagRoutes.ts` is not mounted) | missing on backend | [#819](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/819), [#744](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/744) |
| `SONG_ENDPOINTS.TRANSCRIBE_LYRICS` | `/song/:id/lyrics/transcribe` | — (only `GET /api/song/:id/lyrics` exists) | missing on backend | none yet |
| `SONG_ENDPOINTS.DRAFT_DESCRIPTION` | `/ai/studio/songs/:id/description` | `POST /api/ai-studio/songs/:songId/description` (prefix is `ai-studio`, not `ai/studio`) | path mismatch | none yet |
| `SONG_ENDPOINTS.VERSIONS` | `/song/:id/versions` | `GET /api/song/:id/versions` | ok | — |
| `SONG_ENDPOINTS.REUPLOAD` | `/song/:id/versions` | No `POST /api/song/:id/versions` (only `GET`, plus `/:version/rollback`) | missing on backend | none yet |

### On-chain

| Constant | Client path | Backend route | Status | Linked issue |
|---|---|---|---|---|
| `ARTIST_ONCHAIN_ENDPOINTS.CONNECT_WALLET` | `/artist/onchain/connect-wallet` | `POST /api/artist/onchain/connect-wallet` | ok | — |
| `ARTIST_ONCHAIN_ENDPOINTS.PREPARE_SETUP` | `/artist/onchain/prepare-setup` | `POST /api/artist/onchain/prepare-setup` | ok | — |
| `ARTIST_ONCHAIN_ENDPOINTS.SUBMIT_SETUP` | `/artist/onchain/submit-setup` | `POST /api/artist/onchain/submit-setup` | ok | — |
| `SONG_ONCHAIN_ENDPOINTS.prepareMint` | `/song/:id/onchain/prepare-mint` | `POST /api/song/:id/onchain/prepare-mint` | ok | — |
| `SONG_ONCHAIN_ENDPOINTS.submitMint` | `/song/:id/onchain/submit-mint` | `POST /api/song/:id/onchain/submit-mint` | ok | — |
| `SONG_ONCHAIN_ENDPOINTS.prepareTransfer` | `/song/:id/onchain/prepare-transfer` | — | missing on backend | none yet |
| `SONG_ONCHAIN_ENDPOINTS.submitTransfer` | `/song/:id/onchain/submit-transfer` | — | missing on backend | none yet |

### Merch

| Constant | Client path | Backend route | Status | Linked issue |
|---|---|---|---|---|
| `MERCH_ENDPOINTS.LIST` / `CREATE` | `/artist/merches` | — | missing on backend | none yet |
| `MERCH_ENDPOINTS.UPDATE` / `DELETE` | `/artist/merches/:id` | — | missing on backend | none yet |
| `MERCH_ENDPOINTS.CREATE_ORDER` | `/artist/merches/:id/orders` | — | missing on backend | none yet |
| `MERCH_ENDPOINTS.ORDERS` | `/artist/merches/orders` | — | missing on backend | none yet |
| `MERCH_INVENTORY_ENDPOINTS.LIST` | `/artist/merches/inventory` | — | missing on backend | none yet |
| `MERCH_INVENTORY_ENDPOINTS.UPDATE_STOCK` | `/artist/merches/:id/stock` | — | missing on backend | none yet |
| `MERCH_INVENTORY_ENDPOINTS.ORDERS` | `/artist/merches/orders` | — | missing on backend | none yet |
| `MERCH_INVENTORY_ENDPOINTS.ORDER_STATUS` | `/artist/merches/orders/:orderId` | — | missing on backend | none yet |

### Earnings, overview and transactions

| Constant | Client path | Backend route | Status | Linked issue |
|---|---|---|---|---|
| `EARNINGS_ENDPOINTS.GET_EARNINGS` | `/artist/earnings` | — (`GET /api/royalty-payouts/export` only) | missing on backend | none yet |
| `EARNINGS_ENDPOINTS.GET_PLATFORM_REVENUE` | `/artist/earnings/platforms` | — | missing on backend | none yet |
| `EARNINGS_ENDPOINTS.GET_PAYOUTS` | `/artist/earnings/payouts` | — (`GET /api/royalty-payouts/export` is export-only) | missing on backend | none yet |
| `OVERVIEW_ENDPOINTS.GET_OVERVIEW` | `/artist/overview` | — | missing on backend | [#846](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/846) |
| `OVERVIEW_ENDPOINTS.GET_STATISTICS` | `/artist/statistics` | — | missing on backend | [#846](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/846) |
| `OVERVIEW_ENDPOINTS.GET_RECENT_ACTIVITY` | `/artist/recent-activity` | — (closest: `GET /api/activity/feed/me`) | missing on backend | [#846](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/846) |
| `DASHBOARD_TRANSACTION_ENDPOINTS.LIST` | `/artist/transactions` | — (admin-only `/api/admin/transaction-log`) | missing on backend | none yet |

### Comments and engagement

| Constant | Client path | Backend route | Status | Linked issue |
|---|---|---|---|---|
| `DASHBOARD_COMMENT_ENDPOINTS.LIST` / `CREATE` | `/artist/comments` | — | missing on backend | none yet |
| `DASHBOARD_COMMENT_ENDPOINTS.SONG_COMMENTS` | `/songs/:id/comments` | `GET /:id/comments` in `songEngagementRoutes.ts`, which is unmounted (the mount is `/api/song`, singular) | exists but unmounted | [#749](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/749) |
| `DASHBOARD_COMMENT_ENDPOINTS.CREATE_SONG_COMMENT` | `/songs/:id/comments` | — (no `POST` comment route for songs) | missing on backend | [#749](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/749) |
| `COMMENT_MODERATION_ENDPOINTS.REPORT` | `/comments/:id/report` | `POST /api/comments/:id/report` | ok | — |
| `COMMENT_MODERATION_ENDPOINTS.UPDATE` | `/comments/:id` | `PUT /api/comments/:id` | ok | — |
| `COMMENT_MODERATION_ENDPOINTS.DELETE` | `/comments/:id` | `DELETE /api/comments/:id` | ok | — |
| `COMMENT_MODERATION_ENDPOINTS.BULK` | `/comments/moderation/bulk` | — | missing on backend | none yet |

### Collaborators and team

| Constant | Client path | Backend route | Status | Linked issue |
|---|---|---|---|---|
| `COLLABORATOR_ENDPOINTS.LIST` / `CREATE` | `/artist/collaborators/invites` | — | missing on backend | [#438](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/438) |
| `COLLABORATOR_ENDPOINTS.RESEND` | `/artist/collaborators/invites/:id/resend` | — | missing on backend | [#438](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/438) |
| `COLLABORATOR_ENDPOINTS.REVOKE` | `/artist/collaborators/invites/:id` | — | missing on backend | [#438](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/438) |
| `COLLABORATOR_ENDPOINTS.ACCEPT` | `/artist/collaborators/invites/accept` | — | missing on backend | [#438](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/438) |
| `COLLABORATOR_ENDPOINTS.SONG_COLLABORATORS` | `/song/:id/collaborators` | `GET /api/song/:id/collaborators` | ok | — |
| `COLLABORATOR_ENDPOINTS.SONG_COLLABORATOR` | `/song/:id/collaborators/:userId` | `PATCH /api/song/:id/collaborators/:userId` (no `DELETE`) | ok (confirm the client method) | — |
| `COLLABORATOR_ENDPOINTS.DISPUTE_SPLIT` | `/song/:id/collaborators/dispute` | `POST /api/song/:id/collaborators/dispute` | ok | — |
| `TEAM_ENDPOINTS.*` | `/artist/team`, `/artist/team/invite`, `/artist/team/:id`, `/artist/team/accept-invite` | — | missing on backend | none yet |

### Security and verification

| Constant | Client path | Backend route | Status | Linked issue |
|---|---|---|---|---|
| `SECURITY_ENDPOINTS.TWO_FACTOR_STATUS` | `/artist/security/2fa` | — (no 2FA status route under `/api/auth`) | missing on backend | none yet |
| `SECURITY_ENDPOINTS.TWO_FACTOR_SETUP` | `/artist/security/2fa/setup` | `POST /api/auth/2fa/enable` | path mismatch | none yet |
| `SECURITY_ENDPOINTS.TWO_FACTOR_VERIFY` | `/artist/security/2fa/verify` | `POST /api/auth/2fa/verify` | path mismatch | none yet |
| `SECURITY_ENDPOINTS.TWO_FACTOR_DISABLE` | `/artist/security/2fa/disable` | `POST /api/auth/2fa/disable` | path mismatch | none yet |
| `VERIFICATION_ENDPOINTS.APPLY` / `STATUS` | `/artist/verification` | — (the admin review side exists at `/api/admin/verification`) | missing on backend | [#426](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/426) |
| `AUDIT_LOG_ENDPOINTS.LIST` | `/artist/audit-logs` | — (admin audit trail not exposed to artists) | missing on backend | [#505](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/505) |

### Analytics, fans and events

| Constant | Client path | Backend route | Status | Linked issue |
|---|---|---|---|---|
| `ANALYTICS_ENDPOINTS.SUMMARY` | `/artist/analytics/summary` | — | missing on backend | [#448](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/448) |
| `ANALYTICS_ENDPOINTS.DATA` | `/artist/analytics?period=` | — | missing on backend | [#448](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/448), [#443](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/443) |
| `FANS_ENGAGEMENT_ENDPOINTS.GET_FANS_ENGAGEMENT` | `/artist/fans-engagement` | — | missing on backend | none yet |
| `EVENTS_ENDPOINTS.LIST` / `CREATE` | `/artist/events` | — | missing on backend | none yet |
| `EVENTS_ENDPOINTS.UPDATE` / `DELETE` | `/artist/events/:id` | — | missing on backend | none yet |
| `EVENTS_ENDPOINTS.CHECK_IN` | `/artist/events/:id/check-in` | — | missing on backend | none yet |
| `EVENTS_ENDPOINTS.TICKETS` | `/artist/events/:id/tickets` | — | missing on backend | none yet |
| `EVENTS_ENDPOINTS.VALIDATE_TICKET` | `/artist/events/:id/validate` | — | missing on backend | none yet |

### Albums, notifications and public or admin pages

| Constant | Client path | Backend route | Status | Linked issue |
|---|---|---|---|---|
| `ALBUM_ENDPOINTS.LIST` / `LIST_FOR_ARTIST` | `/albums` | `GET /api/albums` in `AlbumRoutes.ts`, which is unmounted | exists but unmounted | [#740](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/740) |
| `ALBUM_ENDPOINTS.CREATE` | `/albums` | — (`AlbumRoutes.ts` has only `GET /`) | missing on backend | [#741](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/741) |
| `ALBUM_ENDPOINTS.GET` | `/albums/:albumId` | — | missing on backend | [#741](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/741) |
| `ALBUM_ENDPOINTS.UPDATE` / `DELETE` | `/albums/:albumId` | — | missing on backend | [#741](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/741) |
| `NOTIFICATION_ENDPOINTS.LIST` | `/notifications` | `GET /api/notifications` in `notificationRoutes.ts`, which is unmounted | exists but unmounted | [#746](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/746) |
| `NOTIFICATION_ENDPOINTS.MARK_READ` | `/notifications/:id/read` | `PUT /api/notifications/:id/read` (unmounted) | exists but unmounted | [#746](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/746) |
| `NOTIFICATION_ENDPOINTS.MARK_ALL_READ` | `/notifications/read-all` | `POST /api/notifications/read-all` (unmounted) | exists but unmounted | [#746](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/746) |
| `PUBLIC_ARTIST_ENDPOINTS.PROFILE` | `/artist/public/:handle` | — (closest: `GET /api/users/:id/public`) | path mismatch | none yet |
| `ADMIN_ARTIST_ENDPOINTS.SEARCH` | `/admin/artists` | — | missing on backend | none yet |

Routes listed in the issue description but not present in `api-endpoint.ts`
(`/contract/*`) are not covered here.

## Services that bypass the API and use `localStorage`

These services reference `localStorage` in `app/src/services/`. They are found
by a text search, so the list is a starting point. Where a service is
`localStorage`-only, the dashboard does not reach the backend at all.

| Service | Feature | Linked issue |
|---|---|---|
| `securitySettingsService.ts` | Security settings | none yet |
| `teamService.ts` | Team management | none yet |
| `collaboratorService.ts` | Collaborator invites | [#438](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/438) |
| `emailVerificationService.ts` | Email verification | none yet |
| `auditLogApi.ts` | Audit log | [#505](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/505) |
| `royaltySplitService.ts` | Royalty splits | [#439](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/439) |
| `royaltyTemplateService.ts` | Royalty templates | [#756](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/756) |
| `trackVisibilityService.ts` | Track visibility | none yet |
| `notificationService.ts` | Notifications | [#746](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/746) |
| `notificationPreferences.ts` | Notification preferences | [#427](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/427) |
| `verificationService.ts`, `verificationApi.ts` | Artist verification | [#426](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/426) |
| `fanPerkService.ts` | Fan perks | [#757](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/757) |
| `fanMessagingService.ts` | Fan messaging | none yet |
| `linkedAccountsService.ts` | Linked accounts | none yet |
| `releaseService.ts` | Releases | [#752](https://github.com/AudioBitsStellar/AudioBlock_Backend/issues/752) |
| `onboardingService.ts` | Onboarding | none yet |
| `qualityCheckService.ts` | Quality checks | none yet |
| `authService.ts` | Token storage only | not a bypass |

## Follow-up

For each `missing on backend` row with **none yet**, a backend issue still
needs to be opened and linked. Until then the dashboard runs on mock data or
`localStorage` for those features (see `NEXT_PUBLIC_USE_MOCK_DATA` in
[`app/src/lib/featureFlags.ts`](../app/src/lib/featureFlags.ts)).
