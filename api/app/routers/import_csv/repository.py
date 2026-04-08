from typing import Optional
from sqlalchemy import sql
from sqlalchemy.ext.asyncio import AsyncSession
from app.db import models


class ImportRepository:
    """Repository for handling database lookups during CSV import operations.

    Provides specialized methods to resolve human-readable names (from CSV)
    into database entities, ensuring proper team-based isolation.
    """

    @staticmethod
    async def get_team_by_name(db: AsyncSession, name: str) -> Optional[models.Teams]:
        """Fetch a team by its unique name.

        :param db: Active asynchronous database session.
        :param name: The name of the team to search for.
        :return: The Teams model instance or None if not found.
        """
        stmt = sql.select(models.Teams).where(models.Teams.name == name)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_room_by_name(
        db: AsyncSession, name: str, team_id: int
    ) -> Optional[models.Rooms]:
        """Fetch a room by name within a specific team's context.

        :param db: Active asynchronous database session.
        :param name: The name of the room.
        :param team_id: The ID of the team the room must belong to.
        :return: The Rooms model instance or None if not found.
        """
        stmt = sql.select(models.Rooms).where(
            models.Rooms.name == name, models.Rooms.team_id == team_id
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_category_by_name(
        db: AsyncSession, name: str
    ) -> Optional[models.Categories]:
        """Fetch an inventory category by its name.

        :param db: Active asynchronous database session.
        :param name: The name of the category (e.g., 'Cables', 'Peripherals').
        :return: The Categories model instance or None if not found.
        """
        stmt = sql.select(models.Categories).where(models.Categories.name == name)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_machine_by_name(
        db: AsyncSession, name: str, team_id: int
    ) -> Optional[models.Machines]:
        """Fetch a machine by name within a specific team's context.

        Used to link inventory items to existing machines during import.

        :param db: Active asynchronous database session.
        :param name: The name/hostname of the machine.
        :param team_id: The ID of the team the machine must belong to.
        :return: The Machines model instance or None if not found.
        """
        stmt = sql.select(models.Machines).where(
            models.Machines.name == name, models.Machines.team_id == team_id
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    async def get_shelf_by_name(
        db: AsyncSession, shelf_name: str, rack_name: str, room_id: int
    ) -> Optional[models.Shelf]:
        """Fetch a shelf by its name, filtered by rack name and room context.

        Ensures that the correct shelf is found even if multiple racks
        in the same room have shelves with identical names (e.g., 'U1').

        :param db: Active asynchronous database session.
        :param shelf_name: The human-readable name of the shelf.
        :param rack_name: The name of the rack containing the shelf.
        :param room_id: The ID of the room where the rack is located.
        :return: The Shelf model instance or None if not found.
        """
        stmt = (
            sql.select(models.Shelf)
            .join(models.Rack)
            .where(
                models.Shelf.name == shelf_name,
                models.Rack.name == rack_name,
                models.Rack.room_id == room_id,
            )
        )
        res = await db.execute(stmt)
        return res.scalar_one_or_none()
