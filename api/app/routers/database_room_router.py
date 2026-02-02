"""Router for Room Database API CRUD."""

from typing import List
from app.database import get_db
from app.db.models import (
    Rooms,
)
from app.db.schemas import (
    RoomsCreate,
    RoomsResponse,
    RoomsUpdate,
)
from app.utils.redis_service import acquire_lock
from fastapi import APIRouter, Depends, HTTPException, status
from app.auth.dependencies import RequestContext
from sqlalchemy.orm import Session

router = APIRouter()


@router.post(
    "/db/rooms/",
    response_model=RoomsResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Rooms"],
)
def create_room(room_data: RoomsCreate, db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Create new room
    :param room_data: Room data
    :param db: Active database session
    :return: Room object
    """
    ctx.require_group_admin()
    data = room_data.model_dump()
    if not ctx.is_admin:
        data["team_id"] = ctx.team_id


    obj = Rooms(**room_data.model_dump())
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
    query = db.query(Rooms)
    query = ctx.team_filter(query, Rooms)
    return query.all()


@router.get("/db/rooms/{room_id}", response_model=RoomsResponse, tags=["Rooms"])
def get_room_by_id(room_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Fetch specific room by ID
    :param room_id: Room ID
    :param db: Active database session
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
    room_id: int, room_data: RoomsUpdate, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Update room
    :param room_id: Room ID
    :param room_data: Room data schema
    :param db: Active database session
    :return: Updated Room
    """
    ctx.require_group_admin()

    async with acquire_lock(f"room_lock:{room_id}"):
        query = db.query(Rooms).filter(Rooms.id == room_id)
        query = ctx.team_filter(query, Rooms)

        room = query.first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Room not found or access denied"
            )
        data = room_data.model_dump(exlude_unset=True)
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
async def delete_room(room_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Delete Room
    :param room_id: Room ID
    :param db: Active database session
    :return: None
    """
    ctx.require_group_admin()

    async with acquire_lock(f"room_lock:{room_id}"):
        query = db.query(Rooms).filter(Rooms.id == room_id)
        query = ctx.team_filter(query, Rooms)
        room = query.first()
        if not room:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Room not found or access denied"
            )
        db.delete(room)
        db.commit()
