import uuid
from sqlalchemy import Column, String, Integer, SmallInteger, Date, DateTime, Text, ForeignKey, BigInteger, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class PatientTable(Base):
    """Permanent patient records. One row per registration. Phone not unique."""
    __tablename__ = "patients"

    id              = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    registration_id = Column(String(20),  unique=True, nullable=False)   # e.g. "A1", "AA1"
    full_name       = Column(String(255), nullable=False)
    phone_number    = Column(String(30),  nullable=False, index=True)    # indexed, NOT unique
    age             = Column(SmallInteger, nullable=False)
    gender          = Column(String(30),  nullable=False)
    created_at      = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class RegistrationIdCounterTable(Base):
    """Single-row atomic counter for Registration ID generation."""
    __tablename__ = "registration_id_counter"

    id          = Column(Integer, primary_key=True, default=1)
    current_seq = Column(BigInteger, nullable=False, default=0)


class AppointmentCounterTable(Base):
    """Per-day appointment number counter. Resets naturally — each date is its own row."""
    __tablename__ = "appointment_counters"

    date        = Column(Date, primary_key=True, server_default=func.current_date())
    last_number = Column(Integer, nullable=False, default=0)


class IntakeSessionTable(Base):
    """Core intake session — stores the full session as a JSONB document."""
    __tablename__ = "intake_sessions"

    id                  = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    status              = Column(String(30),  nullable=False, default="in_progress")
    visit_classification = Column(String(20), nullable=False, server_default="ROUTINE")
    patient_id          = Column(UUID(as_uuid=True), ForeignKey("patients.id"), nullable=True)
    appointment_number  = Column(Integer, nullable=True)
    chief_complaint_text = Column(Text,   nullable=True)
    data                = Column(JSONB,   nullable=False)
    created_at          = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at          = Column(DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now())


class ConversationTurnTable(Base):
    """Append-only audit log of every message in a session."""
    __tablename__ = "conversation_turns"

    id                = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id        = Column(UUID(as_uuid=True), ForeignKey("intake_sessions.id"), nullable=False)
    role              = Column(String(10),  nullable=False)    # "user" | "assistant"
    content           = Column(Text,        nullable=False)
    extraction_result = Column(JSONB,       nullable=True)
    timestamp         = Column(DateTime(timezone=True), nullable=False, server_default=func.now())


class ClinicianNoteTable(Base):
    """Doctor/nurse notes attached to a session."""
    __tablename__ = "clinician_notes"

    id          = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id  = Column(UUID(as_uuid=True), ForeignKey("intake_sessions.id"), nullable=False)
    author_name = Column(String(255), nullable=False)
    note_type   = Column(String(30),  nullable=False)   # "verification" | "correction" | "observation"
    content     = Column(Text,        nullable=False)
    created_at  = Column(DateTime(timezone=True), nullable=False, server_default=func.now())
