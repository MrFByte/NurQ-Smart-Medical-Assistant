import asyncio
import io
import json
import logging
from typing import Optional

import openai
from pydantic import ValidationError

from app.config import settings
from app.providers.protocols import (
    LLMProvider,
    STTProvider,
    ExtractionResult,
    ExtractedFieldUpdate,
    EmergencyResult,
    SummaryResult,
)

logger = logging.getLogger(__name__)

class GroqProvider(LLMProvider, STTProvider):
    def __init__(self):
        self.client = openai.AsyncOpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=settings.GROQ_API_KEY,
        )

    async def _call_with_timeout(self, coro):
        try:
            return await asyncio.wait_for(coro, timeout=settings.llm_timeout_seconds)
        except asyncio.TimeoutError:
            logger.error("LLM call timed out.")
            raise
        except Exception as e:
            logger.error(f"LLM call failed: {e}")
            raise

    def _build_messages(self, system_prompt: str, user_message: Optional[str] = None, conversation: Optional[list[dict]] = None) -> list[dict]:
        messages = [{"role": "system", "content": system_prompt}]
        if conversation:
            messages.extend(conversation)
        if user_message:
            messages.append({"role": "user", "content": user_message})
        return messages

    async def extract_fields(
        self, user_message: str, schema_state: dict, conversation: list[dict]
    ) -> ExtractionResult:
        system_prompt = (
            "Extract medical information from the patient's message. Map to the provided schema fields. "
            "Never diagnose. If uncertain, set confidence to PARTIAL. "
            f"Current state: {json.dumps(schema_state)}\n\n"
            "You MUST return a JSON object exactly matching this schema:\n"
            '{"fields": {"<field_path>": {"value": "<extracted value>", "confidence": "<unasked|asked|partial|confirmed|skipped>", "raw_quote": "<exact quote>"}}}'
        )
        messages = self._build_messages(system_prompt, user_message, conversation)
        
        try:
            coro = self.client.chat.completions.create(
                model=settings.extraction_model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.0
            )
            response = await self._call_with_timeout(coro)
            raw_content = response.choices[0].message.content
            
            parsed = ExtractionResult.model_validate_json(raw_content)
            parsed.raw_response = raw_content
            return parsed
        except (ValidationError, Exception) as e:
            logger.error(f"Extraction failed to parse: {e}")
            return ExtractionResult(fields={}, raw_response=str(e))

    async def detect_emergency(
        self, user_message: str, conversation: list[dict]
    ) -> EmergencyResult:
        system_prompt = (
            "You are an emergency keyword detector. Your ONLY job is to identify if the patient's "
            "message contains any of these exact red-flag conditions:\n"
            "  - chest pain, difficulty breathing, suicidal ideation, stroke symptoms, "
            "severe bleeding, loss of consciousness, cardiac arrest, heart attack, seizure\n\n"
            "STRICT RULES:\n"
            "1. ONLY flag a keyword if the patient has EXPLICITLY and LITERALLY stated it. "
            "Do NOT infer, assume, or extrapolate. If the word 'chest' is not in the message, "
            "'chest pain' is NOT triggered.\n"
            "2. Return triggered_keywords as an EMPTY list [] if no red-flag words are literally present.\n"
            "3. Never flag conditions based on lifestyle factors (overwork, stress, skipping meals) alone.\n"
            "4. When in doubt, return is_emergency: false and an empty list.\n\n"
            "You MUST return a JSON object exactly matching this schema:\n"
            '{"is_emergency": true/false, "triggered_keywords": ["<keyword>"], "recommended_action": "<action or null>"}'
        )
        messages = self._build_messages(system_prompt, user_message, conversation)

        try:
            coro = self.client.chat.completions.create(
                model=settings.emergency_model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.0
            )
            response = await self._call_with_timeout(coro)
            raw_content = response.choices[0].message.content
            
            parsed = EmergencyResult.model_validate_json(raw_content)
            parsed.raw_response = raw_content
            return parsed
        except (ValidationError, Exception) as e:
            logger.error(f"Emergency detection failed to parse: {e}")
            return EmergencyResult(is_emergency=False, triggered_keywords=[], raw_response=str(e))

    async def generate_question(
        self, target_field: str, field_label: str, conversation: list[dict]
    ) -> str:
        system_prompt = (
            f"You are a warm, calm medical intake assistant. Ask the patient one question about {field_label}. "
            "Never diagnose. Never suggest treatment. Keep it short and conversational."
        )
        messages = self._build_messages(system_prompt, None, conversation)
        
        try:
            coro = self.client.chat.completions.create(
                model=settings.question_model,
                messages=messages,
                temperature=0.7
            )
            response = await self._call_with_timeout(coro)
            return response.choices[0].message.content.strip()
        except Exception as e:
            logger.error(f"Question generation failed: {e}")
            return f"Could you tell me about your {field_label}?"

    async def generate_summary(
        self, session_data: dict
    ) -> SummaryResult:
        system_prompt = (
            "Synthesise this intake data into a concise clinician-facing summary. NO diagnosis. "
            "NO treatment suggestions. Flag anything that warrants clinician attention. "
            "You MUST return a JSON object exactly matching this schema:\n"
            '{"clinician_summary": "<summary text>", "flags": ["<flag1>"]}'
        )
        messages = self._build_messages(system_prompt, str(session_data))
        
        try:
            coro = self.client.chat.completions.create(
                model=settings.summary_model,
                messages=messages,
                response_format={"type": "json_object"},
                temperature=0.2
            )
            response = await self._call_with_timeout(coro)
            raw_content = response.choices[0].message.content
            
            parsed = SummaryResult.model_validate_json(raw_content)
            parsed.raw_response = raw_content
            return parsed
        except (ValidationError, Exception) as e:
            logger.error(f"Summary generation failed to parse: {e}")
            return SummaryResult(
                clinician_summary="Failed to generate summary.",
                flags=["Error generating summary"],
                raw_response=str(e)
            )

    async def transcribe(self, audio_bytes: bytes, mime_type: str) -> str:
        file_obj = io.BytesIO(audio_bytes)
        file_obj.name = "audio.wav" if "wav" in mime_type else ("audio.webm" if "webm" in mime_type else "audio.mp3")
        
        try:
            coro = self.client.audio.transcriptions.create(
                model=settings.stt_model,
                file=file_obj,
            )
            response = await self._call_with_timeout(coro)
            return response.text
        except Exception as e:
            logger.error(f"Transcription failed: {e}")
            return ""
