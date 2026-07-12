import pytest
from sqlalchemy import text
from app.db.engine import async_session_maker

@pytest.mark.asyncio
async def test_database_connection():
    """
    Tests that the application can successfully connect to the PostgreSQL database
    and execute a simple query.
    """
    try:
        async with async_session_maker() as session:
            result = await session.execute(text("SELECT 1"))
            assert result.scalar() == 1
    except Exception as e:
        pytest.fail(f"Database connection failed: {e}")
