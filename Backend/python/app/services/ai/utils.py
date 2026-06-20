from typing import List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

async def fetch_config_value(session: AsyncSession, key: str) -> str:
    """Fetch any configuration value from the system_config table."""
    result = await session.execute(
        text("SELECT config_value FROM system_config WHERE config_key = :key"),
        {"key": key}
    )
    row = result.first()
    if row:
        return row[0]
    raise Exception(f"{key} not found in system_config. Please update settings.")

async def fetch_api_key(session: AsyncSession) -> str:
    """Fetch the Gemini API key from system_config (backward compatibility)."""
    return await fetch_config_value(session, "GEMINI_API_KEY")

def calculate_similarity(vec1: List[float], vec2: List[float]) -> float:
    """Calculate the cosine similarity between two float vectors in memory."""
    if len(vec1) != len(vec2) or not vec1:
        return 0.0
        
    dot_product = 0.0
    norm_a = 0.0
    norm_b = 0.0
    for a, b in zip(vec1, vec2):
        dot_product += a * b
        norm_a += a * a
        norm_b += b * b
        
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
        
    return dot_product / ((norm_a ** 0.5) * (norm_b ** 0.5))
