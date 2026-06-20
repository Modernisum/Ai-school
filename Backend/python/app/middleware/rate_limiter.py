import time
from typing import Dict, Tuple
from fastapi import Request, HTTPException, status

class RateLimiter:
    def __init__(self, window_secs: int, max_requests: int):
        self.window_secs = window_secs
        self.max_requests = max_requests
        # Key: client_ip -> Value: (request_count, window_start_time)
        self.counters: Dict[str, Tuple[int, float]] = {}

    @classmethod
    def general(cls) -> "RateLimiter":
        return cls(60, 500)

    @classmethod
    def auth(cls) -> "RateLimiter":
        return cls(60, 5)

    @classmethod
    def ai(cls) -> "RateLimiter":
        return cls(60, 100)

    @classmethod
    def admin(cls) -> "RateLimiter":
        return cls(60, 10000)

    @staticmethod
    def extract_client_ip(request: Request) -> str:
        """Extract client IP address from headers (like Cloudflare, Nginx reverse proxy) or fallback."""
        x_forwarded_for = request.headers.get("x-forwarded-for")
        if x_forwarded_for:
            return x_forwarded_for.split(",")[0].strip()
        
        x_real_ip = request.headers.get("x-real-ip")
        if x_real_ip:
            return x_real_ip.strip()
            
        client = request.client
        if client:
            return client.host
            
        return "unknown"

    def check(self, client_ip: str) -> None:
        """
        Verify request count for the client IP.
        Raises 429 Too Many Requests if the limit is exceeded.
        """
        now = time.time()
        
        # Cleanup stale keys to avoid unbounded memory growth
        if len(self.counters) > 10000:
            self.counters = {
                ip: val for ip, val in self.counters.items()
                if now - val[1] <= self.window_secs
            }

        if client_ip not in self.counters:
            self.counters[client_ip] = (1, now)
            return

        count, start_time = self.counters[client_ip]

        if now - start_time > self.window_secs:
            # New window
            self.counters[client_ip] = (1, now)
        elif count >= self.max_requests:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail={
                    "success": False,
                    "error_code": "RATE_LIMITED",
                    "message": "Too many requests. Please try again later."
                }
            )
        else:
            self.counters[client_ip] = (count + 1, start_time)
