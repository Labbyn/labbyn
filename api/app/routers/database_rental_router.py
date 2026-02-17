"""Router for Rental Database API CRUD."""

from typing import List, Optional
from datetime import date
from app.database import get_db
from app.db.models import (
    Rentals,
    Inventory,
)
from app.db.schemas import RentalsCreate, RentalsResponse, RentalReturn
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

router = APIRouter()


@router.post(
    "/db/rentals/",
    response_model=RentalsResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Rentals"],
)
async def create_rental(
    rent_data: RentalsCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
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
        item = (
            db.query(Inventory)
            .filter(Inventory.id == rent_data.item_id)
            .with_for_update(nowait=True)
            .first()
        )

        if not item:
            raise HTTPException(status_code=404, detail="Item not found")

        active_rentals_sum = (
            db.query(func.coalesce(func.sum(Rentals.quantity), 0))
            .filter(
                Rentals.item_id == item.id,
                Rentals.start_date <= rent_data.end_date,
                Rentals.end_date >= rent_data.start_date,
            )
            .scalar()
        )

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

        db.commit()
        db.refresh(rental)
        return rental


@router.post("/db/rentals/{rental_id}/return", tags=["Rentals"])
async def return_rental(
    rental_id: int,
    return_data: Optional[RentalReturn] = None,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    End item rental
    :param rental_id: Rental ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success message
    """
    ctx.require_user()

    query = (
        db.query(Rentals)
        .join(Inventory, Rentals.item_id == Inventory.id)
        .filter(Rentals.id == rental_id)
    )
    query = ctx.team_filter(query, Inventory)

    rental = query.first()

    if not rental:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rental not found or access denied",
        )

    item_id = rental.item_id

    async with acquire_lock(f"inventory_lock:{rental.item_id}"):
        db.expire_all()

        rental = (
            db.query(Rentals).filter(Rentals.id == rental_id).with_for_update().first()
        )

        item = (
            db.query(Inventory)
            .filter(Inventory.id == item_id)
            .with_for_update()
            .first()
        )

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
            if item:
                item.rental_status = False
            message = "Returned successfully (Full)"
        else:
            rental.quantity -= qty_to_return
            if item:
                item.rental_status = False
            message = f"Partially returned {qty_to_return} items. Remaining: {rental.quantity}"

        if item:
            item.rental_status = False

        db.commit()

    return {"message": message}


@router.get("/db/rentals/", response_model=List[RentalsResponse], tags=["Rentals"])
def get_rentals(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Get all rentals
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all rentals
    """
    query = db.query(Rentals).join(Inventory, Rentals.item_id == Inventory.id)
    query = ctx.team_filter(query, Inventory)
    return query.all()


@router.get("/db/rentals/{rental_id}", response_model=RentalsResponse, tags=["Rentals"])
def get_rental_by_id(
    rental_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Get specific rental by ID
    :param rental_id: Rental ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Rental object
    """
    query = (
        db.query(Rentals)
        .join(Inventory, Rentals.item_id == Inventory.id)
        .filter(Rentals.id == rental_id)
    )
    query = ctx.team_filter(query, Inventory)
    rental = query.first()
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
    rental_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Delete rental history
    :param rental_id: Rental ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """
    query = (
        db.query(Rentals)
        .join(Inventory, Rentals.item_id == Inventory.id)
        .filter(Rentals.id == rental_id)
    )
    query = ctx.team_filter(query, Inventory)
    rental = query.first()
    if not rental:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rental not found or access denied",
        )

    async with acquire_lock(f"inventory_lock:{rental.item_id}"):
        item = db.query(Inventory).filter(Inventory.id == rental.item_id).first()
        if item and item.rental_id == rental.id:
            item.rental_status = False
            item.rental_id = None

        db.delete(rental)
        db.commit()
