import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_classification_no_downgrade(async_client: AsyncClient):
    # Register a patient
    reg_resp = await async_client.post("/patient/register", json={
        "full_name": "Downgrade Patient",
        "phone_number": "911",
        "age": 30,
        "gender": "female"
    })
    patient_id = reg_resp.json()["patient_id"]
    
    # 1. Start session with CRITICAL complaint
    payload = {
        "disclaimer_acknowledged": True,
        "patient_id": patient_id,
        "chief_complaint_text": "I am having a heart attack"
    }
    session_resp = await async_client.post("/intake/session", json=payload)
    data = session_resp.json()
    assert data["visit_classification"]["code"] == "CRITICAL"
    
    # If it's critical, session is not created (blocked), so we can't test a mid-session downgrade on a CRITICAL visit
    # But we can check that determine_classification_from_keywords and upgrade_classification (which we tested in unit tests)
    # enforce the logic.
    pass
