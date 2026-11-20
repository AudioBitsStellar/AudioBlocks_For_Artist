# Frontend Production Runbook: Deploy, Rollback, Environment & Incident Steps

This runbook defines the operational standards and emergency recovery procedures for operating the AudioBlocks Artist Dashboard in production on Vercel.

---

## 1. Environment Variables Reference

All environment variables configured for the Artist Dashboard must be registered in the Vercel Project Settings under **Environment Variables**:

| Variable Name | Required? | Context | Description & Example |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_API_BASE_URL` | **Yes** | Client & Build | Base URL for the `AudioBlock_Backend` REST API (e.g. `https://api.audioblocks.io/api`). |
| `NEXT_PUBLIC_STELLAR_NETWORK` | **Yes** | Client & Build | Network target: `testnet` or `public` (mainnet). Affects network badge and Soroban contract IDs. |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | **Yes** | Client & Build | Endpoint for Soroban RPC simulation and transaction status polling (e.g. `https://soroban-rpc.mainnet.stellar.org`). |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | **Yes** | Client & Build | Passphrase matching the target Stellar network (`Public Global Stellar Network ; September 2015` or `Test SDF Network ; September 2015`). |
| `NEXT_PUBLIC_SUBGRAPH_URL` | Optional | Client & Build | GraphQL endpoint for on-chain artist analytics rollups. |
| `NEXT_PUBLIC_FEATURE_FLAGS` | Optional | Client & Build | JSON or comma-separated overrides for rollout flags (e.g. `artistOnchainAnalytics:true`). |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Client & Build | Sentry telemetry DSN for exception reporting. |
| `SENTRY_AUTH_TOKEN` | Optional | Build-only | Internal Vercel build token for uploading source maps to Sentry. |

---

## 2. Deployment Workflows

### 2.1. Production Deployments
- **Trigger**: Every pull request merged into `main`.
- **Pipeline**: Vercel Git integration triggers `npm run build`.
- **Pre-flight verification**:
  - `npm run lint` must pass.
  - Vitest unit tests must pass.
  - Sentry source maps uploaded cleanly.
  - Zero critical security violations in `npm audit`.

### 2.2. Preview Deployments
- **Trigger**: Opened pull requests against `main`.
- **Ephemeral URL**: Vercel generates an isolated preview URL (`https://audioblocks-artist-git-<branch>.vercel.app`).
- **Isolation**: Connects to staging backend services and Stellar Testnet.

---

## 3. Rollback Procedures

When a critical regression, broken wallet handshake, or render crash reaches production, follow these steps to execute an immediate rollback:

### Method A: Instant Vercel Dashboard Rollback (Fastest: < 30 seconds)
1. Open the **AudioBlocks Artist Project** in the Vercel Dashboard.
2. Navigate to the **Deployments** tab.
3. Locate the last known good deployment (marked with a green checkmark prior to the incident).
4. Click the three dots (`...`) on that deployment row and select **Instant Rollback**.
5. Confirm the dialog. Vercel instantly routes edge traffic to the previous deployment build artifacts without requiring a rebuild.

### Method B: Vercel CLI Rollback
If the web UI is unreachable or for automated incident workflows:
```bash
# Authenticate with Vercel CLI
npx vercel login
# List recent production deployments
npx vercel ls --prod
# Promote the target deployment alias to production
npx vercel rollback <deployment-url-or-id>
```

### Method C: Git Revert (Permanent Fix)
To maintain an immutable git audit trail following an instant rollback:
```bash
git checkout main
git pull upstream main
# Revert the merge commit or offending commit
git revert -m 1 <merge-commit-hash>
git push upstream main
```

---

## 4. Incident Response & Troubleshooting Steps

### 4.1. Health Check Triage
1. Check frontend availability:
   ```bash
   curl -I https://artist.audioblocks.io
   # Expected: HTTP/2 200
   ```
2. Check backend API reachability from the edge:
   ```bash
   curl -s https://api.audioblocks.io/health | jq .
   ```
3. Check Soroban RPC connectivity:
   ```bash
   curl -s -X POST -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}' \
     https://soroban-rpc.mainnet.stellar.org
   # Expected: {"jsonrpc":"2.0","id":1,"result":{"status":"healthy"}}
   ```

### 4.2. Common Failure Modes & Remedies
- **"Network Error / Failed to Fetch" during uploads**: Check AWS S3 pre-signed URL expiration or CORS headers in the S3 bucket policy.
- **Freighter Signature Rejection**: Check if user is on Testnet while app is set to Mainnet (or vice versa); inspect `NEXT_PUBLIC_STELLAR_NETWORK` environment variable.
- **500 Internal Error on Release Notes Page**: Verify that `CHANGELOG.md` is bundled or ensure `parseChangelog` gracefully handles missing file fallback.
