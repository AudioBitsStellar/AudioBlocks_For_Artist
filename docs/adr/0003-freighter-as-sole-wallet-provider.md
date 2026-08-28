# ADR-0003: Freighter as the sole supported wallet provider

## Status

Accepted.

## Context

Earlier iterations of this app wired up Dynamic Labs
(`NEXT_PUBLIC_DYNAMIC_ENV_ID`) for wallet-based auth. Dynamic is a
multi-chain wallet aggregator; this product only ever needs one chain
(Stellar/Soroban), and pulling in a multi-chain abstraction layer for a
single-chain app added a dependency and an indirection (an extra
auth/session model bridging Dynamic's identity to a Stellar address)
without a corresponding benefit. `NEXT_PUBLIC_DYNAMIC_ENV_ID` is still in
`.env.example` for older branches, but no code reads it.

## Decision

Talk to [Freighter](https://www.freighter.app) directly via
`@stellar/freighter-api`, wrapped in `src/lib/freighter.ts`
(`connectFreighter`, `getFreighterAddress`, `signTransactionXdr`), and treat
it as the only supported wallet for the foreseeable future. No wallet
abstraction layer sits in front of it.

## Consequences

- Simpler integration surface: `src/lib/freighter.ts` is a thin,
  fully-typed wrapper with no adapter/plugin indirection, and every
  wallet-consuming component (`useStellarWallet.ts` and everything built on
  it) codes directly against Freighter's shape.
- Artists without the Freighter browser extension installed cannot use any
  on-chain feature — every wallet-gated component
  (`ConnectStellarWalletButton.tsx`, `MintSongButton.tsx`,
  `SetupArtistOnChainProfile.tsx`) renders an explicit "Install Freighter"
  prompt rather than falling back to another provider.
- Adding a second wallet later (e.g. a mobile-friendly WalletConnect-style
  option) means introducing a real abstraction at that point — this ADR
  should be revisited (superseded) rather than bolted onto
  `useStellarWallet.ts` as a one-off special case.
- Freighter's own active network (testnet vs. mainnet, set inside the
  extension) is independent of this app's Horizon network selection — see
  [ADR-0004](0004-direct-horizon-reads-from-the-browser.md). The two can
  drift apart, which is why the network switcher surfaces a mismatch
  warning instead of assuming they match.
