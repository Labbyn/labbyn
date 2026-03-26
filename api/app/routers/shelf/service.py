from sqlalchemy import sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.utils import redis_service

from .repository import ShelfRepository


class ShelfService:
    """Service for managing Shelves and validating rack-level permissions."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Shelf Service.

        :param db: Active database session.
        :param ctx: Request context for user and team info.
        """
        self.db = db
        self.ctx = ctx
        self.repo = ShelfRepository()

    async def _verify_rack_access(self, rack_id: int) -> models.Rack:
        """Internal helper to verify if user has access to the rack containing the shelf.

        :param rack_id: ID of the rack to check.
        :return: Rack object if found and accessible.
        :raises ObjectNotFoundError: If rack doesn't exist or user lacks team access.
        """
        stmt = sql.select(models.Rack).filter(models.Rack.id == rack_id)
        stmt = self.ctx.team_filter(stmt, models.Rack)
        rack = (await self.db.execute(stmt)).scalar_one_or_none()

        if not rack:
            raise exceptions.ObjectNotFoundError("Rack")
        return rack

    async def get_shelf_or_404(self, shelf_id: int) -> models.Shelf:
        """Fetch shelf or raise 404.

        :param shelf_id: ID of the shelf to fetch.
        :return: Shelf object with nested machines.
        """
        shelf = await self.repo.get_by_id(self.db, shelf_id)
        if not shelf:
            raise exceptions.ObjectNotFoundError("Shelf")

        await self._verify_rack_access(shelf.rack_id)
        return shelf

    async def list_by_rack(self, rack_id: int):
        """List all shelves for a validated rack, ordered by position.

        :param rack_id: ID of the parent rack.
        :return: List of Shelf objects.
        """
        self.ctx.require_user()
        await self._verify_rack_access(rack_id)
        return await self.repo.get_by_rack(self.db, rack_id)

    async def create_shelf(self, rack_id: int, shelf_data):
        """Create a new shelf in a specific rack.

        :param rack_id: ID of the parent rack.
        :param shelf_data: Pydantic schema with new shelf data.
        :return: Created Shelf object with rack name populated.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"rack_lock:{rack_id}"):
            rack = await self._verify_rack_access(rack_id)
            try:
                db_shelf = models.Shelf(**shelf_data.model_dump(), rack_id=rack_id)
                self.db.add(db_shelf)
                await self.db.commit()
                await self.db.refresh(db_shelf, attribute_names=["rack", "machines"])
                db_shelf.rack_name = rack.name
                return db_shelf
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Failed to create shelf '{shelf_data.name}' in rack '{rack.name}'"
                ) from e

    async def update_shelf(self, shelf_id: int, shelf_data):
        """Update shelf details (name, order).

        :param shelf_id: ID of the shelf to update.
        :param shelf_data: Pydantic schema with fields to update.
        :return: Updated Shelf object.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"shelf_lock:{shelf_id}"):
            db_shelf = await self.get_shelf_or_404(shelf_id)
            try:
                update_dict = shelf_data.model_dump(exclude_unset=True)
                for key, value in update_dict.items():
                    setattr(db_shelf, key, value)
                await self.db.commit()
                await self.db.refresh(db_shelf, attribute_names=["rack", "machines"])
                return db_shelf
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Failed to update shelf '{db_shelf.name}'"
                ) from e

    async def delete_shelf(self, shelf_id: int):
        """Delete a shelf only if it contains no machines.

        :param shelf_id: ID of the shelf to remove.
        :raises ObjectNotFoundError: If shelf doesn't exist.
        :raises ValidationError: If shelf is not empty or deletion is blocked.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"shelf_lock:{shelf_id}"):
            db_shelf = await self.get_shelf_or_404(shelf_id)

            if db_shelf.machines:
                count = len(db_shelf.machines)
                raise exceptions.ValidationError(
                    f"Shelf '{db_shelf.name}' is not empty (contains {count} machines). "
                    "Move or delete machines first."
                )
            try:
                shelf_name = db_shelf.name
                await self.db.delete(db_shelf)
                await self.db.commit()
            except Exception:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Could not delete shelf '{shelf_name}'"
                )
