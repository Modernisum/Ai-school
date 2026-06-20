import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    DATABASE_URL: str = "postgres://postgres:1234@127.0.0.1:5432/ai_school?sslmode=disable"
    REDIS_URL: str = "redis://127.0.0.1:6379/"
    JWT_SECRET: str = "change_me_to_strong_random_hex"
    SUPER_ADMIN_SECRET: str = "change_me_to_strong_random_hex"
    API_BASE_URL: str = "http://localhost:8080"
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000,http://localhost:5174"
    ENVIRONMENT: str = "development"
    PORT: int = 8080
    
    # AI Credentials
    GEMINI_API_KEY: str = ""
    DEEPSEEK_API_KEY: str = ""
    
    # DB Max/Min Connections
    DB_MAX_CONNECTIONS: int = 50
    DB_MIN_CONNECTIONS: int = 5

    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "Backend/.env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    @property
    def async_database_url(self) -> str:
        """Swap protocol for asyncpg driver and strip incompatible params."""
        url = self.DATABASE_URL
        # Remove ?sslmode=... — asyncpg handles SSL via connect_args, not URL params
        if "?" in url:
            url = url.split("?")[0]
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url

    @property
    def origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",") if origin.strip()]

settings = Settings()
