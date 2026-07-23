from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import AsyncSession
from fastapi import Depends

from app.config import settings, Settings
from app.db.engine import async_session_maker
from app.db.repository import SessionRepository

def get_settings() -> Settings:
    return settings

async def get_db_session() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_maker() as session:
        yield session

def get_repo(db: AsyncSession = Depends(get_db_session)) -> SessionRepository:
    return SessionRepository(db)

# New imports
from app.providers.protocols import LLMProvider, STTProvider, TTSProvider
from app.providers.groq_provider import GroqProvider
from app.providers.tts_provider import EdgeTTSProvider
from app.services.state_machine import IntakeStateMachine
from app.services.orchestrator import IntakeOrchestrator
from app.db.cache_repository import CacheRepository
from app.db.redis_client import get_redis

def get_groq_provider() -> GroqProvider:
    return GroqProvider()

def get_llm(provider: GroqProvider = Depends(get_groq_provider)) -> LLMProvider:
    return provider

def get_stt(provider: GroqProvider = Depends(get_groq_provider)) -> STTProvider:
    return provider

def get_tts() -> TTSProvider:
    return EdgeTTSProvider()

def get_state_machine() -> IntakeStateMachine:
    return IntakeStateMachine()

def get_cache_repo() -> CacheRepository:
    return CacheRepository(get_redis())

def get_orchestrator(
    repo: SessionRepository = Depends(get_repo),
    cache_repo: CacheRepository = Depends(get_cache_repo),
    llm: LLMProvider = Depends(get_llm),
    sm: IntakeStateMachine = Depends(get_state_machine)
) -> IntakeOrchestrator:
    return IntakeOrchestrator(repo, cache_repo, llm, sm)
