"""Router for Room Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.database import get_async_db
from app.schemas import room_schemas

from .service import RoomService

router = APIRouter(prefix="/db/rooms", tags=["Rooms"])


@router.post(
    "", response_model=room_schemas.RoomsResponse, status_code=status.HTTP_201_CREATED
)
async def create_room(
    room_data: room_schemas.RoomsCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new room.

    :param room_data: Room data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Room object.
    """
    return await RoomService(db, ctx).create_room(room_data)


@router.get("", response_model=List[room_schemas.RoomsResponse])
async def get_rooms(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all rooms.

    :param ctx: Request context for user and team info
    :param db: Active database session
    :return: List of all rooms.
    """
    return await RoomService(db, ctx).repo.get_all(db, ctx)


@router.get("/dashboard", response_model=List[room_schemas.RoomDashboardResponse])
async def get_rooms_dashboard(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all rooms with rack count and map link for dashboard.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Room object.
    """
    return await RoomService(db, ctx).get_dashboard_list()


@router.get("/{room_id}/details", response_model=room_schemas.RoomDetailsResponse)
async def get_room_details(
    room_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific room by ID with nested racks, shelves and machines.

    For dashboard details

    :param room_id: Room ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Room object.
    """
    return await RoomService(db, ctx).get_detailed_room(room_id)


@router.get("/{room_id}", response_model=room_schemas.RoomsResponse)
async def get_room_by_id(
    room_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific room by ID.

    :param room_id: Room ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Room object.
    """
    return await RoomService(db, ctx).get_room_or_404(room_id)


@router.patch("/{room_id}", response_model=room_schemas.RoomsResponse)
async def update_room(
    room_id: int,
    room_data: room_schemas.RoomsUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update room.

    :param room_id: Room ID
    :param room_data: Room data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated Room.
    """
    return await RoomService(db, ctx).update_room(room_id, room_data)


@router.delete("/{room_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_room(
    room_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete Room.

    :param room_id: Room ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    await RoomService(db, ctx).delete_room(room_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
