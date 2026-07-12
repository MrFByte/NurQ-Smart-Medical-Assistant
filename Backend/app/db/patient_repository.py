from uuid import UUID
from datetime import date
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import update, func
from sqlalchemy.orm import selectinload
from app.db.tables import PatientTable, RegistrationIdCounterTable, AppointmentCounterTable
from app.utils.registration import generate_registration_id

class PatientRepository:
    """Handles patient registration, lookup, and atomic counter operations."""

    @staticmethod
    async def generate_next_registration_id(session: AsyncSession) -> str:
        """Atomically increments the registration counter and generates an ID."""
        # Lock the single row for update
        stmt = select(RegistrationIdCounterTable).where(RegistrationIdCounterTable.id == 1).with_for_update()
        result = await session.execute(stmt)
        counter = result.scalar_one_or_none()
        
        if not counter:
            # If for some reason the row doesn't exist, create it (should be in migrations though)
            counter = RegistrationIdCounterTable(id=1, current_seq=0)
            session.add(counter)
            await session.flush()
            
        current_seq = counter.current_seq
        counter.current_seq += 1
        
        return generate_registration_id(current_seq)

    @staticmethod
    async def create_patient(
        session: AsyncSession, 
        full_name: str, 
        phone_number: str, 
        age: int, 
        gender: str
    ) -> PatientTable:
        """Creates a new patient record with a generated ID."""
        reg_id = await PatientRepository.generate_next_registration_id(session)
        
        patient = PatientTable(
            registration_id=reg_id,
            full_name=full_name,
            phone_number=phone_number,
            age=age,
            gender=gender
        )
        session.add(patient)
        await session.commit()
        await session.refresh(patient)
        return patient

    @staticmethod
    async def get_patient_by_registration_id(session: AsyncSession, registration_id: str) -> PatientTable | None:
        """Finds a patient by their human-readable ID."""
        stmt = select(PatientTable).where(PatientTable.registration_id == registration_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_patient_by_id(session: AsyncSession, patient_id: UUID) -> PatientTable | None:
        """Finds a patient by their UUID."""
        stmt = select(PatientTable).where(PatientTable.id == patient_id)
        result = await session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_patients_by_phone(session: AsyncSession, phone_number: str) -> list[PatientTable]:
        """Finds all patients registered with the given phone number."""
        stmt = select(PatientTable).where(PatientTable.phone_number == phone_number)
        result = await session.execute(stmt)
        return list(result.scalars().all())

    @staticmethod
    async def get_next_appointment_number(session: AsyncSession) -> int:
        """Atomically gets the next appointment number for today."""
        today = date.today()
        
        stmt = select(AppointmentCounterTable).where(AppointmentCounterTable.date == today).with_for_update()
        result = await session.execute(stmt)
        counter = result.scalar_one_or_none()
        
        if not counter:
            counter = AppointmentCounterTable(date=today, last_number=1)
            session.add(counter)
            await session.flush()
        else:
            counter.last_number += 1
            
        await session.commit()
        return counter.last_number
