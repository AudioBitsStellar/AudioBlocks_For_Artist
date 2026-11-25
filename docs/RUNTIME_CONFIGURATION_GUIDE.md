# Runtime Configuration & Single Image Promotion Guide (OPS-04)

This guide documents the runtime configuration architecture for the AudioBlocks Artist Dashboard. It describes how public environment variables (`NEXT_PUBLIC_*`) are decoupled from Docker build time to enable **one container image to be promoted across environments** (Development -> Staging -> Production) without rebuilding.

---

## 1. Problem Statement

Next.js standard client-side bundles inline `process.env.NEXT_PUBLIC_*` values at `next build` time. When application images are built with baked-in build args:
- A container image built for Staging cannot be promoted to Production.
- Changing an API endpoint or Stellar RPC URL requires a full rebuild and re-compilation of JavaScript bundles.
- Images built in CI are not truly environment-agnostic.

---

## 2. Architecture & Solution (OPS-04)

AudioBlocks implements a dual runtime configuration system that delivers client environment variables dynamically:

```
┌─────────────────────────────────────────────────────────────┐
│                   Container Runtime                         │
│  (Docker / Kubernetes / ECS / Cloud Run Environment)        │
│                                                             │
│  NEXT_PUBLIC_API_BASE_URL=https://api.testnet.audioblocks.io│
│  NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=...                 │
│  NEXT_PUBLIC_HORIZON_URL=...                                │
│  NEXT_PUBLIC_FEATURE_FLAGS=artistOnchainAnalytics=true      │
└──────────────────────────────┬──────────────────────────────┘
                               │
                Node.js server.js process.env
                               │
               ┌───────────────┴───────────────┐
               ▼                               ▼
     Server Component               GET /api/config
  (RootLayout / Scripts)        (Runtime JSON Endpoint)
               │                               │
               ▼                               ▼
  window.__RUNTIME_CONFIG__             Client Service
(Injected into HTML on request)         (Dynamic Fetch)
```

### Components

1. **Runtime Config Module (`app/src/lib/runtimeConfig.ts`)**:
   - Central accessor function `getRuntimeConfig()`.
   - **In the Browser**: Returns `window.__RUNTIME_CONFIG__` injected on server response. If absent (e.g. static tests), falls back safely to `process.env.NEXT_PUBLIC_*`.
   - **In Node.js Server**: Evaluates `process.env` directly at request execution time.

2. **Runtime Script Injector (`app/src/components/RuntimeConfigScript.tsx`)**:
   - Server Component rendered in `RootLayout`.
   - Inlines a lightweight `<script id="runtime-config-bootstrap">` before React hydration.
   - Guarantees zero client hydration mismatch or network latency.

3. **Public Dynamic API (`app/src/app/api/config/route.ts`)**:
   - Route `GET /api/config` exposing public configuration with `Cache-Control: no-store`.
   - Allows healthcheck harnesses, external scripts, and mobile webviews to inspect live runtime values.
   - Includes runtime `NEXT_PUBLIC_FEATURE_FLAGS`; rollout decisions use the
     value injected into each page response, not the client build.

4. **Environment-Agnostic Dockerfile**:
   - `ARG NEXT_PUBLIC_*` in the builder stage are configured with sensible build-time placeholders.
   - Building the image requires zero environment-specific build arguments:
     ```bash
     docker build --target runner -t audioblocks:v1.2.0 .
     ```
   - Running the image injects runtime variables:
     ```bash
     docker run -e NEXT_PUBLIC_API_BASE_URL=https://api.audioblocks.io audioblocks:v1.2.0
     ```

---

## 3. Promoting One Image Across Environments

| Stage | Image Tag | Injected Runtime Config |
| :--- | :--- | :--- |
| **CI / Build** | `audioblocks:sha-abc1234` | Built once in CI with no environment secrets |
| **Staging** | `audioblocks:sha-abc1234` promoted to `:staging` | `NEXT_PUBLIC_API_BASE_URL=https://api.testnet.audioblocks.io` |
| **Production** | `audioblocks:sha-abc1234` promoted to `:v1.2.0` | `NEXT_PUBLIC_API_BASE_URL=https://api.audioblocks.io` |

No code recompilation occurs during promotion.

### Runtime feature-flag kill switch

Set `NEXT_PUBLIC_FEATURE_FLAGS` in the service/container runtime environment,
not in Docker build arguments. To disable the on-chain analytics rollout without
rebuilding the image:

```text
NEXT_PUBLIC_FEATURE_FLAGS=artistOnchainAnalytics=false
```

Update the service environment and restart/redeploy the same immutable image so
new page responses contain the changed runtime config. An explicit runtime
`false` overrides browser-local test settings; remove local overrides when
verifying other runtime flag values.
