"""Router for Rack Database API CRUD."""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from sqlalchemy.orm import joinedload, Session
from typing import List, Optional

from app.database import get_db
from app.db.models import Rack, Shelf, Rooms, Tags, Teams
from app.auth.dependencies import RequestContext
from app.db.schemas import (
    RackCreate,
    RackUpdate,
    RackResponse,
    RackWithOrderedMachinesResponse,
)

router = APIRouter(tags=["Racks"])


def format_rack_output(rack: Rack):
    """
    Format rack output to display machine list ordered

    :param rack: Rack object
    :return: Formatted rack dict
    """

    sorted_shelves = sorted(rack.shelves, key=lambda s: s.order or 0)
    ordered_machines = []

    for shelf in sorted_shelves:
        ordered_machines.append(shelf.machines)

    team_name = rack.team.name if rack.team else "N/A"
    rack_link = f"/racks/{rack.id}"

    return {
        "id": rack.id,
        "name": rack.name,
        "team_id": rack.team_id,
        "layout_id": rack.layout_id,
        "team_name": team_name,
        "room_id": rack.room_id,
        "tags": rack.tags or [],
        "machines": ordered_machines,
        "link": rack_link,
    }


@router.get("/db/racks", response_model=List[RackResponse], tags=["Racks"])
def get_racks(
    room_ids: Optional[List[int]] = Query(None),
    team_ids: Optional[List[int]] = Query(None),
    ctx: RequestContext = Depends(),
):
    """
    Returns ALL racks with their shelves and machines nested inside.
    :param room_ids: Optional list of room IDs to filter by
    :param team_ids: Optional list of team IDs to filter by
    :param ctx: Request context for database and user info
    :return: List of racks with nested structures
    """
    query = ctx.db.query(Rack)

    if room_ids:
        query = query.filter(Rack.room_id.in_(room_ids))
    if team_ids:
        query = query.filter(Rack.team_id.in_(team_ids))

    racks = query.options(
        joinedload(Rack.room),
        joinedload(Rack.team),
        joinedload(Rack.shelves).joinedload(Shelf.machines),
    ).all()

    for r in racks:
        r.room_name = r.room.name if r.room else "N/A"
        r.team_name = r.team.name if r.team else "N/A"

    return racks


@router.get("/db/racks-list", tags=["Racks"])
def get_racks_list(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Returns a simple list of rack names and IDs for dropdowns
    :param db: Active database session
    :param ctx: Request context
    :return: List of dictionaries with id and name
    """
    query = db.query(Rack.id, Rack.name)
    racks = ctx.team_filter(query, Rack).all()

    return [{"id": r.id, "name": r.name} for r in racks]


@router.get("/db/racks/{rack_id}", response_model=RackResponse, tags=["Racks"])
def get_rack_detail(
    rack_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch specific rack by ID with its nested shelves and machines
    :param rack_id: ID of the rack
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Detailed rack object
    """
    query = db.query(Rack).filter(Rack.id == rack_id)
    rack = (
        ctx.team_filter(query, Rack)
        .options(
            joinedload(Rack.room),
            joinedload(Rack.team),
            joinedload(Rack.shelves).joinedload(Shelf.machines),
        )
        .first()
    )

    if not rack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rack not found or access denied",
        )

    rack.room_name = rack.room.name if rack.room else "N/A"
    rack.team_name = rack.team.name if rack.team else "N/A"

    return rack


@router.post(
    "/db/racks",
    response_model=RackResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Racks"],
)
def create_rack(
    rack: RackCreate, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Create a new rack with team and room validation
    :param rack: Rack creation data
    :param db: Active database session
    :param ctx: Request context for user authorization
    :return: Created rack object with names
    """
    ctx.require_user()

    if ctx.is_admin and rack.team_id:
        effective_team_id = rack.team_id
    else:
        effective_team_id = ctx.team_id

    room = db.query(Rooms).filter(Rooms.id == rack.room_id).first()

    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    if not ctx.is_admin and room.team_id != effective_team_id:
        raise HTTPException(
            status_code=403, detail="Cannot assign rack to a room owned by another team"
        )

    db_rack = Rack(
        name=rack.name,
        room_id=rack.room_id,
        layout_id=rack.layout_id,
        team_id=effective_team_id,
    )

    if rack.tag_ids:
        tags = ctx.db.query(Tags).filter(Tags.id.in_(rack.tag_ids)).all()
        db_rack.tags = tags

    db.add(db_rack)
    db.commit()
    db.refresh(db_rack)

    db_rack.room_name = db_rack.room.name if db_rack.room else "N/A"
    db_rack.team_name = db_rack.team.name if db_rack.team else "N/A"

    return db_rack


@router.patch("/db/racks/{rack_id}", response_model=RackResponse, tags=["Racks"])
def update_rack(
    rack_id: int,
    rack_data: RackUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Update an existing rack including team or room changes
    :param rack_id: ID of the rack to update
    :param rack_data: Data fields to update
    :param db: Active database session
    :param ctx: Request context for permissions
    :return: Updated rack object
    """
    ctx.require_user()

    query = db.query(Rack).filter(Rack.id == rack_id)
    db_rack = ctx.team_filter(query, Rack).first()

    if not db_rack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rack not found or access denied",
        )

    update_dict = rack_data.model_dump(exclude_unset=True)

    if "tag_ids" in update_dict:
        tag_ids = update_dict.pop("tag_ids")
        if tag_ids is not None:
            new_tags = ctx.db.query(Tags).filter(Tags.id.in_(tag_ids)).all()
            db_rack.tags = new_tags

    if "team_id" in update_dict:
        if not ctx.is_admin and update_dict["team_id"] != ctx.team_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot reassign rack to another team",
            )

    if "room_id" in update_dict:
        new_room_id = update_dict["room_id"]
        room = db.query(Rooms).filter(Rooms.id == new_room_id).first()
        if not room:
            raise HTTPException(status_code=404, detail="New room not found")

        target_team = update_dict.get("team_id", db_rack.team_id)
        if not ctx.is_admin and room.team_id != target_team:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="New room is owned by another team",
            )

    for key, value in update_dict.items():
        setattr(db_rack, key, value)

    db.commit()
    db.refresh(db_rack)

    db_rack.room_name = db_rack.room.name if db_rack.room else "N/A"
    db_rack.team_name = db_rack.team.name if db_rack.team else "N/A"

    return db_rack


@router.delete(
    "/db/racks/{rack_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Racks"]
)
def delete_rack(
    rack_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Delete a specific rack from the database
    :param rack_id: ID of the rack to delete
    :param db: Active database session
    :param ctx: Request context for team-based access control
    :return: No content response
    """
    ctx.require_user()

    query = db.query(Rack).filter(Rack.id == rack_id)
    db_rack = ctx.team_filter(query, Rack).first()

    if not db_rack:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rack not found or you don't have permission to delete it",
        )

    db.delete(db_rack)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/db/racks/rack_info/{rack_id}",
    response_model=RackWithOrderedMachinesResponse,
    tags=["Racks"],
)
def get_rack_info_by_id(
    rack_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch detailed information about a specific rack by ID including ordered machine list
    :param rack_id: Rack ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Rack object
    """
    rack = (
        db.query(Rack)
        .filter(Rack.id == rack_id)
        .options(
            joinedload(Rack.team), joinedload(Rack.shelves).joinedload(Shelf.machines)
        )
        .first()
    )

    if not rack:
        raise HTTPException(status_code=404, detail="Rack not found")

    return format_rack_output(rack)
