# ADR-0002: Split Soroban transactions into backend-prepare / Freighter-sign / backend-submit

## Status

Accepted.

## Context

Minting an artist profile or a song (`register_artist`, `mint_song` on the
`artist`/`catalog` Soroban contracts) requires building a transaction
envelope, having the artist's wallet sign it, and relaying it to the
network. The frontend cannot hold the artist's private key — it never
should, and Freighter (see [ADR-0003](0003-freighter-as-sole-wallet-provider.md))
is explicitly designed so the key never leaves the extension. At the same
time, building a correct Soroban invocation (resolving contract IDs,
sequence numbers, resource footprints, and the IPFS CID a song/artist
record points at) is backend-owned logic that the frontend shouldn't have
to reimplement or keep in sync with contract changes.

## Decision

Every on-chain write is split into three steps across two owners, visible in
`src/services/onchainService.ts` and `src/lib/freighter.ts`:

1. **Prepare (backend)** — `POST .../prepare-*` builds the unsigned
   transaction XDR server-side and returns it with the `networkPassphrase`
   it was built against (`PreparedTransaction` in `src/types/api.ts`).
2. **Sign (Freighter, client-side only)** — `signTransactionXdr()` in
   `src/lib/freighter.ts` hands that XDR to the Freighter extension, which
   prompts the artist and signs it with a key that never leaves the
   extension.
3. **Submit (backend)** — `POST .../submit-*` relays the signed XDR to the
   network and returns the resulting tx hash / minted token ID.

Every mint/setup component (`MintSongButton.tsx`,
`SetupArtistOnChainProfile.tsx`, `BatchMintSongsButton.tsx`) drives this
same three-step sequence through `useStellarWallet().signAndSubmit()` or an
equivalent inline prepare → sign → submit call.

## Consequences

- The artist's signing key never reaches this codebase or the backend —
  the frontend only ever sees XDR strings passing through, matching how
  browser-extension wallets are used elsewhere (MetaMask, Albedo, etc.).
- New on-chain write flows (e.g. song transfer) get built by adding a
  matching `prepare-*`/`submit-*` endpoint pair rather than inventing a new
  signing pathway.
- The prepare and submit steps depend on the backend being reachable and
  built against the same contract addresses/network the frontend is
  configured for; a mismatch surfaces as a prepare/submit failure rather
  than a client-side one (see the network-passphrase mismatch entry in
  `docs/GUIDE.md`'s troubleshooting table, and
  [ADR-0004](0004-direct-horizon-reads-from-the-browser.md) for the one
  category of on-chain data that bypasses the backend entirely).
- A network switch (testnet ↔ mainnet) only changes what the read-only
  Horizon calls point at (balance, transaction history) — the actual
  prepare/submit network is still whatever the backend is deployed against,
  since that's where the XDR gets built. The settings UI added for this
  surfaces a mismatch warning rather than trying to force Freighter or the
  backend onto a different network.
