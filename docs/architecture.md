# AudioBlocks Architecture: Frontend, Backend, and Chain Data Flow

This document details the architectural layout, system boundaries, and end-to-end request lifecycles across the **AudioBlocks Artist Dashboard**, the **AudioBlocks Backend**, external storage services, and the **Stellar/Soroban** network.

---

## 1. System Topology & Data Flow

```
+---------------------------------------------------------------------------------------+
|                                    CLIENT BROWSER                                     |
|                                                                                       |
|  +--------------------------------------------------+   +--------------------------+  |
|  |           AudioBlocks Artist Dashboard           |   |     Freighter Wallet     |  |
|  |             (Next.js App Router)                 |   |    Browser Extension     |  |
|  |                                                  |   +-------------+------------+  |
|  |  +-------------------+   +--------------------+  |                 ^               |
|  |  | React UI & Forms  |   | React Query Cache  |  |                 |               |
|  |  +---------+---------+   +----------+---------+  |                 | Sign XDR      |
|  |            |                        |            |                 |               |
|  |  +---------v------------------------v---------+  |                 |               |
|  |  |             API Service Layer              |--+-----------------+               |
|  |  |  (Axios HTTP Client + @stellar/freighter)  |                                    |
|  +--+-------------------+--------------------+---+                                    |
+-------------------------|--------------------|----------------------------------------+
                          |                    | Direct Upload (Pre-signed URL)
                          | REST / JSON        v
                          |            +------------------+
                          |            |  AWS S3 Storage  |
                          |            | (Audio & Images) |
                          v            +------------------+
+-----------------------------------------------------+
|                  BACKEND SERVICE                    |
|                AudioBlock_Backend                   |
|                                                     |
|  +-------------------+      +--------------------+  |
|  |  Auth & Role API  |      |   Media & S3 Mgr   |  |
|  +---------+---------+      +----------+---------+  |
|            |                           |            |
|  +---------v---------+      +----------v---------+  |       +--------------------+
|  |  Soroban Tx Prep  |      | IPFS Metadata Pin  |--+------>|     IPFS Node      |
|  +---------+---------+      +--------------------+  |       |   (NFT Metadata)   |
+------------|----------------------------------------+       +--------------------+
             |                                                           ^
             | Build Unsigned XDR                                        |
             v                                                           |
+------------------------------------------------------------------------+--------------+
|                              STELLAR & SOROBAN NETWORK                                |
|                                                                                       |
|   +--------------------------+                +----------------------------------+    |
|   |    Soroban RPC Node      |--------------->|     AudioBlocks Smart Contracts  |    |
|   | (Simulate, Send, Status) |                |   - AudioNFT Contract (721)      |    |
|   +--------------------------+                |   - Royalty Distribution Engine  |    |
|                                               +----------------------------------+    |
+---------------------------------------------------------------------------------------+
```

---

## 2. Core Subsystems and Responsibilities

### 2.1. Frontend: Artist Dashboard (`app/`)
- **Technology**: Next.js 15 (App Router), React 19, Tailwind CSS 4, TanStack React Query v5.
- **Role**: Provides the user interface for artist onboarding, profile management, audio track/album uploading, royalty distribution inspection, and wallet interactions.
- **Security Boundary**: The frontend **never stores, handles, or requests private keys**. All cryptographic signing delegates exclusively to the user's Freighter wallet browser extension via `@stellar/freighter-api`.

### 2.2. Backend API: `AudioBlock_Backend`
- **Role**: Serves REST endpoints for authentication, role verification, pre-signed upload URL generation, database persistence (PostgreSQL), and Soroban transaction preparation.
- **Transaction Builder**: Assembles contract invocation operations into valid Stellar transaction XDR and encodes function parameters for the client.

### 2.3. Storage Layer (Hybrid: AWS S3 + IPFS)
- **AWS S3**: Secure, low-latency binary storage for high-resolution audio files (WAV, MP3, FLAC) and visual album artwork. Protected via pre-signed, single-use upload and stream URLs.
- **IPFS**: Decentralised metadata repository storing immutable JSON descriptors (track title, artist DID, audio hash, duration, royalty split scheme) referenced on-chain by token URIs.

### 2.4. Blockchain Layer: Stellar / Soroban
- **Soroban Contracts**: Enforce ownership, transferability, and automated royalty splits for minted music tokens.
- **Soroban RPC**: Exposes standard endpoints (`simulateTransaction`, `sendTransaction`, `getTransaction`) to test transaction validity and check on-chain ledger confirmation.

---

## 3. End-to-End Request Lifecycles

### 3.1. Authentication & Session Resolution
1. Artist clicks "Connect Wallet" or logs in with credentials.
2. Frontend requests a cryptographic challenge (nonce/timestamp) from `POST /api/auth/challenge`.
3. Freighter prompts the user to sign the authentication message with their public key.
4. Frontend posts the signature to `POST /api/auth/login`.
5. Backend verifies signature against the Stellar public key and issues an HTTP-only JWT access token and refresh token.
6. The `RoleContext` evaluates the user's role (`artist` vs `listener`) and unlocks the dashboard.

### 3.2. Audio Asset & Metadata Upload Lifecycle
```
Artist Client                 Backend API                  AWS S3                 IPFS
     |                             |                          |                     |
     | 1. POST /api/upload/init    |                          |                     |
     |---------------------------->|                          |                     |
     |                             | 2. Generate Pre-signed   |                     |
     |                             |    PUT URL               |                     |
     | 3. Returns Upload URL & Key |                          |                     |
     |<----------------------------|                          |                     |
     |                                                        |                     |
     | 4. Direct Binary Upload (PUT audio/artwork)            |                     |
     |------------------------------------------------------->|                     |
     |                                                        |                     |
     | 5. POST /api/upload/complete (Key, Track Metadata)     |                     |
     |---------------------------->|                          |                     |
     |                             | 6. Validate S3 Object    |                     |
     |                             |------------------------->|                     |
     |                             |                          |                     |
     |                             | 7. Assemble & Pin Metadata                     |
     |                             |----------------------------------------------->|
     |                             |                          | 8. Return IPFS CID  |
     |                             |<-----------------------------------------------|
     | 9. Upload Ready (CID & ID)  |                          |                     |
     |<----------------------------|                          |                     |
```

### 3.3. On-Chain Minting & Royalty Configuration
```
Artist Client               Backend API              Freighter Wallet         Soroban RPC
     |                           |                          |                      |
     | 1. POST /api/nft/prepare  |                          |                      |
     |    (TrackId, Splits)      |                          |                      |
     |-------------------------->|                          |                      |
     |                           | 2. Build Unsigned XDR    |                      |
     |                           |    (Call Contract)       |                      |
     | 3. Unsigned XDR           |                          |                      |
     |<--------------------------|                          |                      |
     |                                                      |                      |
     | 4. Request Signature (freighter.signTransaction)     |                      |
     |----------------------------------------------------->|                      |
     |                                                      | User Confirms Popup  |
     | 5. Signed XDR returned                               |                      |
     |<-----------------------------------------------------|                      |
     |                                                                             |
     | 6. Submit Signed XDR (via backend or direct RPC)                            |
     |---------------------------------------------------------------------------->|
     |                                                                             |
     | 7. Poll Transaction Status (getTransaction)                                 |
     |---------------------------------------------------------------------------->|
     | 8. Ledger Confirmed (Token ID Issued)                                       |
     |<----------------------------------------------------------------------------|
     |                                                                             |
     | 9. POST /api/nft/confirm (Token ID, Tx Hash)                                |
     |-------------------------->|                                                 |
     | 10. Dashboard Cache       |                                                 |
     |     Invalidated           |                                                 |
```

---

## 4. Key Architectural Safeguards & Gaps

1. **Transaction Simulation Pre-Flight**:
   Every Soroban call prepared by the backend is pre-simulated against current ledger state to prevent failed on-chain submissions, estimate exact resource fees, and ensure contract pre-conditions are satisfied before wallet popup.

2. **Decoupled Asset Delivery**:
   Heavy audio streams and graphic assets bypass the Node.js API application layer, streaming directly through AWS S3 and CloudFront CDN caches.

3. **Optimistic UI with Background Verification**:
   React Query manages optimistic local updates during track metadata changes while background refetches reconcile ledger state once Soroban transaction confirmations finalize.
