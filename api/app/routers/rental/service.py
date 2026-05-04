from datetime import date
from typing import Dict

from sqlalchemy import orm, sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.utils import redis_service

from .repository import RentalRepository


class RentalService:
    """Service for managing item rentals and availability logic."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Rental Service.

        :param db: Active database session.
        :param ctx: User context.
        """
        self.db = db
        self.ctx = ctx
        self.repo = RentalRepository()

    async def get_rental_or_404(self, rental_id: int) -> models.Rentals:
        """Fetch rental by ID or raise 404.

        :param rental_id: Rental ID.
        :return: Rental object.
        :raises ObjectNotFoundError: If rental not found.
        """
        self.ctx.require_user()
        rental = await self.repo.get_by_id(self.db, rental_id, self.ctx)
        if not rental:
            raise exceptions.ObjectNotFoundError("Rental for this item")
        return rental

    async def create_rental(self, rent_data):
        """Create new rental with stock validation and Redis locking.

        :param rent_data: Pydantic schema for rental creation.
        :return: Created Rental object.
        :raises InsufficientAmountError: If requested quantity exceeds stock.
        :raises ValidationError: On database failure.
        """
        self.ctx.require_user()

        async with redis_service.acquire_lock(f"inventory_lock:{rent_data.item_id}"):
            stmt = (
                sql.select(models.Inventory)
                .filter(models.Inventory.id == rent_data.item_id)
                .with_for_update(nowait=True)
            )
            item = (await self.db.execute(stmt)).scalar_one_or_none()
            if not item:
                raise exceptions.ObjectNotFoundError("Item for this rental")

            # Check availability
            active_sum = await self.repo.get_active_rentals_sum(
                self.db, item.id, rent_data.start_date, rent_data.end_date
            )
            in_stock = item.quantity - active_sum

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
                    user_id=self.ctx.current_user.id,
                )
                self.db.add(rental)

                if in_stock - rent_data.quantity == 0:
                    item.rental_status = True

                await self.db.commit()
                await self.db.refresh(rental)
                return rental
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Failed to create rental for '{item.name}'"
                ) from e

    async def return_rental(self, rental_id: int, return_data=None) -> Dict[str, str]:
        """End or partially end an item rental.

        :param rental_id: ID of the rental to return.
        :param return_data: Optional schema for partial return quantity.
        :return: Success message.
        :raises InsufficientAmountError: If return quantity exceeds rented quantity.
        """
        self.ctx.require_user()

        check_stmt = (
            sql.select(models.Rentals)
            .join(models.Inventory, models.Rentals.item_id == models.Inventory.id)
            .filter(models.Rentals.id == rental_id)
            .options(orm.joinedload(models.Rentals.item))
        )
        rental = (
            await self.db.execute(self.ctx.team_filter(check_stmt, models.Inventory))
        ).scalar_one_or_none()

        if not rental:
            raise exceptions.ObjectNotFoundError("Rental for this item")

        item = rental.item
        async with redis_service.acquire_lock(f"inventory_lock:{item.id}"):
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
                    msg = f"Partially returned {qty_to_return}x '{item.name}'. Remaining: {rental.quantity}"

                item.rental_status = False
                await self.db.commit()
                return {"message": msg}
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Return failed for '{item.name}'"
                ) from e

    async def delete_rental(self, rental_id: int):
        """Delete rental history and update item status if needed.

        :param rental_id: ID of the rental to delete.
        :raises ValidationError: On deletion failure.
        """
        self.ctx.require_user()
        rental = await self.get_rental_or_404(rental_id)

        async with redis_service.acquire_lock(f"inventory_lock:{rental.item_id}"):
            try:
                item = (
                    await self.db.execute(
                        sql.select(models.Inventory).filter(
                            models.Inventory.id == rental.item_id
                        )
                    )
                ).scalar_one_or_none()
                item_name = item.name if item else f"ID {rental.item_id}"

                if item and item.rental_id == rental.id:
                    item.rental_status = False
                    item.rental_id = None

                await self.db.delete(rental)
                await self.db.commit()
            except Exception:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Could not delete rental for '{item_name}'"
                )
    async def get_rentals_by_item_id(self, item_id: int):
        """Fetch all rentals for a specific inventory item.

        :param item_id: Inventory Item ID
        :return: List of rentals.
        """
        self.ctx.require_user()
        return await self.repo.get_by_item_id(self.db, item_id, self.ctx)
