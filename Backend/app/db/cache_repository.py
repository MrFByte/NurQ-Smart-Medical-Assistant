import json
import uuid
import logging
from typing import List, Optional
import redis.asyncio as redis

from app.models.domain import IntakeSession, ConversationTurn
from app.config import settings

logger = logging.getLogger(__name__)

class CacheRepository:
    def __init__(self, redis_client: redis.Redis):
        self.redis = redis_client

    def _session_key(self, session_id: uuid.UUID) -> str:
        return f"session:{session_id}:data"

    def _turns_key(self, session_id: uuid.UUID) -> str:
        return f"session:{session_id}:turns"

    async def cache_session(self, session: IntakeSession) -> None:
        key = self._session_key(session.id)
        try:
            data = session.model_dump_json()
            await self.redis.set(key, data, ex=settings.redis_session_ttl_seconds)
        except Exception as e:
            logger.error(f"Failed to cache session {session.id}: {e}")

    async def get_cached_session(self, session_id: uuid.UUID) -> Optional[IntakeSession]:
        key = self._session_key(session_id)
        try:
            data = await self.redis.get(key)
            if data:
                # Refresh TTL on access
                await self.redis.expire(key, settings.redis_session_ttl_seconds)
                # Parse as dict first since model_validate expects a dict when coming from DB usually, 
                # but model_validate_json is better here since we dumped to json string.
                return IntakeSession.model_validate_json(data)
        except Exception as e:
            logger.error(f"Failed to get cached session {session_id}: {e}")
        return None

    async def append_cached_turn(self, session_id: uuid.UUID, turn: ConversationTurn) -> None:
        key = self._turns_key(session_id)
        try:
            data = turn.model_dump_json()
            # Push to the right end of the list
            await self.redis.rpush(key, data)
            # Set/refresh TTL on the list
            await self.redis.expire(key, settings.redis_session_ttl_seconds)
        except Exception as e:
            logger.error(f"Failed to cache turn for session {session_id}: {e}")

    async def get_cached_turns(self, session_id: uuid.UUID) -> Optional[List[ConversationTurn]]:
        key = self._turns_key(session_id)
        try:
            # Check if key exists first, because lrange returns empty list if key doesn't exist.
            # We want to return None if it's a true cache miss, so we can fallback to DB.
            if not await self.redis.exists(key):
                return None
            
            raw_turns = await self.redis.lrange(key, 0, -1)
            turns = [ConversationTurn.model_validate_json(t) for t in raw_turns]
            await self.redis.expire(key, settings.redis_session_ttl_seconds)
            return turns
        except Exception as e:
            logger.error(f"Failed to get cached turns for session {session_id}: {e}")
            return None

    async def invalidate_session(self, session_id: uuid.UUID) -> None:
        try:
            await self.redis.delete(
                self._session_key(session_id),
                self._turns_key(session_id)
            )
        except Exception as e:
            logger.error(f"Failed to invalidate session {session_id}: {e}")
