import uuid
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.domain import IntakeSession, ConversationTurn
from app.db.tables import IntakeSessionTable, ConversationTurnTable

class SessionRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_session(self, session: IntakeSession) -> None:
        db_session = IntakeSessionTable(
            id=session.id,
            status=session.status,
            data=session.model_dump(mode="json")
        )
        self.session.add(db_session)
        await self.session.commit()

    async def get_session(self, session_id: uuid.UUID) -> IntakeSession | None:
        result = await self.session.execute(
            select(IntakeSessionTable).where(IntakeSessionTable.id == session_id)
        )
        db_session = result.scalar_one_or_none()
        if db_session:
            return IntakeSession.model_validate(db_session.data)
        return None

    async def update_session(self, session: IntakeSession) -> None:
        await self.session.execute(
            update(IntakeSessionTable)
            .where(IntakeSessionTable.id == session.id)
            .values(
                status=session.status,
                data=session.model_dump(mode="json")
            )
        )
        await self.session.commit()

    async def append_turn(self, session_id: uuid.UUID, turn: ConversationTurn) -> None:
        db_turn = ConversationTurnTable(
            id=turn.id,
            session_id=session_id,
            role=turn.role,
            content=turn.content,
            extraction_result=turn.extraction_result,
            timestamp=turn.timestamp
        )
        self.session.add(db_turn)
        await self.session.commit()

    async def message_exists(self, session_id: uuid.UUID, message_id: uuid.UUID) -> bool:
        result = await self.session.execute(
            select(ConversationTurnTable).where(
                ConversationTurnTable.session_id == session_id,
                ConversationTurnTable.id == message_id
            )
        )
        return result.scalar_one_or_none() is not None
