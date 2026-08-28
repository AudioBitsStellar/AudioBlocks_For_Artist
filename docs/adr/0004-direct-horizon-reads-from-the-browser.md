# ADR-0004: Read-only Stellar queries go directly from the browser to Horizon

## Status

Accepted.

## Context

Several features only need to *read* public chain state that's already
unauthenticated and public by design: an artist's XLM balance
(`WalletBalanceDisplay.tsx`), their recent transaction history
(`TransactionHistoryViewer.tsx`), and a live network-fee estimate for the
"Est. gas" hint shown before minting/transferring
(`MintSongButton.tsx`/`SetupArtistOnChainProfile.tsx`). None of this data is
specific to this app or requires the backend's involvement — Horizon (the
public Stellar API) already serves it directly, and proxying it through
`AudioBlock_Backend` would add a network hop, a backend endpoint to
maintain, and a staleness window for data that's cheaper to just fetch live.

## Decision

`src/lib/horizon.ts` is a minimal, dependency-free Horizon REST client that
runs entirely client-side and talks straight to whichever Horizon instance
the app is currently pointed at (`fetchAccountBalances`,
`fetchAccountTransactions`, `fetchFeeStats`, `explorerTxUrl`). It
deliberately does not go through `src/api/queryClient.ts` — there is no
backend round-trip to layer React Query's mutation/cache machinery over,
just a plain read from a public API, so components call these functions
directly in a `useEffect`/`useCallback` pair (see `WalletBalanceDisplay.tsx`
for the pattern).

Which Horizon instance "currently pointed at" means is itself configurable:
`src/lib/stellarNetwork.ts` resolves testnet vs. mainnet from an explicit
user choice (persisted in `localStorage`, changeable from
Settings → Network) falling back to `NEXT_PUBLIC_STELLAR_RPC_URL` /
`NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE` for whichever network those env
vars describe. This only affects the read-only calls in this file — it does
not change which network the backend prepares/submits transactions against
(see [ADR-0002](0002-soroban-prepare-sign-submit-split.md)), which is why
switching networks here surfaces a Freighter-network-mismatch warning
instead of silently assuming everything else followed along.

## Consequences

- Balance, transaction history, and gas-estimate features work with zero
  backend involvement and no added backend endpoints to build or maintain.
- These reads are only as reliable as the public Horizon instance in use —
  there's no backend-side caching or retry layer in front of them, so a
  Horizon outage or rate limit surfaces directly in the UI (each consumer
  handles its own loading/error state, matching the pattern in
  `WalletBalanceDisplay.tsx`).
- Because this bypasses `queryClient.ts`, it's the one part of the codebase
  that doesn't get React Query's shared caching/retry policy from
  [ADR-0001](0001-react-query-for-server-state.md) — a deliberate,
  scoped exception, not a precedent for skipping the query layer elsewhere.
- A user can point the *read* path at a different network than the backend
  is actually configured for (e.g. browsing mainnet balances while the
  backend only prepares testnet transactions). This is by design for
  read-only exploration, but it means "Est. gas" and balance figures can
  reflect a different network than an in-flight mint/transfer will actually
  execute on — the UI is expected to make that distinction visible rather
  than silently blend the two.
