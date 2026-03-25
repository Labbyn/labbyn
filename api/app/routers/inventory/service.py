from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.utils import redis_service
from .repository import InventoryRepository


class InventoryService:
    """Service for managing Inventory articles and their tag associations."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Inventory Service.

        :param db: Active asynchronous database session.
        :param ctx: Request context containing current user information.
        """
        self.db = db
        self.ctx = ctx
        self.repo = InventoryRepository()

    async def get_inventory_or_404(
        self, item_id: int, detailed: bool = False
    ) -> models.Inventory:
        """Fetch specific inventory item or raise 404.

        :param item_id: Item ID
        :param detailed: Load relations
        :return: Inventory item.
        :raises ObjectNotFoundError: If not found.
        """
        self.ctx.require_user()
        item = await self.repo.get_by_id(self.db, item_id, self.ctx, detailed=detailed)
        if not item:
            raise exceptions.ObjectNotFoundError("Inventory item")
        return item

    async def create_item(self, inventory_data):
        """Create and add new inventory to database.

        :param inventory_data: Inventory data
        :return: Inventory item.
        """
        self.ctx.require_user()
        try:
            data = inventory_data.model_dump()
            await self.ctx.validate_team_access(data["team_id"])

            obj = models.Inventory(**data)
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj, attribute_names=["category", "team"])
            return obj
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Could not create inventory item '{inventory_data.name}'"
            ) from e

    async def get_all_details(self):
        """Fetch all inventory items with detailed information."""
        self.ctx.require_user()
        items = await self.repo.get_detailed_list(self.db, self.ctx)
        today = datetime.now().date()

        results = []
        for item in items:
            active_rentals_list = [
                {
                    "id": r.id,
                    "borrower_name": f"{r.user.name} {r.user.surname}",
                    "borrower_team": (
                        ", ".join([ut.team.name for ut in r.user.teams])
                        if r.user.teams
                        else "N/A"
                    ),
                    "quantity": r.quantity,
                    "end_date": r.end_date,
                }
                for r in item.rental_history
                if r.end_date >= today
            ]

            total_rented = sum(r["quantity"] for r in active_rentals_list)

            results.append(
                {
                    "id": item.id,
                    "name": item.name,
                    "total_quantity": item.quantity,
                    "in_stock_quantity": item.quantity - total_rented,
                    "team_id": item.team_id,
                    "team_name": item.team.name if item.team else "N/A",
                    "room_name": item.room.name if item.room else "N/A",
                    "room_id": item.room.id if item.room else 1,
                    "machine_info": item.machine.name if item.machine else "None",
                    "category_id": item.category_id,
                    "category_name": item.category.name if item.category else "N/A",
                    "location_link": f"/labs/{item.localization_id}",
                    "active_rentals": active_rentals_list,
                }
            )
        return results

    async def bulk_create_items(self, items_data):
        """Bulk import inventory items.

        :param items_data: Inventory data
        :return: Inventory items
        """
        self.ctx.require_group_admin()
        new_items = []
        for item_data in items_data:
            data = item_data.model_dump()
            new_items.append(models.Inventory(**data))

        try:
            self.db.add_all(new_items)
            await self.db.commit()
            for item in new_items:
                await self.db.refresh(item, attribute_names=["category", "team"])
            return new_items
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                "Bulk import failed: database integrity error or invalid data"
            ) from e

    async def get_item_details(self, item_id: int):
        """Fetch all specific item with detailed information.

        :param item_id: Item ID
        :return: Item details
        """
        self.ctx.require_user()
        item = await self.get_item_or_404(item_id, detailed=True)
        today = datetime.now().date()

        active_rentals_list = [
            {
                "id": r.id,
                "borrower_name": f"{r.user.name} {r.user.surname}",
                "borrower_team": (
                    ", ".join([ut.team.name for ut in r.user.teams])
                    if r.user.teams
                    else "N/A"
                ),
                "quantity": r.quantity,
                "end_date": r.end_date,
            }
            for r in item.rental_history
            if r.end_date >= today
        ]

        total_rented = sum(r["quantity"] for r in active_rentals_list)

        return {
            "id": item.id,
            "name": item.name,
            "total_quantity": item.quantity,
            "in_stock_quantity": item.quantity - total_rented,
            "team_id": item.team_id,
            "team_name": item.team.name if item.team else "N/A",
            "room_name": item.room.name if item.room else "N/A",
            "room_id": item.room.id if item.room else 1,
            "machine_info": item.machine.name if item.machine else "None",
            "category_id": item.category_id,
            "category_name": item.category.name if item.category else "N/A",
            "location_link": f"/labs/{item.localization_id}",
            "active_rentals": active_rentals_list,
        }

    async def update_item(self, item_id: int, item_data):
        """Update item in inventory.

        :param item_id: Item ID
        :param item_data: Item data
        :return: Item data
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"inventory_lock:{item_id}"):
            item = await self.get_item_or_404(item_id)
            data = item_data.model_dump(exclude_unset=True)

            if "team_id" in data and not self.ctx.is_admin:
                if data["team_id"] not in self.ctx.team_ids:
                    raise exceptions.AccessDeniedError("Cannot move item to this team")

            try:
                for k, v in data.items():
                    setattr(item, k, v)
                await self.db.commit()
                await self.db.refresh(item, attribute_names=["category", "team"])
                return item
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Failed to update item '{item.name}'"
                ) from e

    async def delete_item(self, item_id: int):
        """Delete item in inventory.

        :param item_id: Item ID
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"inventory_lock:{item_id}"):
            item = await self.get_item_or_404(item_id)
            try:
                await self.db.delete(item)
                await self.db.commit()
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Could not delete item '{item.name}'"
                ) from e
