# Responsibility System - Developer Guide

## Overview
This guide provides technical documentation for developers working on the Responsibility System. It covers architecture, code organization, extension points, and development workflows.

## Architecture

### System Components
```
┌─────────────────────────────────────────────────────────────┐
│                    Responsibility System                    │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React/Vue)        │  Mobile Apps (Flutter)      │
├─────────────────────────────────────────────────────────────┤
│              API Layer (Axum Router)                        │
├─────────────────────────────────────────────────────────────┤
│              Service Layer (Business Logic)                 │
├─────────────────────────────────────────────────────────────┤
│           Repository Layer (Data Access)                    │
├─────────────────────────────────────────────────────────────┤
│              Database (PostgreSQL)                          │
└─────────────────────────────────────────────────────────────┘
```

### Key Directories
```
Backend/src/
├── routes/responsibility.rs          # API endpoints
├── routes/responsibility_ext.rs      # Extended endpoints (reports, analytics)
├── services/responsibility/          # Business logic
│   ├── mod.rs                        # Main service implementation
│   ├── crud.rs                       # CRUD operations
│   ├── history.rs                    # Version history
│   └── permissions.rs                # Permission checks
├── repository/traits/responsibility.rs # Repository trait
├── repository/misc_repo.rs           # Repository implementation
├── logic/cache_service.rs            # Redis caching layer
├── logic/query_builder.rs            # SQL query builder
└── migrations/                       # Database schema
```

## Database Schema

### Core Tables
```sql
-- Responsibilities definition
CREATE TABLE responsibilities (
    school_id VARCHAR NOT NULL,
    responsibility_id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    employee_type VARCHAR,
    space_category VARCHAR,
    space_ids TEXT[] DEFAULT '{}',
    monthly_price DECIMAL(10,2) DEFAULT 0,
    per_day_price DECIMAL(10,2) DEFAULT 0,
    student_fee DECIMAL(10,2) DEFAULT 0,
    work_level VARCHAR,
    work_period VARCHAR,
    work_amount DECIMAL(10,2) DEFAULT 1.0,
    created_by VARCHAR,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Employee assignments
CREATE TABLE employee_responsibilities (
    school_id VARCHAR NOT NULL,
    employee_id VARCHAR NOT NULL,
    responsibility_id VARCHAR NOT NULL,
    space_id VARCHAR,
    assigned_date TIMESTAMP DEFAULT NOW(),
    end_date TIMESTAMP,
    status VARCHAR DEFAULT 'active',
    PRIMARY KEY (school_id, employee_id, responsibility_id)
);

-- Assignment history (for rollback/audit)
CREATE TABLE responsibility_history (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR NOT NULL,
    responsibility_id VARCHAR NOT NULL,
    employee_id VARCHAR,
    action VARCHAR NOT NULL,  -- 'CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'UNASSIGN'
    old_data JSONB,
    new_data JSONB,
    performed_by VARCHAR,
    performed_at TIMESTAMP DEFAULT NOW()
);
```

## Code Structure

### Repository Pattern
The system uses the Repository pattern for data access:

```rust
// Trait definition
pub trait ResponsibilityRepository: Send + Sync {
    async fn get_responsibilities(&self, school_id: &str, employee_type: Option<String>) -> Result<JsonList, AppError>;
    async fn add_responsibility(&self, school_id: &str, data: Value) -> Result<Value, AppError>;
    // ... other methods
}

// Implementation
impl ResponsibilityRepository for PostgresResponsibilityRepository {
    // Database-specific implementations
}
```

### Service Layer
Business logic is encapsulated in services:

```rust
pub struct ResponsibilityCrud {
    pub repos: Arc<Repositories>,
}

impl ResponsibilityCrud {
    pub async fn list_responsibilities_paginated(
        &self,
        school_id: &str,
        employee_type: Option<String>,
        page: i32,
        limit: i32,
    ) -> AppResult<Value> {
        // Business logic + repository calls
    }
}
```

### Caching Layer
Redis-based caching for performance:

```rust
pub struct ResponsibilityCacheService {
    redis_pool: Pool,
}

impl ResponsibilityCacheService {
    pub async fn get_responsibilities(
        &self,
        school_id: &str,
        employee_type: Option<&str>,
    ) -> Result<Option<Vec<Value>>, Box<dyn std::error::Error + Send + Sync>> {
        // Check cache first, then database
    }
}
```

## API Endpoints

### Base URL
```
/api/:schoolId/responsibility
```

### Key Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | List responsibilities (with pagination) |
| POST | `/` | Create responsibility |
| GET | `/:id` | Get responsibility details |
| PUT | `/:id` | Update responsibility |
| DELETE | `/:id` | Delete responsibility |
| GET | `/student/:studentId` | Get student responsibilities |
| GET | `/employee/:employeeId` | Get employee responsibilities |
| POST | `/:id/assign` | Assign responsibility to employee |
| POST | `/bulk-assign` | Bulk assign responsibilities |
| GET | `/:id/analytics` | Get responsibility analytics |
| GET | `/analytics/overview` | Get overview analytics |
| GET | `/export/csv` | Export to CSV |
| POST | `/import/csv` | Import from CSV |

### Request/Response Examples

**Create Responsibility:**
```bash
curl -X POST /api/school_123/responsibility \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Class Teacher",
    "description": "Responsible for class management",
    "employeeType": "teacher",
    "monthlyPrice": 5000.0
  }'
```

**Paginated List:**
```bash
curl -X GET "/api/school_123/responsibility?page=1&limit=20&employee_type=teacher"
```

## Performance Optimizations

### Query Builder
Replaces hardcoded SQL with type-safe query building:

```rust
let query = ResponsibilityQueryBuilder::new()
    .school_id(school_id)
    .employee_type(employee_type)
    .space_id(space_id)
    .order_by("created_at", "DESC")
    .limit(limit)
    .offset(offset)
    .build();
```

### Database Indexes
Created indexes for common query patterns:

```sql
-- Performance indexes
CREATE INDEX idx_responsibilities_school_employee 
    ON responsibilities(school_id, employee_type);

CREATE INDEX idx_employee_responsibilities_school_employee 
    ON employee_responsibilities(school_id, employee_id);

CREATE INDEX idx_responsibility_history_school_responsibility 
    ON responsibility_history(school_id, responsibility_id);
```

### Caching Strategy
- **List queries**: 30 seconds TTL
- **Detail queries**: 5 minutes TTL  
- **Analytics queries**: 1 hour TTL
- **Cache invalidation**: On create/update/delete operations

## Testing

### Unit Tests
```rust
#[cfg(test)]
mod responsibility_repository_tests {
    use super::*;
    
    #[test]
    fn test_query_builder_integration() {
        // Test query builder functionality
    }
    
    #[test]
    fn test_responsibility_cache_service_creation() {
        // Test cache service initialization
    }
}
```

### Integration Tests
```rust
#[tokio::test]
async fn test_list_responsibilities_paginated() {
    // Test paginated API endpoint
}

#[tokio::test]
async fn test_create_and_assign_responsibility() {
    // Test full workflow
}
```

## Extension Points

### Adding New Responsibility Types
1. Extend the `responsibilities` table schema if needed
2. Add validation in the service layer
3. Update API documentation
4. Add frontend form fields

### Custom Analytics
1. Create new analytics method in repository
2. Add service method
3. Create API endpoint
4. Add caching if needed

### New Report Types
1. Create report generator in `logic/pdf_generator.rs`
2. Add service method
3. Create API endpoint
4. Add scheduling support

## Development Workflow

### Setting Up Development Environment
```bash
# Clone repository
git clone <repo-url>

# Install dependencies
cd Backend
cargo build

# Set up database
createdb responsibility_dev
sqlx migrate run

# Run tests
cargo test

# Start development server
cargo run --bin server
```

### Code Style Guidelines
1. **Rust**: Follow Rustfmt and Clippy recommendations
2. **Error Handling**: Use `AppError` enum for all errors
3. **Logging**: Use `tracing` crate with appropriate levels
4. **Documentation**: Add doc comments for public APIs
5. **Testing**: Write unit tests for business logic

### Commit Convention
```
feat: add pagination to responsibility lists
fix: resolve cache invalidation issue
docs: update API documentation
perf: optimize analytics queries
test: add unit tests for query builder
refactor: extract cache service to separate module
```

## Deployment

### Environment Variables
```bash
# Database
DATABASE_URL=postgres://user:pass@localhost:5432/responsibility
REDIS_URL=redis://localhost:6379

# Server
PORT=3000
RUST_LOG=info
```

### Docker Deployment
```dockerfile
FROM rust:1.70 as builder
WORKDIR /app
COPY . .
RUN cargo build --release

FROM debian:bullseye-slim
COPY --from=builder /app/target/release/responsibility-api /usr/local/bin/
CMD ["responsibility-api"]
```

### Health Checks
```bash
# API health
curl http://localhost:3000/health

# Database connectivity
curl http://localhost:3000/health/db

# Redis connectivity  
curl http://localhost:3000/health/redis
```

## Monitoring & Observability

### Logging
```rust
tracing::info!("Responsibility created: {}", responsibility_id);
tracing::warn!("Cache miss for school: {}", school_id);
tracing::error!("Failed to assign responsibility: {}", error);
```

### Metrics
- Request latency
- Cache hit/miss rates
- Database query performance
- Memory usage

### Alerting
- High error rates (>5%)
- Slow responses (>1s p95)
- Cache hit rate below threshold
- Database connection failures

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connectivity
psql -h localhost -U postgres -d responsibility

# Check migrations
sqlx migrate info
```

#### Cache Issues
```bash
# Check Redis
redis-cli ping
redis-cli info stats

# Clear cache
redis-cli FLUSHALL
```

#### Performance Issues
1. Check database indexes
2. Review query execution plans
3. Monitor cache hit rates
4. Check for N+1 queries

### Debugging
```rust
// Enable debug logging
RUST_LOG=debug cargo run

// Use tracing spans
let span = tracing::info_span!("responsibility_operation");
let _guard = span.enter();
```

## Contributing

### Pull Request Process
1. Create feature branch from `main`
2. Write tests for new functionality
3. Update documentation
4. Ensure all tests pass
5. Submit PR with detailed description

### Code Review Checklist
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] Code follows style guide
- [ ] No security vulnerabilities
- [ ] Performance considered
- [ ] Backward compatibility maintained

### Release Process
1. Update version in `Cargo.toml`
2. Update CHANGELOG.md
3. Create release tag
4. Build and test release
5. Deploy to staging
6. Monitor for issues
7. Deploy to production

## Resources

### Documentation
- [API Documentation](./responsibility-api.md)
- [User Guide](./responsibility-user-guide.md)
- [Database Schema](./database-schema.md)

### Tools
- **SQLx CLI**: Database migrations
- **cargo-audit**: Security auditing
- **cargo-tarpaulin**: Code coverage
- **cargo-clippy**: Linting

### References
- [Axum Web Framework](https://docs.rs/axum/latest/axum/)
- [SQLx Documentation](https://docs.rs/sqlx/latest/sqlx/)
- [Redis Rust Client](https://docs.rs/redis/latest/redis/)
- [Tracing Framework](https://docs.rs/tracing/latest/tracing/)

---

*Last Updated: April 2024*  
*For questions, contact the backend team or refer to the backend architecture documentation.*