import pytest
from app.models.domain import IntakeSession, VisitClassification
from pydantic import ValidationError
import json

def test_ai_json_schema_parsing():
    # Simulate a raw JSON payload from the AI matching our contract
    payload = {
        "schema_version": "1.0",
        "fields": {
            "chief_complaint.summary": {
                "value": "worsening back pain",
                "confidence": "confirmed",
                "raw_quote": "my back hurts so much"
            },
            "hpi.severity": {
                "value": "7",
                "confidence": "confirmed",
                "raw_quote": "it is a 7 out of 10"
            },
            "medications": {
                "value": [
                    {
                        "name": "Metformin",
                        "dosage": "500mg",
                        "frequency": "twice daily",
                        "is_currently_taking": True
                    }
                ],
                "confidence": "confirmed",
                "raw_quote": "I take Metformin 500mg twice a day"
            },
            "disabilities": {
                "value": [
                    {
                        "type": "physical",
                        "description": "uses wheelchair"
                    }
                ],
                "confidence": "partial",
                "raw_quote": "I use a wheelchair"
            },
            "medical_findings": {
                "value": [
                    {
                        "finding_type": "lab_result",
                        "description": "HbA1c: 8.2%",
                        "date_reported": "2025-03-10"
                    }
                ],
                "confidence": "partial",
                "raw_quote": "last A1C was 8.2 in March"
            }
        },
        "updated_fields": ["medications", "disabilities", "medical_findings", "chief_complaint.summary", "hpi.severity"]
    }
    
    # Normally the state_machine or orchestrator merges this into the IntakeSession.
    # Let's test that the typed arrays parse correctly when applied to the session.
    session = IntakeSession()
    
    # 1. Medications
    meds_data = payload["fields"]["medications"]["value"]
    # We assign it directly and pydantic will validate when we use model_validate if we re-parse, 
    # but here we manually test if it fits the schema by unpacking.
    session.medications = meds_data
    # 2. Disabilities
    disabilities_data = payload["fields"]["disabilities"]["value"]
    session.disabilities = disabilities_data
    # 3. Medical Findings
    findings_data = payload["fields"]["medical_findings"]["value"]
    session.medical_findings = findings_data
    
    # Dump and validate
    session_dict = session.model_dump()
    parsed_session = IntakeSession.model_validate(session_dict)
    
    assert len(parsed_session.medications) == 1
    assert parsed_session.medications[0].name == "Metformin"
    assert parsed_session.medications[0].dosage == "500mg"
    
    assert len(parsed_session.disabilities) == 1
    assert parsed_session.disabilities[0].type == "physical"
    assert parsed_session.disabilities[0].description == "uses wheelchair"
    
    assert len(parsed_session.medical_findings) == 1
    assert parsed_session.medical_findings[0].finding_type == "lab_result"
    assert parsed_session.medical_findings[0].description == "HbA1c: 8.2%"

def test_invalid_disability_type():
    with pytest.raises(ValidationError):
        session = IntakeSession(disabilities=[{"type": "invalid_type", "description": "foo"}])
        
def test_invalid_medical_finding_type():
    with pytest.raises(ValidationError):
        session = IntakeSession(medical_findings=[{"finding_type": "invalid", "description": "foo"}])
