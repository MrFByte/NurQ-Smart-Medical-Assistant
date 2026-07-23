from typing import Protocol, Optional, Any
from pydantic import BaseModel, field_validator
from app.models.domain import FieldConfidence

class ExtractedFieldUpdate(BaseModel):
    value: str | list | None = None
    confidence: FieldConfidence
    raw_quote: str | None = None

    @field_validator("confidence", mode="before")
    @classmethod
    def normalize_confidence(cls, v):
        if isinstance(v, str):
            return v.strip().lower()
        return v

class ExtractionResult(BaseModel):
    fields: dict[str, ExtractedFieldUpdate] = {}
    is_emergency: bool = False
    triggered_keywords: list[str] = []
    recommended_action: Optional[str] = None
    raw_response: str = ""

class SummaryResult(BaseModel):
    clinician_summary: str
    flags: list[str]
    raw_response: str = ""

class LLMProvider(Protocol):
    """All 4 LLM roles behind one interface.
    POC keeps them together. Split into 4 protocols (ISP) when
    you need different providers per role."""

    async def extract_fields(
        self, user_message: str, schema_state: dict, conversation: list[dict],
        group_label: str | None = None
    ) -> ExtractionResult: ...

    async def generate_question(
        self, group_label: str, known_context: str | None, conversation: list[dict]
    ) -> str: ...

    async def generate_summary(
        self, session_data: dict
    ) -> SummaryResult: ...

class STTProvider(Protocol):
    async def transcribe(self, audio_bytes: bytes, mime_type: str) -> str: ...

class TTSProvider(Protocol):
    async def synthesize(self, text: str) -> bytes: ...
