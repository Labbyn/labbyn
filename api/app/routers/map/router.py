"""Router for Map Database API CRUD."""

from fastapi import APIRouter, Depends

from app.auth import dependencies
from app.schemas import map_schemas

from .service import MapService

router = APIRouter(prefix="/rooms", tags=["Maps"])


@router.get("/{room_id}/map", response_model=map_schemas.MapResponse)
async def get_room_map(
    room_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific map by Room ID.

    :param room_id: ID of the room
    :param ctx: Request context
    :return: Map object
    """
    return await MapService(ctx.db, ctx).get_room_map(room_id)


@router.patch("/{room_id}/map", response_model=map_schemas.MapResponse)
async def sync_room_map(
    room_id: int,
    payload: map_schemas.MapUpdate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Synchronize room map layout.

    :param room_id: ID of the room
    :param payload: Map update payload
    :param ctx: Request context
    :return: Updated map object
    """
    return await MapService(ctx.db, ctx).sync_map(room_id, payload)
