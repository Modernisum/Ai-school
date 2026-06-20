# Multi-stage build for both production and development

# Builder stage - for production
FROM rust:latest as builder

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    cmake \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY Cargo.toml Cargo.lock ./
COPY src ./src
COPY .sqlx ./.sqlx

ARG FEATURES=""
ENV SQLX_OFFLINE=true
RUN cargo build --release --features "${FEATURES}"

# Production runtime
FROM debian:trixie-slim as production

RUN apt-get update && apt-get install -y \
    libssl3 \
    ca-certificates \
    libstdc++6 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /app/target/release/backend ./backend
RUN mkdir -p /app/models /app/uploads

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/health || exit 1
CMD ["./backend"]

# Development image with cargo-watch
FROM rust:latest as development

RUN apt-get update && apt-get install -y \
    pkg-config \
    libssl-dev \
    cmake \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN cargo install cargo-watch

WORKDIR /app

# Cargo-watch will watch for changes and rebuild
EXPOSE 8080

CMD ["cargo-watch", "-q", "-c", "-w", "src", "-w", "Cargo.toml", "-x", "run"]
