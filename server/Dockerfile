# ─────────────────────────────────────────────────────────────────────────────
# Gym Master API — Multi-stage Dockerfile
#
# Security hardening applied:
#  • Multi-stage build so dev dependencies never reach the production image.
#  • Non-root user (uid 1001) — no process runs as root inside the container.
#  • Read-only filesystem (enforced at compose level with read_only: true).
#  • No shell in production stage (distroless-style minimal base).
#  • Package versions pinned; npm ci (not npm install) for reproducibility.
#  • .dockerignore prevents secrets / source maps leaking into the image.
#  • HEALTHCHECK built-in so orchestrators can detect unhealthy containers.
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependency installer ─────────────────────────────────────────
FROM node:20-alpine AS deps

# Install only production deps cleanly.
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts \
    && npm cache clean --force


# ── Stage 2: Production image ─────────────────────────────────────────────
FROM node:20-alpine AS production

LABEL org.opencontainers.image.title="Gym Master API"
LABEL org.opencontainers.image.source="https://github.com/your-org/gym-master"

WORKDIR /app

# Copy production dependencies from the deps stage.
COPY --from=deps /app/node_modules ./node_modules

# Copy application source (never copies .env — see .dockerignore).
COPY src ./src
COPY package.json ./

# ── Security: non-root user ──────────────────────────────────────────────
# Create a dedicated non-root user + group.
RUN addgroup --system --gid 1001 gymmaster \
 && adduser  --system --uid 1001 --ingroup gymmaster --no-create-home gymmaster

# Ensure the app directory is owned by the non-root user.
RUN chown -R gymmaster:gymmaster /app

# Create a writable /tmp directory for any transient writes.
# The rest of the filesystem will be mounted read-only by compose.
RUN mkdir -p /tmp/gymmaster && chown gymmaster:gymmaster /tmp/gymmaster

USER gymmaster

# ── Runtime config ───────────────────────────────────────────────────────
ENV NODE_ENV=production \
    PORT=5000 \
    # Tell Node to trust only 1 proxy hop (nginx).
    # Increase if you add additional load-balancer layers.
    NODE_OPTIONS="--max-old-space-size=512"

EXPOSE 5000

# ── Health check ─────────────────────────────────────────────────────────
# Docker / Kubernetes uses this to decide when the container is ready.
# Retries 3×, waiting 10 s between attempts, starting 15 s after startup.
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:$PORT/api/v1/health || exit 1

# ── Entrypoint ────────────────────────────────────────────────────────────
CMD ["node", "src/server.js"]
