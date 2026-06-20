import asyncio
import json
import os
import httpx
from typing import Dict, Any, List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import async_session_factory

async def call_senior_deepseek(prompt: str) -> str:
    """Call DeepSeek to evaluate Junior SQL logic against database schema."""
    api_key = os.environ.get("DEEPSEEK_API_KEY", "")
    url = "https://api.deepseek.com/chat/completions"

    body = {
        "model": "deepseek-v4-flash",
        "messages": [
            { "role": "system", "content": "You are a Senior SQL Database Architect. You evaluate the logic of a Junior AI." },
            { "role": "user", "content": prompt }
        ],
        "response_format": { "type": "json_object" }
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            url,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=body
        )
        res = response.json()
        return res["choices"][0]["message"]["content"]

async def evaluate_batch_shadow(session: AsyncSession, school_id: str) -> None:
    """Assess logical correctness of 10 unverified queries. Promotes to senior if 10/10 correct."""
    # 1. Fetch 10 unverified queries
    result = await session.execute(
        text(
            "SELECT question_text, generated_sql FROM ai_query_cache "
            "WHERE school_id = :sid AND verified_by_senior = false "
            "LIMIT 10"
        ),
        {"sid": school_id}
    )
    unverified = result.all()
    if not unverified:
        return

    # 2. Fetch full schema text
    schema_res = await session.execute(text("SELECT schema_text FROM ai_schema_embeddings"))
    schema_rows = schema_res.all()
    schema_str = "\n".join([row[0] for row in schema_rows])

    # 3. Build prompts
    queries_text = ""
    for idx, row in enumerate(unverified):
        queries_text += f"Query {idx + 1}:\nUser Asked: {row[0]}\nJunior Wrote: {row[1]}\n\n"

    prompt = (
        f"Database Schema:\n{schema_str}\n\n"
        f"The Junior AI generated the following 10 SQL queries. Review them for logical accuracy.\n"
        f"{queries_text}\n"
        f"CRITICAL RULE: DO NOT hallucinate column names. If a column like 'class_id' is not explicitly in the schema, do NOT use it. Verify every column and JOIN against the schema.\n"
        f"If all 10 are PERFECT logically, return an empty array for mistakes.\n"
        f"If any are wrong, return their mistakes.\n\n"
        f"RESPOND IN STRICT JSON FORMAT:\n"
        f"{{\n  \"mistakes\": [\n    {{ \"user_query\": \"...\", \"junior_sql\": \"...\", \"correction_sql\": \"...\", \"lesson_learned\": \"...\" }}\n  ]\n}}"
    )

    try:
        response = await call_senior_deepseek(prompt)
        clean_text = response.strip()
        if clean_text.startswith("```json"):
            clean_text = clean_text.replace("```json", "", 1).rstrip("`").strip()
            
        parsed = json.loads(clean_text)
        mistakes = parsed.get("mistakes", [])

        # 4. Handle mistakes & graduation
        if not mistakes and len(unverified) == 10:
            await session.execute(
                text("UPDATE ai_school_status SET is_junior_graduated = true WHERE school_id = :sid"),
                {"sid": school_id}
            )
            print(f"[BATCH EVALUATION] Junior got 10/10! School {school_id} Graduated.")
        else:
            for mistake in mistakes:
                await session.execute(
                    text(
                        "INSERT INTO ai_learning_lessons (school_id, user_query, junior_mistake, senior_correction, lesson_learned) "
                        "VALUES (:sid, :q, :m, :c, :l)"
                    ),
                    {
                        "sid": school_id,
                        "q": mistake.get("user_query", ""),
                        "m": mistake.get("junior_sql", ""),
                        "c": mistake.get("correction_sql", ""),
                        "l": mistake.get("lesson_learned", "")
                    }
                )
            print(f"[BATCH EVALUATION] Processed {len(mistakes)} mistakes.")

        # 5. Mark all 10 as verified
        for row in unverified:
            await session.execute(
                text("UPDATE ai_query_cache SET verified_by_senior = true WHERE school_id = :sid AND question_text = :q"),
                {"sid": school_id, "q": row[0]}
            )
        await session.commit()

    except Exception as e:
        await session.rollback()
        print(f"[BATCH EVALUATION] Error processing shadow evaluation: {e}")

async def start_ai_background_worker() -> None:
    """Async background worker checking for pending AI batch evaluations."""
    print("[AI WORKER] Starting background worker...")
    while True:
        async with async_session_factory() as session:
            try:
                # Find and lock a pending job
                job_result = await session.execute(
                    text(
                        "UPDATE ai_background_jobs "
                        "SET status = 'PROCESSING', updated_at = NOW() "
                        "WHERE id = ( "
                        "    SELECT id FROM ai_background_jobs "
                        "    WHERE status = 'PENDING' "
                        "    ORDER BY created_at ASC "
                        "    FOR UPDATE SKIP LOCKED "
                        "    LIMIT 1 "
                        ") "
                        "RETURNING id, job_type, payload"
                    )
                )
                row = job_result.first()
                if row:
                    job_id, job_type, payload_val = row[0], row[1], row[2]
                    payload = payload_val if isinstance(payload_val, dict) else json.loads(payload_val or "{}")

                    print(f"[AI WORKER] Processing job: {job_type} ({job_id})")
                    
                    if job_type == "SHADOW_EVAL":
                        school_id = payload.get("school_id")
                        if school_id:
                            await evaluate_batch_shadow(session, school_id)

                    # Mark job complete
                    await session.execute(
                        text("UPDATE ai_background_jobs SET status = 'COMPLETED', updated_at = NOW() WHERE id = :id"),
                        {"id": job_id}
                    )
                    await session.commit()
                else:
                    # No pending jobs, sleep
                    await asyncio.sleep(5)
            except Exception as e:
                await session.rollback()
                print(f"[AI WORKER] Error in main loop: {e}")
                await asyncio.sleep(10)
