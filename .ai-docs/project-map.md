# Project Map - Modern School Management System

## Overview
Multi-tenant school management platform with AI capabilities, built with Rust backend, React frontends, Flutter mobile apps, and Qdrant vector database.

## Core Components

### 1. Backend (Rust/Axum)
- **Location**: `Backend/`
- **Language**: Rust
- **Framework**: Axum web framework
- **Database**: PostgreSQL with multi-tenant RLS (Row Level Security)
- **Key Files**:
  - `src/main.rs` - Application entry point
  - `src/routes/` - API route handlers
  - `src/services/` - Business logic services
  - `src/repository/` - Database repositories
  - `src/db.rs` - Database connection pool
- **Architecture**: Clean architecture with services, repositories, and route handlers
- **Port**: 8080

### 2. Frontend - Vidhyam (React)
- **Location**: `frontend/Vidhyam/`
- **Language**: JavaScript/React
- **Framework**: Vite, React, Redux Toolkit (RTK Query)
- **Key Features**: School administration dashboard, student/employee management, billing, infrastructure
- **Structure**:
  - `src/features/` - Feature-based modules (students, employees, billing, infrastructure)
  - `src/components/ui/` - Reusable UI components
  - `src/app/api/` - API slice configuration
- **Port**: 5174

### 3. Frontend - SuperAdmin (React)
- **Location**: `frontend/SuperAdmin/`
- **Language**: JavaScript/React
- **Purpose**: Platform-level administration for managing multiple schools
- **Port**: 3001

### 4. Mobile Apps (Flutter)
- **Chatra App**: `Apps/chatra/` - Student/Parent mobile app
- **Employee App**: `Apps/employee/` - Teacher/Staff mobile app
- **Framework**: Flutter with Dart
- **Architecture**: Feature-based structure with API service layer

### 5. AI/Vector Database (Qdrant)
- **Technology**: Qdrant vector database for AI embeddings
- **Port**: 6333 (HTTP), 6334 (gRPC)
- **Usage**: Storing document embeddings, semantic search, AI chat history

### 6. Browser Extension
- **Location**: `modernschoolextension/`
- **Purpose**: Student data autofill for external websites
- **Technology**: Chrome extension with manifest v3

## Key Architectural Patterns

### Multi-tenancy
- Each school has separate PostgreSQL schema (tenant isolation)
- RLS policies enforce data separation
- School ID passed in all API routes (`/api/:schoolId/...`)

### API Design
- RESTful endpoints with JSON responses
- Authentication via JWT tokens
- Error handling with standardized error responses

### State Management (Frontend)
- Redux Toolkit with RTK Query for API state
- Feature-sliced design for scalability

### Database Migrations
- Located in `Backend/migrations/`
- Managed via SQLx migration tool

## Development Commands
See `run-project.md` for detailed startup sequence.

## Common Relationships
- Backend serves both frontends (Vidhyam & SuperAdmin)
- Frontends call backend APIs with school ID context
- Mobile apps share same backend API
- Qdrant used by backend AI services for vector search
- Extension interacts with backend for student data

## Important Notes
- Always check if Qdrant container is running before starting backend
- Backend requires PostgreSQL running (configured in .env)
- Frontends proxy API requests to backend via Vite config
- Mobile apps require Flutter SDK and Android emulator

## School Setup Automation
- New schools are automatically configured with comprehensive default data
- Creates 8 default space types with appropriate materials
- Generates academic structure (Pre-Nursery to Class 12) with subjects
- Sets up admin user, default configurations, and notification templates
- Automated responsibility generation for academic subjects
- Implemented in `Backend/src/services/setup_service.rs`
- Provides detailed response with auto-created item counts

## File Naming Conventions
- Rust: `snake_case.rs`
- React components: `PascalCase.jsx`
- Flutter: `snake_case.dart`
- API endpoints: RESTful resource naming (`/api/resource/:id`)

## Testing
- Rust: `cargo test`
- React: `npm test` (Jest)
- Flutter: `flutter test`

This map should help the agent understand project structure and maintain discipline while making changes.