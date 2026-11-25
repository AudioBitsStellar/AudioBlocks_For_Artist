# Security Incident Runbook: Credential and Supply-Chain Compromise

This runbook defines the operational protocol for handling security incidents affecting the AudioBlocks Artist Dashboard and its infrastructure, with explicit procedures for credential compromise and supply-chain dependency attacks.

---

## 1. Incident Classification & Severity Levels

| Severity | Definition | Example Scenarios | Initial Response SLA |
| :--- | :--- | :--- | :--- |
| **P0 - Critical** | Active exploitation of production infrastructure or compromised privileged credentials with direct impact on user funds, keys, or data integrity. | Compromise of production AWS keys, Vercel admin tokens, deployer private keys, or active supply-chain injection in production bundles. | `< 15 minutes` |
| **P1 - High** | Exposure of sensitive credentials, leaked tokens without verified exploit, or malicious dependency detected before or during staging build. | Leaked staging/read-only token, suspicious package flagged in `package-lock.json`, compromised CI bot token. | `< 1 hour` |
| **P2 - Medium** | Vulnerable dependency identified with known CVE but no active exploit path, or low-privilege API token rotation needed. | Transitive dependency vulnerability flagged by Dependabot/npm audit without remote code execution. | `< 24 hours` |

---

## 2. Emergency Incident Contacts & Roles

| Role | Responsibilities | Contact / Escalation Channel |
| :--- | :--- | :--- |
| **Incident Commander (IC)** | Leads incident triage, directs isolation actions, authorises rollbacks and external announcements. | `#incident-commander` / `ic-oncall@audioblocks.io` |
| **Security / DevSecOps Lead** | Conducts technical forensics, revokes credentials, audits audit logs and git commit hashes. | `#sec-ops` / `security-lead@audioblocks.io` |
| **Frontend / Engineering Lead** | Coordinates code fixes, lockfile rollbacks, and emergency production redeployment. | `#eng-leads` / `eng-lead@audioblocks.io` |
| **Legal & Compliance Counsel** | Assesses regulatory notification triggers (GDPR, state data breach laws) and disclosure statements. | `legal@audioblocks.io` |
| **Public Disclosure & Support** | Coordinates public announcements, status page updates, and user communications. | `security@audioblocks.io` / `status.audioblocks.io` |

---

## 3. Credential Compromise Runbook

### Step 1: Immediate Triage and Scope Containment
1. Identify the leaked credential type, exposure vector (e.g. public git commit, build log, Discord paste), and creation timestamp.
2. Freeze active deployment pipelines in Vercel and GitHub Actions if production keys are implicated:
   ```bash
   # Cancel running workflows
   gh run list --status in_progress
   gh run cancel <run-id>
   ```
3. Audit access logs across AWS CloudTrail, Vercel deployment logs, and Stellar RPC nodes for unauthorized invocations.

### Step 2: Step-by-Step Rotation Checklist

Use this checklist to execute orderly token invalidation and credential cycling:

- [ ] **GitHub Access Tokens & Secrets**
  - Revoke affected Personal Access Tokens (PAT) via GitHub Settings → Developer Settings.
  - Rotate repository and organization secrets:
    - `GH_TOKEN` / `PAT_AUTOMATION`
    - `VERCEL_TOKEN`
    - `CODECOV_TOKEN`
    - `NPM_PUBLISH_TOKEN` (if applicable)
  - Verify commit signatures and audit recent commit history: `git log --show-signature -n 20`.

- [ ] **Vercel Infrastructure & Environment Secrets**
  - Navigate to Vercel Project Settings → Environment Variables.
  - Rotate all sensitive frontend/edge secrets:
    - `NEXT_PUBLIC_API_BASE_URL` (if endpoint moved or behind proxy)
    - `SENTRY_AUTH_TOKEN` & Sentry DSN
    - Build webhook keys and deploy tokens.
  - Trigger an immediate redeployment with cache purges.

- [ ] **Cloud & Storage (AWS S3 / CloudFront)**
  - Rotate IAM user access keys for S3 audio & cover art buckets:
    ```bash
    aws iam create-access-key --user-name audioblocks-media-uploader
    # Update backend configuration with new keys, test connectivity
    aws iam delete-access-key --user-name audioblocks-media-uploader --access-key-id <OLD_KEY_ID>
    ```
  - Review bucket policies and CORS origins for unauthorised modifications.

- [ ] **Stellar / Soroban Keys & RPC Endpoints**
  - Note: Artists sign all on-chain transactions via Freighter; the frontend never holds user private keys.
  - If deployment keys (contracts admin) or Soroban RPC gateway tokens were exposed:
    - Invalidate RPC API keys with the RPC provider (e.g., QuickNode / SDF Testnet).
    - Rotate fee-sponsor keys if backend fee-sponsorship endpoints are used.

- [ ] **Database & Backend API Service Secrets**
  - Rotate API JWT signing secrets (`JWT_SECRET`, `REFRESH_SECRET`) in `AudioBlock_Backend`.
  - Invalidate all existing active artist sessions to force re-authentication.

---

## 4. Supply-Chain Compromise Runbook

### Step 1: Detection and Validation
1. Indicators of supply-chain attacks:
   - Unexpected changes in `package-lock.json` or new post-install scripts (`preinstall`, `postinstall`).
   - Sudden package deprecation or security alerts from npm / GitHub Dependabot.
   - Network requests originating from dependencies to untrusted or newly registered domains.
2. Isolate the offending dependency and version range:
   ```bash
   cd app
   npm ls <package-name>
   npm audit --audit-level=high
   ```

### Step 2: Immediate Containment
1. Stop automated deployments: disable Vercel Git integration or auto-deploy branch triggers.
2. Invalidate local and CI package caches:
   - GitHub Actions: clear Actions caches via `gh cache delete --all`.
   - Vercel: enforce clean build without build cache.

### Step 3: Clean Remediation Procedure
1. Revert `package-lock.json` and `package.json` to the last known trusted commit:
   ```bash
   git checkout <trusted-commit-hash> -- app/package.json app/package-lock.json
   ```
2. If the compromised package is required, pin to the last known safe version using strict equality (no `^` or `~` ranges):
   ```json
   "dependencies": {
     "vulnerable-pkg": "1.2.3"
   }
   ```
3. Run clean install and regenerate lockfile:
   ```bash
   cd app
   rm -rf node_modules
   npm ci
   npm run lint
   npm test
   ```
4. Perform bundle inspection to ensure malicious artifacts are absent from client output:
   ```bash
   npm run build
   # Inspect generated chunks in .next/static/chunks/
   ```

---

## 5. Post-Incident Review & RCA Template

Following resolution of any P0 or P1 incident, the Incident Commander must schedule a blameless post-mortem within 48 hours and complete the following report:

1. **Executive Summary**: Brief timeline of discovery, impact, and remediation.
2. **Impact Assessment**: Data, funds, or user sessions exposed or affected.
3. **Timeline of Events (UTC)**:
   - `YYYY-MM-DD HH:MM` — Root cause event occurred
   - `YYYY-MM-DD HH:MM` — Incident detected
   - `YYYY-MM-DD HH:MM` — Containment initiated
   - `YYYY-MM-DD HH:MM` — Credential rotated / package eradicated
   - `YYYY-MM-DD HH:MM` — Verification complete & normal operations resumed
4. **Root Cause Analysis (5 Whys)**: Deep dive into procedural or architectural weaknesses.
5. **Corrective & Preventive Action Items (CAPA)**: Assigned action items with owners and deadlines.
