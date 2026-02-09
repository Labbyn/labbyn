"""Router for Rental Database API CRUD."""

from typing import List
from datetime import date
from app.database import get_db
from app.db.models import (
    Rentals,
    Inventory,
)
from app.db.schemas import (
    RentalsCreate,
    RentalsResponse,
)
from app.utils.redis_service import acquire_lock
from app.auth.dependencies import RequestContext
from fastapi import APIRouter, Depends, HTTPException, status
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
    async with acquire_lock(f"inventory_lock:{rent_data.item_id}"):
        query = db.query(Inventory).filter(Inventory.id == rent_data.item_id)
        query = ctx.team_filter(query, Inventory)
        item = query.first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
            )
        if item.rental_status:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT, detail="Item is already rented"
            )

        rental = Rentals(**rent_data.model_dump())
        db.add(rental)
        db.flush()

        item.rental_status = True
        item.rental_id = rental.id

        db.commit()
        db.refresh(rental)
        return rental


@router.post("/db/rentals/{rental_id}/return", tags=["Rentals"])
async def return_rental(
    rental_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    End item rental
    :param rental_id: Rental ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Success message
    """
    query = db.query(Rentals).join(Inventory).filter(Rentals.id == rental_id)
    query = ctx.team_filter(query, Inventory)
    rental = query.first()
    if not rental:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Rental not found or access denied",
        )

    async with acquire_lock(f"inventory_lock:{rental.item_id}"):
        item = db.query(Inventory).filter(Inventory.id == rental.item_id).first()
        rental.end_date = date.today()
        if item:
            item.rental_status = False
            item.rental_id = None
        db.commit()
    return {"message": "Returned successfully"}


@router.get("/db/rentals/", response_model=List[RentalsResponse], tags=["Rentals"])
def get_rentals(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Get all rentals
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of all rentals
    """
    query = db.query(Rentals).join(Inventory)
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
    query = db.query(Rentals).join(Inventory).filter(Rentals.id == rental_id)
    query = ctx.team_filter(query, Inventory)
    rental = query.first
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
    query = db.query(Rentals).join(Inventory).filter(Rentals.id == rental_id)
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
