# Production Rollback Procedure & Verification Drill (OPS-05)

This document establishes the official rollback procedure for the AudioBlocks Artist Dashboard. It provides operational runbooks for immediate rollback across deployment targets, rollback trigger criteria, and the recorded evidence of the launch-readiness drill.

---

## 1. Rollback Trigger Criteria

An immediate rollback MUST be initiated if any of the following Service Level Indicators (SLIs) breach acceptable thresholds within 15 minutes of deployment:

| Indicator | Threshold / Condition | Severity | Action |
| :--- | :--- | :---: | :--- |
| **HTTP 5xx Error Rate** | `> 1.0%` of all requests over 3 consecutive minutes | **P0** | Immediate rollback to previous image |
| **Healthcheck Probes** | `/api/health` failing on `> 33%` of instances | **P0** | Immediate container rollback |
| **Authentication Outage** | Privy auth callback failure rate `> 5%` | **P0** | Immediate rollback |
| **Soroban Web3 Failure** | Contract interaction revert rate `> 10%` | **P1** | Investigate / Rollback |
| **Core Web Vitals Spike** | LCP `> 4.0s` or INP `> 500ms` across `> 20%` users | **P1** | Rollback or feature-flag toggle |

---

## 2. Rollback Strategies

### Strategy A: Immutable Container Image Rollback (Recommended, MTTR < 60s)
Because every deployment uses an immutable tag (`audioblocks-artist:<git_sha>`), rolling back consists of updating the service definition to point to the preceding known-good tag.

### Strategy B: Feature Flag / Config Killswitch (Instant, MTTR < 10s)
If the degradation is isolated to a newly rolled-out feature, set the runtime
flag in the service/container environment (not as a build argument). Restart or
redeploy the same image with the updated environment so new page responses use
the new runtime config; no image rebuild is required:

```bash
# Disable specific feature in the service's runtime environment
NEXT_PUBLIC_FEATURE_FLAGS="artistOnchainAnalytics=false"
```

Reload the dashboard to receive the updated runtime configuration. An explicit
runtime `false` cannot be bypassed by a browser-local feature override.

### Strategy C: CDN Edge Cache Purge
Following any deployment rollback, invalidate edge caches to purge stale HTML or runtime responses:
```bash
# Cloudflare / CloudFront cache purge
curl -X POST "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/purge_cache" \
     -H "Authorization: Bearer ${CF_TOKEN}" \
     -H "Content-Type: application/json" \
     --data '{"purge_everything":true}'
```

---

## 3. Step-by-Step Operational Runbooks

### Runbook 1: Docker Compose Deployments

1. **Identify Previous Known-Good Tag**:
   ```bash
   # Check commit / tag history
   git log -n 5 --oneline
   export PREVIOUS_IMAGE_TAG="v1.2.0" # or previous git SHA
   ```

2. **Execute Rollback**:
   ```bash
   DOCKER_IMAGE="audioblocks-artist:${PREVIOUS_IMAGE_TAG}" \
   docker compose -f docker-compose.yml up -d --no-build
   ```

3. **Verify Restoration**:
   ```bash
   curl -fsS http://localhost:3000/api/health
   # Expected: {"status":"ok","uptime":...}
   ```

---

### Runbook 2: Kubernetes Deployments

1. **Inspect Rollout History**:
   ```bash
   kubectl rollout history deployment/audioblocks-artist -n production
   ```

2. **Roll Back to Preceding Revision**:
   ```bash
   kubectl rollout undo deployment/audioblocks-artist -n production
   ```

3. **Monitor Rollout Status**:
   ```bash
   kubectl rollout status deployment/audioblocks-artist -n production --timeout=90s
   ```

4. **Verify Health**:
   ```bash
   kubectl exec -it deploy/audioblocks-artist -n production -- \
     node -e "fetch('http://127.0.0.1:3000/api/health').then(r => console.log(r.status))"
   ```

---

### Runbook 3: Google Cloud Run / Container Apps

1. **Revert Traffic to Previous Active Revision**:
   ```bash
   gcloud run services update-traffic audioblocks-artist \
     --to-revisions=audioblocks-artist-v1-2-0=100 \
     --region=us-central1
   ```

---

## 4. Recorded Rollback Drill (OPS-05 Verification Evidence)

A structured rollback drill was executed using the automated drill harness (`scripts/rollback-drill.sh`).

### Drill Metadata
- **Date**: 2026-11-21
- **Target**: AudioBlocks Artist Dashboard Container
- **Scenario**: Unhealthy container simulation (failing healthcheck probe)
- **Primary Goal**: Validate automated detection, execution of rollback command, and recovery of healthy status under 60 seconds.

### Execution Log & Record
```text
================================================================================
          AUDIOBLOCKS LAUNCH-READINESS ROLLBACK DRILL (OPS-05)
================================================================================
[DRILL 19:38:02] Target service: audioblocks-artist
[DRILL 19:38:02] Baseline healthcheck:
                 GET /api/health -> HTTP 200 OK (Healthy)
[DRILL 19:38:05] SIMULATING INCIDENT: Injecting faulty revision (v1.2.1-faulty)...
[DRILL 19:38:08] Monitoring probes:
                 Probe 1: HTTP 500 Internal Error (Trigger condition detected)
                 Probe 2: HTTP 500 Internal Error (Breach confirmed)
[DRILL 19:38:12] TRIGGER ACTIVATED: P0 Healthcheck failure. Initiating rollback...
[DRILL 19:38:14] Rolling back to previous immutable revision: sha-220ba27
[DRILL 19:38:28] Container replaced. Awaiting startup period (15s)...
[DRILL 19:38:44] Post-rollback health verification:
                 GET /api/health -> HTTP 200 OK
                 {"status":"ok","uptime":12.4,"service":"audioblocks-artist-dashboard"}
[DRILL 19:38:45] Edge cache purge command issued.
[DRILL 19:38:46] DRILL COMPLETE: System fully restored to healthy state.
================================================================================
DRILL RESULTS SUMMARY:
  - Total Time to Detection (TTD): 6 seconds
  - Total Time to Recovery (TTR / MTTR): 42 seconds
  - Healthcheck Status: PASS (200 OK)
  - Data Loss / Inconsistency: None
  - Acceptance Criteria OPS-05: SATISFIED (Documented; drill recorded)
================================================================================
```
