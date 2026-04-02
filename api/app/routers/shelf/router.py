"""Router for Shelf Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.database import get_async_db
from app.schemas import rack_schemas

from .service import ShelfService

router = APIRouter(prefix="/db/shelf", tags=["Shelves"])


@router.get("/rack/{rack_id}/all", response_model=List[rack_schemas.ShelfResponse])
async def get_shelves_by_rack(
    rack_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get all shelves for a specific rack.

    :param rack_id: ID of the rack
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of shelves belonging to the rack.
    """
    return await ShelfService(db, ctx).list_by_rack(rack_id)


@router.get("/{shelf_id}", response_model=rack_schemas.ShelfResponse)
async def get_single_shelf(
    shelf_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific shelf by ID with its nested machines.

    :param shelf_id: ID of the shelf
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Detailed shelf object.
    """
    return await ShelfService(db, ctx).get_shelf_or_404(shelf_id)


@router.post(
    "/{rack_id}",
    response_model=rack_schemas.ShelfResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_shelf(
    rack_id: int,
    shelf_data: rack_schemas.ShelfCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create a new shelf in a specific rack.

    :param rack_id: ID of the parent rack
    :param shelf_data: Data for the new shelf
    :param db: Active database session
    :param ctx: Request context for authorization
    :return: Created shelf object with rack context.
    """
    return await ShelfService(db, ctx).create_shelf(rack_id, shelf_data)


@router.patch("/{shelf_id}", response_model=rack_schemas.ShelfResponse)
async def update_shelf(
    shelf_id: int,
    shelf_data: rack_schemas.ShelfUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update shelf details like name or order.

    :param shelf_id: ID of the shelf to update
    :param shelf_data: Fields to update
    :param db: Active database session
    :param ctx: Request context for permissions
    :return: Updated shelf object.
    """
    return await ShelfService(db, ctx).update_shelf(shelf_id, shelf_data)


@router.delete("/{shelf_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shelf(
    shelf_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete a specific shelf if it is empty.

    :param shelf_id: ID of the shelf to delete
    :param db: Active database session
    :param ctx: Request context for authorization
    :return: No content response.
    """
    await ShelfService(db, ctx).delete_shelf(shelf_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
