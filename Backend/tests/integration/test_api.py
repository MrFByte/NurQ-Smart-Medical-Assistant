import pytest
from fastapi.testclient import TestClient
import uuid

from app.main import app
from app.dependencies import get_repo, get_orchestrator
from tests.unit.test_orchestrator import MockSessionRepository, MockLLMProvider
from app.services.orchestrator import IntakeOrchestrator
from app.services.state_machine import IntakeStateMachine

repo = MockSessionRepository()
sm = IntakeStateMachine()
llm = MockLLMProvider()
orchestrator = IntakeOrchestrator(repo, llm, sm)

app.dependency_overrides[get_repo] = lambda: repo
app.dependency_overrides[get_orchestrator] = lambda: orchestrator

client = TestClient(app)

def test_create_session():
    pid = str(uuid.uuid4())
    # Test failure due to disclaimer not acknowledged
    response = client.post("/intake/session", json={
        "disclaimer_acknowledged": False, 
        "patient_id": pid, 
        "chief_complaint_text": "I feel dizzy"
    })
    assert response.status_code == 400
    
    # Test success
    response = client.post("/intake/session", json={
        "disclaimer_acknowledged": True, 
        "patient_id": pid, 
        "chief_complaint_text": "I feel dizzy"
    })
    assert response.status_code == 200
    data = response.json()
    assert "session_id" in data
    assert data["first_question"] == "What brings you in today?"

@pytest.mark.asyncio
async def test_send_message():
    # First create a session
    from app.models.domain import IntakeSession
    session = IntakeSession()
    await repo.create_session(session)
    
    msg_id = str(uuid.uuid4())
    response = client.post(
        f"/intake/session/{session.id}/message", 
        json={"message_id": msg_id, "content": "I have a headache"}
    )
    
    assert response.status_code == 200
    data = response.json()
    assert "assistant_message" in data
    assert data["session_status"] == "in_progress"

@pytest.mark.asyncio
async def test_get_summary_incomplete():
    from app.models.domain import IntakeSession
    session = IntakeSession()
    session.status = "in_progress"
    await repo.create_session(session)
    
    response = client.get(f"/intake/session/{session.id}/summary")
    assert response.status_code == 400
    assert "completed" in response.json()["detail"]
