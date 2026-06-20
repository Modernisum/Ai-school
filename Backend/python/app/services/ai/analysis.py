from typing import List, Dict, Any, Optional
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.ai.providers import GeminiProvider
from app.services.ai.utils import fetch_api_key

class AnalysisEngine:
    def __init__(self, provider: Optional[GeminiProvider] = None):
        self.provider = provider

    async def get_provider(self, session: AsyncSession) -> GeminiProvider:
        """Dynamically initialize or return the GeminiProvider using key from DB."""
        if self.provider:
            return self.provider
        api_key = await fetch_api_key(session)
        self.provider = GeminiProvider(api_key=api_key)
        return self.provider

    async def generate_embedding(self, session: AsyncSession, text_data: str) -> List[float]:
        """Generate float vector using initialized Gemini provider."""
        provider = await self.get_provider(session)
        return await provider.generate_embedding(text_data)

    async def search_documents(self, session: AsyncSession, school_id: str, query: str) -> Dict[str, Any]:
        """Performs semantic vector search on document chunks in document_embeddings table."""
        query_embedding = await self.generate_embedding(session, query)
        
        # Cosine distance operator '<=>' in pgvector
        result = await session.execute(
            text(
                "SELECT chunk_text, 1 - (chunk_embedding <=> :embedding::real[]::vector) as similarity "
                "FROM document_embeddings "
                "WHERE school_id = :sid AND 1 - (chunk_embedding <=> :embedding::real[]::vector) > 0.7 "
                "ORDER BY chunk_embedding <=> :embedding::real[]::vector ASC "
                "LIMIT 5"
            ),
            {"sid": school_id, "embedding": query_embedding}
        )
        
        rows = result.all()
        excerpts = [row[0] for row in rows]
        return {"excerpts": excerpts}
