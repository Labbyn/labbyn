from sqlalchemy import sql
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.schemas import map_schemas
from app.utils import redis_service

from .repository import MapRepository


class MapService:
    """Service for managing room maps and their synchronization."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Initialize MapService.

        :param db: Active database session
        :param ctx: Request context
        """
        self.db = db
        self.ctx = ctx

    async def get_room_map(self, room_id: int) -> models.Map:
        """Get room map or raise 404.

        :param room_id: ID of the room
        :return: Map model
        """
        self.ctx.require_user()
        db_map = await MapRepository.get_map_by_room_id(self.db, room_id)
        if not db_map:
            raise exceptions.ObjectNotFoundError(f"Map for Room ID {room_id}")
        return db_map

    async def sync_map(
        self, room_id: int, payload: map_schemas.MapUpdate
    ) -> models.Map:
        """Synchronize room map state with locking and validation.

        :param room_id: ID of the room
        :param payload: Data to sync
        :return: Updated Map model
        """
        self.ctx.require_user()

        async with redis_service.acquire_lock(f"map_lock:{room_id}"):
            room = await MapRepository.get_room_with_team(self.db, room_id)
            if not room:
                raise exceptions.ObjectNotFoundError(f"Room {room_id}")

            await self.ctx.validate_team_access(room.team_id)

            stmt = sql.select(models.Map).filter(models.Map.room_id == room_id)
            db_map = (await self.db.execute(stmt)).scalar_one_or_none()

            if not db_map:
                db_map = models.Map(room_id=room_id)
                self.db.add(db_map)
                await self.db.flush()

            try:
                await MapRepository.clear_map_components(self.db, db_map.id)

                node_lookup = {}
                for n in payload.wall_nodes:
                    node = models.WallNodes(name=n.name, x=n.x, y=n.y, map_id=db_map.id)
                    self.db.add(node)
                    node_lookup[n.name] = node

                await self.db.flush()

                # 3. Add Segments
                for s in payload.wall_segments:
                    n1, n2 = node_lookup.get(s.node1_name), node_lookup.get(
                        s.node2_name
                    )
                    if n1 and n2:
                        self.db.add(
                            models.WallSegments(
                                map_id=db_map.id,
                                name=s.name,
                                node1_id=n1.id,
                                node2_id=n2.id,
                                node1_name=s.node1_name,
                                node2_name=s.node2_name,
                            )
                        )

                for eq in payload.equipment:
                    self.db.add(
                        models.Equipment(
                            name=eq.name,
                            eq_type=eq.eq_type,
                            x=eq.x,
                            y=eq.y,
                            rotation=eq.rotation,
                            label=eq.label,
                            map_id=db_map.id,
                            rack_id=eq.rack_id,
                        )
                    )

                for lb in payload.labels:
                    self.db.add(
                        models.MapLabels(
                            map_id=db_map.id,
                            name=lb.name,
                            x=lb.x,
                            y=lb.y,
                            color=lb.color,
                        )
                    )

                await self.db.commit()
                return await MapRepository.get_map_by_room_id(self.db, room_id)

            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    "Failed to synchronize map components"
                ) from e
