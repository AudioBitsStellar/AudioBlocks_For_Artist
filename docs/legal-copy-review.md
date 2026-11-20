# Legal Review of Earnings, Royalty, and NFT Copy

**Document Reference:** COMP-01  
**Target Repository:** AudioBitsStellar/AudioBlocks_For_Artist  
**Review Status:** Approved by Legal & Compliance  
**Review Date:** November 2026  

---

## 1. Executive Summary

This document establishes mandatory copy standards and terminology guidelines across all artist portal surfaces in AudioBlocks, specifically covering:
- Creator earnings and streaming revenue distributions
- Smart contract royalty splitting and automated escrow payouts
- Digital music collectibles (NFTs) and tokenized release packaging
- Stellar Soroban smart contract interactions and transaction settlements

These guidelines ensure compliance with U.S. Federal Securities Laws (Howey Test boundaries), FinCEN regulations regarding money transmission exemptions, FTC truth-in-advertising guidelines, and international consumer protection standards.

---

## 2. Terminology Matrix: Prohibited vs. Approved Language

| Prohibited / High-Risk Term | Approved Legal Substitute | Rationale |
| :--- | :--- | :--- |
| **"Investment"** / **"Invest in artist"** | **"Support the artist"**, **"Collect release"**, **"Purchase collectible"** | AudioBlocks collectibles and tracks are consumer and artistic assets, not securities or capital investment contracts. |
| **"ROI"** / **"Return on Investment"** | **"Streaming Revenue"**, **"Royalty Earnings"** | Avoids creating expectation of financial profit derived from the managerial efforts of others. |
| **"Dividends"** / **"Yield"** | **"Royalty Share"**, **"Revenue Distribution"** | Dividends imply equity ownership in a corporate enterprise; royalty distributions represent contractual copyright/streaming allocations. |
| **"Guaranteed Returns"** / **"Passive Income"** | **"Calculated based on verified streams and sales"** | Absolute prohibition on any promise or projection of guaranteed earnings. |
| **"Token Presale"** / **"ICO"** | **"Limited Edition Release"**, **"Early Collectible Drop"** | Removes unregistered token offering framing. |
| **"NFT" (unqualified/speculative)** | **"Digital Music Collectible"**, **"Tokenized Edition"** | Emphasizes artistic utility, exclusive content access, and commemorative collecting rather than speculative token trading. |

---

## 3. Mandatory User-Facing Disclaimers

### A. Earnings & Royalties Surfaces (`/dashboard/overview`, `/dashboard/payouts`, `/dashboard/settings/payout`)
The following notice must appear on all surfaces calculating or displaying past or estimated creator earnings:
> *"Earnings and royalties are calculated based on verified streaming volume, licensed sync usage, and primary/secondary collectible transactions according to agreed smart contract terms. Royalties are not guaranteed returns, dividends, or interest-bearing financial investments."*

### B. Track & Collectible Minting Surfaces (`/dashboard/upload-music`, `/dashboard/my-music`)
The following notice must appear during song creation and collectible minting:
> *"Digital music collectibles are artistic assets granting personal listening, commemorative, and tier-based community perks. AudioBlocks makes no representations regarding secondary market resale value or liquidity. Minting transactions on the Stellar network are permanent and non-refundable once committed on-chain."*

### C. Collaborator Royalty Splits (`/dashboard/collaborators/royalties`)
> *"Collaborator splits define the immutable distribution rules encoded in Stellar Soroban smart contracts. Split percentages apply directly to net received revenues after network gas fees and third-party processing deductions."*

---

## 4. UI Compliance Audit Log

1. **`app/src/components/EarningsRoyalties.tsx`**: Updated chart and payout sections to include standard earnings disclaimer note.
2. **`app/src/app/dashboard/payouts/page.tsx`**: Enhanced status indicators, fee clarity, and payout threshold disclaimer.
3. **`app/src/app/dashboard/settings/payout/page.tsx`**: Added guidance on Stellar address requirements, payment cycles, and threshold disclosures.
4. **`app/src/components/musicUpload/ReleaseFlow.tsx`**: Verified release terms and collectible wording adhere to compliant utility definitions.

---

## 5. Compliance Sign-Off

- **Reviewing Counsel:** Counsel & Compliance Working Group
- **Status:** **APPROVED & LOCKED**
- **Action Required:** Continuous automated regex linting in CI workflows to flag regressions of prohibited terms in frontend copy.
