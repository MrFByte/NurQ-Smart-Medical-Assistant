import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_emergency_blocks_appointment(async_client: AsyncClient):
    # Register a patient first
    reg_resp = await async_client.post("/patient/register", json={
        "full_name": "Emergency Patient",
        "phone_number": "911",
        "age": 50,
        "gender": "male"
    })
    patient_id = reg_resp.json()["patient_id"]
    
    # Send a critical chief complaint
    payload = {
        "disclaimer_acknowledged": True,
        "patient_id": patient_id,
        "chief_complaint_text": "I am having a heart attack and severe chest pain"
    }
    
    session_resp = await async_client.post("/intake/session", json=payload)
    assert session_resp.status_code == 200
    data = session_resp.json()
    
    # Should be classified as CRITICAL
    assert data["visit_classification"]["code"] == "CRITICAL"
    assert data["is_emergency"] is True
    
    # Should NOT assign an appointment number or a session ID
    assert data["session_id"] is None
    assert data["appointment_number"] is None
    
    # Should return emergency alerts
    assert "emergency_alert" in data
    alert = data["emergency_alert"]
    assert "contacts" in alert or "emergency_contacts" in alert
