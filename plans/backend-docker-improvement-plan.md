# Backend Dockerization & Improvement Plan

## Objective
Transform the monolithic Rust backend into a containerized, production-ready system following big-tech company practices. This includes architectural improvements, Docker deployment, orchestration, and operational workflows.

## 1. Current Architecture Analysis

### Strengths
- Clean separation of concerns (routes, services, repositories)
- Multi‑tenant PostgreSQL with RLS
- Asynchronous background jobs (billing, backup, analytics)

### Areas for Improvement
- **Monolithic service files** (e.g., `auxiliary_service.rs` > 1400 lines)
- **All traits in single files** (`traits.rs`, `repository/traits.rs`)
- **No containerization** – runs locally with manual dependency management
- **Limited observability** – no structured logging, metrics, or health checks
- **Manual deployment** – no CI/CD, no orchestration

## 2. Architectural Refactoring (Phase 1)

Follow the existing [backend‑refactoring plan](backend-refactoring-plan.md) to split oversized files:

### 2.1 Split Service Implementations
- Extract each `impl` block from `auxiliary_service.rs` into dedicated service files:
  - `award_service.rs`
  - `complain_service.rs`
  - `reminder_service.rs`
  - `documentbox_service.rs`
  - `school_service.rs`
  - `responsibility_service.rs`
  - `task_service.rs`

### 2.2 Split Service Traits
Create `services/traits/` directory with domain‑specific trait files:
- `auxiliary.rs`
- `responsibility.rs`
- `task.rs`
- `student.rs`
- `employee.rs`
- `academic.rs`
- `auth.rs`
- `attendance.rs`
- `fee.rs`
- `payroll.rs`
- `resource.rs`
- `leave.rs`
- `ai.rs`
- `recovery.rs`
- `setup.rs`

### 2.3 Split Repository Traits
Create `repository/traits/` directory with similar domain split.

### 2.4 Split Route Definitions
Group routes by domain into sub‑routers:
- `responsibility_router.rs`
- `student_router.rs`
- `employee_router.rs`
- `academic_router.rs`
- `fee_router.rs`
- `admin_router.rs`

**Expected Outcome**: Files under 500 lines, faster AI token consumption, clearer module boundaries.

## 3. Dockerization (Phase 2)

### 3.1 Dockerfile for Rust Backend
```dockerfile
# Build stage
FROM rust:1.80-slim AS builder
WORKDIR /app
COPY . .
RUN cargo build --release --bin modern_school_backend

# Runtime stage
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY --from=builder /app/target/release/modern_school_backend /app/
COPY --from=builder /app/migrations /app/migrations
COPY --from=builder /app/models /app/models
ENV RUST_LOG=info
EXPOSE 8080
CMD ["./modern_school_backend"]
```

### 3.2 docker‑compose.yml for Local Development
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: 1234
      POSTGRES_DB: ai_school
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U postgres"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  backend:
    build:
      context: ./Backend
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgres://postgres:1234@postgres:5432/ai_school
      REDIS_URL: redis://redis:6379/
      JWT_SECRET: ${JWT_SECRET:-vidhyam_super_secure_enterprise_key_2026}
      RUST_LOG: info
    ports:
      - "8080:8080"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./Backend/uploads:/app/uploads
      - ./Backend/models:/app/models
    command: >
      sh -c "
        cargo sqlx migrate run &&
        ./modern_school_backend
      "

volumes:
  postgres_data:
  redis_data:
```

### 3.3 Environment Variables
Create `.env.docker` with production‑ready values:
```env
DATABASE_URL=postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/ai_school
REDIS_URL=redis://redis:6379/
JWT_SECRET=your_secure_jwt_secret
API_BASE_URL=http://localhost:8080
```

## 4. Kubernetes Orchestration (Phase 3 – Optional)

For production deployment, create Kubernetes manifests:

### 4.1 Namespace
```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: modern-school
```

### 4.2 ConfigMap & Secrets
Store environment variables and JWT secret as Kubernetes Secrets.

### 4.3 Deployments & Services
- `postgres-deployment.yaml` (or use managed cloud DB)
- `redis-deployment.yaml`
- `backend-deployment.yaml` (with readiness/liveness probes)

### 4.4 Ingress
Expose backend via Ingress controller (nginx, traefik) with TLS.

### 4.5 Horizontal Pod Autoscaler
Scale backend based on CPU/memory usage.

## 5. Migration from Local Server to Docker

### Step‑by‑Step Migration Plan
1. **Backup local data**: Dump PostgreSQL and Redis.
2. **Stop local services**: Terminate local PostgreSQL, Redis, and backend processes.
3. **Deploy Docker stack**: Run `docker‑compose up -d` in the project root.
4. **Restore data**: Import backups into the new containers.
5. **Update frontend configurations**: Change API endpoints from `localhost:8080` to `backend:8080` (within Docker network) or external IP.
6. **Validate**: Run integration tests to ensure all functionalities work.

### Local Server Termination Checklist
- [ ] Stop `cargo run` process (backend)
- [ ] Stop PostgreSQL service (`pg_ctl stop` or systemctl)
- [ ] Stop Redis server
- [ ] Update `.env` files to point to Docker services
- [ ] Remove any local startup scripts that launch the old services

## 6. Operational Workflow

### 6.1 Build Pipeline (CI/CD)
```yaml
# GitHub Actions example
name: Build & Deploy
on:
  push:
    branches: [main]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build Docker image
        run: docker build -t modern-school-backend:latest ./Backend
      - name: Push to Container Registry
        run: |
          docker tag modern-school-backend:latest ${{ secrets.REGISTRY }}/modern-school-backend:${{ github.sha }}
          docker push ${{ secrets.REGISTRY }}/modern-school-backend:${{ github.sha }}
  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Kubernetes
        run: kubectl set image deployment/backend backend=${{ secrets.REGISTRY }}/modern-school-backend:${{ github.sha }}
```

### 6.2 Monitoring & Observability
- **Logging**: Structured JSON logs with `tracing` + OpenTelemetry export.
- **Metrics**: Expose Prometheus metrics via `metrics` endpoint.
- **Health checks**: Implement `/health` endpoint for readiness/liveness probes.
- **Alerting**: Integrate with Grafana/Alerta for critical errors.

### 6.3 Backup & Disaster Recovery
- Schedule automated backups of PostgreSQL and Redis using cron jobs inside containers.
- Store backups in cloud storage (S3, GCS) via the existing `BackupService`.

## 7. Documentation

Create the following documentation files:

- `Backend/DEPLOYMENT.md` – step‑by‑step deployment guide
- `Backend/DOCKER.md` – Docker‑specific instructions
- `Backend/KUBERNETES.md` – Kubernetes deployment guide
- `Backend/MONITORING.md` – observability setup
- `Backend/OPERATIONS.md` – daily operational tasks

## 8. Success Metrics

- **Deployment time** reduced from minutes to seconds
- **Zero‑downtime updates** via rolling deployments
- **Resource utilization** monitored and optimized
- **Incident response** improved with centralized logs and metrics
- **Developer onboarding** simplified with single‑command `docker‑compose up`

## 9. Next Steps (Post‑Dockerization)

1. **Implement service mesh** (Linkerd, Istio) for advanced traffic management.
2. **Split monolithic backend into microservices** (e.g., separate AI service, billing service).
3. **Adopt GitOps** (Flux, ArgoCD) for declarative Kubernetes management.
4. **Introduce chaos engineering** (Chaos Mesh) to test resilience.

## 10. Timeline & Priority

| Phase | Description | Estimated Effort |
|-------|-------------|------------------|
| 1 | Architectural refactoring (split files) | 2–3 days |
| 2 | Dockerize backend & dependencies | 1–2 days |
| 3 | Migrate local data to Docker | 1 day |
| 4 | Implement CI/CD pipeline | 1–2 days |
| 5 | Add monitoring & logging | 1–2 days |
| 6 | Kubernetes orchestration (optional) | 3–5 days |

## Conclusion

This plan transforms the backend into a containerized, observable, and scalable system that aligns with big‑tech company standards. It addresses immediate pain points (large files, manual deployment) while laying the foundation for future microservices and cloud‑native practices.

**Approval Request**: Please review this plan and provide feedback. Once approved, we can switch to Code mode to begin implementation.