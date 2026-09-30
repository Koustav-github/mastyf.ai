# Agent Gateway external processing service.
#
# Deliberately a separate, minimal image rather than a target in deploy/Dockerfile:
# this runs in the request data plane, so it should not also carry the dashboard
# SPA, the adversarial harness, and a Python venv.
#
# Pinned digest for reproducible builds (see docs/SUPPLY_CHAIN.md).
FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293 AS builder
WORKDIR /app

RUN corepack enable

COPY . .
RUN pnpm install --frozen-lockfile --ignore-scripts

# Build workspace package dependencies before root tsc
RUN pnpm --filter @mastyf_ai/plugin-sdk run build \
    && pnpm --filter @mastyf_ai/core run build \
    && pnpm --filter @mastyf_ai/mcp-server run build \
    && npx tsc --project tsconfig.json

# Non-TS assets tsc does not carry, needed at runtime by the policy engine and Redis.
RUN mkdir -p dist/policy dist/scripts/redis \
    && cp src/policy/regex-eval-worker.mjs dist/policy/ \
    && cp scripts/redis/*.lua dist/scripts/redis/

FROM node:20-alpine@sha256:fb4cd12c85ee03686f6af5362a0b0d56d50c58a04632e6c0fb8363f609372293
RUN addgroup -g 1001 -S appgroup && adduser -u 1001 -S appuser -G appgroup
WORKDIR /app

COPY --from=builder --chown=appuser:appgroup /app/dist/ ./dist/
COPY --from=builder --chown=appuser:appgroup /app/node_modules/ ./node_modules/
COPY --from=builder --chown=appuser:appgroup /app/packages/ ./packages/
COPY --from=builder --chown=appuser:appgroup /app/scripts/redis/ ./scripts/redis/
COPY --from=builder --chown=appuser:appgroup /app/package.json ./
COPY --from=builder --chown=appuser:appgroup /app/pnpm-lock.yaml ./
# The ext_proc protos are read at RUNTIME by @grpc/proto-loader, so they are
# not compiled into dist/. Omitting this copy yields a service that boots and
# then fails every authorization.
COPY --from=builder --chown=appuser:appgroup /app/proto/ ./proto/
COPY --from=builder --chown=appuser:appgroup /app/default-policy.yaml ./default-policy.yaml

USER 1001

# gRPC only. Cloud Run health checks are configured as TCP because there is no
# HTTP/1.1 listener to probe.
EXPOSE 8080

ENV NODE_ENV=production
ENV PORT=8080
ENV MASTYF_AI_POLICY_PATH=/app/default-policy.yaml
ENV NODE_OPTIONS="--max-old-space-size=512"

# Fail closed on dependency faults. Without this, an unreachable OPA authorizes
# (opa-policy.ts) and a Redis fault silently falls back to per-process counters
# (redis-rate-limiter.ts) -- the authorizer would look healthy while enforcing
# less than it reports.
#
# COUPLING: strict mode requires shared state. In a multi-replica or Kubernetes
# deployment it refuses to start without Redis, because per-replica rate limits
# and flow history cannot fail closed on something they cannot see. Set
# REDIS_URL (or SENTINELS/CLUSTER_NODES) before scaling past one replica; a
# single replica may run without it.
ENV MASTYF_AI_STRICT_MODE=true

ENTRYPOINT ["node", "dist/agent-gateway/index.js"]
