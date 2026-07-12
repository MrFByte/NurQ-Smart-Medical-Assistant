import pytest
from app.models.domain import IntakeSession, FieldConfidence, ExtractedField
from app.services.state_machine import IntakeStateMachine, INTAKE_FIELDS

@pytest.fixture
def state_machine():
    return IntakeStateMachine()

@pytest.fixture
def empty_session():
    return IntakeSession()

def test_next_target_initial(state_machine, empty_session):
    target = state_machine.next_target(empty_session)
    assert target is not None
    assert target.path == "chief_complaint.summary"
    assert target.label == "what brings you in today"

def test_skip_filled_fields(state_machine, empty_session):
    # Fill chief_complaint summary
    empty_session.chief_complaint.summary.confidence = FieldConfidence.CONFIRMED
    target = state_machine.next_target(empty_session)
    assert target is not None
    assert target.path == "chief_complaint.onset"
    
    # Fill chief_complaint onset
    empty_session.chief_complaint.onset.confidence = FieldConfidence.ASKED
    # wait, ASKED is not skipped, but wait, the logic checks for UNASKED or PARTIAL
    # so ASKED means it shouldn't ask again! Wait, let's verify.
    target = state_machine.next_target(empty_session)
    assert target.path == "hpi.quality"

def test_recently_asked_heuristic(state_machine, empty_session):
    from app.models.domain import ConversationTurn
    
    # Let's say all extracted fields are filled, we are down to medications (list type)
    empty_session.chief_complaint.summary.confidence = FieldConfidence.CONFIRMED
    empty_session.chief_complaint.onset.confidence = FieldConfidence.CONFIRMED
    empty_session.hpi.quality.confidence = FieldConfidence.CONFIRMED
    empty_session.hpi.severity.confidence = FieldConfidence.CONFIRMED
    empty_session.hpi.timing_frequency.confidence = FieldConfidence.CONFIRMED
    empty_session.hpi.provocation_palliation.confidence = FieldConfidence.CONFIRMED
    empty_session.hpi.radiation.confidence = FieldConfidence.CONFIRMED
    
    # Next target should be medications
    target = state_machine.next_target(empty_session)
    assert target.path == "medications"
    
    # Assume assistant asks about medications
    turn = ConversationTurn(role="assistant", content="Could you tell me about your current medications?")
    empty_session.conversation_log.append(turn)
    
    # Now next_target should skip medications because it was recently asked and is empty
    next_target = state_machine.next_target(empty_session)
    assert next_target.path == "allergies"

def test_is_complete(state_machine, empty_session):
    # Set all base scalar fields to CONFIRMED
    empty_session.chief_complaint.summary.confidence = FieldConfidence.CONFIRMED
    empty_session.chief_complaint.onset.confidence = FieldConfidence.CONFIRMED
    empty_session.hpi.quality.confidence = FieldConfidence.CONFIRMED
    empty_session.hpi.severity.confidence = FieldConfidence.CONFIRMED
    empty_session.hpi.timing_frequency.confidence = FieldConfidence.CONFIRMED
    empty_session.hpi.provocation_palliation.confidence = FieldConfidence.CONFIRMED
    empty_session.hpi.radiation.confidence = FieldConfidence.CONFIRMED
    
    # Add dummy elements to all lists and string fields to mark them filled
    from app.models.domain import Medication, Allergy
    empty_session.medications.append(Medication(name="Aspirin"))
    empty_session.allergies.append(Allergy(allergen="Peanuts"))
    empty_session.pmh.chronic_conditions = ["Asthma"]
    empty_session.social_history.smoking_status = "Never"
    empty_session.family_history.conditions = ["Diabetes"]
    empty_session.ros.positive_findings = ["Cough"]
    
    assert state_machine.is_complete(empty_session) is True
