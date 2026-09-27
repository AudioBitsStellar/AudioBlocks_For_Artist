# Soroban Contract Upgrade Mechanism — Design (#295)

This document specifies the Soroban smart contract upgrade mechanism for AudioBlocks
contracts (`artist`, `catalog`, `royalty`), detailing the contract-level upgrade
interface, authorization model, WASM management, and the frontend prepare-sign-submit
integration lifecycle.

## Goals

- Enable in-place contract code upgrades without changing contract IDs or discarding storage.
- Preserve all existing instance and persistent contract storage (token IDs, artist profiles, royalty configurations).
- Strictly enforce administrator authorization via `admin.require_auth()` before bytecode replacement.
- Follow the project's standard ADR-0002 prepare-sign-submit transaction split.
- Provide comprehensive client-side parameter validation (WASM hash, contract address, redundant upgrade prevention) and user-friendly error handling.

## Soroban Contract Interface (Rust)

In Soroban, smart contract bytecode upgrades are executed using the Soroban SDK's deployer interface: `env.deployer().update_current_contract_wasm(new_wasm_hash)`.

```rust
use soroban_sdk::{contracterror, contracttype, symbol_short, Address, BytesN, Env, Symbol};

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq, PartialOrd, Ord)]
#[repr(u32)]
pub enum UpgradeError {
    AlreadyInitialized = 1,
    NotAuthorized = 2,
    SameWasmHash = 3,
    MigrationFailed = 4,
}

pub trait UpgradableContract {
    /// Upgrades the contract WASM bytecode in-place.
    ///
    /// # Arguments
    /// * `env` - The Soroban execution environment.
    /// * `new_wasm_hash` - The 32-byte SHA-256 hash of the uploaded replacement WASM.
    ///
    /// # Authorization
    /// Requires authorization from the designated contract admin address:
    /// `admin.require_auth()`.
    ///
    /// # Events
    /// Emits `(symbol_short!("upgrade"), old_wasm_hash, new_wasm_hash)`.
    fn upgrade(env: Env, new_wasm_hash: BytesN<32>);

    /// Returns the currently active WASM hash of the contract.
    fn get_wasm_hash(env: Env) -> BytesN<32>;

    /// Returns the administrator address authorized to perform upgrades.
    fn get_admin(env: Env) -> Address;

    /// Sets or transfers the administrator role (admin-only).
    fn set_admin(env: Env, new_admin: Address);
}
```

### In-Place Upgrade Flow

```text
1. Developer compiles new contract WASM:
   stellar contract build

2. Upload new WASM bytecode to Stellar network:
   stellar contract install --wasm target/wasm32-unknown-unknown/release/contract.wasm
   => Returns <new_wasm_hash> (32 bytes / 64 hex characters)

3. Admin triggers upgrade via AudioBlocks frontend / API:
   prepare_upgrade(contract_id, new_wasm_hash) -> sign with Freighter -> submit_upgrade()

4. Contract executes in-place bytecode update:
   env.deployer().update_current_contract_wasm(new_wasm_hash);
```

## Storage & Migration Semantics

- **Instance & Persistent Storage**: Contract instance storage and persistent data remain intact across WASM upgrades.
- **Data Key Compatibility**: Storage keys and struct shapes must maintain backward compatibility or execute a migration sequence during the upgrade call.
- **Event Emission**: The upgrade emits a standardized audit event:
  - Topics: `(Symbol::new(&env, "upgrade"), contract_id)`
  - Data: `(old_wasm_hash, new_wasm_hash, admin)`

## Frontend & Service Integration Surface (This Repo)

Following [ADR-0002](adr/0002-soroban-prepare-sign-submit-split.md), the upgrade flow is exposed via:

- `POST /contract/onchain/prepare-upgrade` — builds the transaction XDR invoking `upgrade(new_wasm_hash)` with the admin's authorization footprint.
- `POST /contract/onchain/submit-upgrade` — relays the Freighter-signed XDR to the Stellar Soroban RPC.
- `GET /contract/:contractId/info` — queries active WASM hash and administrator address.

Frontend implementation:
- Service hook: `app/src/services/contractUpgradeService.ts` (`useContractUpgradeService`)
- Types: `app/src/types/contractUpgrade.ts`
- Validation & formatting: `app/src/lib/contractUpgrade.ts`
- Error mapping: `app/src/lib/contractErrors.ts`

## Validation Rules (Frontend Defense-in-Depth)

- **WASM Hash**: Must be exactly 64 hexadecimal characters representing a 32-byte SHA-256 digest.
- **Contract Address**: Must be a valid 56-character Stellar C-address starting with `C`.
- **Admin Address**: Must be a valid Stellar account (`G...`) or contract (`C...`) address.
- **Redundant Upgrade Prevention**: `new_wasm_hash` must not match the contract's currently deployed WASM hash.
- **Admin Match**: The connected Freighter wallet address must match the on-chain contract administrator.

## Status

Implemented in issue #295. Service hooks, types, validation rules, and error handling are live in `app/src/services/contractUpgradeService.ts` and `app/src/lib/contractUpgrade.ts`.
