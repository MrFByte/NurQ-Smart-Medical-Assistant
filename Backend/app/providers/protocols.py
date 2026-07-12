from typing import Protocol, Optional, Any
from pydantic import BaseModel
from app.models.domain import FieldConfidence

class ExtractedFieldUpdate(BaseModel):
    value: str | list | None = None
    confidence: FieldConfidence
    raw_quote: str | None = None

class ExtractionResult(BaseModel):
    fields: dict[str, ExtractedFieldUpdate]
    raw_response: str = ""

class EmergencyResult(BaseModel):
    is_emergency: bool
    triggered_keywords: list[str]
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
        self, user_message: str, schema_state: dict, conversation: list[dict]
    ) -> ExtractionResult: ...

    async def detect_emergency(
        self, user_message: str, conversation: list[dict]
    ) -> EmergencyResult: ...

    async def generate_question(
        self, target_field: str, field_label: str, conversation: list[dict]
    ) -> str: ...

    async def generate_summary(
        self, session_data: dict
    ) -> SummaryResult: ...

class STTProvider(Protocol):
    async def transcribe(self, audio_bytes: bytes, mime_type: str) -> str: ...

class TTSProvider(Protocol):
    async def synthesize(self, text: str) -> bytes: ...
