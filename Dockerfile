# syntax=docker/dockerfile:1

# ── Stage 1: dependency install ─────────────────────────────────────────────
# Pinned Alpine base digest for reproducible, tamper-proof builds (OPS-06).
FROM node:20.18.3-alpine@sha256:d8c42b08fa111978eb3a696ee2433ff46a2a5f1e582e3076595567b579549cf0 AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY app/package.json app/package-lock.json ./
RUN npm ci --ignore-scripts

# ── Stage 2: build ──────────────────────────────────────────────────────────
FROM node:20.18.3-alpine@sha256:d8c42b08fa111978eb3a696ee2433ff46a2a5f1e582e3076595567b579549cf0 AS builder
WORKDIR /app

# Safe fallback placeholders for static pre-rendering during build.
# Real environment values are injected dynamically at container runtime (OPS-04),
# enabling a single immutable image to be promoted across staging and production.
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
ARG NEXT_PUBLIC_PRIVY_APP_ID=placeholder-app-id
ARG NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE="Test SDF Network ; September 2015"
ARG NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org

ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_PRIVY_APP_ID=$NEXT_PUBLIC_PRIVY_APP_ID
ENV NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE=$NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE
ENV NEXT_PUBLIC_HORIZON_URL=$NEXT_PUBLIC_HORIZON_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY app/ .

RUN npm run build

# ── Stage 3: production runner ──────────────────────────────────────────────
FROM node:20.18.3-alpine@sha256:d8c42b08fa111978eb3a696ee2433ff46a2a5f1e582e3076595567b579549cf0 AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user with dedicated UID/GID for least-privilege security (OPS-06).
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# Liveness and readiness healthcheck probe (OPS-06).
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3000) + '/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
