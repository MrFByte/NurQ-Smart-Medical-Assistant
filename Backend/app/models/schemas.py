from typing import Optional
from uuid import UUID
from pydantic import BaseModel

from .domain import IntakeSession, VisitClassification


# ---------------------------------------------------------------------------
# Emergency contact — returned when classification is CRITICAL
# ---------------------------------------------------------------------------

class EmergencyContact(BaseModel):
    label: str
    number: str


EMERGENCY_CONTACTS_MAP = {
    "suicidal ideation": [
        EmergencyContact(label="Suicide Helpline", number="iCall: 9152987821"),
        EmergencyContact(label="Emergency Services", number="112")
    ],
    "default": [
        EmergencyContact(label="Emergency Services", number="112"),
        EmergencyContact(label="Ambulance", number="108")
    ]
}

def get_emergency_contacts(keywords: list[str] = None) -> list[EmergencyContact]:
    if not keywords:
        return EMERGENCY_CONTACTS_MAP["default"]
    
    for kw in keywords:
        if kw.lower() in EMERGENCY_CONTACTS_MAP:
            return EMERGENCY_CONTACTS_MAP[kw.lower()]
            
    return EMERGENCY_CONTACTS_MAP["default"]

class EmergencyAlert(BaseModel):
    message: str
    emergency_contacts: list[EmergencyContact]


# ---------------------------------------------------------------------------
# Patient registration / lookup schemas
# ---------------------------------------------------------------------------

class RegisterPatientRequest(BaseModel):
    full_name: str
    phone_number: str
    age: int
    gender: str


class RegisterPatientResponse(BaseModel):
    registration_id: str   # e.g. "A1", "AA1", "AAA1"
    patient_id: UUID


class LookupPatientByIdRequest(BaseModel):
    registration_id: str


class LookupPatientByPhoneRequest(BaseModel):
    phone_number: str


class PatientSummary(BaseModel):
    """Lightweight patient info returned in lookup results."""
    patient_id: UUID
    registration_id: str
    full_name: str
    age: int
    gender: str


class LookupPatientByPhoneResponse(BaseModel):
    patients: list[PatientSummary]


# ---------------------------------------------------------------------------
# Intake session schemas
# ---------------------------------------------------------------------------

class CreateSessionRequest(BaseModel):
    disclaimer_acknowledged: bool
    patient_id: UUID
    chief_complaint_text: str


class VisitClassificationInfo(BaseModel):
    """Human-readable classification details for API responses."""
    code: VisitClassification
    color: str    # "RED" | "ORANGE" | "YELLOW" | "GREEN" | "BLUE"
    label: str    # e.g. "Sudden Medical Emergency"


CLASSIFICATION_DISPLAY: dict[VisitClassification, VisitClassificationInfo] = {
    VisitClassification.CRITICAL:     VisitClassificationInfo(code=VisitClassification.CRITICAL,     color="RED",    label="Sudden Medical Emergency"),
    VisitClassification.URGENT:       VisitClassificationInfo(code=VisitClassification.URGENT,       color="ORANGE", label="Urgent but Stable"),
    VisitClassification.SEMI_URGENT:  VisitClassificationInfo(code=VisitClassification.SEMI_URGENT,  color="YELLOW", label="Existing Condition Flare"),
    VisitClassification.ROUTINE:      VisitClassificationInfo(code=VisitClassification.ROUTINE,      color="GREEN",  label="Routine Check-up"),
    VisitClassification.NON_CLINICAL: VisitClassificationInfo(code=VisitClassification.NON_CLINICAL, color="BLUE",   label="Information / Clarification"),
}


class CreateSessionResponse(BaseModel):
    session_id: Optional[UUID] = None
    appointment_number: Optional[int] = None
    visit_classification: Optional[VisitClassificationInfo] = None
    is_emergency: bool = False
    emergency_alert: Optional[EmergencyAlert] = None
    first_question: Optional[str] = None


class SendMessageRequest(BaseModel):
    content: str


class SendMessageResponse(BaseModel):
    message_id: UUID              # server-generated ID for this exchange
    assistant_message: str
    session_status: str
    visit_classification: Optional[VisitClassificationInfo] = None
    updated_fields: list[str]
    audio_url: Optional[str] = None
    # Set if classification upgraded to CRITICAL mid-conversation
    emergency_alert: Optional[EmergencyAlert] = None


class SummaryResponse(BaseModel):
    session_id: UUID
    clinician_summary: str
    flags_for_review: list[str]
    structured_data: dict  # Serialised IntakeSession


# ---------------------------------------------------------------------------
# Clinician dashboard schemas
# ---------------------------------------------------------------------------

class ClinicianPatientView(BaseModel):
    registration_id: str
    full_name: str
    age: int
    gender: str
    phone_number: str


class ClinicianNoteRequest(BaseModel):
    author_name: str
    note_type: str    # "verification" | "correction" | "observation"
    content: str


class ClinicianNoteResponse(BaseModel):
    note_id: UUID | int
    session_id: UUID
    author_name: str
    note_type: str
    content: str


class ClinicianSessionView(BaseModel):
    session_id: UUID
    patient: ClinicianPatientView
    appointment_number: Optional[int]
    visit_classification: VisitClassificationInfo
    chief_complaint: Optional[str]
    medications: list
    allergies: list
    disabilities: list
    medical_findings: list
    pmh: dict
    social_history: dict
    family_history: dict
    emergency_flags: list[str]
    session_status: str
    ai_summary: Optional[str] = None
    clinician_notes: list[ClinicianNoteResponse] = []
    verified_by: Optional[str] = None


class UpdateSessionStatusRequest(BaseModel):
    status: str


class VerifySessionRequest(BaseModel):
    clinician_name: str


class ClinicianQueueItem(BaseModel):
    session_id: UUID
    patient_name: Optional[str] = None
    registration_id: Optional[str] = None
    appointment_number: Optional[int] = None
    visit_classification: VisitClassificationInfo
    session_status: str
    chief_complaint: Optional[str] = None
