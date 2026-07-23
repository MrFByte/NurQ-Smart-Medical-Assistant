from typing import Optional, Literal
from datetime import datetime
from enum import Enum
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Visit Classification — color + keyword system
# ---------------------------------------------------------------------------

class VisitClassification(str, Enum):
    CRITICAL     = "CRITICAL"      # 🔴 RED    — life-threatening, show emergency dial
    URGENT       = "URGENT"        # 🟠 ORANGE — needs care within hours
    SEMI_URGENT  = "SEMI_URGENT"   # 🟡 YELLOW — existing condition flare
    ROUTINE      = "ROUTINE"       # 🟢 GREEN  — scheduled / wellness
    NON_CLINICAL = "NON_CLINICAL"  # 🔵 BLUE   — info, second opinion, clarification


# Severity order used to enforce upgrade-only logic (higher index = more severe)
CLASSIFICATION_SEVERITY: dict[VisitClassification, int] = {
    VisitClassification.NON_CLINICAL: 0,
    VisitClassification.ROUTINE:      1,
    VisitClassification.SEMI_URGENT:  2,
    VisitClassification.URGENT:       3,
    VisitClassification.CRITICAL:     4,
}

# ---------------------------------------------------------------------------
# Field extraction primitives
# ---------------------------------------------------------------------------

class FieldConfidence(str, Enum):
    UNASKED   = "unasked"
    ASKED     = "asked"
    PARTIAL   = "partial"
    CONFIRMED = "confirmed"
    SKIPPED   = "skipped"


class ExtractedField(BaseModel):
    value: Optional[str] = None
    confidence: FieldConfidence = FieldConfidence.UNASKED
    source_turn_id: Optional[UUID] = None
    raw_quote: Optional[str] = None


# ---------------------------------------------------------------------------
# Clinical data models
# ---------------------------------------------------------------------------

class PatientDemographics(BaseModel):
    full_name: Optional[str] = None
    date_of_birth: Optional[str] = None
    sex_at_birth: Optional[Literal["male", "female", "intersex", "unspecified"]] = None
    contact_number: Optional[str] = None
    preferred_language: Optional[str] = None


class ChiefComplaint(BaseModel):
    summary: ExtractedField = Field(default_factory=ExtractedField)
    onset: ExtractedField = Field(default_factory=ExtractedField)


class HistoryOfPresentIllness(BaseModel):
    onset: ExtractedField = Field(default_factory=ExtractedField)
    provocation_palliation: ExtractedField = Field(default_factory=ExtractedField)
    quality: ExtractedField = Field(default_factory=ExtractedField)
    radiation: ExtractedField = Field(default_factory=ExtractedField)
    severity: ExtractedField = Field(default_factory=ExtractedField)
    timing_frequency: ExtractedField = Field(default_factory=ExtractedField)
    associated_symptoms: list[str] = Field(default_factory=list)


class PastMedicalHistory(BaseModel):
    chronic_conditions: list[str] = Field(default_factory=list)
    past_surgeries: list[str] = Field(default_factory=list)
    hospitalizations: list[str] = Field(default_factory=list)
    immunization_notes: Optional[str] = None


class Medication(BaseModel):
    name: str
    dosage: Optional[str] = None
    frequency: Optional[str] = None
    is_currently_taking: bool = True
    last_taken: Optional[str] = None
    purpose: Optional[str] = None


class Allergy(BaseModel):
    allergen: str
    reaction: Optional[str] = None
    severity: Optional[Literal["mild", "moderate", "severe", "unknown"]] = None


class Disability(BaseModel):
    """Physical, mental, cognitive, or sensory disability reported by the patient."""
    type: Literal["physical", "mental", "cognitive", "sensory", "other"]
    description: str


class MedicalFinding(BaseModel):
    """
    A previous finding reported by the patient during intake —
    e.g. a lab result, imaging report, or past doctor's note.
    'reported_by' refers to a clinic/lab name, not a system user.
    """
    finding_type: Literal["lab_result", "imaging", "doctor_note", "diagnosis", "other"]
    description: str
    date_reported: Optional[str] = None
    reported_by: Optional[str] = None


class SocialHistory(BaseModel):
    smoking_status: Optional[str] = None
    alcohol_use: Optional[str] = None
    substance_use: Optional[str] = None
    occupation: Optional[str] = None
    living_situation: Optional[str] = None


class FamilyHistory(BaseModel):
    conditions: list[str] = Field(default_factory=list)


class ReviewOfSystems(BaseModel):
    positive_findings: list[str] = Field(default_factory=list)
    negative_findings: list[str] = Field(default_factory=list)


class EmergencyAssessment(BaseModel):
    is_emergency: bool = False
    triggered_keywords: list[str] = Field(default_factory=list)
    triggered_at_turn: Optional[UUID] = None
    recommended_action: Optional[str] = None


class VerificationStatus(BaseModel):
    is_verified: bool = False
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    verification_notes: Optional[str] = None
    field_corrections: dict[str, str] = Field(default_factory=dict)


class ConversationTurn(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    role: Literal["assistant", "user"]
    content: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now().astimezone())
    extraction_result: Optional[dict] = None


# ---------------------------------------------------------------------------
# Core session model
# ---------------------------------------------------------------------------

class IntakeSession(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    patient_id: Optional[UUID] = None
    token: Optional[str] = None
    is_returning_patient: bool = False
    previous_visit_summary_id: Optional[UUID] = None

    status: Literal["in_progress", "emergency_escalated", "completed", "abandoned"] = "in_progress"

    # Visit classification — can only be upgraded, never downgraded
    visit_classification: VisitClassification = VisitClassification.ROUTINE

    created_at: datetime = Field(default_factory=lambda: datetime.now().astimezone())
    updated_at: datetime = Field(default_factory=lambda: datetime.now().astimezone())

    demographics: PatientDemographics = Field(default_factory=PatientDemographics)
    chief_complaint: ChiefComplaint = Field(default_factory=ChiefComplaint)
    hpi: HistoryOfPresentIllness = Field(default_factory=HistoryOfPresentIllness)

    pmh: PastMedicalHistory = Field(default_factory=PastMedicalHistory)
    medications: list[Medication] = Field(default_factory=list)
    allergies: list[Allergy] = Field(default_factory=list)
    disabilities: list[Disability] = Field(default_factory=list)
    medical_findings: list[MedicalFinding] = Field(default_factory=list)
    social_history: SocialHistory = Field(default_factory=SocialHistory)
    family_history: FamilyHistory = Field(default_factory=FamilyHistory)
    ros: ReviewOfSystems = Field(default_factory=ReviewOfSystems)
    emergency: EmergencyAssessment = Field(default_factory=EmergencyAssessment)

    verification: VerificationStatus = Field(default_factory=VerificationStatus)
    conversation_log: list[ConversationTurn] = Field(default_factory=list)
    ask_counts: dict[str, int] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Summary and patient record models
# ---------------------------------------------------------------------------

class IntakeSummary(BaseModel):
    session_id: UUID
    generated_at: datetime = Field(default_factory=lambda: datetime.now().astimezone())
    clinician_summary_text: str
    structured_data: IntakeSession
    flags_for_review: list[str] = Field(default_factory=list)


class PatientRecord(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    registration_id: str
    phone_number: Optional[str] = None
    demographics: PatientDemographics = Field(default_factory=PatientDemographics)

    standing_medications: list[Medication] = Field(default_factory=list)
    standing_allergies: list[Allergy] = Field(default_factory=list)
    standing_conditions: list[str] = Field(default_factory=list)
    pmh: PastMedicalHistory = Field(default_factory=PastMedicalHistory)
    family_history: FamilyHistory = Field(default_factory=FamilyHistory)
    social_history: SocialHistory = Field(default_factory=SocialHistory)

    last_verified_at: Optional[datetime] = None
    last_verified_by: Optional[str] = None
    visit_ids: list[UUID] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now().astimezone())
