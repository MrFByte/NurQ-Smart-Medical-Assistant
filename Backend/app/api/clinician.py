from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import date
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.dependencies import get_db_session, get_llm, verify_supabase_token
from app.providers.protocols import LLMProvider
from app.db.clinician_repository import ClinicianRepository
from app.db.tables import IntakeSessionTable
from app.models.schemas import (
    ClinicianQueueItem,
    ClinicianSessionView,
    ClinicianNoteRequest,
    ClinicianNoteResponse,
    SummaryResponse,
    UpdateSessionStatusRequest,
    VerifySessionRequest
)

router = APIRouter(
    prefix="/clinician", 
    tags=["Clinician Dashboard"],
    dependencies=[Depends(verify_supabase_token)]
)


@router.get("/queue", response_model=list[ClinicianQueueItem])
async def get_queue(
    date: Optional[date] = Query(None, description="Filter queue by a specific date (YYYY-MM-DD)"),
    db: AsyncSession = Depends(get_db_session)
):
    return await ClinicianRepository.get_queue(db, filter_date=date)


@router.get("/session/{session_id}", response_model=ClinicianSessionView)
async def get_session(
    session_id: UUID, 
    db: AsyncSession = Depends(get_db_session)
):
    view = await ClinicianRepository.get_clinician_session_view(db, session_id)
    if not view:
        raise HTTPException(status_code=404, detail="Session not found")
    return view


@router.post("/session/{session_id}/note", response_model=ClinicianNoteResponse)
async def add_note(
    session_id: UUID, 
    request: ClinicianNoteRequest, 
    db: AsyncSession = Depends(get_db_session)
):
    note = await ClinicianRepository.add_clinician_note(
        session=db,
        session_id=session_id,
        author_name=request.author_name,
        note_type=request.note_type,
        content=request.content
    )
    return ClinicianNoteResponse(
        note_id=note.id,
        session_id=note.session_id,
        author_name=note.author_name,
        note_type=note.note_type,
        content=note.content
    )


@router.get("/session/{session_id}/summary", response_model=SummaryResponse)
async def generate_session_summary(
    session_id: UUID, 
    db: AsyncSession = Depends(get_db_session),
    llm: LLMProvider = Depends(get_llm)
):
    stmt = select(IntakeSessionTable).where(IntakeSessionTable.id == session_id)
    result = await db.execute(stmt)
    session_row = result.scalar_one_or_none()
    
    if not session_row:
        raise HTTPException(status_code=404, detail="Session not found")
        
    summary_result = await llm.generate_summary(session_row.data)
    
    return SummaryResponse(
        session_id=session_id,
        clinician_summary=summary_result.clinician_summary,
        flags_for_review=summary_result.flags,
        structured_data=session_row.data
    )


@router.patch("/session/{session_id}/status")
async def update_session_status(
    session_id: UUID, 
    request: UpdateSessionStatusRequest, 
    db: AsyncSession = Depends(get_db_session)
):
    await ClinicianRepository.update_session_status(db, session_id, request.status)
    return {"message": "Status updated successfully"}


@router.post("/session/{session_id}/verify")
async def verify_session(
    session_id: UUID, 
    request: VerifySessionRequest, 
    db: AsyncSession = Depends(get_db_session)
):
    await ClinicianRepository.verify_session(db, session_id, request.clinician_name)
    return {"message": "Session verified successfully"}
