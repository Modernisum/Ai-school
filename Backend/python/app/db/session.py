from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
import redis.asyncio as aioredis
from app.config import settings

# 1. Initialize Async PostgreSQL Engine
# We map DB_MAX_CONNECTIONS and DB_MIN_CONNECTIONS to pool size options
engine = create_async_engine(
    settings.async_database_url,
    pool_size=settings.DB_MIN_CONNECTIONS,
    max_overflow=settings.DB_MAX_CONNECTIONS - settings.DB_MIN_CONNECTIONS,
    pool_recycle=1800, # 30 minutes (matches Rust max_lifetime)
    pool_pre_ping=True,
    echo=False
)

# 2. Async Session Maker
async_session_factory = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False
)

# 3. Async Redis Connection Pool
redis_pool = aioredis.ConnectionPool.from_url(
    settings.REDIS_URL,
    max_connections=20,
    decode_responses=True
)

def get_redis_client() -> aioredis.Redis:
    return aioredis.Redis(connection_pool=redis_pool)

async def get_db_session() -> AsyncSession:
    """Dependency to get async DB session."""
    async with async_session_factory() as session:
        yield session
