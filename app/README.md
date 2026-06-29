# AudioBlocks — Artist Dashboard

The artist-facing web app for **AudioBlocks**, a music NFT platform on
Stellar/Soroban. Artists sign up, upload songs and albums, connect a Stellar
wallet, and mint their profile and music as NFTs — all on-chain actions are
signed by the artist's own wallet; this app and its backend never hold an
artist's private key.

> Note: the actual Next.js project lives in this `app/` subdirectory of the
> repository, not at the repo root.

## Table of Contents

- [Architecture](#architecture)
- [Tech Stack](#tech-stack)
- [Routes](#routes)
- [Authentication](#authentication)
- [On-Chain Integration: Freighter + Soroban](#on-chain-integration-freighter--soroban)
- [Song Upload Pipeline](#song-upload-pipeline)
- [Project Structure](#project-structure)
- [Environment Variables](#environment-variables)
- [Getting Started](#getting-started)
- [Scripts](#scripts)
- [Known Gaps / In Progress](#known-gaps--in-progress)

## Architecture

```
┌────────────────────────────┐
│      Artist Dashboard        │
│ (this repo, Next.js/Vercel)  │
└────────────┬────────────────┘
             │ REST (axios + React Query)
             ▼
   ┌──────────────────┐        ┌──────────────────────┐
   │  AudioBlock_Backend │◀────▶│  PostgreSQL / S3 / IPFS │
   └─────────┬──────────┘        └──────────────────────┘
             │ prepares unsigned XDR
             ▼
   ┌──────────────────┐
   │  Freighter wallet  │── signs ──▶ submitted back to backend ──▶ Soroban RPC
   └──────────────────┘
```

The app talks to the [`AudioBlock_Backend`](../../AudioBlock_Backend) API for
everything — auth, profile, uploads — and to the
[Freighter](https://www.freighter.app/) browser extension directly (via
`@stellar/freighter-api`) for anything that requires an on-chain signature.

## Tech Stack

| Concern | Library |
|---|---|
| Framework | Next.js 16 (App Router, React Compiler enabled), React 19 |
| Styling | Tailwind CSS 4, Radix UI primitives (`Dialog`, `Tabs`) |
| Forms | `react-hook-form` |
| Data fetching | TanStack React Query, `axios` |
| Charts | Recharts |
| Carousels | `react-slick` |
| Toasts | `sonner` |
| Stellar / Soroban wallet | `@stellar/freighter-api` |

## Routes

| Route | Description |
|---|---|
| `/` | Public artist-hub landing page (hero, features, upgrade CTA) |
| `/login` | Email + password login |
| `/signup` | Email + password signup (always registers as `role: "artist"`) |
| `/dashboard` | Redirects to `/dashboard/overview` |
| `/dashboard/overview` | KPI cards, earnings/royalties chart, albums carousel, fan engagement |
| `/dashboard/my-music` | Song/album library, links to upload flow |
| `/dashboard/upload-music` | Upload a song or an album |
| `/dashboard/events` | Artist events management |
| `/dashboard/merches` | Merchandise management |
| `/dashboard/profile` | Profile editor, notification settings, and the **On-chain** tab (connect wallet + mint profile) |

## Authentication

Email + password is the sole auth method: `/signup` and
`/login` call the backend's `register-email`/`login-email` endpoints and
store the returned JWT in an `audioblocks_jwt` cookie, which the shared
axios client (`src/api/axios.ts`) attaches to every subsequent request as a
`Bearer` token.

## On-Chain Integration: Freighter + Soroban

The backend never holds an artist's secret key — every on-chain action is
signed by the artist's own [Freighter](https://www.freighter.app/) wallet in
the browser. The flow, implemented in `src/lib/freighter.ts` and
`src/components/common/wallet/useStellarWallet.ts`:

1. **Connect** — `ConnectStellarWalletButton` calls `connectFreighter()`,
   which prompts the Freighter extension for account access, then POSTs the
   resulting public key to the backend (`connect-wallet`) so it's associated
   with the artist's account.
2. **Prepare** — an action like "Set up on-chain profile" or "Mint on-chain"
   calls a backend `prepare-*` endpoint, which returns an unsigned Soroban
   transaction as XDR.
3. **Sign** — `signAndSubmit()` hands that XDR to Freighter
   (`signTransactionXdr`), which shows the artist exactly what they're
   approving and signs it locally; the secret key never leaves the
   extension.
4. **Submit** — the signed XDR is POSTed to the backend's `submit-*`
   endpoint, which relays it to Soroban and returns the transaction hash and
   the resulting on-chain ID (artist ID / song token ID).

This pattern is used by two components:

- **`SetupArtistOnChainProfile`** (Profile → On-chain tab) — one-time artist
  profile registration on the `artist` Soroban contract.
- **`MintSongButton`** (shown after a successful song upload) — mints a song
  NFT via the `catalog` Soroban contract.

## Song Upload Pipeline

`src/components/musicUpload/Song.tsx` implements a chunked upload so large
audio files don't hit request-size limits:

1. The file is split client-side into 2MB chunks (`src/utils/chunkUploader.ts`)
   and uploaded sequentially.
2. The cover image is uploaded separately.
3. A "finalize" call tells the backend to merge the chunks and create the
   song record — the backend then transcodes and pins the song's metadata in
   the background.
4. Once finalized, a `MintSongButton` appears so the artist can mint the song
   on-chain whenever they're ready (independent of the upload itself).

> **Album upload** (`src/components/musicUpload/Album.tsx`) is currently a
> UI prototype — its progress bars are simulated locally and it is not yet
> wired to the real upload services that `Song.tsx` uses.

## Project Structure

```
src/
├── app/                       # routes (App Router)
│   ├── login/, signup/
│   └── dashboard/
│       ├── overview/, my-music/, upload-music/, events/, merches/, profile/
├── api/                        # axios client, React Query hook factories, endpoint registry
├── components/
│   ├── common/wallet/            # Freighter connect/sign/submit + on-chain action components
│   ├── musicUpload/                # Song.tsx (wired), Album.tsx (prototype)
│   ├── common/artist-hub/          # landing page sections
│   ├── common/modals/                # claim-name, add-music, new-event modals
│   └── ...dashboard widgets (charts, tables, sidebar, top header)
├── services/                   # authService, artistServices, uploadSerive, onchainService
├── lib/freighter.ts             # thin wrapper over @stellar/freighter-api
├── hooks/                       # toast handler hooks
├── context/provider.tsx         # React Query provider
└── types/                       # shared request/response types
```

## Environment Variables

```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api   # AudioBlock_Backend base URL
```

> No `.env.local` ships by default — without this variable set, the app
> falls back to `http://localhost:3000/api`, which is almost never the
> backend's actual port. Set this explicitly.

## Getting Started

```bash
cd app                # the Next.js project root
npm install
echo "NEXT_PUBLIC_API_BASE_URL=http://localhost:4000/api" > .env.local
npm run dev
```

The app needs a running [`AudioBlock_Backend`](../../AudioBlock_Backend)
instance to do anything beyond render static pages — auth, profile, uploads,
and on-chain actions all require it.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the Next.js dev server |
| `npm run build` | Production build |
| `npm start` | Serves the production build |
| `npm run lint` | Runs ESLint |

## Known Gaps / In Progress

- `Album.tsx`'s upload flow is UI-only and needs to be wired to the same
  chunked-upload services `Song.tsx` already uses.
- Several dashboard widgets (overview KPIs, events, merches, "My Music")
  currently render static/mock data rather than live data from the backend.
