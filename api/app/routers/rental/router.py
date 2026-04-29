from typing import List, Optional

from fastapi import APIRouter, Depends, Response, status

from app.auth import dependencies
from app.schemas import inventory_schemas

from .service import RentalService

router = APIRouter(prefix="/db/rentals", tags=["Inventory-Rentals"])


@router.post(
    "",
    response_model=inventory_schemas.RentalsResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_rental(
    rent_data: inventory_schemas.RentalsCreate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new item rent.

    :param rent_data: Rent data
    :param ctx: Request context for user and team info
    :return: New Rental object.
    """
    return await RentalService(ctx.db, ctx).create_rental(rent_data)


@router.post("/{rental_id}/return")
async def return_rental(
    rental_id: int,
    return_data: Optional[inventory_schemas.RentalReturn] = None,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """End item rental.

    :param rental_id: Rental ID
    :param return_data: Rental return data
    :param ctx: Request context for user and team info
    :return: Success message.
    """
    return await RentalService(ctx.db, ctx).return_rental(rental_id, return_data)


@router.get("", response_model=List[inventory_schemas.RentalsResponse])
async def get_rentals(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get all rentals.

    :param ctx: Request context for user and team info
    :return: List of all rentals.
    """
    return await RentalService(ctx.db, ctx).repo.get_all(ctx.db, ctx)


@router.get("/{rental_id}", response_model=inventory_schemas.RentalsResponse)
async def get_rental_by_id(
    rental_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Get specific rental by ID.

    :param rental_id: Rental ID
    :param ctx: Request context for user and team info
    :return: Rental object.
    """
    return await RentalService(ctx.db, ctx).get_rental_or_404(rental_id)


@router.delete("/{rental_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_rental(
    rental_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete rental history.

    :param rental_id: Rental ID
    :param ctx: Request context for user and team info
    :return: Success or error message.
    """
    await RentalService(ctx.db, ctx).delete_rental(rental_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
