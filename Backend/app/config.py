# pyrefly: ignore [missing-import]
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    APP_NAME: str
    DEBUG: bool

    
    DATABASE_URL: str
    SECRET_KEY:str
    REDIS_URL: str = "redis://127.0.0.1:6379"

    redis_session_ttl_seconds: int = 172800 # 48 hours
    db_write_max_retries: int = 5
    db_write_retry_base_seconds: float = 1.0

    GROQ_API_KEY: str
    SUPABASE_URL: str

    # Model names — change these to swap providers
    extraction_model: str = "llama-3.1-8b-instant"
    emergency_model: str = "llama-3.1-8b-instant"
    question_model: str = "llama-3.3-70b-versatile"
    summary_model: str = "llama-3.3-70b-versatile"
    stt_model: str = "whisper-large-v3"
    tts_voice: str = "en-US-JennyNeural"

    llm_timeout_seconds: float = 30.0

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
