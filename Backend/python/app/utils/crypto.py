import jwt
from datetime import datetime, timedelta, timezone
from typing import Dict, Any, Optional
from argon2 import PasswordHasher
from argon2.exceptions import VerifyMismatchError, VerificationError
from app.config import settings

# Initialize Argon2 PasswordHasher with identical parameters:
# m=19456 (19MiB), t=2, p=1
ph = PasswordHasher(
    time_cost=2,
    memory_cost=19456,
    parallelism=1
)

def hash_password(plain: str) -> str:
    """Hash a plaintext password using Argon2id."""
    return ph.hash(plain)

def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plaintext password against an Argon2id PHC hash."""
    try:
        return ph.verify(hashed, plain)
    except (VerifyMismatchError, VerificationError):
        return False
    except Exception:
        # Catch other formatting errors to mimic Rust behavior of returning False/Error
        return False

def create_jwt(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Generate a signed HMAC-SHA256 JWT."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(hours=24)
        
    to_encode.update({"exp": int(expire.timestamp())})
    # Set iat (issued at)
    to_encode.update({"iat": int(datetime.now(timezone.utc).timestamp())})
    
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET, algorithm="HS256")
    return encoded_jwt

def decode_jwt(token: str) -> Dict[str, Any]:
    """Decode and validate a signed JWT. Raises jwt.PyJWTError on invalid/expired."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=["HS256"])
