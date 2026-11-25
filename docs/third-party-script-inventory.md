# Third-Party Script & Dependency Inventory (with DPAs)

This document serves as the regulatory and operational inventory register for all third-party scripts, SDKs, client libraries, and external infrastructure services integrated into the AudioBlocks Artist Dashboard.

Last updated: Launch-readiness audit (Item `COMP-04`).

---

## 1. Third-Party Services & SDK Register

| Service / Vendor | Purpose & Integration | Script / Package | Execution Context | Data Processed | DPA Status & Legal Basis | Retention & Transfer |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Sentry** (Functional Software, Inc.) | Error tracking, exception reporting, performance tracing | `@sentry/nextjs` | Client & Node.js Edge Runtime | Anonymized stack traces, browser user-agent, sanitized error contexts (no private keys or PII) | **DPA in place** (Standard Contractual Clauses - SCCs) | 30-day retention; US-hosted with DPF compliance |
| **Privy** (Privy, Inc.) | Optional user authentication & embedded wallet abstraction | `@privy-io/react-auth`, `@privy-io/server-auth` | Client browser (dynamic load on auth modal) | Wallet public addresses, session tokens, user email (when provided) | **DPA in place** (SCCs & DPA executed) | Session lifecycle; encrypted key shares |
| **Freighter** (SDF) | Non-custodial transaction signing bridge | `@stellar/freighter-api` | Browser extension bridge (no remote script execution) | Public Stellar key, transaction XDR for user review | **Not applicable** (Local client extension; zero data transmission to external servers) | Local to user device; no server logging |
| **AWS** (Amazon Web Services, Inc.) | Media binary hosting (audio WAV/MP3, album cover images) | `@aws-sdk/client-s3` (backend pre-signed URLs) | Client direct PUT / CloudFront CDN GET | Raw audio files, image assets | **AWS GDPR DPA Executed** (AWS Customer Agreement) | Permanent until artist deletes track; S3 versioning |
| **Pinata / IPFS** (Pinata Technologies, Inc.) | Decentralised immutable NFT metadata pinning | REST API via backend worker | Server-side IPFS pinning | Public track metadata JSON, song title, artist DID, IPFS CIDs | **DPA in place** (Public blockchain/IPFS broadcast terms) | Immutable decentralised storage |
| **Stellar / Soroban RPC** (SDF / QuickNode) | Smart contract simulation, submission, and transaction polling | `@stellar/stellar-sdk` | Client & server RPC calls | Public transaction XDR, contract IDs, ledger sequence numbers | **Vendor SLA & DPA** (Public blockchain node provider) | Immutable public ledger data |
| **Plausible Analytics** (Plausible Insights OÜ) | Cookieless privacy-friendly page view metrics (optional via env) | `next/script` (`plausible.js`) | Client-side (only if `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` set) | Anonymized page URL, referrer, screen width (zero cookies, zero IP logging) | **DPA in place** (EU-hosted in Germany, 100% GDPR compliant) | Aggregate statistical data only |

---

## 2. Data Flow & Boundary Isolation Rules

1. **Zero Private Key Exposure**:
   Neither the Artist Dashboard nor any third-party script receives or processes private keys or seed phrases. All transaction signing operations occur exclusively within the isolated Freighter browser extension sandbox.

2. **Sanitized Telemetry**:
   Sentry error reporting is pre-filtered by `beforeSend` hooks in `sentry.client.config.ts` and `sentry.server.config.ts` to strip authentication headers, query parameter tokens, and cryptographic signatures before payload transmission.

3. **Strict Content Security Policy (CSP)**:
   All allowable remote endpoints and script sources are strictly gated via Content-Security-Policy headers in `middleware.ts` and `next.config.ts`. Any attempt by an unauthorized dependency to inject external scripts or make out-of-band network calls is blocked by the browser.

---

## 3. Annual DPA Review & Vendor Assessment

The Engineering Lead and Compliance Counsel perform a semi-annual review of this inventory to:
1. Verify renewed Data Processing Agreements and Standard Contractual Clauses with every active vendor.
2. Ensure third-party SDK versions remain pinned in `package-lock.json` and scanned by `npm audit` and Dependabot.
3. Remove or deprecate unused vendor libraries.
