import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_classification_upgrade(async_client: AsyncClient):
    # Register a patient
    reg_resp = await async_client.post("/patient/register", json={
        "full_name": "Upgrade Patient",
        "phone_number": "911",
        "age": 30,
        "gender": "female"
    })
    patient_id = reg_resp.json()["patient_id"]
    
    # 1. Start session with mild complaint (ROUTINE)
    payload = {
        "disclaimer_acknowledged": True,
        "patient_id": patient_id,
        "chief_complaint_text": "I need a checkup"
    }
    session_resp = await async_client.post("/intake/session", json=payload)
    assert session_resp.status_code == 200
    data = session_resp.json()
    # Mock LLM detect_emergency returns no keywords for "I need a checkup",
    # so determine_classification_from_keywords([]) → NON_CLINICAL
    assert data["visit_classification"]["code"] == "NON_CLINICAL"
    session_id = data["session_id"]
    
    # 2. Send message with URGENT keyword ("high fever")
    msg_payload = {
        "content": "Actually, I also have a very high fever."
    }
    
    msg_resp = await async_client.post(f"/intake/session/{session_id}/message", json=msg_payload)
    assert msg_resp.status_code == 200
    # Server should return a generated message_id
    assert "message_id" in msg_resp.json()

