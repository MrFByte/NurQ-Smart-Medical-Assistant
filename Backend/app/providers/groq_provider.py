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
    SummaryResult,
)

logger = logging.getLogger(__name__)

class GroqProvider(LLMProvider, STTProvider):
    def __init__(self):
        self.client = openai.AsyncOpenAI(
            base_url="https://api.groq.com/openai/v1",
            api_key=settings.GROQ_API_KEY,
            max_retries=0,
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

    @staticmethod
    def _normalize_extraction_json(raw_json: dict) -> dict:
        """Lowercase confidence values before Pydantic validation."""
        fields = raw_json.get("fields", {})
        for field_data in fields.values():
            if isinstance(field_data, dict) and "confidence" in field_data:
                conf = field_data["confidence"]
                if isinstance(conf, str):
                    field_data["confidence"] = conf.strip().lower()
        return raw_json

    async def extract_fields(
        self, user_message: str, schema_state: dict, conversation: list[dict],
        group_label: str | None = None
    ) -> ExtractionResult:
        context_str = f" The patient is currently answering about: '{group_label}'. A single answer may contain info for MULTIPLE fields — extract all that apply." if group_label else ""
        system_prompt = (
            f"Extract medical information from the patient's message.{context_str} Map to the provided schema fields. "
            "Never diagnose. Never suggest treatment. "
            "Set confidence to CONFIRMED if the patient gave a clear, specific, unambiguous answer to a field — "
            "this includes short direct answers like 'yes', 'no', 'just X', 'a few days ago'. "
            "A short answer is NOT automatically PARTIAL — judge by clarity, not length. "
            "Set confidence to PARTIAL only if the answer is vague, incomplete, hedged, or contradictory. "
            "Set confidence to SKIPPED if the patient explicitly declines to answer or says 'no' to a field that doesn't apply. "
            f"Current state: {json.dumps(schema_state)}\n\n"
            "In addition, act as an emergency keyword detector. Identify if the message contains any of these exact red-flag conditions: "
            "chest pain, difficulty breathing, suicidal ideation, stroke symptoms, severe bleeding, loss of consciousness, cardiac arrest, heart attack, seizure. "
            "ONLY flag a keyword if the patient has EXPLICITLY and LITERALLY stated it. Do NOT infer or extrapolate. "
            "When in doubt, return is_emergency: false and an empty triggered_keywords list.\n\n"
            "You MUST return a JSON object exactly matching this schema. The confidence value MUST be lowercase, "
            "exactly one of: unasked, asked, partial, confirmed, skipped. Do not use uppercase or any other value.\n"
            '{"fields": {"<field_path>": {"value": "<extracted value>", "confidence": "unasked|asked|partial|confirmed|skipped", "raw_quote": "<exact quote>"}}, '
            '"is_emergency": true/false, "triggered_keywords": ["<keyword>"], "recommended_action": "<action or null>"}'
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
            
            raw_json = json.loads(raw_content)
            raw_json = self._normalize_extraction_json(raw_json)
            parsed = ExtractionResult.model_validate(raw_json)
            
            parsed.raw_response = raw_content
            return parsed
        except openai.RateLimitError as e:
            logger.error(f"Rate limit exceeded during extraction: {e}")
            return ExtractionResult(fields={}, raw_response="Rate limit exceeded")
        except (json.JSONDecodeError, ValidationError, Exception) as e:
            logger.error(f"Extraction failed to parse: {e}")
            return ExtractionResult(fields={}, raw_response=str(e))

    async def generate_question(
        self, group_label: str, known_context: str | None, conversation: list[dict]
    ) -> str:
        if known_context:
            context = (
                f"We already know this about {group_label}: '{known_context}'. "
                "Do NOT ask the patient to repeat or reconfirm this. "
                f"Ask ONE short, natural question covering the remaining missing details for: {group_label}. "
                "You can ask a multi-part question if needed."
            )
        else:
            context = f"Nothing is known yet about {group_label}. Ask ONE short, natural opening question covering: {group_label}."

        system_prompt = (
            f"You are a warm, calm medical intake assistant. {context} "
            "Never diagnose. Never suggest treatment. Keep it short and conversational. "
            "Do not summarize the whole conversation back to the patient — just ask the next question."
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
        except openai.RateLimitError as e:
            logger.error(f"Rate limit exceeded during question generation: {e}")
            return f"Could you tell me more about {group_label}?"
        except Exception as e:
            logger.error(f"Question generation failed: {e}")
            return f"Could you tell me more about {group_label}?"

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
