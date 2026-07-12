from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
import uuid
import base64

from sqlalchemy.ext.asyncio import AsyncSession
from app.dependencies import get_db_session

from app.models.schemas import (
    CreateSessionRequest, CreateSessionResponse,
    SendMessageRequest, SendMessageResponse, SummaryResponse,
    EmergencyAlert, CLASSIFICATION_DISPLAY
)
from app.models.domain import IntakeSession, VisitClassification
from app.db.repository import SessionRepository
from app.db.patient_repository import PatientRepository
from app.db.tables import IntakeSessionTable
from sqlalchemy.future import select

from app.services.orchestrator import IntakeOrchestrator
from app.providers.protocols import LLMProvider, STTProvider, TTSProvider
from app.dependencies import get_repo, get_orchestrator, get_llm, get_stt, get_tts
from app.utils.classification import determine_classification_from_keywords

router = APIRouter(prefix="/intake", tags=["intake"])

@router.post("/session", response_model=CreateSessionResponse)
async def create_session(
    request: CreateSessionRequest,
    repo: SessionRepository = Depends(get_repo),
    llm: LLMProvider = Depends(get_llm),
    db: AsyncSession = Depends(get_db_session)
):
    if not request.disclaimer_acknowledged:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Disclaimer must be acknowledged to proceed."
        )
    
    # 1. Triage the chief complaint
    emergency_result = await llm.detect_emergency(request.chief_complaint_text, [])
    classification = determine_classification_from_keywords(emergency_result.triggered_keywords)
    
    # 2. Handle CRITICAL cases immediately (no session created)
    if classification == VisitClassification.CRITICAL:
        return CreateSessionResponse(
            visit_classification=CLASSIFICATION_DISPLAY[classification],
            is_emergency=True,
            emergency_alert=EmergencyAlert(
                message="Based on what you've described, this may be a life-threatening emergency. Please contact emergency services immediately."
            )
        )
        
    # 3. For non-critical, get appointment number and create session
    appointment_number = await PatientRepository.get_next_appointment_number(db)
    
    session = IntakeSession()
    session.patient_id = request.patient_id
    session.visit_classification = classification
    session.chief_complaint.summary.value = request.chief_complaint_text
    
    # We must also ensure we add it to the DB with the extra columns
    db_session = IntakeSessionTable(
        id=session.id,
        patient_id=session.patient_id,
        appointment_number=appointment_number,
        chief_complaint_text=request.chief_complaint_text,
        visit_classification=classification.value,
        data=session.model_dump(mode="json")
    )
    db.add(db_session)
    await db.commit()
    
    return CreateSessionResponse(
        session_id=session.id,
        appointment_number=appointment_number,
        visit_classification=CLASSIFICATION_DISPLAY[classification],
        is_emergency=False,
        first_question="What brings you in today?"
    )

@router.post("/session/{session_id}/message", response_model=SendMessageResponse)
async def send_message(
    session_id: uuid.UUID,
    request: SendMessageRequest,
    orchestrator: IntakeOrchestrator = Depends(get_orchestrator)
):
    try:
        response = await orchestrator.process_message(session_id, request.message_id, request.content)
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

@router.post("/session/{session_id}/audio-message", response_model=SendMessageResponse)
async def send_audio_message(
    session_id: uuid.UUID,
    message_id: uuid.UUID = Form(...),
    audio: UploadFile = File(...),
    orchestrator: IntakeOrchestrator = Depends(get_orchestrator),
    stt: STTProvider = Depends(get_stt),
    tts: TTSProvider = Depends(get_tts)
):
    audio_bytes = await audio.read()
    
    transcript = await stt.transcribe(audio_bytes, audio.content_type)
    if not transcript:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not transcribe audio.")
    
    try:
        response = await orchestrator.process_message(session_id, message_id, transcript)
        
        tts_bytes = await tts.synthesize(response.assistant_message)
        if tts_bytes:
            b64_audio = base64.b64encode(tts_bytes).decode("utf-8")
            response.audio_url = f"data:audio/mp3;base64,{b64_audio}"
            
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/session/{session_id}/summary", response_model=SummaryResponse)
async def get_summary(
    session_id: uuid.UUID,
    repo: SessionRepository = Depends(get_repo),
    llm: LLMProvider = Depends(get_llm)
):
    session = await repo.get_session(session_id)
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found.")
        
    if session.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Session must be completed to generate summary."
        )
        
    session_data = session.model_dump(mode="json")
    summary_result = await llm.generate_summary(session_data)
    
    return SummaryResponse(
        session_id=session.id,
        clinician_summary=summary_result.clinician_summary,
        flags_for_review=summary_result.flags,
        structured_data=session_data
    )
