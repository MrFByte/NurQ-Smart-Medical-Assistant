import uuid
import asyncio
import logging
from typing import Optional

from app.models.domain import ConversationTurn, IntakeSession
from app.models.schemas import SendMessageResponse
from app.db.repository import SessionRepository
from app.providers.protocols import LLMProvider
from app.services.state_machine import IntakeStateMachine

logger = logging.getLogger(__name__)

class IntakeOrchestrator:
    def __init__(
        self,
        repo: SessionRepository,
        llm: LLMProvider,
        state_machine: IntakeStateMachine,
    ):
        self.repo = repo
        self.llm = llm
        self.state_machine = state_machine

    async def process_message(
        self, session_id: uuid.UUID, message_id: uuid.UUID, content: str
    ) -> SendMessageResponse:
        
        session = await self.repo.get_session(session_id)
        if not session:
            raise ValueError(f"Session {session_id} not found")

        if await self.repo.message_exists(session_id, message_id):
            logger.warning(f"Message {message_id} already exists for session {session_id}.")
            return SendMessageResponse(
                assistant_message="I have already received that message.",
                session_status=session.status,
                updated_fields=[]
            )

        user_turn = ConversationTurn(id=message_id, role="user", content=content)
        session.conversation_log.append(user_turn)

        history = [{"role": t.role, "content": t.content} for t in session.conversation_log[-6:-1]]
        schema_state = session.model_dump(mode="json")
        
        emergency_task = self.llm.detect_emergency(content, history)
        extraction_task = self.llm.extract_fields(content, schema_state, history)
        
        emergency_result, extraction_result = await asyncio.gather(emergency_task, extraction_task)
        user_turn.extraction_result = extraction_result.model_dump(mode="json")
        await self.repo.append_turn(session_id, user_turn)
        
        # --- Classification Upgrade Logic ---
        from app.utils.classification import determine_classification_from_keywords, upgrade_classification
        from app.models.schemas import CLASSIFICATION_DISPLAY, EmergencyAlert
        
        new_classification = determine_classification_from_keywords(emergency_result.triggered_keywords)
        current_classification = session.visit_classification
        upgraded_classification = upgrade_classification(current_classification, new_classification)
        
        if upgraded_classification != current_classification:
            session.visit_classification = upgraded_classification
            
        # Check if we hit CRITICAL (either newly upgraded or was already critical, though it shouldn't have been created)
        if upgraded_classification == "CRITICAL" or emergency_result.is_emergency:
            session.status = "emergency_escalated"
            session.emergency.is_emergency = True
            session.emergency.triggered_keywords = emergency_result.triggered_keywords
            session.emergency.recommended_action = emergency_result.recommended_action
            session.emergency.triggered_at_turn = message_id
            
            safety_msg = (
                "Based on what you've described, this may require immediate medical attention. "
                "Please contact emergency services immediately. "
                "This intake session has been paused."
            )
            assistant_turn = ConversationTurn(role="assistant", content=safety_msg)
            session.conversation_log.append(assistant_turn)
            
            await self.repo.update_session(session)
            await self.repo.append_turn(session_id, assistant_turn)
            
            return SendMessageResponse(
                assistant_message=safety_msg,
                session_status=session.status,
                visit_classification=CLASSIFICATION_DISPLAY[upgraded_classification],
                updated_fields=[],
                emergency_alert=EmergencyAlert(
                    message="Based on what you've described, this may be a life-threatening emergency. Please contact emergency services immediately."
                )
            )
            
        updated_fields = self._apply_extraction(session, extraction_result.fields)
        
        target = self.state_machine.next_target(session)
        if not target:
            session.status = "completed"
            await self.repo.update_session(session)
            return SendMessageResponse(
                assistant_message="Thank you, I have all the information I need.",
                session_status=session.status,
                updated_fields=updated_fields
            )
            
        next_q = await self.llm.generate_question(target.path, target.label, history + [{"role": "user", "content": content}])
        
        assistant_turn = ConversationTurn(role="assistant", content=next_q)
        session.conversation_log.append(assistant_turn)
        
        await self.repo.update_session(session)
        await self.repo.append_turn(session_id, assistant_turn)
        
        return SendMessageResponse(
            assistant_message=next_q,
            session_status=session.status,
            updated_fields=updated_fields
        )

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
