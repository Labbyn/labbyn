from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.database import get_async_db
from app.schemas import history_schemas

from .service import HistoryService

router = APIRouter(prefix="/sub", tags=["History subpage dedicated router"])


@router.get("/history", response_model=List[history_schemas.HistoryResponse])
async def get_blackboxed_history_logs(
    limit: int = 200,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Retrieve "blackboxed" history list with state diffing.

    :param limit: Limit of entries to retrieve.
    :param db: Active asynchronous database session.
    :param ctx: Request context for user and team info.
    :return: List of formatted history logs.
    """
    return await HistoryService(db, ctx).get_blackboxed_logs(limit)


@router.get("/history/{history_id}", response_model=history_schemas.HistoryResponse)
async def get_blackboxed_history_item(
    history_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Retrieve detailed "blackboxed" information for a single history item.

    :param history_id: The ID of the history entry.
    :param db: Active asynchronous database session.
    :param ctx: Request context for user and team info.
    :return: Blackboxed history item details.
    """
    return await HistoryService(db, ctx).get_blackboxed_item(history_id)
