"""Router for Room Database API CRUD."""

from typing import List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload
from app.database import get_async_db
from app.db.models import Rooms, Tags, Rack, Shelf
from app.db.schemas import (
    RoomsCreate,
    RoomsResponse,
    RoomsUpdate,
    RoomDashboardResponse,
    RoomDetailsResponse,
)
from app.utils.redis_service import acquire_lock
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import RequestContext
from app.utils.database_service import resolve_target_team_id


router = APIRouter()


@router.post(
    "/db/rooms/",
    response_model=RoomsResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Rooms"],
)
async def create_room(
    room_data: RoomsCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Create new room
    :param room_data: Room data
    :param db: Active database session
    :return: Room object
    """
    ctx.require_group_admin()
    tag_ids = room_data.tag_ids if hasattr(room_data, "tag_ids") else []

    effective_team_id = resolve_target_team_id(ctx, getattr(room_data, "team_id", None))

    obj = Rooms(
        name=room_data.name, room_type=room_data.room_type, team_id=effective_team_id
    )

    if tag_ids:
        tag_stmt = select(Tags).where(Tags.id.in_(tag_ids))
        tag_res = await db.execute(tag_stmt)
        obj.tags = tag_res.scalars().all()

    db.add(obj)
    await db.commit()
    await db.refresh(obj, attribute_names=["team", "racks", "tags"])
    return obj


@router.get("/db/rooms/", response_model=List[RoomsResponse], tags=["Rooms"])
async def get_rooms(
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch all rooms
    :param db: Active database session
    :return: List of all rooms
    """
    ctx.require_user()
    stmt = select(Rooms).options(joinedload(Rooms.tags))
    stmt = ctx.team_filter(stmt, Rooms)

    result = await db.execute(stmt)
    return result.unique().scalars().all()


@router.get(
    "/db/rooms/dashboard", response_model=List[RoomDashboardResponse], tags=["Rooms"]
)
async def get_rooms_dashboard(
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch all rooms with rack count and map link for dashboard
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Room object
    """
    ctx.require_user()
    stmt = select(Rooms).options(
        joinedload(Rooms.racks), joinedload(Rooms.layouts), joinedload(Rooms.team)
    )
    stmt = ctx.team_filter(stmt, Rooms)

    result = await db.execute(stmt)
    rooms = result.unique().scalars().all()

    results = []
    for r in rooms:
        results.append(
            {
                "id": r.id,
                "name": r.name,
                "team_name": r.team.name if r.team else "N/A",
                "rack_count": len(r.racks),
                "map_link": f"/map/room/{r.id}",
            }
        )
    return results


@router.get(
    "/db/rooms/{room_id}/details", response_model=RoomDetailsResponse, tags=["Rooms"]
)
async def get_room_details(
    room_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch specific room by ID with nested racks, shelves and machines for dashboard details
    :param room_id: Room ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Room object
    """
    ctx.require_user()
    stmt = (
        select(Rooms)
        .options(
            joinedload(Rooms.tags),
            joinedload(Rooms.layouts),
            joinedload(Rooms.racks).joinedload(Rack.tags),
            joinedload(Rooms.racks).joinedload(Rack.shelves).joinedload(Shelf.machines),
        )
        .filter(Rooms.id == room_id)
    )

    stmt = ctx.team_filter(stmt, Rooms)
    result = await db.execute(stmt)
    room = result.unique().scalar_one_or_none()

    if not room:
        raise HTTPException(status_code=404, detail="Lab not found")

    racks_list = []
    for rack in room.racks:
        machines_in_rack = []
        for shelf in rack.shelves:
            for m in shelf.machines:
                machines_in_rack.append(
                    {
                        "id": str(m.id),
                        "hostname": m.name,
                        "ip_address": m.ip_address,
                        "mac_address": m.mac_address,
                    }
                )

        racks_list.append(
            {
                "id": rack.id,
                "name": rack.name,
                "tags": [
                    {
                        "name": getattr(t, "name", "Unnamed"),
                        "color": getattr(t, "color", "red"),
                    }
                    for t in (rack.tags or [])
                ],
                "machines": machines_in_rack,
            }
        )

    return {
        "id": room.id,
        "name": room.name,
        "tags": [t.name for t in room.tags],
        "map_link": f"/map/room/{room.id}",
        "racks": racks_list,
    }


@router.get("/db/rooms/{room_id}", response_model=RoomsResponse, tags=["Rooms"])
async def get_room_by_id(
    room_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch specific room by ID
    :param room_id: Room ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Room object
    """
    ctx.require_user()
    stmt = select(Rooms).filter(Rooms.id == room_id)
    stmt = ctx.team_filter(stmt, Rooms)

    result = await db.execute(stmt)
    room = result.scalar_one_or_none()

    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found"
        )
    return room


@router.patch("/db/rooms/{room_id}", response_model=RoomsResponse, tags=["Rooms"])
async def update_room(
    room_id: int,
    room_data: RoomsUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Update room
    :param room_id: Room ID
    :param room_data: Room data schema
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Updated Room
    """
    ctx.require_group_admin()

    async with acquire_lock(f"room_lock:{room_id}"):
        stmt = select(Rooms).filter(Rooms.id == room_id)
        stmt = ctx.team_filter(stmt, Rooms)

        result = await db.execute(stmt)
        room = result.scalar_one_or_none()

        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found or access denied",
            )

        update_data = room_data.model_dump(exclude_unset=True)

        if "tag_ids" in update_data:
            tag_ids = update_data.pop("tag_ids")
            if tag_ids is not None:
                tag_stmt = select(Tags).where(Tags.id.in_(tag_ids))
                tag_res = await db.execute(tag_stmt)
                room.tags = tag_res.scalars().all()

        if "team_id" in update_data and not ctx.is_admin:
            if update_data["team_id"] not in ctx.team_ids:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Cannot assign room to a team you don't belong to",
                )

        for k, v in update_data.items():
            setattr(room, k, v)

        await db.commit()
        await db.refresh(room, attribute_names=["team", "racks"])
        return room


@router.delete(
    "/db/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Rooms"]
)
async def delete_room(
    room_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Delete Room
    :param room_id: Room ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """
    ctx.require_group_admin()

    async with acquire_lock(f"room_lock:{room_id}"):
        stmt = select(Rooms).filter(Rooms.id == room_id)
        stmt = ctx.team_filter(stmt, Rooms)

        result = await db.execute(stmt)
        room = result.scalar_one_or_none()

        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found or access denied",
            )

        await db.delete(room)
        await db.commit()
