import pytest
import uuid
from typing import Optional

from app.models.domain import IntakeSession, ConversationTurn
from app.models.schemas import SendMessageResponse
from app.services.orchestrator import IntakeOrchestrator
from app.services.state_machine import IntakeStateMachine
from app.providers.protocols import LLMProvider, ExtractionResult, EmergencyResult, SummaryResult

class MockSessionRepository:
    def __init__(self):
        self.sessions = {}
        self.turns = []

    async def create_session(self, session: IntakeSession) -> None:
        self.sessions[session.id] = session

    async def get_session(self, session_id: uuid.UUID) -> IntakeSession | None:
        return self.sessions.get(session_id)

    async def update_session(self, session: IntakeSession) -> None:
        self.sessions[session.id] = session

    async def append_turn(self, session_id: uuid.UUID, turn: ConversationTurn) -> None:
        self.turns.append((session_id, turn))

    async def message_exists(self, session_id: uuid.UUID, message_id: uuid.UUID) -> bool:
        return any(t.id == message_id for s, t in self.turns if s == session_id)

class MockLLMProvider(LLMProvider):
    def __init__(self, is_emergency=False):
        self._is_emergency = is_emergency

    async def extract_fields(self, user_message: str, schema_state: dict, conversation: list[dict]) -> ExtractionResult:
        from app.providers.protocols import ExtractedFieldUpdate
        from app.models.domain import FieldConfidence
        
        # Mock extracting the chief complaint summary
        if "chest pain" in user_message.lower():
            return ExtractionResult(fields={
                "chief_complaint.summary": ExtractedFieldUpdate(
                    value="Chest Pain", 
                    confidence=FieldConfidence.CONFIRMED, 
                    raw_quote="I have chest pain"
                )
            })
        return ExtractionResult(fields={})

    async def detect_emergency(self, user_message: str, conversation: list[dict]) -> EmergencyResult:
        return EmergencyResult(
            is_emergency=self._is_emergency,
            triggered_keywords=["chest pain"] if self._is_emergency else [],
            recommended_action="Go to ER" if self._is_emergency else None
        )

    async def generate_question(self, target_field: str, field_label: str, conversation: list[dict]) -> str:
        return f"Mocked question about {field_label}?"

    async def generate_summary(self, session_data: dict) -> SummaryResult:
        return SummaryResult(clinician_summary="Mocked summary", flags=[])


@pytest.fixture
def mock_repo():
    return MockSessionRepository()

@pytest.fixture
def state_machine():
    return IntakeStateMachine()

@pytest.mark.asyncio
async def test_process_message_normal(mock_repo, state_machine):
    llm = MockLLMProvider(is_emergency=False)
    orchestrator = IntakeOrchestrator(mock_repo, llm, state_machine)
    
    session = IntakeSession()
    await mock_repo.create_session(session)
    
    msg_id = uuid.uuid4()
    response = await orchestrator.process_message(session.id, msg_id, "I have chest pain")
    
    assert response.session_status == "in_progress"
    assert "chief_complaint.summary" in response.updated_fields
    assert "Mocked question" in response.assistant_message
    
    # Verify DB state
    updated_session = await mock_repo.get_session(session.id)
    assert updated_session.chief_complaint.summary.value == "Chest Pain"

@pytest.mark.asyncio
async def test_process_message_emergency(mock_repo, state_machine):
    llm = MockLLMProvider(is_emergency=True)
    orchestrator = IntakeOrchestrator(mock_repo, llm, state_machine)
    
    session = IntakeSession()
    await mock_repo.create_session(session)
    
    msg_id = uuid.uuid4()
    response = await orchestrator.process_message(session.id, msg_id, "I have severe chest pain")
    
    assert response.session_status == "emergency_escalated"
    assert "immediate medical attention" in response.assistant_message
    
    updated_session = await mock_repo.get_session(session.id)
    assert updated_session.status == "emergency_escalated"
    assert updated_session.emergency.is_emergency is True

@pytest.mark.asyncio
async def test_idempotency(mock_repo, state_machine):
    llm = MockLLMProvider()
    orchestrator = IntakeOrchestrator(mock_repo, llm, state_machine)
    
    session = IntakeSession()
    await mock_repo.create_session(session)
    
    msg_id = uuid.uuid4()
    # First call
    await orchestrator.process_message(session.id, msg_id, "Hello")
    
    # Second call with same ID
    response = await orchestrator.process_message(session.id, msg_id, "Hello again")
    assert response.assistant_message == "I have already received that message."
