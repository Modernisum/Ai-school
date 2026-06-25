import os
import glob
from sqlalchemy import text
from app.db.session import engine, async_session_factory
from app.db.connection_utils import ConnectionUtils

def _find_migrations_dir() -> str:
    """Find migrations directory - supports Docker volume mount and local dev."""
    # Docker: volume mounted at /app/migrations
    docker_path = "/app/migrations"
    if os.path.exists(docker_path):
        return docker_path
    # Local dev: sibling Backend/migrations folder
    local_path = os.path.abspath(
        os.path.join(os.path.dirname(__file__), "../../../Backend/migrations")
    )
    return local_path

MIGRATIONS_DIR = _find_migrations_dir()

async def run_database_migrations():
    """Runs all raw SQL migrations sequentially using raw asyncpg connection."""
    print(f"Scanning for database migrations in: {MIGRATIONS_DIR}")
    if not os.path.exists(MIGRATIONS_DIR):
        print(f"Warning: Migrations directory not found at {MIGRATIONS_DIR}")
        return

    # Find all SQL files, excluding down migrations
    sql_files = glob.glob(os.path.join(MIGRATIONS_DIR, "*.sql"))
    migration_files = [f for f in sql_files if not f.endswith(".down.sql")]
    migration_files.sort(key=lambda x: os.path.basename(x))

    # Use raw asyncpg connection to handle multi-statement SQL files
    async with engine.connect() as conn:
        # Get the underlying asyncpg connection
        raw_conn = await conn.get_raw_connection()
        asyncpg_conn = raw_conn.driver_connection

        try:
            # 1. Reset role so we can run DDL as superuser
            await asyncpg_conn.execute("RESET ROLE")
            await asyncpg_conn.execute("SET app.is_super_admin = 'true'")

            # Ensure all referenced roles exist in PostgreSQL
            for role in ['ai_readonly_role', 'developer_readonly', 'developer_emergency', 'developer_data_engineer', 'developer_audit']:
                await asyncpg_conn.execute(
                    f"DO $$ BEGIN IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = '{role}') THEN CREATE ROLE {role}; END IF; END $$;"
                )

            # 2. Ensure schema_migrations tracker table exists
            await asyncpg_conn.execute(
                "CREATE TABLE IF NOT EXISTS public.schema_migrations (version VARCHAR(255) PRIMARY KEY)"
            )

            # 3. Get already applied migrations
            applied = await asyncpg_conn.fetch("SELECT version FROM public.schema_migrations")
            applied_versions = {row["version"] for row in applied}

            # 4. Apply new migrations sequentially
            for filepath in migration_files:
                filename = os.path.basename(filepath)

                if filename in applied_versions:
                    continue

                print(f"Applying migration: {filename}")
                with open(filepath, "r", encoding="utf-8") as f:
                    sql_content = f.read()

                # Strip comments and check if there are any SQL statements
                cleaned_lines = []
                for line in sql_content.splitlines():
                    trimmed = line.strip()
                    if trimmed.startswith("--") or not trimmed:
                        continue
                    cleaned_lines.append(line)
                cleaned_sql = "\n".join(cleaned_lines).strip()

                if not cleaned_sql:
                    print(f"Skipping empty/comment-only migration: {filename}")
                    try:
                        await asyncpg_conn.execute(
                            "INSERT INTO public.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
                            filename
                        )
                    except Exception as e:
                        print(f"Error marking empty migration {filename} as applied: {e}")
                    continue

                try:
                    # asyncpg.execute handles multi-statement SQL natively
                    await asyncpg_conn.execute(sql_content)
                    await asyncpg_conn.execute(
                        "INSERT INTO public.schema_migrations (version) VALUES ($1) ON CONFLICT DO NOTHING",
                        filename
                    )
                    print(f"Successfully applied: {filename}")
                except Exception as e:
                    print(f"Error applying migration {filename}: {e}")
                    # Non-fatal: continue to next migration
                    continue
        finally:
            try:
                await asyncpg_conn.execute("RESET ALL")
                await asyncpg_conn.execute("RESET ROLE")
                print("Connection settings reset successfully.")
            except Exception as e:
                print(f"Failed to reset connection settings: {e}")

    print("Migrations complete.")

