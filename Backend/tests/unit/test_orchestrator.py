import pytest
import uuid
from typing import Optional

from app.models.domain import IntakeSession, ConversationTurn
from app.models.schemas import SendMessageResponse
from app.services.orchestrator import IntakeOrchestrator
from app.services.state_machine import IntakeStateMachine
from app.providers.protocols import LLMProvider, ExtractionResult, SummaryResult

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

class MockCacheRepository:
    def __init__(self):
        self.sessions = {}
        self.turns = []

    async def cache_session(self, session: IntakeSession) -> None:
        self.sessions[session.id] = session

    async def get_cached_session(self, session_id: uuid.UUID) -> IntakeSession | None:
        return self.sessions.get(session_id)

    async def append_cached_turn(self, session_id: uuid.UUID, turn: ConversationTurn) -> None:
        self.turns.append((session_id, turn))

    async def get_cached_turns(self, session_id: uuid.UUID):
        return [t for s, t in self.turns if s == session_id]

    async def invalidate_session(self, session_id: uuid.UUID) -> None:
        pass

class MockLLMProvider(LLMProvider):
    def __init__(self, is_emergency=False):
        self._is_emergency = is_emergency

    async def extract_fields(
        self, user_message: str, schema_state: dict, conversation: list[dict],
        group_label: str | None = None
    ) -> ExtractionResult:
        from app.providers.protocols import ExtractedFieldUpdate
        from app.models.domain import FieldConfidence
        
        # Mock extracting the chief complaint summary
        mock_fields = {}
        if "chest pain" in user_message.lower():
            mock_fields = {
                "chief_complaint.summary": ExtractedFieldUpdate(
                    value="Chest Pain", 
                    confidence=FieldConfidence.CONFIRMED, 
                    raw_quote="I have chest pain"
                )
            }
        return ExtractionResult(
            fields=mock_fields,
            raw_response="Mocked extraction",
            is_emergency=self._is_emergency,
            triggered_keywords=["chest pain"] if self._is_emergency else [],
            recommended_action="Go to ER" if self._is_emergency else None
        )

    async def generate_question(
        self, group_label: str, known_context: str | None, conversation: list[dict]
    ) -> str:
        return f"Mocked question about {group_label}?"

    async def generate_summary(self, session_data: dict) -> SummaryResult:
        return SummaryResult(clinician_summary="Mocked summary", flags=[])


@pytest.fixture
def mock_repo():
    return MockSessionRepository()

@pytest.fixture
def mock_cache_repo():
    return MockCacheRepository()

@pytest.fixture
def state_machine():
    return IntakeStateMachine()

@pytest.mark.asyncio
async def test_process_message_normal(mock_repo, mock_cache_repo, state_machine):
    llm = MockLLMProvider(is_emergency=False)
    orchestrator = IntakeOrchestrator(mock_repo, mock_cache_repo, llm, state_machine)
    
    session = IntakeSession()
    await mock_repo.create_session(session)
    
    response = await orchestrator.process_message(session.id, "I have chest pain")
    
    assert response.session_status == "in_progress"
    assert "chief_complaint.summary" in response.updated_fields
    assert "Mocked question" in response.assistant_message
    # Server should generate and return a message_id
    assert response.message_id is not None
    assert isinstance(response.message_id, uuid.UUID)
    
    # Verify DB state
    updated_session = await mock_repo.get_session(session.id)
    assert updated_session.chief_complaint.summary.value == "Chest Pain"

@pytest.mark.asyncio
async def test_process_message_emergency(mock_repo, mock_cache_repo, state_machine):
    llm = MockLLMProvider(is_emergency=True)
    orchestrator = IntakeOrchestrator(mock_repo, mock_cache_repo, llm, state_machine)
    
    session = IntakeSession()
    await mock_repo.create_session(session)
    
    response = await orchestrator.process_message(session.id, "I have severe chest pain")
    
    assert response.session_status == "emergency_escalated"
    assert "immediate medical attention" in response.assistant_message
    assert response.message_id is not None
    
    updated_session = await mock_repo.get_session(session.id)
    assert updated_session.status == "emergency_escalated"
    assert updated_session.emergency.is_emergency is True

@pytest.mark.asyncio
async def test_message_id_unique_per_call(mock_repo, mock_cache_repo, state_machine):
    """Each call to process_message should produce a unique server-generated message_id."""
    llm = MockLLMProvider()
    orchestrator = IntakeOrchestrator(mock_repo, mock_cache_repo, llm, state_machine)
    
    session = IntakeSession()
    await mock_repo.create_session(session)
    
    response1 = await orchestrator.process_message(session.id, "Hello")
    response2 = await orchestrator.process_message(session.id, "Hello again")
    
    assert response1.message_id != response2.message_id

@pytest.mark.asyncio
async def test_process_message_force_confirm(mock_repo, mock_cache_repo, state_machine):
    """Test that after 3 asks, the field is force confirmed and we move on."""
    llm = MockLLMProvider()
    orchestrator = IntakeOrchestrator(mock_repo, mock_cache_repo, llm, state_machine)
    
    session = IntakeSession()
    session.ask_counts["chief_complaint"] = 2
    await mock_repo.create_session(session)
    
    response = await orchestrator.process_message(session.id, "I don't know")
    
    updated_session = await mock_repo.get_session(session.id)
    assert updated_session.ask_counts["chief_complaint"] == 3
    assert updated_session.chief_complaint.summary.confidence == "skipped"
    assert "hpi_core" in response.assistant_message or "how the symptom started" in response.assistant_message

