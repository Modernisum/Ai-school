# Multi-tenancy Compliance Design Specification

## Problem Statement

The current backend violates the architectural rule: "School ID passed in all API routes: `/api/:schoolId/...`". Specifically, the geo routes (`/api/geo/countries`, `/api/geo/states/:countryId`, `/api/geo/districts/:stateId`) don't include the `:schoolId` parameter.

## Design Goals

1. **Consistency**: All non-admin routes must follow the `:schoolId` pattern
2. **Backward Compatibility**: Maintain existing functionality while fixing the pattern
3. **Performance**: Minimize impact on response times
4. **Scalability**: Support thousands of schools with efficient data isolation

## Technical Design

### 1. Route Pattern Standardization

#### Current Route Structure
```rust
// Violating routes (need fixing)
/api/geo/countries
/api/geo/states/:countryId
/api/geo/districts/:stateId
/api/geo/export
/api/geo/import

// Correct routes (already compliant)
/api/dashboard/:schoolId/stats
/api/:schoolId/responsibilities
/api/:schoolId/students
```

#### Target Route Structure
```rust
// Updated geo routes
/api/geo/:schoolId/countries
/api/geo/:schoolId/states/:countryId  
/api/geo/:schoolId/districts/:stateId
/api/geo/:schoolId/export
/api/geo/:schoolId/import

// Admin routes (remain unchanged)
/api/admin/schools
/api/admin/promos

// Global routes (remain unchanged)
/api/global/notification
/api/public/health
```

### 2. Database Schema Design

#### Option A: Schema-per-Tenant (Recommended)
```sql
-- Common/shared tables (no school_id needed)
CREATE TABLE public.countries (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(2) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE public.states (
    id SERIAL PRIMARY KEY,
    country_id INTEGER REFERENCES public.countries(id),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(10),
    created_at TIMESTAMP DEFAULT NOW()
);

-- School-specific schema (created dynamically)
CREATE SCHEMA IF NOT EXISTS school_sch_123;

-- School-specific tables in their own schema
CREATE TABLE school_sch_123.students (...);
CREATE TABLE school_sch_123.responsibilities (...);
```

#### Option B: Row-level with school_id Column
```sql
-- All tables include school_id
CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    school_id VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(2) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(school_id, code)
);

-- With RLS policies
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
CREATE POLICY school_isolation ON countries
    USING (school_id = current_setting('app.current_school_id'));
```

**Decision**: Use **Option A** for better performance and data isolation.

### 3. Middleware Enhancement

#### Current Middleware (`rls.rs`)
```rust
pub async fn rls_middleware(
    State(_state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // Extract school_id from headers
    let school_id = request.headers()
        .get("X-School-ID")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());
    
    // ... existing code
}
```

#### Enhanced Middleware
```rust
pub async fn enhanced_rls_middleware(
    State(state): State<AppState>,
    mut request: Request,
    next: Next,
) -> Result<Response, AppError> {
    // 1. Extract school_id from path OR headers (for backward compatibility)
    let school_id = extract_school_id(&request).await?;
    
    // 2. Validate school exists and is active
    validate_school(&state.db, &school_id).await?;
    
    // 3. Set database search_path for schema-per-tenant
    if let Some(mut conn) = state.db.pool.acquire().await.ok() {
        let _ = sqlx::query(&format!("SET search_path TO school_{}, public", school_id))
            .execute(&mut *conn)
            .await;
    }
    
    // 4. Create enhanced tenant context
    let tenant_ctx = EnhancedTenantContext {
        school_id: school_id.clone(),
        schema_name: format!("school_{}", school_id),
        is_super_admin: extract_admin_status(&request),
        admin_id: extract_admin_id(&request),
        request_id: generate_request_id(),
        rate_limit_tier: determine_rate_limit_tier(&school_id).await,
        permissions: load_permissions(&school_id, &admin_id).await,
    };
    
    // 5. Store in request extensions
    request.extensions_mut().insert(tenant_ctx);
    
    // 6. Set database connection context
    request.extensions_mut().insert(SchoolDatabaseConfig {
        search_path: format!("school_{}, public", school_id),
        pool: state.db.pool.clone(),
    });
    
    Ok(next.run(request).await)
}
```

### 4. Geo Service Modification

#### Current Implementation
```rust
// routes/geo.rs (current)
pub async fn get_countries() -> impl IntoResponse {
    // Fetches ALL countries without school context
    let countries = sqlx::query!("SELECT * FROM countries")
        .fetch_all(&pool)
        .await?;
    // ...
}
```

#### Updated Implementation
```rust
// routes/geo.rs (updated)
pub async fn get_countries(
    Path(school_id): Path<String>,
    State(state): State<AppState>,
) -> Result<Json<ApiResponse>, AppError> {
    // 1. Get school-specific countries (if any customizations exist)
    let custom_countries = sqlx::query!(
        "SELECT * FROM school_countries WHERE school_id = $1",
        school_id
    )
    .fetch_all(&state.db.pool)
    .await?;
    
    // 2. If no custom countries, return global countries
    if custom_countries.is_empty() {
        let global_countries = sqlx::query!("SELECT * FROM public.countries")
            .fetch_all(&state.db.pool)
            .await?;
        return Ok(Json(ApiResponse::success(global_countries)));
    }
    
    // 3. Merge custom with global (custom takes precedence)
    let merged = merge_countries(custom_countries, global_countries);
    Ok(Json(ApiResponse::success(merged)))
}
```

### 5. Migration Strategy

#### Phase 1: Backward Compatibility Layer
```rust
// Temporary compatibility middleware
pub async fn geo_route_compatibility(
    request: Request,
    next: Next,
) -> Result<Response, AppError> {
    let path = request.uri().path();
    
    // Check if this is an old geo route without school_id
    if path.starts_with("/api/geo/") && !path.contains("/api/geo/:schoolId/") {
        // Extract school_id from headers
        let school_id = extract_school_id_from_headers(&request)
            .ok_or_else(|| AppError::Unauthorized("School ID required".to_string()))?;
        
        // Rewrite path to include school_id
        let new_path = path.replacen("/api/geo/", &format!("/api/geo/{}/", school_id), 1);
        
        // Create new request with updated path
        let (mut parts, body) = request.into_parts();
        parts.uri = new_path.parse().unwrap();
        let new_request = Request::from_parts(parts, body);
        
        return Ok(next.run(new_request).await);
    }
    
    Ok(next.run(request).await)
}
```

#### Phase 2: Client Updates
Update all frontend clients to use new route patterns:
- Web frontend (Vidhyam)
- Mobile apps (Chatra, Employee)
- Third-party integrations

#### Phase 3: Deprecation & Cleanup
After 30 days:
1. Remove compatibility middleware
2. Update API documentation
3. Monitor for any remaining old-style calls

### 6. Testing Strategy

#### Unit Tests
```rust
#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::Request;
    use axum::body::Body;
    
    #[tokio::test]
    async fn test_geo_routes_require_school_id() {
        // Test that geo routes return 400 without school_id
        let app = create_test_app();
        
        let response = app
            .oneshot(Request::builder()
                .uri("/api/geo/countries")
                .body(Body::empty())
                .unwrap())
            .await
            .unwrap();
            
        assert_eq!(response.status(), 400);
    }
    
    #[tokio::test]
    async fn test_geo_routes_with_school_id() {
        // Test that geo routes work with school_id
        let app = create_test_app();
        
        let response = app
            .oneshot(Request::builder()
                .uri("/api/geo/sch_123/countries")
                .body(Body::empty())
                .unwrap())
            .await
            .unwrap();
            
        assert_eq!(response.status(), 200);
    }
}
```

#### Integration Tests
```rust
#[tokio::test]
async fn test_multi_tenant_isolation() {
    // Create test data for school A
    create_test_school("sch_a").await;
    create_test_country("sch_a", "US", "United States").await;
    
    // Create test data for school B  
    create_test_school("sch_b").await;
    create_test_country("sch_b", "IN", "India").await;
    
    // Test school A only sees its data
    let countries_a = get_countries_for_school("sch_a").await;
    assert_eq!(countries_a.len(), 1);
    assert_eq!(countries_a[0].code, "US");
    
    // Test school B only sees its data
    let countries_b = get_countries_for_school("sch_b").await;
    assert_eq!(countries_b.len(), 1);
    assert_eq!(countries_b[0].code, "IN");
}
```

### 7. Performance Considerations

#### Caching Strategy
```rust
// Multi-tenant aware cache
pub struct SchoolAwareCache {
    redis: RedisPool,
}

impl SchoolAwareCache {
    pub async fn get_countries(&self, school_id: &str) -> Result<Vec<Country>, CacheError> {
        let key = format!("geo:countries:{}", school_id);
        self.redis.get(&key).await
    }
    
    pub async fn set_countries(&self, school_id: &str, countries: &[Country], ttl: Duration) {
        let key = format!("geo:countries:{}", school_id);
        self.redis.set(&key, countries, ttl).await;
    }
}
```

#### Database Indexing
```sql
-- For schema-per-tenant approach
CREATE INDEX idx_countries_school_code ON public.countries(school_id, code);

-- For row-level approach  
CREATE INDEX idx_school_countries_school_id ON school_countries(school_id);
CREATE INDEX idx_school_countries_code ON school_countries(code);
```

### 8. Rollback Plan

If issues arise during deployment:

1. **Immediate Rollback**: Revert code changes and restart services
2. **Database Rollback**: Restore from backup if schema changes were made
3. **Client Rollback**: Point clients back to old API version
4. **Monitoring**: Alert on increased error rates during deployment

### 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| API compliance | 100% routes follow pattern | Automated route scanning |
| Response time | < 100ms p95 | Application metrics |
| Error rate | < 0.1% | Error monitoring |
| Cache hit rate | > 80% | Redis metrics |
| Migration completion | 100% clients updated | API usage analytics |

### 10. Implementation Timeline

**Week 1**: Design and prototype
- Update route definitions
- Create compatibility middleware
- Write unit tests

**Week 2**: Implementation
- Modify geo service
- Update database queries
- Implement caching

**Week 3**: Testing
- Integration tests
- Load testing
- Security testing

**Week 4**: Deployment
- Staging deployment
- Production rollout
- Monitoring setup

## Conclusion

This design provides a comprehensive solution for achieving multi-tenancy compliance while maintaining backward compatibility and ensuring performance. The phased approach minimizes risk and allows for gradual migration of clients to the new API patterns.