from typing import List, Optional, Dict, Any
from sqlalchemy import sql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth import dependencies
from app.core import exceptions
from app.db import models
from .repository import RackRepository


class RackService:
    """Service for managing Racks, shelf ordering, and virtual room transitions."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Rack Service.

        :param db: Active database session.
        :param ctx: User context.
        """
        self.db = db
        self.ctx = ctx
        self.repo = RackRepository()

    def format_rack_output(self, rack: models.Rack) -> Dict[str, Any]:
        """Format rack output to display machine list ordered.

        :param rack: Rack object.
        :return: Formatted rack dict.
        """
        sorted_shelves = sorted(rack.shelves, key=lambda s: s.order or 0)
        ordered_machines = []

        for shelf in sorted_shelves:
            ordered_machines.append(shelf.machines)

        team_name = rack.team.name if rack.team else "N/A"
        rack_link = f"/racks/{rack.id}"

        return {
            "id": rack.id,
            "name": rack.name,
            "team_id": rack.team_id,
            "layout_id": rack.layout_id,
            "team_name": team_name,
            "room_id": rack.room_id,
            "tags": rack.tags or [],
            "machines": ordered_machines,
            "link": rack_link,
        }

    async def get_rack_or_404(
        self, rack_id: int, detailed: bool = False
    ) -> models.Rack:
        """Fetch rack or raise 404.

        :param rack_id: ID of the rack.
        :param detailed: Load relations.
        :return: Rack object.
        :raises ObjectNotFoundError: If rack not found.
        """
        self.ctx.require_user()
        rack = await self.repo.get_by_id(self.db, rack_id, self.ctx, detailed=detailed)
        if not rack:
            raise exceptions.ObjectNotFoundError("Rack")
        return rack

    async def get_all_racks(
        self, room_ids: Optional[List[int]] = None, team_ids: Optional[List[int]] = None
    ):
        """Returns ALL racks with their nested structures.

        :param room_ids: Filter by room.
        :param team_ids: Filter by team.
        :return: List of racks with names populated.
        """
        self.ctx.require_user()
        racks = await self.repo.get_all(self.db, self.ctx, room_ids, team_ids)
        for r in racks:
            r.room_name = r.room.name if r.room else "N/A"
            r.team_name = r.team.name if r.team else "N/A"
        return racks

    async def create_rack(self, rack_data):
        """Create a new rack with validation.

        :param rack_data: Creation schema.
        :return: Created rack.
        :raises ValidationError: If team or room issues occur.
        :raises ConflictError: On name collision.
        """
        self.ctx.require_user()
        target_team_id = rack_data.team_id or (
            self.ctx.team_ids[0] if len(self.ctx.team_ids) == 1 else None
        )
        if not target_team_id:
            raise exceptions.ValidationError("Target team ID is required")

        await self.ctx.validate_team_access(target_team_id)

        room = (
            await self.db.execute(
                sql.select(models.Rooms).where(models.Rooms.id == rack_data.room_id)
            )
        ).scalar_one_or_none()
        if not room:
            raise exceptions.ObjectNotFoundError("Room")

        if room.team_id != target_team_id and not self.ctx.is_admin:
            raise exceptions.AccessDeniedError(
                f"Room '{room.name}' belongs to another team"
            )

        try:
            db_rack = models.Rack(
                name=rack_data.name,
                room_id=rack_data.room_id,
                layout_id=rack_data.layout_id,
                team_id=target_team_id,
            )
            if rack_data.tag_ids:
                tag_res = await self.db.execute(
                    sql.select(models.Tags).where(models.Tags.id.in_(rack_data.tag_ids))
                )
                db_rack.tags = list(tag_res.scalars().all())

            self.db.add(db_rack)
            await self.db.commit()

            # Reload to get names
            return await self.get_rack_or_404(db_rack.id, detailed=True)
        except IntegrityError:
            await self.db.rollback()
            raise exceptions.ConflictError(
                message=f"Rack with name '{rack_data.name}' already exists."
            )
        except Exception as e:
            await self.db.rollback()
            raise e

    async def update_rack(self, rack_id: int, rack_data):
        """Update an existing rack.

        :param rack_id: ID to update.
        :param rack_data: Update schema.
        :return: Updated rack.
        :raises ValidationError: On update failure.
        """
        self.ctx.require_user()
        db_rack = await self.get_rack_or_404(rack_id)
        update_dict = rack_data.model_dump(exclude_unset=True)
        update_dict.pop("machines", None)  # TO DO: Handle ordering of machines

        try:
            if "tag_ids" in update_dict:
                tag_ids = update_dict.pop("tag_ids")
                if tag_ids is not None:
                    tag_res = await self.db.execute(
                        sql.select(models.Tags).where(models.Tags.id.in_(tag_ids))
                    )
                    db_rack.tags = tag_res.scalars().all()

            if "team_id" in update_dict:
                await self.ctx.validate_team_access(update_dict["team_id"])

            if "room_id" in update_dict:
                room = (
                    await self.db.execute(
                        sql.select(models.Rooms).where(
                            models.Rooms.id == update_dict["room_id"]
                        )
                    )
                ).scalar_one_or_none()
                if not room:
                    raise exceptions.ObjectNotFoundError("New room")
                if not self.ctx.is_admin and room.team_id not in self.ctx.team_ids:
                    raise exceptions.AccessDeniedError(
                        f"Room '{room.name}' is owned by another team"
                    )

            for key, value in update_dict.items():
                setattr(db_rack, key, value)

            await self.db.commit()
            return await self.get_rack_or_404(rack_id, detailed=True)
        except Exception as e:
            await self.db.rollback()
            if isinstance(
                e, (exceptions.ObjectNotFoundError, exceptions.AccessDeniedError)
            ):
                raise e
            raise exceptions.ValidationError(
                f"Failed to update rack '{db_rack.name}'"
            ) from e

    async def delete_rack(self, rack_id: int):
        """Delete rack and move machines to virtual room.

        :param rack_id: ID to delete.
        :raises ValidationError: If virtual room is missing or deletion fails.
        """
        self.ctx.require_user()
        db_rack = await self.get_rack_or_404(rack_id, detailed=True)
        try:
            virtual_room = (
                await self.db.execute(
                    sql.select(models.Rooms).where(
                        models.Rooms.team_id == db_rack.team_id,
                        models.Rooms.room_type == "virtual",
                    )
                )
            ).scalar_one_or_none()

            if not virtual_room:
                team_name = db_rack.team.name if db_rack.team else "N/A"
                raise exceptions.ValidationError(
                    f"Virtual lab not found for team '{team_name}'"
                )

            shelf_ids = [shelf.id for shelf in db_rack.shelves]
            if shelf_ids:
                m_res = await self.db.execute(
                    sql.select(models.Machines).where(
                        models.Machines.shelf_id.in_(shelf_ids)
                    )
                )
                for machine in m_res.scalars().all():
                    machine.shelf_id = None
                    machine.localization_id = virtual_room.id

            await self.db.delete(db_rack)
            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            if isinstance(e, exceptions.ValidationError):
                raise e
            raise exceptions.ValidationError(
                f"Could not delete rack '{db_rack.name}'"
            ) from e
