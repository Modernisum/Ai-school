# Phase 5: Global Scale Infrastructure

> **Goal**: Transform the infrastructure from single-server deployment to a globally distributed, auto-scaling platform capable of handling millions to billions of users with 99.99% uptime, sub-100ms latency, and zero data loss.

---

## 5.1 Database Scaling

### 5.1.1 PostgreSQL horizontal sharding with Citus
- **Sub-tasks**:
  1. Add Citus extension to PostgreSQL: `CREATE EXTENSION IF NOT EXISTS citus;`
  2. Configure Citus coordinator node
  3. Add worker nodes (minimum 3 for production)
  4. Define distribution strategy:
     - `school_id` as the distribution column for all tenant-scoped tables
     - Reference tables for geo data, templates, global settings
  5. Migrate existing tables to distributed tables:
     ```sql
     SELECT create_distributed_table('students', 'school_id');
     SELECT create_distributed_table('employees', 'school_id');
     SELECT create_distributed_table('student_fees', 'school_id');
     -- ... all school-scoped tables
     SELECT create_reference_table('geo_countries');
     SELECT create_reference_table('geo_states');
     ```
  6. Update application queries to always include `school_id` in WHERE clauses (Citus requirement)
  7. Test with multi-tenant data isolation verification
  8. Benchmark: achieve 10K+ queries/second with Citus

### 5.1.2 Read replicas
- **Sub-tasks**:
  1. Configure PostgreSQL streaming replication with 2 read replicas
  2. Update `connection_pool.rs` to support read/write splitting:
     - Write queries → primary connection
     - Read queries → replica connection (with round-robin)
  3. Add replica lag monitoring
  4. Add automatic failover with Patroni
  5. Configure connection string in environment:
     ```
     DATABASE_URL=postgres://...primary...
     DATABASE_READ_URL=postgres://...replica1...,postgres://...replica2...
     ```

### 5.1.3 Connection pooling with PgBouncer
- **Sub-tasks**:
  1. Add PgBouncer as sidecar container in docker-compose
  2. Configure transaction-mode pooling for maximum efficiency
  3. Set pool size based on: `max_connections = (CPU_cores * 2) + effective_spindle_count`
  4. Add PgBouncer metrics to monitoring
  5. Update application to connect through PgBouncer

### 5.1.4 Database backup and disaster recovery
- **Sub-tasks**:
  1. Configure WAL archiving to Cloudflare R2
  2. Set up Point-in-Time Recovery (PITR)
  3. Configure automated daily base backups with `pg_basebackup`
  4. Test backup restoration on a separate instance
  5. Document RPO (Recovery Point Objective): < 5 minutes
  6. Document RTO (Recovery Time Objective): < 30 minutes
  7. Add cross-region backup replication

---

## 5.2 Caching Architecture

### 5.2.1 Redis Cluster setup
- **Sub-tasks**:
  1. Configure Redis Cluster with 6 nodes (3 primary + 3 replica)
  2. Update `connection_pool.rs` to use Redis Cluster client
  3. Define cache key naming convention: `{school_id}:{entity}:{id}`
  4. Define TTL strategy:
     - Session tokens: 24 hours
     - Dashboard data: 5 minutes
     - Student lists: 2 minutes
     - Reference data: 1 hour
  5. Add cache invalidation on data mutation
  6. Add cache warming on application startup

### 5.2.2 Application-level caching
- **Sub-tasks**:
  1. Implement cache-aside pattern in repository layer
  2. Add `Cache-Control` headers to API responses
  3. Add ETag support for conditional requests
  4. Add stale-while-revalidate for dashboard data
  5. Implement response compression (gzip/brotli) — already partially done in tower-http

### 5.2.3 CDN and edge caching
- **Sub-tasks**:
  1. Set up Cloudflare as CDN
  2. Configure cache rules:
     - Static assets: 1 year (with content hash)
     - API responses: no cache (private data)
     - Public pages: 5 minutes
  3. Configure Cloudflare Workers for edge-side rendering of marketing pages
  4. Add Brotli compression at edge
  5. Configure image optimization (Cloudflare Polish)
  6. Configure WebP/AVIF auto-conversion

---

## 5.3 Async Processing & Event Bus

### 5.3.1 NATS JetStream setup
- **Sub-tasks**:
  1. Add NATS server to docker-compose
  2. Add `async-nats` dependency to Cargo.toml
  3. Define event subjects:
     - `school.{school_id}.attendance.created`
     - `school.{school_id}.fee.payment.received`
     - `school.{school_id}.leave.approved`
     - `school.{school_id}.notification.send`
     - `platform.billing.daily`
  4. Create event publisher service
  5. Create event consumer services:
     - Notification dispatcher
     - Analytics aggregator
     - Audit logger
     - Search indexer
  6. Add dead-letter queue for failed events
  7. Add event replay capability

### 5.3.2 Background job processing
- **Sub-tasks**:
  1. Refactor `background_jobs.rs` to use NATS instead of tokio::spawn
  2. Add job types:
     - Daily attendance summary
     - Fee reminder notifications
     - Payroll processing
     - Report generation
     - Database backup
     - Search index rebuild
  3. Add job scheduling (cron-like with NATS)
  4. Add job retry with exponential backoff
  5. Add job monitoring dashboard

---

## 5.4 Full-Text Search

### 5.4.1 Meilisearch integration
- **Sub-tasks**:
  1. Add Meilisearch to docker-compose
  2. Add `meilisearch-sdk` dependency to Cargo.toml
  3. Define indexes:
     - `students` — searchable by name, roll number, class, parent name
     - `employees` — searchable by name, employee ID, department
     - `fees` — searchable by student name, fee type, status
  4. Create indexer service that syncs from PostgreSQL to Meilisearch via NATS events
  5. Add search API endpoint: `GET /api/school/:schoolId/search?q=...&type=...`
  6. Integrate search into Vidhyam SpotlightSearch component
  7. Integrate search into chatra and employee apps
  8. Configure Meilisearch relevance rules (typo tolerance, ranking)

---

## 5.5 Observability Stack

### 5.5.1 OpenTelemetry integration
- **Sub-tasks**:
  1. Add `opentelemetry` and `tracing-opentelemetry` dependencies
  2. Configure OTLP exporter to Grafana Tempo
  3. Add spans for all HTTP requests, database queries, cache operations
  4. Add custom spans for business logic (attendance marking, fee payment, etc.)
  5. Add metrics:
     - Request latency (p50, p95, p99)
     - Error rate by endpoint
     - Database query latency
     - Cache hit/miss ratio
     - Active connections
     - Queue depth
  6. Export metrics to Grafana Prometheus

### 5.5.2 Grafana dashboard setup
- **Sub-tasks**:
  1. Add Grafana + Prometheus + Tempo + Loki to docker-compose
  2. Create dashboards:
     - API overview (request rate, latency, errors)
     - Database performance (query time, connections, replication lag)
     - Cache performance (hit rate, memory usage)
     - Business metrics (active schools, students, daily attendance rate)
     - Infrastructure (CPU, memory, disk, network)
  3. Add alerting rules:
     - API error rate > 1%
     - Database query time > 500ms (p95)
     - Cache hit rate < 80%
     - Replication lag > 10 seconds
     - Disk usage > 80%
  4. Configure notification channels (Slack, email, PagerDuty)

### 5.5.3 Structured logging
- **Sub-tasks**:
  1. Replace all `println!` with `tracing::info!` / `tracing::error!`
  2. Add structured fields to all log entries (school_id, user_id, request_id)
  3. Configure log output as JSON for Loki ingestion
  4. Add request ID middleware for trace correlation
  5. Add log aggregation with Grafana Loki

---

## 5.6 Security Hardening

### 5.6.1 Authentication improvements
- **Sub-tasks**:
  1. Add refresh token rotation
  2. Add device fingerprinting for session validation
  3. Add brute-force protection (already have rate limiter, verify it works)
  4. Add IP-based anomaly detection
  5. Add 2FA option for admin accounts (TOTP)
  6. Add session management page (view active sessions, revoke)

### 5.6.2 Data encryption
- **Current state**: `encryption_service.rs`, `encryption_middleware.rs`, `data_encryption_foundation.sql` exist
- **Sub-tasks**:
  1. Verify AES-GCM encryption for PII fields works
  2. Add encryption for: Aadhaar numbers, phone numbers, addresses, bank details
  3. Add encryption key rotation procedure
  4. Add field-level access control (who can decrypt what)
  5. Verify encrypted data is not leaked in API responses or logs

### 5.6.3 API security
- **Sub-tasks**:
  1. Add request signing (HMAC) for API key requests
  2. Add CORS strict mode for production (remove wildcard origins)
  3. Add CSRF protection for cookie-based auth
  4. Add SQL injection testing (automated)
  5. Add XSS testing (automated)
  6. Add dependency vulnerability scanning (cargo audit, npm audit)
  7. Add SAST (Static Application Security Testing) to CI pipeline

---

## 5.7 Auto-Scaling & Container Orchestration

### 5.7.1 Kubernetes migration
- **Sub-tasks**:
  1. Create Dockerfiles for all services (backend, web apps)
  2. Create Kubernetes manifests:
     - `deployment.yaml` for backend (with HPA)
     - `service.yaml` for internal routing
     - `ingress.yaml` for external access
     - `configmap.yaml` for configuration
     - `secret.yaml` for sensitive data
  3. Configure Horizontal Pod Autoscaler:
     - Min replicas: 2
     - Max replicas: 20
     - Scale on CPU > 70%
     - Scale on request rate > 1000/min
  4. Configure Pod Disruption Budget for zero-downtime deployments
  5. Set up namespace isolation: `production`, `staging`, `development`

### 5.7.2 GitOps deployment with ArgoCD
- **Sub-tasks**:
  1. Create `k8s/` directory with all manifests
  2. Install ArgoCD in Kubernetes cluster
  3. Configure ArgoCD application to sync from Git
  4. Add automatic sync policy (auto-deploy on main branch)
  5. Add manual approval for production deployments
  6. Add rollback capability

### 5.7.3 Multi-region deployment
- **Sub-tasks**:
  1. Select primary region (e.g., ap-south-1 for India)
  2. Select secondary regions (e.g., us-east-1, eu-west-1)
  3. Configure DNS-based geo-routing (Cloudflare)
  4. Set up cross-region database replication
  5. Configure region-aware API routing
  6. Add region failover automation
  7. Test region failover scenario

---

## 5.8 Performance Optimization

### 5.8.1 Backend performance
- **Sub-tasks**:
  1. Add database query analysis with `EXPLAIN ANALYZE`
  2. Add missing indexes based on slow query log
  3. Optimize N+1 queries in repository layer
  4. Add connection pooling verification
  5. Add request batching for bulk operations
  6. Benchmark: achieve < 50ms p95 latency for all CRUD endpoints
  7. Load test with k6: 10K concurrent users

### 5.8.2 Frontend performance
- **Sub-tasks**:
  1. Implement route-based code splitting (already partially done with lazy loading)
  2. Add service worker for offline support
  3. Optimize bundle size:
     - Tree-shake unused dependencies
     - Replace moment.js with date-fns (if used)
     - Use dynamic imports for heavy components (charts, PDF)
  4. Add resource hints (preconnect, prefetch, preload)
  5. Target: Lighthouse score > 95 for all pages
  6. Target: First Contentful Paint < 1.5s
  7. Target: Time to Interactive < 3s

### 5.8.3 Mobile app performance
- **Sub-tasks**:
  1. Optimize image loading (cached, resized, WebP)
  2. Add pagination to all list views (lazy loading)
  3. Optimize BLoC rebuilds (use `buildWhen` / `listenWhen`)
  4. Add memory profiling and leak detection
  5. Target: App startup < 2 seconds
  6. Target: Smooth 60fps scrolling on all list views

---

## Exit Criteria

- [ ] Citus is configured with distributed tables for all school-scoped data
- [ ] Read replicas are configured with automatic failover
- [ ] Redis Cluster is operational with proper key namespacing
- [ ] CDN serves static assets with < 50ms TTFB globally
- [ ] NATS JetStream processes events with < 10ms latency
- [ ] Meilisearch returns results in < 50ms
- [ ] Grafana dashboards show all key metrics
- [ ] Alerting is configured for all critical thresholds
- [ ] PII fields are encrypted at rest
- [ ] Kubernetes HPA scales backend automatically
- [ ] Multi-region deployment works with automatic failover
- [ ] Backend p95 latency < 50ms for CRUD endpoints
- [ ] Lighthouse score > 95 for web apps
- [ ] Load test passes with 10K concurrent users
