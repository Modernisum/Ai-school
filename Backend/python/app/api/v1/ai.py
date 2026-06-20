import json
from typing import Dict, Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import StreamingResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.middleware.rls import get_db_with_rls, get_tenant_context, TenantContext
from app.services.ai.orchestrator import AiOrchestrator
from pydantic import BaseModel

router = APIRouter()
orchestrator = AiOrchestrator()

class QueryPayload(BaseModel):
    query: str

class RenamePayload(BaseModel):
    title: str

class ArchivePayload(BaseModel):
    is_active: bool

class InvalidateCachePayload(BaseModel):
    question_text: str

class IngestDocumentPayload(BaseModel):
    content: str
    metadata: Optional[Dict[str, Any]] = None

class ConfigPayload(BaseModel):
    provider_id: int
    default_model: Optional[str] = None
    embedding_model: Optional[str] = None
    max_monthly_cost: Optional[float] = None
    features_enabled: Optional[Dict[str, Any]] = None

# Stateless general query
@router.post("/school/{schoolId}/query")
async def stateless_query(
    schoolId: str,
    payload: QueryPayload,
    session: AsyncSession = Depends(get_db_with_rls)
):
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        data = await orchestrator.process_query(session, schoolId, payload.query)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# AI Sessions management
@router.post("/school/{schoolId}/ai/session")
async def create_session(
    schoolId: str,
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_db_with_rls)
):
    title = payload.get("title") or "New Research Session"
    user_id = "default"
    session_id = str(uuid_v4_placeholder_or_uuid()) # wait, we can import uuid
    import uuid
    session_id = str(uuid.uuid4())
    try:
        await session.execute(
            text(
                "INSERT INTO ai_chat_sessions (session_id, school_id, user_id, title) "
                "VALUES (:sess, :sid, :uid, :title)"
            ),
            {"sess": session_id, "sid": schoolId, "uid": user_id, "title": title}
        )
        await session.commit()
        return {"success": True, "session_id": session_id}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/school/{schoolId}/ai/sessions")
async def list_sessions(
    schoolId: str,
    session: AsyncSession = Depends(get_db_with_rls)
):
    user_id = "default"
    try:
        result = await session.execute(
            text(
                "SELECT s.session_id, s.school_id, s.user_id, s.title, s.is_active, s.created_at, s.updated_at, "
                "COALESCE(h.msg_count, 0) as message_count, h.last_msg_at as last_message_at "
                "FROM ai_chat_sessions s "
                "LEFT JOIN ( "
                "   SELECT session_id, COUNT(*) as msg_count, MAX(created_at) as last_msg_at "
                "   FROM ai_chat_history GROUP BY session_id "
                ") h ON s.session_id = h.session_id "
                "WHERE s.school_id = :sid AND s.user_id = :uid "
                "ORDER BY s.updated_at DESC"
            ),
            {"sid": schoolId, "uid": user_id}
        )
        sessions = []
        for row in result.all():
            sessions.append({
                "session_id": row[0],
                "school_id": row[1],
                "user_id": row[2],
                "title": row[3],
                "is_active": row[4],
                "created_at": str(row[5]),
                "updated_at": str(row[6]),
                "message_count": int(row[7]),
                "last_message_at": str(row[8]) if row[8] else None
            })
        return {"success": True, "data": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/school/{schoolId}/ai/session/{sessionId}/history")
async def get_session_history(
    schoolId: str,
    sessionId: str,
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        result = await session.execute(
            text(
                "SELECT id, role, content, created_at FROM ai_chat_history "
                "WHERE session_id = :sess ORDER BY created_at ASC"
            ),
            {"sess": sessionId}
        )
        history = []
        for row in result.all():
            history.append({
                "id": row[0],
                "role": row[1],
                "content": row[2],
                "created_at": str(row[3])
            })
        return {"success": True, "data": history}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/school/{schoolId}/ai/session/{sessionId}/query")
async def post_session_query(
    schoolId: str,
    sessionId: str,
    payload: QueryPayload,
    session: AsyncSession = Depends(get_db_with_rls)
):
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    try:
        data = await orchestrator.chat_handler.process_query(session, schoolId, payload.query)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/school/{schoolId}/ai/session/{sessionId}/query/stream")
async def post_session_query_stream(
    schoolId: str,
    sessionId: str,
    payload: QueryPayload,
    session: AsyncSession = Depends(get_db_with_rls)
):
    if not payload.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")
    
    async def event_generator():
        async for chunk in orchestrator.post_session_query_stream(session, schoolId, sessionId, payload.query):
            yield chunk

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.delete("/school/{schoolId}/ai/session/{sessionId}")
async def delete_session(
    schoolId: str,
    sessionId: str,
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        res = await session.execute(
            text("DELETE FROM ai_chat_sessions WHERE session_id = :sess AND school_id = :sid"),
            {"sess": sessionId, "sid": schoolId}
        )
        await session.commit()
        success = res.rowcount > 0
        return {"success": success, "deleted": success}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/school/{schoolId}/ai/session/{sessionId}")
async def rename_session(
    schoolId: str,
    sessionId: str,
    payload: RenamePayload,
    session: AsyncSession = Depends(get_db_with_rls)
):
    if not payload.title.strip():
        raise HTTPException(status_code=400, detail="Title cannot be empty")
    try:
        res = await session.execute(
            text("UPDATE ai_chat_sessions SET title = :title, updated_at = NOW() WHERE session_id = :sess AND school_id = :sid"),
            {"title": payload.title, "sess": sessionId, "sid": schoolId}
        )
        await session.commit()
        return {"success": res.rowcount > 0}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.patch("/school/{schoolId}/ai/session/{sessionId}/archive")
async def archive_session(
    schoolId: str,
    sessionId: str,
    payload: ArchivePayload,
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        res = await session.execute(
            text("UPDATE ai_chat_sessions SET is_active = :active, updated_at = NOW() WHERE session_id = :sess AND school_id = :sid"),
            {"active": payload.is_active, "sess": sessionId, "sid": schoolId}
        )
        await session.commit()
        return {"success": res.rowcount > 0}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/school/{schoolId}/ai/suggest")
async def suggest_queries(
    schoolId: str,
    q: str = Query("", min_length=2),
    limit: int = 5,
    session: AsyncSession = Depends(get_db_with_rls)
):
    if not q.strip():
        return {"success": True, "suggestions": []}
    try:
        # Fast text match using ILIKE
        words = q.split()
        ilike_pattern = "%" + "%".join(words) + "%"
        
        result = await session.execute(
            text(
                "SELECT question_text, search_count FROM ai_query_cache "
                "WHERE (school_id = :sid OR school_id = 'GLOBAL') AND question_text ILIKE :pattern "
                "ORDER BY search_count DESC LIMIT :lim"
            ),
            {"sid": schoolId, "pattern": ilike_pattern, "lim": limit}
        )
        suggestions = [{"text": r[0], "count": r[1], "similarity": 1.0} for r in result.all()]
        return {"success": True, "suggestions": suggestions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/school/{schoolId}/ai/cache/invalidate")
async def invalidate_ai_cache(
    schoolId: str,
    payload: InvalidateCachePayload,
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        # PostgreSQL
        res = await session.execute(
            text("DELETE FROM ai_query_cache WHERE (school_id = :sid OR school_id = 'GLOBAL') AND question_text = :q"),
            {"sid": schoolId, "q": payload.question_text}
        )
        # Redis
        await orchestrator.chat_handler.cache_service.invalidate_ai_response(schoolId, payload.question_text)
        await session.commit()
        return {"success": True, "deleted_rows": res.rowcount}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Config management
@router.get("/school/{schoolId}/ai/chat/config/{schoolId_2}")
async def get_ai_config(
    schoolId: str,
    schoolId_2: str,
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        result = await session.execute(
            text(
                "SELECT p.provider_id, p.provider_type, p.provider_name, sac.default_model, "
                "sac.embedding_model, sac.max_monthly_cost, sac.features_enabled "
                "FROM ai_providers p "
                "LEFT JOIN school_ai_config sac ON p.provider_id = sac.provider_id AND sac.school_id = :sid "
                "WHERE p.is_active = true ORDER BY p.provider_type"
            ),
            {"sid": schoolId}
        )
        providers = []
        for r in result.all():
            providers.append({
                "provider_id": r[0],
                "provider_type": r[1],
                "provider_name": r[2],
                "default_model": r[3],
                "embedding_model": r[4],
                "max_monthly_cost": float(r[5]) if r[5] else None,
                "features_enabled": r[6],
                "is_configured": r[3] is not None
            })
        return {"success": True, "data": providers}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/school/{schoolId}/ai/chat/config/{schoolId_2}")
async def update_ai_config(
    schoolId: str,
    schoolId_2: str,
    payload: ConfigPayload,
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        # Verify provider active
        chk = await session.execute(
            text("SELECT EXISTS(SELECT 1 FROM ai_providers WHERE provider_id = :pid AND is_active = true)"),
            {"pid": payload.provider_id}
        )
        if not chk.scalar():
            raise HTTPException(status_code=400, detail="Provider not active or doesn't exist")

        features_json = json.dumps(payload.features_enabled or {})
        await session.execute(
            text(
                "INSERT INTO school_ai_config (school_id, provider_id, default_model, embedding_model, max_monthly_cost, features_enabled, updated_at) "
                "VALUES (:sid, :pid, :dm, :em, :cost, :feat, NOW()) "
                "ON CONFLICT (school_id, provider_id) DO UPDATE SET "
                "   default_model = EXCLUDED.default_model, "
                "   embedding_model = EXCLUDED.embedding_model, "
                "   max_monthly_cost = EXCLUDED.max_monthly_cost, "
                "   features_enabled = EXCLUDED.features_enabled, "
                "   updated_at = NOW()"
            ),
            {
                "sid": schoolId, "pid": payload.provider_id, "dm": payload.default_model,
                "em": payload.embedding_model, "cost": payload.max_monthly_cost,
                "feat": features_json
            }
        )
        await session.commit()
        return {"success": True}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/school/{schoolId}/ai/chat/config/{schoolId_2}/{providerId}")
async def delete_ai_config(
    schoolId: str,
    schoolId_2: str,
    providerId: int,
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        res = await session.execute(
            text("DELETE FROM school_ai_config WHERE school_id = :sid AND provider_id = :pid"),
            {"sid": schoolId, "pid": providerId}
        )
        await session.commit()
        return {"success": True, "deleted": res.rowcount > 0}
    except Exception as e:
        await session.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/school/{schoolId}/ai/chat/health/{schoolId_2}")
async def ai_health_check(
    schoolId: str,
    schoolId_2: str,
    session: AsyncSession = Depends(get_db_with_rls)
):
    # Standard healthcheck returning active AI systems config
    try:
        res = await session.execute(
            text("SELECT provider_type, provider_name FROM ai_providers WHERE is_active = true")
        )
        active = [{"type": r[0], "name": r[1]} for r in res.all()]
        return {"success": True, "data": {"health": "OK", "active_providers": active}}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Embedding & Search
@router.post("/school/{schoolId}/ai/chat/embedding/{schoolId_2}")
async def generate_embedding(
    schoolId: str,
    schoolId_2: str,
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_db_with_rls)
):
    text_val = payload.get("text")
    if not text_val:
        raise HTTPException(status_code=400, detail="text is required")
    try:
        emb = await orchestrator.generate_embedding(session, text_val)
        return {"success": True, "data": emb}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/school/{schoolId}/ai/chat/embedding/{schoolId_2}/search")
async def search_documents(
    schoolId: str,
    schoolId_2: str,
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_db_with_rls)
):
    query = payload.get("query")
    limit = payload.get("limit") or 5
    if not query:
        raise HTTPException(status_code=400, detail="query is required")
    try:
        # Calls orchestrator's document search
        data = await orchestrator.search_documents(session, schoolId, query)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/school/{schoolId}/ai/chat/rag/ingest/{schoolId_2}")
async def ingest_rag_document(
    schoolId: str,
    schoolId_2: str,
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        data = await orchestrator.analysis.ingest_document(session, schoolId, payload)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Employee tasks generation
@router.post("/school/{schoolId}/ai/chat/{schoolId_2}/tasks/generate")
async def ai_generate_tasks(
    schoolId: str,
    schoolId_2: str,
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_db_with_rls)
):
    emp_id = payload.get("employee_id")
    if not emp_id:
        raise HTTPException(status_code=400, detail="employee_id is required")
    try:
        data = await orchestrator.generate_weekly_tasks_for_employee(session, schoolId, emp_id)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/school/{schoolId}/ai/chat/{schoolId_2}/tasks/reorganize")
async def ai_reorganize_tasks(
    schoolId: str,
    schoolId_2: str,
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_db_with_rls)
):
    emp_id = payload.get("employee_id")
    if not emp_id:
        raise HTTPException(status_code=400, detail="employee_id is required")
    try:
        data = await orchestrator.reorganize_tasks(session, schoolId, emp_id)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/school/{schoolId}/ai/chat/{schoolId_2}/exam/generate")
async def ai_generate_exam(
    schoolId: str,
    schoolId_2: str,
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_db_with_rls)
):
    try:
        data = await orchestrator.generate_exam_questions(session, schoolId, payload)
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
