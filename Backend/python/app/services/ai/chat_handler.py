import json
import httpx
from typing import Dict, Any, List, Optional, AsyncGenerator
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.services.ai.providers import GeminiProvider, DeepSeekProvider, OllamaProvider
from app.services.ai.ai_cache import AiCacheService
from app.services.ai.prompt_builder import PromptBuilder
from app.services.ai.utils import fetch_api_key

def detect_greeting(query: str) -> bool:
    q = query.strip().lower()
    return q in ["hello", "hi", "hey", "namaste", "salaam", "kase ho", "kaise ho"]

def format_query_results(records: List[Dict[str, Any]]) -> str:
    if not records:
        return "No records found matching your query."

    # Single cell shortcut
    if len(records) == 1 and len(records[0]) == 1:
        val = list(records[0].values())[0]
        if isinstance(val, (int, float)):
            return f"There are currently {val} records registered."
        if val is None:
            return "-"
        return str(val)

    cols = list(records[0].keys())
    md = "|"
    for c in cols:
        md += f" {c} |"
    md += "\n|"
    for _ in cols:
        md += "---|"
    md += "\n"

    for r in records:
        md += "|"
        for c in cols:
            val = r[c]
            if val is None:
                val_str = "-"
            elif isinstance(val, str):
                s = val.strip()
                val_str = s if s else "-"
            elif isinstance(val, (dict, list)):
                val_str = json.dumps(val)
            else:
                val_str = str(val)
            # Replace | to avoid table break
            val_str = val_str.replace("|", "\\|")
            md += f" {val_str} |"
        md += "\n"
    return md

async def validate_and_execute_sql(session: AsyncSession, sql: str, school_id: str) -> List[Dict[str, Any]]:
    trimmed = sql.strip().rstrip(";")
    upper = trimmed.upper()

    # 1. Check graduation status
    status_res = await session.execute(
        text("SELECT is_junior_graduated FROM ai_school_status WHERE school_id = :sid"),
        {"sid": school_id}
    )
    row = status_res.first()
    is_graduated = row[0] if row else False

    # 2. Command filters
    if not is_graduated:
        if not (upper.startswith("SELECT") or upper.startswith("WITH") or upper.startswith("EXPLAIN")):
            raise ValueError("Junior Mode: Only SELECT, WITH, and EXPLAIN queries are allowed. You do not have write permissions yet.")
    else:
        if not (upper.startswith("SELECT") or upper.startswith("WITH") or upper.startswith("EXPLAIN") or
                upper.startswith("INSERT") or upper.startswith("UPDATE") or upper.startswith("DELETE")):
            raise ValueError("Senior Mode: Only SELECT, WITH, EXPLAIN, INSERT, UPDATE, and DELETE queries are allowed.")

    # 3. Block dangerous keywords
    forbidden = [
        "DROP", "ALTER", "CREATE", "TRUNCATE", "GRANT", "REVOKE", 
        "EXECUTE", "CALL", "COPY", "VACUUM", "REINDEX", "DISCARD", 
        "LOCK", "SHOW", "LISTEN", "NOTIFY", "UNLISTEN", "MOVE", 
        "FETCH", "CLOSE", "PREPARE", "DEALLOCATE", "IMPORT", "EXPORT"
    ]
    # Check if forbidden words exist as whole words
    words = [w.strip() for w in upper.split() if w.strip()]
    for f in forbidden:
        if f in words:
            raise ValueError(f"Forbidden SQL keyword detected: {f}")

    # 4. Check forbidden symbols
    for sym in ["/*", "--", ";"]:
        if sym in trimmed:
            raise ValueError(f"Forbidden SQL symbol detected: {sym}")

    # 5. Enforce LIMIT
    if "LIMIT" not in upper:
        raise ValueError("Query must include a LIMIT clause (max 200)")

    # 6. Execute in transaction with read-only variables
    conn = await session.connection()
    # Begin is implicit in SQLAlchemy sessions, but we run raw statements
    await conn.execute(text("SET LOCAL ROLE ai_readonly_role"))
    await conn.execute(text("SET TRANSACTION READ ONLY"))
    
    result = await conn.execute(text(trimmed))
    rows = [dict(r._mapping) for r in result.all()]
    
    # Clean rollback
    await session.rollback()

    if len(rows) > 50:
        rows = rows[:50]

    return rows

class ChatHandler:
    def __init__(self, cache_service: Optional[AiCacheService] = None):
        self.cache_service = cache_service or AiCacheService()
        self.deepseek = DeepSeekProvider()
        self.ollama = OllamaProvider()

    async def get_gemini(self, session: AsyncSession) -> GeminiProvider:
        api_key = await fetch_api_key(session)
        return GeminiProvider(api_key=api_key)

    async def generate_embedding(self, session: AsyncSession, text_data: str) -> List[float]:
        gemini = await self.get_gemini(session)
        return await gemini.generate_embedding(text_data)

    async def process_query(self, session: AsyncSession, school_id: str, query: str) -> Dict[str, Any]:
        """Stateless query processing with greeting, RAG, tool calling, and self-correction."""
        if detect_greeting(query):
            reply = "Namaste! Main Vidhyam AI hoon. Aapki help kaise kar sakta hoon?"
            await session.execute(
                text("INSERT INTO ai_chat_history (school_id, role, content) VALUES (:sid, 'user', :q)"),
                {"sid": school_id, "q": query}
            )
            await session.execute(
                text("INSERT INTO ai_chat_history (school_id, role, content) VALUES (:sid, 'assistant', :r)"),
                {"sid": school_id, "r": reply}
            )
            await session.commit()
            return {"answer": reply}

        # 1. Hot Cache Lookup
        cache_hit = await self.cache_service.get_ai_response(school_id, query)
        if cache_hit:
            if cache_hit.startswith("__SQL__:"):
                sql = cache_hit.replace("__SQL__:", "", 1)
                try:
                    records = await validate_and_execute_sql(session, sql, school_id)
                    reply = f"**Data Result:**\n\n{format_query_results(records)}"
                except Exception as e:
                    reply = f"Cache hit executed but SQL failed: {e}"
            else:
                reply = cache_hit
            return {"answer": reply}

        # 2. Get Embedding and Schema
        embedding = await self.generate_embedding(session, query)
        schema = await PromptBuilder.fetch_rag_schema(session, school_id, embedding)
        system_prompt = PromptBuilder.build_system_prompt(school_id, schema)

        # 3. Request Senior Completion (DeepSeek)
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": query}
        ]
        
        # Save query to history
        await session.execute(
            text("INSERT INTO ai_chat_history (school_id, role, content) VALUES (:sid, 'user', :q)"),
            {"sid": school_id, "q": query}
        )

        resp = await self.deepseek.chat_completion(messages, json_format=False)
        full_text = resp.get("choices", [{}])[0].get("message", {}).get("content", "")

        # 4. Tool Execution / SQL Extraction
        extracted_sql = None
        if "<sql>" in full_text and "</sql>" in full_text:
            start = full_text.find("<sql>") + 5
            end = full_text.find("</sql>")
            extracted_sql = full_text[start:end].strip()

        if extracted_sql:
            try:
                records = await validate_and_execute_sql(session, extracted_sql, school_id)
                reply = f"**Data Result:**\n\n{format_query_results(records)}"
                # Permanent SQL cache
                await self.cache_service.set_ai_response_permanent(school_id, query, f"__SQL__:{extracted_sql}")
            except Exception as first_error:
                # 5. SQL Self-Correction
                correction_prompt = (
                    f"The following SQL query failed with an error. Fix it and return ONLY the corrected SQL inside <sql>...</sql> tags.\n\n"
                    f"Failed SQL:\n{extracted_sql}\n\nError:\n{first_error}\n\n"
                    f"Important: school_id must be '{school_id}', use exact table names from schema, use LIMIT if applicable."
                )
                corr_messages = [
                    {"role": "system", "content": "You are a SQL expert. Fix the broken SQL query. Return ONLY the corrected SQL inside <sql>...</sql> tags. No explanation."},
                    {"role": "user", "content": correction_prompt}
                ]
                corr_resp = await self.deepseek.chat_completion(corr_messages, json_format=False)
                corr_text = corr_resp.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                corrected_sql = None
                if "<sql>" in corr_text and "</sql>" in corr_text:
                    start = corr_text.find("<sql>") + 5
                    end = corr_text.find("</sql>")
                    corrected_sql = corr_text[start:end].strip()
                
                if corrected_sql:
                    try:
                        records = await validate_and_execute_sql(session, corrected_sql, school_id)
                        reply = f"**Data Result:**\n\n{format_query_results(records)}"
                        await self.cache_service.set_ai_response_permanent(school_id, query, f"__SQL__:{corrected_sql}")
                    except Exception as second_error:
                        reply = f"Could not generate correct SQL after retry. Error: {second_error}"
                else:
                    reply = f"SQL Execution Failed: {first_error}"
        else:
            # Plain Text reply
            reply = full_text.replace("<message>", "").replace("</message>", "").strip()
            if reply:
                await self.cache_service.set_ai_response_permanent(school_id, query, reply)

        # Save assistant reply to history
        await session.execute(
            text("INSERT INTO ai_chat_history (school_id, role, content) VALUES (:sid, 'assistant', :r)"),
            {"sid": school_id, "r": reply}
        )
        await session.commit()
        return {"answer": reply}

    async def get_query_suggestions(self, session: AsyncSession, school_id: str, query_embedding: List[float]) -> List[Dict[str, Any]]:
        """Fetch similar search suggestions based on vector distance."""
        try:
            result = await session.execute(
                text(
                    "SELECT question_text, search_count, 1 - (question_embedding <=> :embedding::real[]::vector) as sim "
                    "FROM ai_query_cache "
                    "WHERE school_id = :sid AND 1 - (question_embedding <=> :embedding::real[]::vector) > 0.55 "
                    "ORDER BY (1 - (question_embedding <=> :embedding::real[]::vector)) * log(search_count + 1) DESC "
                    "LIMIT 5"
                ),
                {"sid": school_id, "embedding": query_embedding}
            )
            return [{"text": row[0], "count": row[1], "similarity": float(row[2])} for row in result.all()]
        except Exception:
            return []

    async def post_session_query_stream(
        self, 
        session: AsyncSession, 
        school_id: str, 
        session_id: str, 
        query: str
    ) -> AsyncGenerator[str, None]:
        """
        SSE Generator for chat streaming. Yields SSE data chunks.
        """
        # Rate limit checks (max 50/hr per school)
        allowed = await self.cache_service.check_rate_limit(school_id, 50)
        if not allowed:
            yield f"data: {json.dumps({'answer': 'Rate limit exceeded for this school (50 req/hr). Please try again later.'})}\n\n"
            return

        # Greeting check
        if detect_greeting(query):
            reply = "Namaste! Main Vidhyam AI hoon. Aapki help kaise kar sakta hoon?"
            # Add history
            await session.execute(
                text("INSERT INTO ai_chat_history (school_id, role, content, session_id) VALUES (:sid, 'user', :q, :sess)"),
                {"sid": school_id, "q": query, "sess": session_id}
            )
            await session.execute(
                text("INSERT INTO ai_chat_history (school_id, role, content, session_id) VALUES (:sid, 'assistant', :r, :sess)"),
                {"sid": school_id, "r": reply, "sess": session_id}
            )
            await session.commit()
            yield f"data: {json.dumps({'answer': reply})}\n\n"
            return

        # Embedding & Cache checks
        embedding = await self.generate_embedding(session, query)
        
        # Hot cache lookup
        cached_resp = await self.cache_service.get_ai_response(school_id, query)
        suggestions = await self.get_query_suggestions(session, school_id, embedding)
        
        if cached_resp:
            if cached_resp.startswith("__SQL__:"):
                sql = cached_resp.replace("__SQL__:", "", 1)
                try:
                    records = await validate_and_execute_sql(session, sql, school_id)
                    reply = f"**Data Result:**\n\n{format_query_results(records)}"
                except Exception:
                    reply = ""
            else:
                reply = cached_resp
            
            if reply:
                yield f"data: {json.dumps({'answer': reply})}\n\n"
                if suggestions:
                    yield f"data: {json.dumps({'suggestions': suggestions})}\n\n"
                return

        # Fetch Schema and history
        schema = await PromptBuilder.fetch_rag_schema(session, school_id, embedding)
        system_prompt = PromptBuilder.build_system_prompt(school_id, schema)

        messages = [{"role": "system", "content": system_prompt}]
        
        # Retrieve history
        hist_res = await session.execute(
            text("SELECT role, content FROM ai_chat_history WHERE session_id = :sess ORDER BY created_at DESC LIMIT 4"),
            {"sess": session_id}
        )
        history_msgs = []
        for r in hist_res.all():
            role, content = r[0], r[1]
            if role == "assistant" and "**Data Result:**" in content:
                pos = content.find("**Data Result:**")
                content = content[:pos] + "[Data Result Provided in UI]"
            history_msgs.append({"role": role, "content": content})
        
        history_msgs.reverse()
        messages.extend(history_msgs)
        messages.append({"role": "user", "content": query})

        # Save user message to DB
        await session.execute(
            text("INSERT INTO ai_chat_history (school_id, role, content, session_id) VALUES (:sid, 'user', :q, :sess)"),
            {"sid": school_id, "q": query, "sess": session_id}
        )
        await session.commit()

        # DeepSeek Stream API Call
        url = "https://api.deepseek.com/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.deepseek.api_key}",
            "Content-Type": "application/json"
        }
        body = {
            "model": "deepseek-v4-flash",
            "messages": messages,
            "stream": True,
            "max_tokens": 4096,
            "temperature": 0.0
        }

        full_response = ""
        in_thought = False
        in_sql = False
        in_message = False
        sql_buffer = ""

        # Use httpx client
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                async with client.stream("POST", url, headers=headers, json=body) as response:
                    if response.status_code == 200:
                        async for chunk in response.aiter_lines():
                            if not chunk.strip():
                                continue
                            if chunk.startswith("data: ") and chunk != "data: [DONE]":
                                try:
                                    json_data = json.loads(chunk[6:])
                                    content = json_data["choices"][0]["delta"].get("content", "")
                                    if not content:
                                        continue
                                    
                                    full_response += content

                                    # State Parsing Machine
                                    if "<thought" in full_response and not in_thought and "</thought>" not in full_response:
                                        in_thought = True
                                        yield f"data: {json.dumps({'answer': '*Thinking...*'})}\n\n"
                                    
                                    if "</thought>" in full_response and in_thought:
                                        in_thought = False
                                    
                                    if "<sql>" in full_response and not in_sql:
                                        in_sql = True
                                        parts = full_response.split("<sql>")
                                        if len(parts) > 1:
                                            sql_buffer += parts[1]
                                        continue

                                    if in_sql:
                                        sql_buffer += content
                                        continue

                                    if "<message>" in full_response and not in_message:
                                        in_message = True

                                    if in_message:
                                        clean = content.replace("<message>", "").replace("</message>", "")
                                        if clean:
                                            yield f"data: {json.dumps({'answer': clean})}\n\n"
                                    elif not in_thought and "<thought" not in full_response:
                                        starts_xml = full_response.strip().startswith("<")
                                        if not starts_xml or len(full_response) > 80:
                                            yield f"data: {json.dumps({'answer': content})}\n\n"

                                except Exception:
                                    pass
            except Exception as e:
                yield f"data: {json.dumps({'answer': f'Connection failed: {e}'})}\n\n"

        # Check for generated SQL
        extracted_sql = None
        if "<incomplete>" in full_response:
            pass
        elif "<sql>" in full_response and "</sql>" in full_response:
            s_idx = full_response.find("<sql>") + 5
            e_idx = full_response.find("</sql>")
            extracted_sql = full_response[s_idx:e_idx].strip()
        elif "SELECT" in sql_buffer.upper():
            extracted_sql = sql_buffer.strip()

        # SQL execution
        if extracted_sql:
            try:
                records = await validate_and_execute_sql(session, extracted_sql, school_id)
                table_md = format_query_results(records)
                data_answer = "\n\n**Data Result:**\n\n" + table_md
                yield f"data: {json.dumps({'answer': data_answer})}\n\n"
                await self.cache_service.set_ai_response_permanent(school_id, query, f"__SQL__:{extracted_sql}")
            except Exception as first_error:
                fix_msg = "\n\n*Fixing SQL error...*"
                yield f"data: {json.dumps({'answer': fix_msg})}\n\n"
                
                # Fetch tables suggestion if relation missing
                dynamic_hint = ""
                if "relation" in str(first_error) and "does not exist" in str(first_error):
                    try:
                        table_res = await session.execute(
                            text("SELECT string_agg(table_name::text, ', ') FROM information_schema.tables WHERE table_schema = 'public'")
                        )
                        tbls = table_res.scalar()
                        if tbls:
                            dynamic_hint = f"\n\nHint: The table you tried to use does not exist. Available tables in the database are: [{tbls}]. Please choose the correct one."
                    except Exception:
                        pass

                correction_prompt = (
                    f"The following SQL query failed with an error. Fix it and return ONLY the corrected SQL inside <sql>...</sql> tags.\n\n"
                    f"Failed SQL:\n{extracted_sql}\n\nError:\n{first_error}{dynamic_hint}\n\n"
                    f"Important: school_id must be '{school_id}', use exact table names from schema, use LIMIT if applicable."
                )
                
                corr_body = {
                    "model": "deepseek-v4-flash",
                    "messages": [
                        {"role": "system", "content": "You are a SQL expert. Fix the broken SQL query. Return ONLY the corrected SQL inside <sql>...</sql> tags. No explanation."},
                        {"role": "user", "content": correction_prompt}
                    ],
                    "stream": False,
                    "max_tokens": 1024,
                    "temperature": 0.0
                }

                corrected_sql = None
                try:
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        corr_resp = await client.post(url, headers=headers, json=corr_body)
                        if corr_resp.status_code == 200:
                            corr_text = corr_resp.json()["choices"][0]["message"]["content"]
                            if "<sql>" in corr_text and "</sql>" in corr_text:
                                s_idx = corr_text.find("<sql>") + 5
                                e_idx = corr_text.find("</sql>")
                                corrected_sql = corr_text[s_idx:e_idx].strip()
                except Exception:
                    pass

                if corrected_sql:
                    try:
                        records = await validate_and_execute_sql(session, corrected_sql, school_id)
                        table_md = format_query_results(records)
                        data_answer2 = "\n\n**Data Result:**\n\n" + table_md
                        yield f"data: {json.dumps({'answer': data_answer2})}\n\n"
                        await self.cache_service.set_ai_response_permanent(school_id, query, f"__SQL__:{corrected_sql}")
                    except Exception as second_error:
                        retry_err = "\n\n*Could not generate correct SQL after retry.*\nError: " + str(second_error)
                        yield f"data: {json.dumps({'answer': retry_err})}\n\n"
                else:
                    sql_fail_msg = "\n\n*SQL Execution Failed:* " + str(first_error)
                    yield f"data: {json.dumps({'answer': sql_fail_msg})}\n\n"

        # Save assistant history
        await session.execute(
            text("INSERT INTO ai_chat_history (school_id, role, content, session_id) VALUES (:sid, 'assistant', :r, :sess)"),
            {"sid": school_id, "r": full_response, "sess": session_id}
        )
        await session.commit()

        if not extracted_sql and full_response.strip():
            clean_resp = full_response.replace("<incomplete>", "").replace("</incomplete>", "")
            clean_resp = clean_resp.replace("<message>", "").replace("</message>", "").strip()
            if clean_resp:
                await self.cache_service.set_ai_response_permanent(school_id, query, clean_resp)

        # Output suggestions
        if suggestions:
            yield f"data: {json.dumps({'suggestions': suggestions})}\n\n"
