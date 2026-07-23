import uuid
import asyncio
import logging
from typing import Optional

from app.models.domain import ConversationTurn, IntakeSession
from app.models.schemas import SendMessageResponse
from app.db.repository import SessionRepository
from app.db.cache_repository import CacheRepository
from app.providers.protocols import LLMProvider
from app.services.state_machine import IntakeStateMachine
from app.services.background_writer import schedule_db_write

logger = logging.getLogger(__name__)

class IntakeOrchestrator:
    def __init__(
        self,
        repo: SessionRepository,
        cache_repo: CacheRepository,
        llm: LLMProvider,
        state_machine: IntakeStateMachine,
    ):
        self.repo = repo
        self.cache_repo = cache_repo
        self.llm = llm
        self.state_machine = state_machine

    async def process_message(
        self, session_id: uuid.UUID, content: str
    ) -> SendMessageResponse:
        
        session = await self.cache_repo.get_cached_session(session_id)
        if not session:
            session = await self.repo.get_session(session_id)
            if not session:
                raise ValueError(f"Session {session_id} not found")
            await self.cache_repo.cache_session(session)

        # Generate message ID server-side
        message_id = uuid.uuid4()

        user_turn = ConversationTurn(id=message_id, role="user", content=content)
        session.conversation_log.append(user_turn)

        history = [{"role": t.role, "content": t.content} for t in session.conversation_log[-6:-1]]
        schema_state = session.model_dump(mode="json")
        
        # Note: We need the current target group to pass its label to extract_fields.
        # However, at this point, the user's message is answering the *previous* turn's question.
        # We need to figure out what group they were likely answering.
        # Let's get the target before applying extraction to give extraction context.
        current_target_group = self.state_machine.next_target_group(session)
        group_label = current_target_group.label if current_target_group else None
        
        extraction_result = await self.llm.extract_fields(content, schema_state, history, group_label=group_label)
        user_turn.extraction_result = extraction_result.model_dump(mode="json")
        
        # --- Classification Upgrade Logic ---
        from app.utils.classification import (
            determine_classification_from_keywords, upgrade_classification,
            KEYWORD_TO_CLASSIFICATION
        )
        from app.models.schemas import CLASSIFICATION_DISPLAY, EmergencyAlert, get_emergency_contacts
        from app.models.domain import VisitClassification

        # --- Validate LLM keywords against what the patient literally said ---
        # Build a searchable corpus: current message + full conversation text
        conversation_text = content.lower() + " " + " ".join(
            t.get("content", "").lower() for t in history
        )
        validated_keywords = [
            kw for kw in extraction_result.triggered_keywords
            if kw.lower() in KEYWORD_TO_CLASSIFICATION  # must be a known red-flag
            and kw.lower() in conversation_text          # must actually appear in the conversation
        ]

        new_classification = determine_classification_from_keywords(validated_keywords)
        current_classification = session.visit_classification
        upgraded_classification = upgrade_classification(current_classification, new_classification)
        
        if upgraded_classification != current_classification:
            session.visit_classification = upgraded_classification
            
        # Only escalate if validated keywords (not hallucinated ones) triggered CRITICAL
        if upgraded_classification == VisitClassification.CRITICAL:
            session.status = "emergency_escalated"
            session.emergency.is_emergency = True
            session.emergency.triggered_keywords = validated_keywords
            session.emergency.recommended_action = extraction_result.recommended_action
            session.emergency.triggered_at_turn = message_id
            
            safety_msg = (
                "Based on what you've described, this may require immediate medical attention. "
                "Please contact emergency services immediately. "
                "This intake session has been paused."
            )
            assistant_turn = ConversationTurn(role="assistant", content=safety_msg)
            session.conversation_log.append(assistant_turn)
            
            # Redis updates
            await self.cache_repo.cache_session(session)
            await self.cache_repo.append_cached_turn(session_id, user_turn)
            await self.cache_repo.append_cached_turn(session_id, assistant_turn)
            
            # Background Postgres write
            schedule_db_write(session, [user_turn, assistant_turn])
            
            return SendMessageResponse(
                message_id=message_id,
                assistant_message=safety_msg,
                session_status=session.status,
                visit_classification=CLASSIFICATION_DISPLAY[upgraded_classification],
                updated_fields=[],
                emergency_alert=EmergencyAlert(
                    message="Based on what you've described, this may be a life-threatening emergency. Please contact emergency services immediately.",
                    emergency_contacts=get_emergency_contacts(extraction_result.triggered_keywords)
                )
            )
            
        updated_fields = self._apply_extraction(session, extraction_result.fields)
        
        target_group = self.state_machine.next_target_group(session)
        if not target_group:
            session.status = "completed"
            
            await self.cache_repo.cache_session(session)
            await self.cache_repo.append_cached_turn(session_id, user_turn)
            
            schedule_db_write(session, [user_turn])
            
            return SendMessageResponse(
                message_id=message_id,
                assistant_message="Thank you, I have all the information I need.",
                session_status=session.status,
                updated_fields=updated_fields
            )

        # 4. Session-wide hard cap (>14 asks)
        if sum(session.ask_counts.values()) > 14:
            logger.info(f"Session {session_id} reached 14 total asks, auto-completing.")
            session.status = "completed"
            await self.cache_repo.cache_session(session)
            await self.cache_repo.append_cached_turn(session_id, user_turn)
            schedule_db_write(session, [user_turn])
            return SendMessageResponse(
                message_id=message_id,
                assistant_message="Thank you, I have all the information I need.",
                session_status=session.status,
                updated_fields=updated_fields
            )
            
        remaining_groups = self.state_machine.count_remaining_groups(session)
        session.ask_counts[target_group.id] = session.ask_counts.get(target_group.id, 0) + 1
        max_asks = self._max_asks_for_group(session, remaining_groups)
        
        if session.ask_counts[target_group.id] >= max_asks:
            self._force_confirm_group(session, target_group)
            target_group = self.state_machine.next_target_group(session)
            if not target_group:
                session.status = "completed"
                
                await self.cache_repo.cache_session(session)
                await self.cache_repo.append_cached_turn(session_id, user_turn)
                
                schedule_db_write(session, [user_turn])
                
                return SendMessageResponse(
                    message_id=message_id,
                    assistant_message="Thank you, I have all the information I need.",
                    session_status=session.status,
                    updated_fields=updated_fields
                )

        known_context = self._summarize_group_known_values(session, target_group)
            
        next_q = await self.llm.generate_question(
            target_group.label, known_context, history + [{"role": "user", "content": content}]
        )
        
        assistant_turn = ConversationTurn(role="assistant", content=next_q)
        session.conversation_log.append(assistant_turn)
        
        await self.cache_repo.cache_session(session)
        await self.cache_repo.append_cached_turn(session_id, user_turn)
        await self.cache_repo.append_cached_turn(session_id, assistant_turn)
        
        schedule_db_write(session, [user_turn, assistant_turn])
        
        return SendMessageResponse(
            message_id=message_id,
            assistant_message=next_q,
            session_status=session.status,
            updated_fields=updated_fields
        )

    def _max_asks_for_group(self, session: IntakeSession, remaining_group_count: int) -> int:
        """Ration remaining question budget fairly across remaining groups."""
        total_asked = sum(session.ask_counts.values())
        remaining_budget = max(14 - total_asked, 0)
        if remaining_group_count <= 0:
            return 1
        # Reserve at least 1 question for every other remaining group
        fair_share = remaining_budget - (remaining_group_count - 1)
        return max(1, min(2, fair_share))

    def _get_field(self, session: IntakeSession, path: str):
        """Resolve a dotted field path on the session."""
        parts = path.split('.')
        current = session
        for part in parts:
            if hasattr(current, part):
                current = getattr(current, part)
            else:
                return None
        return current

    def _force_confirm_group(self, session: IntakeSession, group) -> None:
        """Force-confirm all field paths in a group."""
        for path in group.field_paths:
            self._force_confirm(session, path)

    def _summarize_group_known_values(self, session: IntakeSession, group) -> str | None:
        """Returns a string summarizing what's already known about the group's fields."""
        known_parts = []
        for path in group.field_paths:
            field = self._get_field(session, path)
            if field is None:
                continue
                
            # Handle primitive ExtractedField
            if hasattr(field, "value") and field.value:
                key = path.split('.')[-1]
                known_parts.append(f"{key}: {field.value}")
            # Handle list models (medications, allergies)
            elif isinstance(field, list) and len(field) > 0:
                key = path.split('.')[-1]
                # Just stringify the models
                items = [str(item.model_dump(exclude_none=True)) for item in field]
                known_parts.append(f"{key}: {'; '.join(items)}")
                
        if not known_parts:
            return None
        return "; ".join(known_parts)

    def _force_confirm(self, session: IntakeSession, path: str) -> None:
        """After repeated asks, accept the best-known value rather than looping forever."""
        from app.models.domain import FieldConfidence
        field = self._get_field(session, path)
        if field is not None and hasattr(field, "confidence"):
            if field.value:
                field.confidence = FieldConfidence.CONFIRMED
            else:
                field.confidence = FieldConfidence.SKIPPED
            logger.info(f"Force-confirmed field {path} after repeated asks")

    def _apply_extraction(self, session: IntakeSession, fields: dict) -> list[str]:
        updated = []
        for path, update_data in fields.items():
            parts = path.split('.')
            current = session
            try:
                for i, part in enumerate(parts):
                    if i == len(parts) - 1:
                        if hasattr(current, part):
                            attr = getattr(current, part)
                            if hasattr(attr, "confidence"):
                                attr.value = str(update_data.value) if update_data.value is not None else None
                                attr.confidence = update_data.confidence
                                attr.raw_quote = update_data.raw_quote
                                updated.append(path)
                            elif isinstance(attr, list):
                                if isinstance(update_data.value, list):
                                    setattr(current, part, update_data.value)
                                    updated.append(path)
                            else:
                                setattr(current, part, update_data.value)
                                updated.append(path)
                    else:
                        if hasattr(current, part):
                            current = getattr(current, part)
                        else:
                            break
            except Exception as e:
                logger.warning(f"Failed to apply extraction for path {path}: {e}")
        return updated
