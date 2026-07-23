import redis.asyncio as redis
from app.config import settings
import logging

logger = logging.getLogger(__name__)

pool: redis.Redis | None = None

async def init_redis():
    global pool
    pool = redis.from_url(settings.REDIS_URL, decode_responses=True)
    try:
        await pool.ping()
        logger.info("Connected to Redis")
    except Exception as e:
        logger.error(f"Failed to connect to Redis: {e}")
        # Depending on how critical Redis is, you might want to raise here,
        # but for this setup, the repository falls back to Postgres.

async def close_redis():
    if pool:
        await pool.aclose()
        logger.info("Closed Redis connection")

def get_redis() -> redis.Redis:
    assert pool is not None, "Redis not initialized"
    return pool
