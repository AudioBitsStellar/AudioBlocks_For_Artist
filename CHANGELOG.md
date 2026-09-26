# Changelog

All notable changes to AudioBlocks For Artist will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **Artist team & staff access** (#460): `/dashboard/team` with seat accounting, an
  invite form and a per-row role picker, gated on the `roles:manage` permission
  that `@/types/role` already declared. Refused mutations write a denied entry
  instead of throwing; the roster is a localStorage stand-in until `/api/v1/team`
  ships.
- **Team activity log** (#461): `auditLogService.ts` keeps a rolling trail of
  member, content and settings changes — blocked attempts included — with
  filtering, CSV/JSON export and a formula-injection guard on exported cells.
  Surfaced in `AuditTrailPanel`.
- **Onboarding email verification** (#459): a six-digit code step between signup
  and the dashboard, with an attempt budget, a resend cooldown, and a gate that
  artists who registered before it shipped never trip. `OtpInput` provides the
  split-box field.
- **Dashboard keyboard shortcuts** (#462): `g`-prefixed jumps to every dashboard
  section and `?` for the list, defined in `utils/keyboardShortcuts.ts` and
  mounted by the dashboard layout. Text fields and browser combinations keep
  their keys.
- **On-chain royalty distribution** (#294): Service and types for automatic royalty splitting via Soroban smart contracts. Includes `useRoyaltyDistributionService` hook with prepare/submit/update mutations, basis-point validation, and share calculation utilities.
- **Soroban contract error handling** (#288): `translateContractError()` maps raw contract errors to user-friendly messages with categories, severity levels, and actionable resolution steps. Covers auth, network, contract, validation, and insufficient balance errors.
- **IPFS metadata viewer** (#287): `IPFSMetadataViewer` component fetches and displays metadata stored on IPFS for minted songs and artists. Supports multiple IPFS gateways, formatted and raw JSON views, loading/error states, and responsive layout.
- **CHANGELOG.md** (#276): Version history tracking.

## [0.1.0] - 2026-08-24

### Added

- Artist on-chain profile setup (connect wallet, register artist)
- Song minting via Soroban smart contracts
- Song transfer between wallets
- Freighter wallet integration for transaction signing
- Stellar testnet/mainnet network switching
- Royalty split validation and types
- Horizon direct reads from the browser
- Music upload flow with transcoding and IPFS pinning
- Artist dashboard with overview, analytics, earnings, and events
- Album management
- Merch store integration
- Message system
- Notification preferences
- Scheduled release support
- Sentry error tracking
- Accessibility audit and WCAG 2.1 AA compliance
- Storybook component library
- Chromatic visual testing
- End-to-end tests with Playwright
- Unit tests with Vitest

### Changed

- Migrated to Next.js 16 with React 19
- Upgraded to Tailwind CSS v4
- Upgraded to Radix UI primitives

### Fixed

- State cleanup on wallet disconnect
- Freighter wallet auto-reconnect
