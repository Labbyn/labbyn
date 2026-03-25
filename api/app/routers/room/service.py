from typing import List, Dict, Any
from sqlalchemy import sql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.utils import redis_service
from .repository import RoomRepository


class RoomService:
    """Service for managing Rooms, dashboard views and detailed room layouts."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Room Service.

        :param db: Active database session.
        :param ctx: User context.
        """
        self.db = db
        self.ctx = ctx
        self.repo = RoomRepository()

    async def get_room_or_404(
        self, room_id: int, detailed: bool = False
    ) -> models.Rooms:
        """Fetch room by ID or raise 404.

        :param room_id: Room ID.
        :param detailed: Load full nested relations.
        :return: Room object.
        :raises ObjectNotFoundError: If room not found or access denied.
        """
        self.ctx.require_user()
        room = await self.repo.get_by_id(self.db, room_id, self.ctx, detailed=detailed)
        if not room:
            raise exceptions.ObjectNotFoundError("Room")
        return room

    async def create_room(self, room_data):
        """Create new room with team validation.

        :param room_data: Creation schema.
        :return: Created room with names.
        :raises ValidationError: If team data is missing.
        :raises ConflictError: On name collision.
        """
        self.ctx.require_group_admin()
        target_team_id = room_data.team_id or (
            self.ctx.team_ids[0] if len(self.ctx.team_ids) == 1 else None
        )

        if not target_team_id:
            raise exceptions.ValidationError(
                "Target team ID is required to create a room"
            )

        await self.ctx.validate_team_access(target_team_id)

        try:
            obj = models.Rooms(
                name=room_data.name,
                room_type=room_data.room_type,
                team_id=target_team_id,
            )
            if room_data.tag_ids:
                tag_res = await self.db.execute(
                    sql.select(models.Tags).where(models.Tags.id.in_(room_data.tag_ids))
                )
                obj.tags = list(tag_res.scalars().all())

            self.db.add(obj)
            await self.db.commit()
            return await self.get_room_or_404(obj.id)
        except IntegrityError:
            await self.db.rollback()
            raise exceptions.ConflictError(
                message=f"Room with name '{room_data.name}' already exists for this team."
            )
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Failed to create room '{room_data.name}'"
            ) from e

    async def get_dashboard_list(self) -> List[Dict[str, Any]]:
        """Fetch simplified room data for dashboard cards.

        :return: List of room stats.
        """
        self.ctx.require_user()
        rooms = await self.repo.get_dashboard_data(self.db, self.ctx)
        return [
            {
                "id": r.id,
                "name": r.name,
                "team_name": r.team.name if r.team else "N/A",
                "rack_count": len(r.racks),
                "map_link": f"/map/room/{r.id}",
            }
            for r in rooms
        ]

    async def get_detailed_room(self, room_id: int) -> Dict[str, Any]:
        """Fetch specific room with nested rack/machine hierarchy.

        :param room_id: Room ID.
        :return: Complex dictionary for detailed view.
        """
        self.ctx.require_user()
        room = await self.get_room_or_404(room_id, detailed=True)

        racks_list = []
        for rack in room.racks:
            machines_in_rack = []
            for shelf in rack.shelves:
                for m in shelf.machines:
                    machines_in_rack.append(
                        {
                            "id": str(m.id),
                            "hostname": m.name,
                            "ip_address": m.ip_address,
                            "mac_address": m.mac_address,
                        }
                    )

            racks_list.append(
                {
                    "id": rack.id,
                    "name": rack.name,
                    "tags": [
                        {
                            "name": getattr(t, "name", "Unnamed"),
                            "color": getattr(t, "color", "red"),
                        }
                        for t in (rack.tags or [])
                    ],
                    "machines": machines_in_rack,
                }
            )

        return {
            "id": room.id,
            "name": room.name,
            "tags": [t.name for t in room.tags],
            "map_link": f"/map/room/{room.id}",
            "racks": racks_list,
        }

    async def update_room(self, room_id: int, room_data):
        """Update room details and tags.

        :param room_id: Room ID to update.
        :param room_data: Update schema.
        :return: Updated room.
        :raises ConflictError: On name collision.
        """
        self.ctx.require_group_admin()
        async with redis_service.acquire_lock(f"room_lock:{room_id}"):
            room = await self.get_room_or_404(room_id)
            update_data = room_data.model_dump(exclude_unset=True)

            try:
                if "tag_ids" in update_data:
                    tag_ids = update_data.pop("tag_ids")
                    if tag_ids is not None:
                        tag_res = await self.db.execute(
                            sql.select(models.Tags).where(models.Tags.id.in_(tag_ids))
                        )
                        room.tags = tag_res.scalars().all()

                if "team_id" in update_data:
                    await self.ctx.validate_team_access(update_data["team_id"])

                for k, v in update_data.items():
                    setattr(room, k, v)

                await self.db.commit()
                await self.db.refresh(room, attribute_names=["team"])
                return room
            except IntegrityError:
                await self.db.rollback()
                raise exceptions.ConflictError(
                    message=f"Conflict: Room name '{room.name}' already taken."
                )
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Failed to update room '{room.name}'"
                ) from e

    async def delete_room(self, room_id: int):
        """Delete room.

        :param room_id: Room ID to delete.
        :raises ValidationError: If deletion fails.
        """
        self.ctx.require_group_admin()
        async with redis_service.acquire_lock(f"room_lock:{room_id}"):
            room = await self.get_room_or_404(room_id)
            try:
                await self.db.delete(room)
                await self.db.commit()
            except Exception:
                await self.db.rollback()
                raise exceptions.ValidationError(f"Could not delete room '{room.name}'")
