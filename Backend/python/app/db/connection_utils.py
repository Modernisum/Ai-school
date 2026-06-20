from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

class ConnectionUtils:
    @staticmethod
    def sanitize_school_id(school_id: str) -> str:
        return school_id.replace("'", "''")

    @staticmethod
    def validate_school_id(school_id: str) -> None:
        if not school_id:
            raise ValueError("School ID cannot be empty")
        if len(school_id) > 255:
            raise ValueError("School ID too long (max 255 characters)")

    @staticmethod
    async def set_rls_session(session: AsyncSession, school_id: str) -> None:
        """Sets role and school context for Row Level Security."""
        ConnectionUtils.validate_school_id(school_id)
        sanitized = ConnectionUtils.sanitize_school_id(school_id)
        
        # In SQLAlchemy, session.execute uses connection from pool.
        # Run SET commands matching Rust database connections.
        await session.execute(text("SET ROLE school_tenant"))
        await session.execute(text(f"SET app.current_school_id = '{sanitized}'"))
        await session.execute(text("SET app.is_super_admin = 'false'"))

    @staticmethod
    async def set_super_admin_session(session: AsyncSession) -> None:
        """Resets role and sets super_admin bypass flag."""
        await session.execute(text("RESET ROLE"))
        # Using SET (session level) instead of LOCAL to ensure it persists outside transaction
        await session.execute(text("SET app.is_super_admin = 'true'"))
