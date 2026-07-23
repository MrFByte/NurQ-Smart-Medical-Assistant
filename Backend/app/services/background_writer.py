import asyncio
import logging
from typing import List
from app.db.engine import async_session_maker
from app.db.repository import SessionRepository
from app.models.domain import IntakeSession, ConversationTurn
from app.config import settings

logger = logging.getLogger(__name__)

async def persist_to_db(session_data: IntakeSession, turns: List[ConversationTurn], max_retries: int | None = None) -> None:
    """Fire-and-forget coroutine: writes session + turns to Postgres with retry."""
    max_retries = max_retries or settings.db_write_max_retries
    
    for attempt in range(max_retries):
        try:
            async with async_session_maker() as db:
                repo = SessionRepository(db)
                await repo.update_session(session_data)
                for turn in turns:
                    await repo.append_turn(session_data.id, turn)
            return  # success
        except Exception as e:
            wait = settings.db_write_retry_base_seconds * (2 ** attempt)
            logger.warning(f"DB write attempt {attempt+1} failed: {e}. Retrying in {wait}s")
            await asyncio.sleep(wait)
    
    logger.critical(f"DB write FAILED after {max_retries} attempts for session {session_data.id}")


def schedule_db_write(session_data: IntakeSession, turns: List[ConversationTurn]) -> None:
    """Schedule a fire-and-forget background task."""
    asyncio.create_task(persist_to_db(session_data, turns))
