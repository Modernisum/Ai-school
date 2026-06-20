"""
Auth Router - School Admin Login / Logout / Token management
Mirrors Rust's auth service behavior exactly.
"""
from datetime import timedelta
from fastapi import APIRouter, Header, Request
from fastapi.responses import JSONResponse
from sqlalchemy import text
from typing import Optional
import jwt

from app.config import settings
from app.db.session import async_session_factory
from app.utils.crypto import verify_password, create_jwt, decode_jwt

router = APIRouter(prefix="/api/auth")


# ─── School Admin Login ───────────────────────────────────────────────────────
@router.post("/school/login")
@router.post("/school")  # alias some frontends use
async def school_login(request: Request):
    """
    School admin login: { schoolId, password }
    Returns JWT accessToken with school_id claim (matches Rust AdminClaims).
    """
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid JSON body"})

    school_id = body.get("schoolId") or body.get("school_id")
    password = body.get("password")

    if not school_id or not password:
        return JSONResponse(status_code=400, content={"success": False, "message": "Missing schoolId or password"})

    async with async_session_factory() as session:
        # 1. Fetch auth record
        result = await session.execute(
            text("SELECT password, password_temp FROM auth WHERE school_id = :sid"),
            {"sid": school_id}
        )
        row = result.first()
        if not row:
            return JSONResponse(status_code=401, content={"success": False, "message": "Invalid credentials"})

        stored_hash, is_temp = row[0], row[1]

        # 2. Verify password (Argon2id)
        if not verify_password(password, stored_hash):
            return JSONResponse(status_code=401, content={"success": False, "message": "Invalid credentials"})

        # 3. Fetch school name
        school_res = await session.execute(
            text("SELECT school_name FROM schools WHERE school_id = :sid"),
            {"sid": school_id}
        )
        school_row = school_res.first()
        school_name = school_row[0] if school_row else "School Admin"

        # 4. Issue JWT (matches Rust AdminClaims structure with snake_case)
        token = create_jwt(
            data={
                "sub": school_id,
                "school_id": school_id,   # snake_case matches Rust AdminClaims
                "schoolId": school_id,    # camelCase for compatibility
                "role": "admin",
                "permissions": ["admin"],
            },
            expires_delta=timedelta(hours=24)
        )

        return {
            "success": True,
            "message": "Login successful",
            "accessToken": token,
            "schoolId": school_id,
            "schoolName": school_name,
            "passwordTemp": bool(is_temp),
            "expiresIn": "24h"
        }


# ─── Token Verify ─────────────────────────────────────────────────────────────
@router.post("/school/verify-token")
async def verify_token(request: Request, authorization: Optional[str] = Header(default=None)):
    token = None
    if authorization and authorization.startswith("Bearer "):
        token = authorization.split(" ", 1)[1]
    if not token:
        try:
            body = await request.json()
            token = body.get("token") or body.get("accessToken")
        except Exception:
            pass
    if not token:
        return JSONResponse(status_code=401, content={"success": False, "message": "No token provided"})
    try:
        data = decode_jwt(token)
        school_id = data.get("school_id") or data.get("schoolId") or data.get("sub", "")
        return {"success": True, "valid": True, "schoolId": school_id,
                "role": data.get("role", "admin"), "expiresAt": data.get("exp")}
    except jwt.ExpiredSignatureError:
        return JSONResponse(status_code=401, content={"success": False, "valid": False,
                                                       "message": "Token expired - please login again"})
    except jwt.PyJWTError as e:
        return JSONResponse(status_code=401, content={"success": False, "valid": False, "message": str(e)})


# ─── Token Refresh ────────────────────────────────────────────────────────────
@router.post("/refresh")
async def refresh_token(authorization: Optional[str] = Header(default=None)):
    """Re-issue a fresh token if current one is still valid."""
    if not authorization or not authorization.startswith("Bearer "):
        return JSONResponse(status_code=401, content={"success": False, "message": "No token"})
    token = authorization.split(" ", 1)[1]
    try:
        data = decode_jwt(token)
        school_id = data.get("school_id") or data.get("schoolId") or data.get("sub", "")
        new_token = create_jwt(
            data={"sub": school_id, "school_id": school_id, "schoolId": school_id,
                  "role": data.get("role", "admin"), "permissions": data.get("permissions", ["admin"])},
            expires_delta=timedelta(hours=24)
        )
        return {"success": True, "accessToken": new_token, "expiresIn": "24h"}
    except jwt.PyJWTError as e:
        return JSONResponse(status_code=401, content={"success": False, "message": str(e)})


# ─── Logout ───────────────────────────────────────────────────────────────────
@router.post("/school/logout")
@router.post("/logout")
async def logout():
    # Stateless JWT - just acknowledge
    return {"success": True, "message": "Logged out successfully"}


# ─── Change Password ──────────────────────────────────────────────────────────
@router.post("/school/change-password")
async def change_password(request: Request, authorization: Optional[str] = Header(default=None)):
    try:
        body = await request.json()
    except Exception:
        return JSONResponse(status_code=400, content={"success": False, "message": "Invalid JSON"})

    school_id = body.get("schoolId") or body.get("school_id")
    old_pass = body.get("oldPassword") or body.get("old_password")
    new_pass = body.get("newPassword") or body.get("new_password")

    if not all([school_id, old_pass, new_pass]):
        return JSONResponse(status_code=400, content={"success": False, "message": "Missing schoolId, oldPassword, or newPassword"})

    from app.utils.crypto import hash_password
    async with async_session_factory() as session:
        result = await session.execute(
            text("SELECT password FROM auth WHERE school_id = :sid"), {"sid": school_id}
        )
        row = result.first()
        if not row or not verify_password(old_pass, row[0]):
            return JSONResponse(status_code=401, content={"success": False, "message": "Invalid old password"})

        new_hash = hash_password(new_pass)
        await session.execute(
            text("UPDATE auth SET password = :p, password_temp = false WHERE school_id = :sid"),
            {"p": new_hash, "sid": school_id}
        )
        await session.commit()
    return {"success": True, "message": "Password updated successfully"}
