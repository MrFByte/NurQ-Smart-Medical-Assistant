from uuid import UUID
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import cast, Date
from datetime import date
from app.db.tables import ClinicianNoteTable, IntakeSessionTable, PatientTable
from app.models.schemas import (
    ClinicianSessionView, 
    ClinicianPatientView, 
    ClinicianNoteResponse, 
    ClinicianQueueItem,
    CLASSIFICATION_DISPLAY
)
from app.models.domain import VisitClassification

class ClinicianRepository:
    """Handles clinician dashboard queries and notes."""

    @staticmethod
    async def add_clinician_note(
        session: AsyncSession, 
        session_id: UUID, 
        author_name: str, 
        note_type: str, 
        content: str
    ) -> ClinicianNoteTable:
        note = ClinicianNoteTable(
            session_id=session_id,
            author_name=author_name,
            note_type=note_type,
            content=content
        )
        session.add(note)
        await session.commit()
        await session.refresh(note)
        return note

    @staticmethod
    async def get_notes_for_session(session: AsyncSession, session_id: UUID) -> list[ClinicianNoteTable]:
        stmt = select(ClinicianNoteTable).where(ClinicianNoteTable.session_id == session_id).order_by(ClinicianNoteTable.created_at)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_clinician_session_view(session: AsyncSession, session_id: UUID) -> ClinicianSessionView | None:
        """Fetches the session and formats it into the structured dashboard view."""
        stmt = select(IntakeSessionTable, PatientTable).outerjoin(
            PatientTable, IntakeSessionTable.patient_id == PatientTable.id
        ).where(IntakeSessionTable.id == session_id)
        
        result = await session.execute(stmt)
        row = result.first()
        if not row:
            return None
            
        intake_row, patient_row = row
        data = intake_row.data
        
        # Format patient info
        if patient_row:
            patient_view = ClinicianPatientView(
                registration_id=patient_row.registration_id,
                full_name=patient_row.full_name,
                age=patient_row.age,
                gender=patient_row.gender,
                phone_number=patient_row.phone_number
            )
        else:
            # Fallback for old sessions without a patient
            patient_view = ClinicianPatientView(
                registration_id="N/A",
                full_name="Unknown",
                age=0,
                gender="unknown",
                phone_number="N/A"
            )
            
        # Get notes
        notes = await ClinicianRepository.get_notes_for_session(session, session_id)
        note_responses = [
            ClinicianNoteResponse(
                note_id=n.id,
                session_id=n.session_id,
                author_name=n.author_name,
                note_type=n.note_type,
                content=n.content
            ) for n in notes
        ]
        
        classification_enum = VisitClassification(intake_row.visit_classification)
        classification_info = CLASSIFICATION_DISPLAY.get(classification_enum)
        
        return ClinicianSessionView(
            session_id=intake_row.id,
            patient=patient_view,
            appointment_number=intake_row.appointment_number,
            visit_classification=classification_info,
            chief_complaint=intake_row.chief_complaint_text,
            medications=data.get("medications", []),
            allergies=data.get("allergies", []),
            disabilities=data.get("disabilities", []),
            medical_findings=data.get("medical_findings", []),
            pmh=data.get("pmh", {}),
            social_history=data.get("social_history", {}),
            family_history=data.get("family_history", {}),
            emergency_flags=data.get("emergency", {}).get("triggered_keywords", []),
            session_status=intake_row.status,
            ai_summary=None, # Loaded on demand
            clinician_notes=note_responses,
            verified_by=data.get("verification", {}).get("verified_by")
        )

    @staticmethod
    async def get_queue(session: AsyncSession, filter_date: date | None = None) -> list[ClinicianQueueItem]:
        """Returns sessions for a specific date (or active ones), ordered by severity then appointment number."""
        stmt = select(IntakeSessionTable, PatientTable).outerjoin(
            PatientTable, IntakeSessionTable.patient_id == PatientTable.id
        )
        
        if filter_date:
            stmt = stmt.where(cast(IntakeSessionTable.created_at, Date) == filter_date)
        else:
            stmt = stmt.where(IntakeSessionTable.status == "in_progress")
            
        stmt = stmt.order_by(
            IntakeSessionTable.visit_classification, # We'll sort in python or write a case statement
            IntakeSessionTable.appointment_number
        )
        
        result = await session.execute(stmt)
        rows = result.all()
        
        # Define sort order for classifications
        severity_order = {
            "CRITICAL": 1,
            "URGENT": 2,
            "SEMI_URGENT": 3,
            "ROUTINE": 4,
            "NON_CLINICAL": 5
        }
        
        queue = []
        for intake_row, patient_row in rows:
            classification_enum = VisitClassification(intake_row.visit_classification)
            classification_info = CLASSIFICATION_DISPLAY.get(classification_enum)
            
            queue.append({
                "item": ClinicianQueueItem(
                    session_id=intake_row.id,
                    patient_name=patient_row.full_name if patient_row else "Unknown",
                    registration_id=patient_row.registration_id if patient_row else "N/A",
                    appointment_number=intake_row.appointment_number,
                    visit_classification=classification_info,
                    session_status=intake_row.status,
                    chief_complaint=intake_row.chief_complaint_text
                ),
                "severity": severity_order.get(intake_row.visit_classification, 99),
                "appt": intake_row.appointment_number or 9999
            })
            
        # Sort by severity first, then appointment number
        queue.sort(key=lambda x: (x["severity"], x["appt"]))
        
        return [q["item"] for q in queue]

    @staticmethod
    async def update_session_status(session: AsyncSession, session_id: UUID, status: str) -> None:
        """Updates the status of an intake session."""
        stmt = select(IntakeSessionTable).where(IntakeSessionTable.id == session_id)
        result = await session.execute(stmt)
        intake_row = result.scalar_one_or_none()
        
        if intake_row:
            intake_row.status = status
            await session.commit()

    @staticmethod
    async def verify_session(session: AsyncSession, session_id: UUID, clinician_name: str) -> None:
        """Marks a session as verified and records the clinician's name."""
        stmt = select(IntakeSessionTable).where(IntakeSessionTable.id == session_id)
        result = await session.execute(stmt)
        intake_row = result.scalar_one_or_none()
        
        if intake_row:
            # We must create a new dict for SQLAlchemy to detect the change in JSONB
            new_data = dict(intake_row.data)
            verification = new_data.get("verification", {})
            verification["is_verified"] = True
            verification["verified_by"] = clinician_name
            new_data["verification"] = verification
            
            intake_row.data = new_data
            await session.commit()
