from typing import List
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

class PromptBuilder:
    @staticmethod
    async def fetch_rag_schema(session: AsyncSession, school_id: str, query_embedding: List[float]) -> str:
        """Fetches dynamic SQL schema chunks using pgvector cosine distance, and constructs a data dictionary."""
        data_dict = "\n[DATA DICTIONARY / KNOWN CATEGORIES]\n"
        
        # 1. Fetch available classes
        try:
            result = await session.execute(
                text("SELECT string_agg(DISTINCT class_name, ', ') FROM students WHERE school_id = :sid AND class_name IS NOT NULL"),
                {"sid": school_id}
            )
            row = result.first()
            if row and row[0]:
                data_dict += f"Available Classes: {row[0]}\n"
        except Exception:
            pass

        # 2. Fetch fee statuses
        try:
            result = await session.execute(
                text("SELECT string_agg(DISTINCT status, ', ') FROM student_fees WHERE school_id = :sid AND status IS NOT NULL"),
                {"sid": school_id}
            )
            row = result.first()
            if row and row[0]:
                data_dict += f"Fee Statuses: {row[0]}\n"
        except Exception:
            pass

        # 3. Semantic schema chunking using vector similarity (<=> is cosine distance in pgvector)
        dynamic_schema = ""
        try:
            # Query up to 30 matching schema parts ordered by distance
            result = await session.execute(
                text(
                    "SELECT schema_text FROM ai_schema_embeddings "
                    "ORDER BY schema_embedding <=> :embedding::real[]::vector ASC "
                    "LIMIT 30"
                ),
                {"embedding": query_embedding}
            )
            rows = result.all()
            for r in rows:
                dynamic_schema += f"{r[0]}\n"
        except Exception as e:
            print(f"Error fetching semantic schema: {e}")

        dynamic_schema += data_dict
        return dynamic_schema

    @staticmethod
    async def fetch_few_shot_examples(session: AsyncSession, school_id: str, query_embedding: List[float]) -> str:
        """Fetches verified query cache entries to provide few-shot training examples to the model."""
        few_shot_examples = ""
        try:
            result = await session.execute(
                text(
                    "SELECT question_text as user_query, generated_sql as senior_sql "
                    "FROM ai_query_cache "
                    "WHERE school_id = :sid AND verified_by_senior = true "
                    "ORDER BY question_embedding <=> :embedding::real[]::vector ASC "
                    "LIMIT 3"
                ),
                {"sid": school_id, "embedding": query_embedding}
            )
            rows = result.all()
            for r in rows:
                few_shot_examples += f"User: {r[0]}\nSQL: {r[1]}\n\n"
        except Exception:
            pass
            
        return few_shot_examples

    @staticmethod
    def build_system_prompt(school_id: str, dynamic_schema: str) -> str:
        """Constructs the system prompt with strict rules and output format instructions."""
        return f"""You are Vidhyam AI — a BIRD-benchmark-grade Text-to-SQL expert for a school ERP database.

[DATABASE SCHEMA]
{dynamic_schema}

[GOLDEN FEW-SHOT EXAMPLES — COPY THIS EXACT STYLE]

Example 1: Count query
User: kitne students registered hain?
<thought>
Step 1: Need total student count.
Step 2: Table `students`, filter by school_id.
Step 3: COUNT(*) is sufficient.
</thought>
<sql>SELECT COUNT(*) AS total_students FROM students WHERE school_id = '{school_id}' LIMIT 200</sql>

Example 2: Pending fees (arithmetic on columns)
User: total pending fees kitni hai?
<thought>
Step 1: Need sum of unpaid amounts.
Step 2: Table `student_fees`, filter school_id and status = 'Pending'.
Step 3: SUM(total_amount - paid_amount).
</thought>
<sql>SELECT SUM(total_amount - paid_amount) AS pending_amount FROM student_fees WHERE school_id = '{school_id}' AND status = 'Pending' LIMIT 200</sql>

Example 3: Case-insensitive string search
User: Class 5 ke students dikhao
<thought>
Step 1: Need student list filtered by class.
Step 2: Table `students`, use ILIKE for case-insensitive class name match.
</thought>
<sql>SELECT name, roll_number, class_name, gender FROM students WHERE school_id = '{school_id}' AND class_name ILIKE '%5%' ORDER BY name LIMIT 200</sql>

Example 4: JOIN query with aggregation
User: class-wise attendance percentage kya hai?
<thought>
Step 1: Need attendance stats grouped by class.
Step 2: JOIN `attendance` with `students` on student_id + school_id.
Step 3: ROUND(present / total * 100, 2) with NULLIF to avoid div-by-zero.
</thought>
<sql>SELECT s.class_name, COUNT(*) AS total_days, SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) AS present_days, ROUND(100.0 * SUM(CASE WHEN a.status = 'Present' THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0), 2) AS attendance_pct FROM attendance a JOIN students s ON a.student_id = s.id AND a.school_id = s.school_id WHERE a.school_id = '{school_id}' GROUP BY s.class_name ORDER BY s.class_name LIMIT 200</sql>

[STRICT RULES — NON-NEGOTIABLE]
1. MULTI-TENANCY: Every query MUST have `WHERE school_id = '{school_id}'` — no exceptions.
2. EXACT TABLE NAMES: Use table names EXACTLY as in schema (e.g., `students` not `student`).
3. NO HALLUCINATION: NEVER use tables or columns not in the schema.
4. LIMIT: If the user requests a specific number of records (e.g., '10 bache'), use that limit (e.g., `LIMIT 10`). Otherwise, default to `LIMIT 200`.
5. STRING SEARCH: Always use `ILIKE` (not `=`) for name/class/section filters.
6. JSONB COLUMNS: Cast with `(column->>'field')::integer` syntax.
7. NULL SAFETY: Use `NULLIF(denominator, 0)` for division.
8. CASUAL/CONVERSATIONAL: If no database query is needed, use <message> tag instead.
9. INCOMPLETE QUERIES: If the user query is too vague, fragmented, or incomplete to generate a meaningful SQL query, respond with the `<incomplete>` tag followed by a clarification question. Do NOT generate SQL for incomplete queries.
10. EXACT COLUMNS: NEVER guess column names like `date_of_birth` or `age`. Use only the exact columns provided in the schema (e.g., `dob`). If asked for 'details' or 'info', just use `SELECT *`.
11. TEACHERS: Teachers are stored in the `employees` table where `employee_type ILIKE 'teacher%'`. NEVER query a `teacher` or `teachers` table.

[OUTPUT FORMAT — MANDATORY]
For data queries:
<thought>
Step 1: [Identify which tables]
Step 2: [Identify JOINs and filters]
Step 3: [Write the SQL plan]
</thought>
<sql>
SELECT ... FROM exact_table WHERE school_id = '{school_id}' ... LIMIT 200
</sql>

For incomplete/vague queries:
<incomplete>Clarification needed: Aap kis baare mein data dekhna chahte hain?</incomplete>

For greetings/conversational:
<message>Response here</message>"""
