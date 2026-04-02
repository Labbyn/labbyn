"""Router for History Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.database import get_async_db
from app.schemas import history_schemas

from .service import HistoryService

router = APIRouter(prefix="/db/history", tags=["History"])


@router.get("", response_model=List[history_schemas.HistoryEnhancedResponse])
async def get_history_logs(
    limit: int = 200,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Retrieve history logs with enhanced information.

    :param limit: Maximum number of logs to retrieve
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: History logs with enhanced details.
    """
    return await HistoryService(db, ctx).get_enhanced_logs(limit)


@router.get("/{history_id}", response_model=history_schemas.HistoryEnhancedResponse)
async def get_history_by_id(
    history_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific history by ID.

    :param history_id: History ID
    :param db: Active database session
    :return: History object.
    """

    return await HistoryService(db, ctx).get_log_or_404(history_id)


@router.post("/{history_id}/rollback")
async def rollback_history(
    history_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Rollback a specific history entry by ID.

    :param history_id: History entry ID
    :param db: Active database session
    :return: Success message.
    """
    return await HistoryService(db, ctx).rollback_entry(history_id)
