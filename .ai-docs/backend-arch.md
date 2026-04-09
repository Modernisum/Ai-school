# Backend Architecture & Development Rules

## Overview
Rust/Axum backend with PostgreSQL multi-tenant architecture, Qdrant vector database for AI.

## Core Structure
- **Location**: `Backend/`
- **Framework**: Axum web framework
- **Database**: PostgreSQL with RLS (Row Level Security)
- **Vector DB**: Qdrant (port 6333/6334)

## Key Directories
- `src/routes/` - API route handlers
- `src/services/` - Business logic services  
- `src/repository/` - Database repositories
- `src/db.rs` - Database connection pool
- `migrations/` - SQLx migration files

## Multi-tenancy Pattern
- Each school has separate PostgreSQL schema
- RLS policies enforce data separation
- School ID passed in all API routes: `/api/:schoolId/...`

## API Design Rules
- RESTful endpoints with JSON responses
- Authentication via JWT tokens
- Error handling with standardized error responses
- Use `AppError` enum for all error types

## Database Rules
- Use SQLx for database operations
- All queries must be parameterized to prevent SQL injection
- Use transactions for multi-step operations
- Implement proper connection pooling

## Service Layer Pattern
```rust
// Repository (data access)
trait UserRepository {
    async fn find_by_id(&self, id: i32) -> Result<Option<User>, AppError>;
}

// Service (business logic)
struct UserService<R: UserRepository> {
    repo: R,
}

impl<R: UserRepository> UserService<R> {
    async fn get_user_with_profile(&self, id: i32) -> Result<UserWithProfile, AppError> {
        let user = self.repo.find_by_id(id).await?;
        // Business logic here
    }
}

// Route handler (HTTP layer)
async fn get_user_handler(
    Path(id): Path<i32>,
    Extension(service): Extension<UserService<PostgresUserRepository>>,
) -> Result<Json<UserResponse>, AppError> {
    let user = service.get_user_with_profile(id).await?;
    Ok(Json(user.into()))
}
```

## Error Handling
- Use `thiserror` crate for error definitions
- Convert database errors to appropriate HTTP status codes
- Log errors with appropriate context
- Return user-friendly error messages

## Testing Rules
- Unit tests for all services and repositories
- Integration tests for API endpoints
- Use test database for database tests
- Mock external dependencies

## Performance Rules
- Use connection pooling (deadpool)
- Implement request timeouts
- Use async/await for I/O operations
- Cache frequently accessed data

## Security Rules
- Validate all input data
- Use prepared statements for SQL
- Implement rate limiting
- Secure environment variables
- JWT token validation with proper expiration

## Development Commands
```bash
# Run backend
cd Backend && cargo run --bin modern_school_backend

# Run tests
cargo test

# Run migrations
cargo sqlx migrate run

# Check database schema
cargo sqlx database create
```

## Important Notes
- Backend requires PostgreSQL running (configured in .env)
- Always check if Qdrant container is running before starting
- Use `.env` file for configuration (not committed to git)
- Port: 8080 (default)