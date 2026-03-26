from typing import Optional

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.db import models


class MapRepository:
    """Repository for handling Map-related database operations."""

    @staticmethod
    async def get_map_by_room_id(
        db: AsyncSession, room_id: int
    ) -> Optional[models.Map]:
        """Fetch a room map with all its components joined.

        :param db: Active database session
        :param room_id: ID of the room
        :return: Map object or None
        """
        stmt = (
            select(models.Map)
            .options(
                joinedload(models.Map.nodes),
                joinedload(models.Map.segments),
                joinedload(models.Map.equipment).joinedload(models.Equipment.rack),
                joinedload(models.Map.labels),
                joinedload(models.Map.room),
            )
            .filter(models.Map.room_id == room_id)
        )
        result = await db.execute(stmt)
        return result.unique().scalar_one_or_none()

    @staticmethod
    async def clear_map_components(db: AsyncSession, map_id: int):
        """Delete all existing components of a specific map.

        :param db: Active database session
        :param map_id: ID of the map to clear
        """
        await db.execute(
            delete(models.WallSegments).where(models.WallSegments.map_id == map_id)
        )
        await db.execute(
            delete(models.WallNodes).where(models.WallNodes.map_id == map_id)
        )
        await db.execute(
            delete(models.Equipment).where(models.Equipment.map_id == map_id)
        )
        await db.execute(
            delete(models.MapLabels).where(models.MapLabels.map_id == map_id)
        )

    @staticmethod
    async def get_room_with_team(
        db: AsyncSession, room_id: int
    ) -> Optional[models.Rooms]:
        """Fetch room to check ownership and existence.

        :param db: Active database session
        :param room_id: ID of the room
        :return: Room object or None
        """
        stmt = select(models.Rooms).filter(models.Rooms.id == room_id)
        result = await db.execute(stmt)
        return result.scalar_one_or_none()
