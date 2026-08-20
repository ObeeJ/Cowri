# ── Web client build stage ───────────────────────────────────────────────────
FROM node:22-slim AS web-builder

WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
# Same-origin default: the backend serves this build itself, so the app talks
# to /v1 on its own host and needs no separate API URL or CORS setup.
ENV VITE_COWRI_API_URL=/v1
RUN npm run build

# ── Backend build stage ───────────────────────────────────────────────────────
FROM rust:latest AS builder

RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

RUN cargo build -p backend --release

# ── Runtime stage ─────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

# Non-root user
RUN useradd -m -u 1001 cowri
USER cowri

WORKDIR /app
COPY --from=builder /app/target/release/backend ./backend
COPY --from=builder /app/backend/migrations ./migrations
COPY --from=web-builder /app/web/dist ./web/dist

EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/v1/health || exit 1

CMD ["./backend"]
