"""Router for Rack Database API CRUD."""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.database import get_async_db
from app.schemas import rack_schemas

from .service import RackService

router = APIRouter(prefix="/db/racks", tags=["Racks"])


@router.get("", response_model=List[rack_schemas.RackResponse])
async def get_racks(
    room_ids: Optional[List[int]] = Query(None),
    team_ids: Optional[List[int]] = Query(None),
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Returns ALL racks with their shelves and machines nested inside.

    :param room_ids: Optional list of room IDs to filter by
    :param team_ids: Optional list of team IDs to filter by
    :param ctx: Request context for database and user info
    :return: List of racks with nested structures.
    """
    return await RackService(db, ctx).get_all_racks(room_ids, team_ids)


@router.get("/list")
async def get_racks_list(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Returns a simple list of rack names and IDs for dropdowns.

    :param db: Active database session
    :param ctx: Request context
    :return: List of dictionaries with id and name.
    """
    ctx.require_user()
    service = RackService(db, ctx)
    racks = await service.repo.get_all(db, ctx)
    return [{"id": r.id, "name": r.name} for r in racks]


@router.get("/{rack_id}", response_model=rack_schemas.RackResponse)
async def get_rack_detail(
    rack_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific rack by ID with its nested shelves and machines.

    :param rack_id: ID of the rack
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Detailed rack object.
    """
    rack = await RackService(db, ctx).get_rack_or_404(rack_id, detailed=True)
    rack.room_name = rack.room.name if rack.room else "N/A"
    rack.team_name = rack.team.name if rack.team else "N/A"
    return rack


@router.post(
    "", response_model=rack_schemas.RackResponse, status_code=status.HTTP_201_CREATED
)
async def create_rack(
    rack: rack_schemas.RackCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create a new rack with team and room validation.

    :param rack: Rack creation data
    :param db: Active database session
    :param ctx: Request context for user authorization
    :return: Created rack object with names.
    """
    return await RackService(db, ctx).create_rack(rack)


@router.patch("/{rack_id}", response_model=rack_schemas.RackResponse)
async def update_rack(
    rack_id: int,
    rack_data: rack_schemas.RackUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update an existing rack including team or room changes.

    :param rack_id: ID of the rack to update
    :param rack_data: Data fields to update
    :param db: Active database session
    :param ctx: Request context for permissions
    :return: Updated rack object.
    """
    return await RackService(db, ctx).update_rack(rack_id, rack_data)


@router.delete("/{rack_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rack(
    rack_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete a specific rack from the database.

    :param rack_id: ID of the rack to delete
    :param db: Active database session
    :param ctx: Request context for team-based access control
    :return: No content response.
    """
    await RackService(db, ctx).delete_rack(rack_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get(
    "/info/{rack_id}", response_model=rack_schemas.RackWithOrderedMachinesResponse
)
async def get_rack_info_by_id(
    rack_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch detailed information about a specific rack by ID.

    Includes ordered machine list.

    :param rack_id: Rack ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Rack object.
    """
    service = RackService(db, ctx)
    rack = await service.get_rack_or_404(rack_id, detailed=True)
    return service.format_rack_output(rack)
