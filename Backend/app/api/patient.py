from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_db_session
from app.db.patient_repository import PatientRepository
from app.models.schemas import (
    RegisterPatientRequest, 
    RegisterPatientResponse, 
    LookupPatientByIdRequest, 
    LookupPatientByPhoneRequest,
    LookupPatientByPhoneResponse,
    PatientSummary
)

router = APIRouter(prefix="/patient", tags=["Patient"])


@router.post("/register", response_model=RegisterPatientResponse)
async def register_patient(
    request: RegisterPatientRequest, 
    db: AsyncSession = Depends(get_db_session)
):
    patient = await PatientRepository.create_patient(
        session=db,
        full_name=request.full_name,
        phone_number=request.phone_number,
        age=request.age,
        gender=request.gender
    )
    return RegisterPatientResponse(
        registration_id=patient.registration_id,
        patient_id=patient.id
    )


@router.post("/lookup")
async def lookup_patient(
    request: LookupPatientByIdRequest, 
    db: AsyncSession = Depends(get_db_session)
):
    patient = await PatientRepository.get_patient_by_registration_id(db, request.registration_id)
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")
        
    return {
        "patient_id": patient.id,
        "registration_id": patient.registration_id,
        "full_name": patient.full_name,
        "age": patient.age,
        "gender": patient.gender,
        "phone_number": patient.phone_number
    }


@router.post("/lookup-by-phone", response_model=LookupPatientByPhoneResponse)
async def lookup_patient_by_phone(
    request: LookupPatientByPhoneRequest, 
    db: AsyncSession = Depends(get_db_session)
):
    patients = await PatientRepository.get_patients_by_phone(db, request.phone_number)
    summaries = [
        PatientSummary(
            patient_id=p.id,
            registration_id=p.registration_id,
            full_name=p.full_name,
            age=p.age,
            gender=p.gender
        ) for p in patients
    ]
    return LookupPatientByPhoneResponse(patients=summaries)
