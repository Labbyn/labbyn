"""Router for History Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends

from app.auth import dependencies
from app.schemas import history_schemas

from .service import HistoryService

router = APIRouter(prefix="/db/history", tags=["History"])


@router.get("", response_model=List[history_schemas.HistoryEnhancedResponse])
async def get_history_logs(
    limit: int = 200,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Retrieve history logs with enhanced information.

    :param limit: Maximum number of logs to retrieve
    :param ctx: Request context for user and team info
    :return: History logs with enhanced details.
    """
    return await HistoryService(ctx.db, ctx).get_enhanced_logs(limit)


@router.get("/{history_id}", response_model=history_schemas.HistoryEnhancedResponse)
async def get_history_by_id(
    history_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific history by ID.

    :param history_id: History ID
    :param ctx: Request context for user and team info
    :return: History object.
    """

    return await HistoryService(ctx.db, ctx).get_log_or_404(history_id)


@router.post("/{history_id}/rollback")
async def rollback_history(
    history_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Rollback a specific history entry by ID.

    :param history_id: History entry ID
    :param ctx: Request context for user and team info
    :return: Success message.
    """
    return await HistoryService(ctx.db, ctx).rollback_entry(history_id)
