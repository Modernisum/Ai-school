import uuid
from typing import Optional, List, Dict, Any
from fastapi import Request, Header, HTTPException, Depends, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import jwt

from app.config import settings
from app.db.session import async_session_factory
from app.db.connection_utils import ConnectionUtils
from app.utils.crypto import decode_jwt

class TenantContext(BaseModel):
    school_id: str
    is_super_admin: bool
    admin_id: str
    user_permissions: List[str]
    request_id: str

def is_public_path(path: str) -> bool:
    """Check if the given HTTP request path is public and skips authentication."""
    # Strip trailing slash for normalization
    path = path.rstrip("/")
    if path in ("", "/health") or path.startswith("/uploads"):
        return True
    
    # Check endpoints under /api
    if (path.startswith("/api/cms") or 
        path.startswith("/api/geo") or 
        path.startswith("/api/setup") or 
        path.startswith("/api/admin")):
        return True
        
    if (path.endswith("/login") or 
        path == "/api/auth/school/forgot-password" or 
        path == "/api/auth/school/verify-otp" or 
        path == "/api/auth/school/change-password" or 
        path == "/api/auth/school/support" or 
        path.endswith("/mobile/select-profile")):
        return True
        
    return False

async def get_tenant_context(
    request: Request,
    authorization: Optional[str] = Header(None),
    x_request_id: Optional[str] = Header(None),
    x_school_id: Optional[str] = Header(None),
    x_is_super_admin: Optional[str] = Header(None),
    x_admin_id: Optional[str] = Header(None)
) -> TenantContext:
    """
    Extracts authentication credentials and RLS parameters from request headers and JWT.
    """
    req_id = x_request_id or str(uuid.uuid4())
    school_id = x_school_id
    is_super_admin = x_is_super_admin == "true"
    admin_id = x_admin_id or "unknown_admin"
    user_permissions = ["authenticated"]
    has_valid_token = False
    path = request.url.path

    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ")[1]
        try:
            token_data = decode_jwt(token)
            has_valid_token = True
            
            # Extract claims - Rust AdminClaims uses snake_case school_id
            # Support both snake_case (Rust) and camelCase (Python-issued) tokens
            if "school_id" in token_data:
                school_id = token_data["school_id"]
            elif "schoolId" in token_data:
                school_id = token_data["schoolId"]
                
            if "sub" in token_data:
                admin_id = token_data["sub"]
            
            if "permissions" in token_data:
                user_permissions = token_data["permissions"]
            elif "role" in token_data:
                user_permissions = [token_data["role"]]
        except jwt.PyJWTError as e:
            print(f"[AUTH] JWT decode failed for path {path}: {type(e).__name__}: {e}")
            if not is_public_path(path):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Invalid or expired token: {e}"
                )

    if not has_valid_token and not is_public_path(path):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization token"
        )

    # Fallback default values
    final_school_id = school_id or "default_school"

    return TenantContext(
        school_id=final_school_id,
        is_super_admin=is_super_admin,
        admin_id=admin_id,
        user_permissions=user_permissions,
        request_id=req_id
    )

async def get_db_with_rls(
    context: TenantContext = Depends(get_tenant_context)
) -> AsyncSession:
    """
    Dependency to get a database session initialized with Row Level Security session context.
    """
    async with async_session_factory() as session:
        try:
            if context.is_super_admin:
                await ConnectionUtils.set_super_admin_session(session)
            elif context.school_id:
                await ConnectionUtils.set_rls_session(session, context.school_id)
            else:
                # Fallback strictly isolated connection
                await ConnectionUtils.set_rls_session(session, "none")
                
            yield session
        finally:
            # SQLAlchemy connection checkin handles reset, but we close session properly
            await session.close()
