"""Router for Shelf Database API CRUD."""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.database import get_async_db
from app.db.models import Rack, Shelf
from app.auth.dependencies import RequestContext
from app.db.schemas import (
    ShelfCreate,
    ShelfUpdate,
    ShelfResponse,
)
from app.utils.redis_service import acquire_lock

router = APIRouter(tags=["shelves"])


@router.get("/db/rack/{rack_id}/all", response_model=List[ShelfResponse])
async def get_shelves_by_rack(
    rack_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Get all shelves for a specific rack
    :param rack_id: ID of the rack
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of shelves belonging to the rack
    """
    ctx.require_user()

    rack_stmt = select(Rack).filter(Rack.id == rack_id)
    rack_stmt = ctx.team_filter(rack_stmt, Rack)
    rack_res = await db.execute(rack_stmt)
    rack = rack_res.scalar_one_or_none()

    if not rack:
        raise HTTPException(status_code=404, detail="Rack does not exist.")

    stmt = select(Shelf).filter(Shelf.rack_id == rack_id).order_by(Shelf.order.desc())
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/db/shelf/{shelf_id}", response_model=ShelfResponse)
async def get_single_shelf(
    shelf_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Fetch specific shelf by ID with its nested machines
    :param shelf_id: ID of the shelf
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Detailed shelf object
    """
    ctx.require_user()

    stmt = (
        select(Shelf).options(joinedload(Shelf.machines)).filter(Shelf.id == shelf_id)
    )
    result = await db.execute(stmt)
    shelf = result.unique().scalar_one_or_none()

    if not shelf:
        raise HTTPException(status_code=404, detail="Shelf does not exist.")

    rack_stmt = select(Rack).filter(Rack.id == shelf.rack_id)
    rack_stmt = ctx.team_filter(rack_stmt, Rack)
    rack_res = await db.execute(rack_stmt)

    if not rack_res.scalar_one_or_none():
        raise HTTPException(
            status_code=403, detail="You do not have permission to view this shelf."
        )

    return shelf


@router.post(
    "/db/shelf/{rack_id}",
    response_model=ShelfResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_shelf(
    rack_id: int,
    shelf_data: ShelfCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Create a new shelf in a specific rack
    :param rack_id: ID of the parent rack
    :param shelf_data: Data for the new shelf
    :param db: Active database session
    :param ctx: Request context for authorization
    :return: Created shelf object with rack context
    """
    ctx.require_user()
    async with acquire_lock(f"rack_lock:{rack_id}"):
        rack_stmt = select(Rack).filter(Rack.id == rack_id)
        rack_stmt = ctx.team_filter(rack_stmt, Rack)
        rack_res = await db.execute(rack_stmt)
        rack = rack_res.scalar_one_or_none()

        if not rack:
            raise HTTPException(
                status_code=404, detail="Rack does not exist or access denied."
            )

        db_shelf = Shelf(**shelf_data.model_dump(), rack_id=rack_id)
        db.add(db_shelf)
        await db.commit()
        await db.refresh(db_shelf, attribute_names=["rack", "machines"])

        db_shelf.rack_name = rack.name

        return db_shelf


@router.patch("/db/shelf/{shelf_id}", response_model=ShelfResponse)
async def update_shelf(
    shelf_id: int,
    shelf_data: ShelfUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Update shelf details like name or order
    :param shelf_id: ID of the shelf to update
    :param shelf_data: Fields to update
    :param db: Active database session
    :param ctx: Request context for permissions
    :return: Updated shelf object
    """
    ctx.require_user()

    async with acquire_lock(f"shelf_lock:{shelf_id}"):
        stmt = select(Shelf).filter(Shelf.id == shelf_id)
        result = await db.execute(stmt)
        db_shelf = result.scalar_one_or_none()

        if not db_shelf:
            raise HTTPException(status_code=404, detail="Shelf does not exist.")

        rack_stmt = select(Rack).filter(Rack.id == db_shelf.rack_id)
        rack_stmt = ctx.team_filter(rack_stmt, Rack)
        rack_res = await db.execute(rack_stmt)

        if not rack_res.scalar_one_or_none():
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to manage this shelf.",
            )

        update_dict = shelf_data.model_dump(exclude_unset=True)

        for key, value in update_dict.items():
            setattr(db_shelf, key, value)

        await db.commit()
        await db.refresh(db_shelf, attribute_names=["rack", "machines"])
        return db_shelf


@router.delete("/db/shelf/{shelf_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_shelf(
    shelf_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Delete a specific shelf if it is empty
    :param shelf_id: ID of the shelf to delete
    :param db: Active database session
    :param ctx: Request context for authorization
    :return: No content response
    """
    ctx.require_user()

    async with acquire_lock(f"shelf_lock:{shelf_id}"):
        stmt = (
            select(Shelf)
            .options(joinedload(Shelf.machines))
            .filter(Shelf.id == shelf_id)
        )
        result = await db.execute(stmt)
        db_shelf = result.unique().scalar_one_or_none()

        if not db_shelf:
            raise HTTPException(status_code=404, detail="Shelf does not exist.")

        rack_stmt = select(Rack).filter(Rack.id == db_shelf.rack_id)
        rack_stmt = ctx.team_filter(rack_stmt, Rack)
        rack_res = await db.execute(rack_stmt)

        if not rack_res.scalar_one_or_none():
            raise HTTPException(
                status_code=403,
                detail="You do not have permission to manage this shelf.",
            )

        if db_shelf.machines:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Shelf is not empty. Please remove all machines from the shelf before deleting it.",
            )

        await db.delete(db_shelf)
        await db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)
