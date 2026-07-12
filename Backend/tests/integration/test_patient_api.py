import pytest
from httpx import AsyncClient

@pytest.mark.asyncio
async def test_patient_registration_and_lookup(async_client: AsyncClient):
    # 1. Register a patient
    register_payload = {
        "full_name": "Ravi Kumar",
        "phone_number": "+91-9876543210",
        "age": 45,
        "gender": "male"
    }
    
    register_resp = await async_client.post("/patient/register", json=register_payload)
    assert register_resp.status_code == 200
    data = register_resp.json()
    assert "registration_id" in data
    assert "patient_id" in data
    
    reg_id = data["registration_id"]
    
    # 2. Lookup by Registration ID
    lookup_resp = await async_client.post("/patient/lookup", json={"registration_id": reg_id})
    assert lookup_resp.status_code == 200
    patient = lookup_resp.json()
    assert patient["full_name"] == "Ravi Kumar"
    assert patient["registration_id"] == reg_id
    
    # 3. Lookup by Phone (should return a list of summaries)
    phone_resp = await async_client.post("/patient/lookup-by-phone", json={"phone_number": "+91-9876543210"})
    assert phone_resp.status_code == 200
    results = phone_resp.json()["patients"]
    assert len(results) >= 1
    assert any(p["registration_id"] == reg_id for p in results)

@pytest.mark.asyncio
async def test_lookup_not_found(async_client: AsyncClient):
    resp = await async_client.post("/patient/lookup", json={"registration_id": "INVALID123"})
    assert resp.status_code == 404
