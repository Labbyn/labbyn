"""Router for Rental Database API CRUD."""

from datetime import date
from typing import List, Optional

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import func, sql, orm
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import inventory_schemas
from app.utils import redis_service

router = APIRouter(prefix="/db", tags=["Inventory-Rentals"])


@router.post(
    "/rentals",
    response_model=inventory_schemas.RentalsResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_rental(
    rent_data: inventory_schemas.RentalsCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new item rent.

    :param rent_data: Rent data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: New Rental object.
    """
    ctx.require_user()

    async with redis_service.acquire_lock(f"inventory_lock:{rent_data.item_id}"):
        stmt = (
            sql.select(models.Inventory)
            .filter(models.Inventory.id == rent_data.item_id)
            .with_for_update(nowait=True)
        )
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()

        if not item:
            raise exceptions.ObjectNotFoundError("Item for this rental")

        sum_stmt = sql.select(
            func.coalesce(func.sum(models.Rentals.quantity), 0)
        ).filter(
            models.Rentals.item_id == item.id,
            models.Rentals.start_date <= rent_data.end_date,
            models.Rentals.end_date >= rent_data.start_date,
        )
        sum_result = await db.execute(sum_stmt)
        active_rentals_sum = sum_result.scalar()

        in_stock = item.quantity - active_rentals_sum

        if rent_data.quantity > in_stock:
            raise exceptions.InsufficientAmountError(
                requested=rent_data.quantity, available=in_stock
            )

        try:
            rental = models.Rentals(
                item_id=rent_data.item_id,
                quantity=rent_data.quantity,
                start_date=rent_data.start_date,
                end_date=rent_data.end_date,
                user_id=ctx.current_user.id,
            )

            db.add(rental)

            if in_stock - rent_data.quantity == 0:
                item.rental_status = True

            await db.commit()
            await db.refresh(rental)
            return rental
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Failed to create rental for '{item.name}'"
            ) from e


@router.post("/rentals/{rental_id}/return")
async def return_rental(
    rental_id: int,
    return_data: Optional[inventory_schemas.RentalReturn] = None,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """End item rental.

    :param rental_id: Rental ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success message.
    """
    ctx.require_user()

    check_stmt = (
        sql.select(models.Rentals)
        .join(models.Inventory, models.Rentals.item_id == models.Inventory.id)
        .filter(models.Rentals.id == rental_id)
        .options(orm.joinedload(models.Rentals.item))
    )
    rental = (
        await db.execute(ctx.team_filter(check_stmt, models.Inventory))
    ).scalar_one_or_none()

    if not rental:
        raise exceptions.ObjectNotFoundError("Rental for this item")

    item = rental.item
    async with redis_service.acquire_lock(f"inventory_lock:{item.id}"):
        await db.refresh(rental)
        await db.refresh(item)

        qty_to_return = (
            return_data.quantity
            if return_data and return_data.quantity
            else rental.quantity
        )

        if qty_to_return > rental.quantity:
            raise exceptions.InsufficientAmountError(
                requested=qty_to_return, available=rental.quantity
            )

        try:
            if qty_to_return == rental.quantity:
                rental.end_date = date.today()
                msg = f"Fully returned '{item.name}'"
            else:
                rental.quantity -= qty_to_return
                msg = (
                    f"Partially returned {qty_to_return}x "
                    f"'{item.name}'. Remaining: {rental.quantity}"
                )

            item.rental_status = False
            await db.commit()
            return {"message": msg}
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(f"Return failed for '{item.name}'") from e


@router.get("/rentals", response_model=List[inventory_schemas.RentalsResponse])
async def get_rentals(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get all rentals.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all rentals.
    """
    ctx.require_user()
    stmt = sql.select(models.Rentals).join(
        models.Inventory, models.Rentals.item_id == models.Inventory.id
    )
    stmt = ctx.team_filter(stmt, models.Inventory)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get("/rentals/{rental_id}", response_model=inventory_schemas.RentalsResponse)
async def get_rental_by_id(
    rental_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get specific rental by ID.

    :param rental_id: Rental ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Rental object.
    """
    ctx.require_user()
    stmt = (
        sql.select(models.Rentals)
        .join(models.Inventory, models.Rentals.item_id == models.Inventory.id)
        .filter(models.Rentals.id == rental_id)
    )
    stmt = ctx.team_filter(stmt, models.Inventory)
    result = await db.execute(stmt)
    rental = result.scalar_one_or_none()

    if not rental:
        raise exceptions.ObjectNotFoundError("Rental for this item")
    return rental


@router.delete("/rentals/{rental_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rental(
    rental_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete rental history.

    :param rental_id: Rental ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    ctx.require_user()
    stmt = (
        sql.select(models.Rentals)
        .join(models.Inventory, models.Rentals.item_id == models.Inventory.id)
        .filter(models.Rentals.id == rental_id)
        .options(orm.joinedload(models.Rentals.item))
    )
    stmt = ctx.team_filter(stmt, models.Inventory)
    result = await db.execute(stmt)
    rental = result.scalar_one_or_none()

    if not rental:
        raise exceptions.ObjectNotFoundError("Rental for this item")

    async with redis_service.acquire_lock(f"inventory_lock:{rental.item_id}"):
        try:
            item_stmt = sql.select(models.Inventory).filter(
                models.Inventory.id == rental.item_id
            )
            item_res = await db.execute(item_stmt)
            item = item_res.scalar_one_or_none()

            if item and item.rental_id == rental.id:
                item.rental_status = False
                item.rental_id = None

            await db.delete(rental)
            await db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            raise exceptions.ValidationError(
                f"Could not delete rental for '{item.name}'"
            ) from e
