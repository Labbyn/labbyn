from typing import Any, Dict, List

from fastapi import APIRouter, Body, Depends

from app.auth import dependencies

from .service import ImportService

router = APIRouter(prefix="/db/import", tags=["Import"])


@router.post("/{entity_type}")
async def generic_db_import(
    entity_type: str,
    ui_team_id: int = Body(..., embed=True),
    rows: List[Dict[str, Any]] = Body(...),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """
    Generic endpoint for importing different entities from mapped CSV data.

    Supported entity types: 'machines', 'racks', 'inventory'.

    :param entity_type: The category of data being imported (e.g., 'machines').
    :param ui_team_id: Default team ID selected in the UI context.
    :param rows: List of dictionaries containing mapped row data (names, hardware lists, metadata dicts).
    :param db: Active asynchronous database session.
    :param ctx: Request context for user identity and team authorization.
    :return: Summary of the import process including success/failure counts and detailed row logs.
    """
    service = ImportService(ctx.db, ctx)
    return await service.run_import(entity_type, rows, ui_team_id)
