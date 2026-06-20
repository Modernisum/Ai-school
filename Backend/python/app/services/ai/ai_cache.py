import hashlib
from datetime import datetime, timezone
from typing import Optional
import redis.asyncio as aioredis
from app.db.session import get_redis_client

class AiCacheService:
    def __init__(self, redis_client: aioredis.Redis = None):
        self.redis = redis_client or get_redis_client()

    def generate_key(self, school_id: str, question_text: str) -> str:
        """Generate a SHA256 hashed redis key for hot caching."""
        query_bytes = question_text.strip().lower().encode("utf-8")
        query_hash = hashlib.sha256(query_bytes).hexdigest()
        return f"ai:resp:{school_id}:{query_hash}"

    async def get_ai_response(self, school_id: str, question_text: str) -> Optional[str]:
        """Fetch the AI response from Redis cache."""
        key = self.generate_key(school_id, question_text)
        try:
            return await self.redis.get(key)
        except Exception:
            return None

    async def set_ai_response(self, school_id: str, question_text: str, response: str, ttl_secs: int) -> None:
        """Save the AI response to Redis with a TTL (expiration)."""
        key = self.generate_key(school_id, question_text)
        try:
            await self.redis.setex(key, ttl_secs, response)
        except Exception:
            pass

    async def set_ai_response_permanent(self, school_id: str, question_text: str, response: str) -> None:
        """Save the AI response to Redis permanently."""
        key = self.generate_key(school_id, question_text)
        try:
            await self.redis.set(key, response)
        except Exception:
            pass

    async def invalidate_ai_response(self, school_id: str, question_text: str) -> None:
        """Delete a cached AI response from Redis."""
        key = self.generate_key(school_id, question_text)
        try:
            await self.redis.delete(key)
        except Exception:
            pass

    async def check_rate_limit(self, school_id: str, max_per_hour: int) -> bool:
        """
        Check hourly rate limits for AI queries.
        Returns False if limit exceeded, True otherwise. Fails open on Redis error.
        """
        hour_key = datetime.now(timezone.utc).strftime("%Y%m%d%H")
        key = f"ai:ratelimit:{school_id}:{hour_key}"
        try:
            count_str = await self.redis.get(key)
            count = int(count_str) if count_str else 0
            if count >= max_per_hour:
                return False
                
            new_count = await self.redis.incr(key)
            if new_count == 1:
                await self.redis.expire(key, 3600)
            return True
        except Exception:
            # Fail open if Redis is down
            return True
