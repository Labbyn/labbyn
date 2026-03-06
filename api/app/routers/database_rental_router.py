"""Router for Rental Database API CRUD."""

from typing import List, Optional
from datetime import date
from app.database import get_async_db
from app.db.models import (
    Rentals,
    Inventory,
)
from app.db.schemas import RentalsCreate, RentalsResponse, RentalReturn
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter()


@router.post(
    "/db/rentals/",
    response_model=RentalsResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Rentals"],
)
async def create_rental(
    rent_data: RentalsCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Create new item rent
    :param rent_data: Rent data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: New Rental object
    """
    ctx.require_user()

    async with acquire_lock(f"inventory_lock:{rent_data.item_id}"):
        stmt = (
            select(Inventory)
            .filter(Inventory.id == rent_data.item_id)
            .with_for_update(nowait=True)
        )
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()

        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        sum_stmt = select(func.coalesce(func.sum(Rentals.quantity), 0)).filter(
            Rentals.item_id == item.id,
            Rentals.start_date <= rent_data.end_date,
            Rentals.end_date >= rent_data.start_date,
        )
        sum_result = await db.execute(sum_stmt)
        active_rentals_sum = sum_result.scalar()

        in_stock = item.quantity - active_rentals_sum

        if rent_data.quantity > in_stock:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"You can't borrow more than: {in_stock}",
            )

        rental = Rentals(
            item_id=rent_data.item_id,
            quantity=rent_data.quantity,
            start_date=rent_data.start_date,
            end_date=rent_data.end_date,
            user_id=ctx.current_user.id,
        )

        db.add(rental)

        if in_stock - rent_data.quantity == 0:
            item.rental_status = True
            item.rental_id = None

        await db.commit()
        await db.refresh(rental)
        return rental


@router.post("/db/rentals/{rental_id}/return", tags=["Rentals"])
async def return_rental(
    rental_id: int,
    return_data: Optional[RentalReturn] = None,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    End item rental
    :param rental_id: Rental ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success message
    """
    ctx.require_user()

    # Wstępne sprawdzenie uprawnień
    check_stmt = (
        select(Rentals)
        .join(Inventory, Rentals.item_id == Inventory.id)
        .filter(Rentals.id == rental_id)
    )
    check_stmt = ctx.team_filter(check_stmt, Inventory)
    check_res = await db.execute(check_stmt)
    rental_check = check_res.scalar_one_or_none()

    if not rental_check:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rental not found or access denied",
        )

    item_id = rental_check.item_id

    async with acquire_lock(f"inventory_lock:{item_id}"):
        rent_stmt = select(Rentals).filter(Rentals.id == rental_id).with_for_update()
        item_stmt = select(Inventory).filter(Inventory.id == item_id).with_for_update()

        rent_res = await db.execute(rent_stmt)
        rental = rent_res.scalar_one_or_none()

        item_res = await db.execute(item_stmt)
        item = item_res.scalar_one_or_none()

        qty_to_return = (
            return_data.quantity
            if return_data and return_data.quantity
            else rental.quantity
        )

        if qty_to_return > rental.quantity:
            raise HTTPException(
                status_code=400,
                detail=f"You can't return more than you borrowed: ({rental.quantity})",
            )

        if qty_to_return == rental.quantity:
            rental.end_date = date.today()
            message = "Returned successfully (Full)"
        else:
            rental.quantity -= qty_to_return
            message = f"Partially returned {qty_to_return} items. Remaining: {rental.quantity}"

        if item:
            item.rental_status = False

        await db.commit()

    return {"message": message}


@router.get("/db/rentals/", response_model=List[RentalsResponse], tags=["Rentals"])
async def get_rentals(
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Get all rentals
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all rentals
    """
    ctx.require_user()
    stmt = select(Rentals).join(Inventory, Rentals.item_id == Inventory.id)
    stmt = ctx.team_filter(stmt, Inventory)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/db/rentals/{rental_id}", response_model=RentalsResponse, tags=["Rentals"])
async def get_rental_by_id(
    rental_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Get specific rental by ID
    :param rental_id: Rental ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Rental object
    """
    ctx.require_user()
    stmt = (
        select(Rentals)
        .join(Inventory, Rentals.item_id == Inventory.id)
        .filter(Rentals.id == rental_id)
    )
    stmt = ctx.team_filter(stmt, Inventory)
    result = await db.execute(stmt)
    rental = result.scalar_one_or_none()

    if not rental:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rental not found or access denied",
        )
    return rental


@router.delete(
    "/db/rentals/{rental_id}", status_code=status.HTTP_204_NO_CONTENT, tags=["Rentals"]
)
async def delete_rental(
    rental_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: RequestContext = Depends(RequestContext.create),
):
    """
    Delete rental history
    :param rental_id: Rental ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """
    ctx.require_user()
    stmt = (
        select(Rentals)
        .join(Inventory, Rentals.item_id == Inventory.id)
        .filter(Rentals.id == rental_id)
    )
    stmt = ctx.team_filter(stmt, Inventory)
    result = await db.execute(stmt)
    rental = result.scalar_one_or_none()

    if not rental:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rental not found or access denied",
        )

    async with acquire_lock(f"inventory_lock:{rental.item_id}"):
        item_stmt = select(Inventory).filter(Inventory.id == rental.item_id)
        item_res = await db.execute(item_stmt)
        item = item_res.scalar_one_or_none()

        if item and item.rental_id == rental.id:
            item.rental_status = False
            item.rental_id = None

        await db.delete(rental)
        await db.commit()
