"""Router for Room Database API CRUD."""

from typing import List
from app.database import get_db
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
from sqlalchemy.orm import Session, joinedload

router = APIRouter()


@router.post(
    "/db/rooms/",
    response_model=RoomsResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Rooms"],
)
def create_room(
    room_data: RoomsCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Create new room
    :param room_data: Room data
    :param db: Active database session
    :return: Room object
    """
    ctx.require_group_admin()
    tag_ids = room_data.tag_ids if hasattr(room_data, "tag_ids") else []
    data = room_data.model_dump(exclude={"tag_ids"})
    if not ctx.is_admin:
        data["team_id"] = ctx.team_id

    obj = Rooms(**data)

    if tag_ids:
        tags = db.query(Tags).filter(Tags.id.in_(tag_ids)).all()
        obj.tags = tags

    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get("/db/rooms/", response_model=List[RoomsResponse], tags=["Rooms"])
def get_rooms(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Fetch all rooms
    :param db: Active database session
    :return: List of all rooms
    """
    query = db.query(Rooms).options(joinedload(Rooms.tags))
    query = ctx.team_filter(query, Rooms)
    return query.all()


@router.get(
    "/db/rooms/dashboard", response_model=List[RoomDashboardResponse], tags=["Rooms"]
)
def get_rooms_dashboard(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Fetch all rooms with rack count and map link for dashboard
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Room object
    """
    query = db.query(Rooms).options(joinedload(Rooms.racks), joinedload(Rooms.layouts))
    query = ctx.team_filter(query, Rooms)
    rooms = query.all()

    results = []
    for r in rooms:
        results.append(
            {
                "id": r.id,
                "name": r.name,
                "rack_count": len(r.racks),
                "map_link": f"/map/room/{r.id}",
            }
        )
    return results


@router.get(
    "/db/rooms/{room_id}/details", response_model=RoomDetailsResponse, tags=["Rooms"]
)
def get_room_details(
    room_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch specific room by ID with nested racks, shelves and machines for dashboard details
    :param room_id: Room ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Room object
    """
    query = (
        db.query(Rooms)
        .options(
            joinedload(Rooms.tags),
            joinedload(Rooms.layouts),
            joinedload(Rooms.racks).joinedload(Rack.tags),
            joinedload(Rooms.racks).joinedload(Rack.shelves).joinedload(Shelf.machines),
        )
        .filter(Rooms.id == room_id)
    )

    query = ctx.team_filter(query, Rooms)
    room = query.first()

    if not room:
        raise HTTPException(status_code=404, detail="Lab not found")

    racks_list = []
    for rack in room.racks:
        machines_in_rack = []
        for shelf in rack.shelves:
            for m in shelf.machines:
                machines_in_rack.append(
                    {
                        "device_id": str(m.id),
                        "hostname": m.name,
                        "ip_address": m.ip_address,
                        "mac_address": m.mac_address,
                    }
                )

        racks_list.append(
            {
                "id": rack.id,
                "name": rack.name,
                "tags": [t.name for t in rack.tags],
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
def get_room_by_id(
    room_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch specific room by ID
    :param room_id: Room ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Room object
    """
    query = db.query(Rooms).filter(Rooms.id == room_id)
    query = ctx.team_filter(query, Rooms)
    room = query.first()
    if not room:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Room not found"
        )
    return room


@router.put("/db/rooms/{room_id}", response_model=RoomsResponse, tags=["Rooms"])
async def update_room(
    room_id: int,
    room_data: RoomsUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
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
        query = db.query(Rooms).filter(Rooms.id == room_id)
        query = ctx.team_filter(query, Rooms)

        room = query.first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found or access denied",
            )

        if room_data.tag_ids is not None:
            tags = db.query(Tags).filter(Tags.id.in_(room_data.tag_ids)).all()
            room.tags = tags

        data = room_data.model_dump(exlude_unset=True, exclude={"tag_ids"})
        if not ctx.is_admin and "team_id" in data:
            data["team_id"] = ctx.team_id
        for k, v in room_data.model_dump(exclude_unset=True).items():
            setattr(room, k, v)
        db.commit()
        db.refresh(room)
        return room


@router.delete(
    "/db/rooms/{room_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Rooms"]
)
async def delete_room(
    room_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
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
        query = db.query(Rooms).filter(Rooms.id == room_id)
        query = ctx.team_filter(query, Rooms)
        room = query.first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Room not found or access denied",
            )
        db.delete(room)
        db.commit()
