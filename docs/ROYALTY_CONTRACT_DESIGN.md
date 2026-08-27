# Royalty Smart Contract — Design (#286)

This document specifies the Soroban `royalty` contract that will split a
song's mint/sale proceeds between the artist and any configured collaborators
on-chain, plus the frontend/backend surface needed to use it. The Soroban
contract itself lives in the (separate) contracts repo; this document
captures the interface this frontend integrates against, and the stub types
that keep the frontend and contract in lockstep once it lands.

## Goals

- Every `mint_song` sale pays out automatically to N recipients by basis-point
  share, with no manual distribution step.
- Shares are set once at mint time and are immutable per song (avoids the
  "artist quietly changes the split after release" trust problem).
- Payout happens atomically with the mint/sale transaction — no separate
  claim step, no custodial holding of funds.

## Contract interface (planned)

```rust
#[contracttype]
pub struct RoyaltySplit {
    pub recipient: Address,
    pub basis_points: u32, // out of 10_000; all splits for a song must sum to 10_000
}

pub trait RoyaltyContract {
    /// Registers the immutable split for a song at mint time. Called once,
    /// atomically with `mint_song` in the same transaction.
    fn set_split(env: Env, song_id: Symbol, splits: Vec<RoyaltySplit>);

    /// Distributes `amount` across a song's registered splits. Called by the
    /// marketplace/mint contract on every sale; reverts if `set_split` was
    /// never called for `song_id`.
    fn distribute(env: Env, song_id: Symbol, amount: i128);

    /// Read-only: returns the registered splits for a song.
    fn get_split(env: Env, song_id: Symbol) -> Vec<RoyaltySplit>;
}
```

## Frontend integration surface (this repo)

Once the contract is deployed, the backend needs:

- `POST /song/onchain/prepare-royalty-split` — builds the `set_split` XDR
  given `{ songId, splits: { address, basisPoints }[] }`
- `POST /song/onchain/submit-royalty-split` — relays the signed XDR, same
  prepare/submit pattern as `mint_song` (see `services/onchainService.ts`)

The frontend types below are the stub for that surface — swapping in the
real backend endpoints only touches `services/onchainService.ts`, not
consuming components.

## Validation rules (frontend + contract, defense in depth)

- `basisPoints` across all splits for a song must sum to exactly `10_000`
- No duplicate `recipient` addresses in one split set
- At least one split (the artist themself, by default 100%)
- Every `recipient` must be a valid Stellar `G...` address

## Status

Design only in this PR — no contract code lives in this repo. The stub types
in `types/royalty.ts` and the validator in `lib/royaltySplit.ts` let UI work
(a future split editor form) start against a stable shape before the contract
and backend endpoints exist.
