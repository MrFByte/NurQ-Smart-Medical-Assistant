import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker

# ---------------------------------------------------------------------------
# SQLite compatibility: compile PostgreSQL JSONB as plain JSON in SQLite
# ---------------------------------------------------------------------------
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.dialects.postgresql import JSONB

@compiles(JSONB, "sqlite")
def _compile_jsonb_sqlite(element, compiler, **kw):
    return "JSON"

# ---------------------------------------------------------------------------
# Application imports
# ---------------------------------------------------------------------------
from app.main import app
from app.dependencies import get_db_session, get_llm, get_orchestrator, get_repo
from app.db.tables import Base
from app.providers.protocols import (
    LLMProvider,
    ExtractionResult,
    EmergencyResult,
    SummaryResult,
)
from app.services.orchestrator import IntakeOrchestrator
from app.services.state_machine import IntakeStateMachine
from app.db.repository import SessionRepository

# ---------------------------------------------------------------------------
# In-memory SQLite engine used by ALL tests
# ---------------------------------------------------------------------------
DATABASE_URL = "sqlite+aiosqlite:///:memory:"
engine = create_async_engine(DATABASE_URL, connect_args={"check_same_thread": False})
TestingSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


# ---------------------------------------------------------------------------
# Mock LLM provider so integration / regression tests never hit real Groq API
# ---------------------------------------------------------------------------
class MockLLMProvider(LLMProvider):
    """Deterministic LLM mock used across integration & regression tests."""

    async def extract_fields(self, user_message, schema_state, conversation):
        from app.providers.protocols import ExtractedFieldUpdate
        from app.models.domain import FieldConfidence

        if "chest pain" in user_message.lower():
            return ExtractionResult(fields={
                "chief_complaint.summary": ExtractedFieldUpdate(
                    value="Chest Pain",
                    confidence=FieldConfidence.CONFIRMED,
                    raw_quote="chest pain",
                )
            })
        return ExtractionResult(fields={})

    async def detect_emergency(self, user_message, conversation):
        keywords = []
        is_emergency = False
        lower = user_message.lower()

        emergency_terms = [
            "heart attack", "cardiac arrest", "severe chest pain",
            "not breathing", "stroke", "seizure",
        ]
        for term in emergency_terms:
            if term in lower:
                keywords.append(term)
                is_emergency = True

        return EmergencyResult(
            is_emergency=is_emergency,
            triggered_keywords=keywords,
            recommended_action="Go to ER" if is_emergency else None,
        )

    async def generate_question(self, target_field, field_label, conversation):
        return f"Mocked question about {field_label}?"

    async def generate_summary(self, session_data):
        return SummaryResult(clinician_summary="Mocked summary", flags=[])


_mock_llm = MockLLMProvider()

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest_asyncio.fixture
async def db_session():
    """Provide a clean DB session per test (tables created & dropped each time)."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with TestingSessionLocal() as session:
        yield session
        await session.rollback()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest_asyncio.fixture
async def async_client(db_session):
    """
    ASGI test client with all heavy dependencies replaced by mocks.
    Injects the in-memory db_session and a deterministic MockLLMProvider.
    """

    async def _override_db():
        yield db_session

    def _override_llm():
        return _mock_llm

    def _override_repo():
        return SessionRepository(db_session)

    def _override_orchestrator():
        return IntakeOrchestrator(
            SessionRepository(db_session),
            _mock_llm,
            IntakeStateMachine(),
        )

    app.dependency_overrides[get_db_session] = _override_db
    app.dependency_overrides[get_llm] = _override_llm
    app.dependency_overrides[get_repo] = _override_repo
    app.dependency_overrides[get_orchestrator] = _override_orchestrator

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()


# Keep legacy name so any old test referencing `client` still works
@pytest_asyncio.fixture
async def client(async_client):
    """Alias for async_client (backwards compat)."""
    yield async_client
