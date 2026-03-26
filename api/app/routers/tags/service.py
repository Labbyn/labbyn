from sqlalchemy import sql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.utils import redis_service

from .repository import TagRepository

ENTITY_MAP = {
    "machine": models.Machines,
    "rack": models.Rack,
    "room": models.Rooms,
    "documentation": models.Documentation,
}


class TagService:
    """Service for managing tags and assigning them to various system entities."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Tag Service.

        :param db: Active database session.
        :param ctx: Request context for user and team info.
        """
        self.db = db
        self.ctx = ctx
        self.repo = TagRepository()

    async def get_tag_or_404(self, tag_id: int) -> models.Tags:
        """Fetch a tag or raise 404.

        :param tag_id: ID of the tag.
        :return: Tag object.
        """
        self.ctx.require_user()
        tag = await self.repo.get_by_id(self.db, tag_id)
        if not tag:
            raise exceptions.ObjectNotFoundError("Tag")
        return tag

    async def create_tag(self, tag_data):
        """Create a new tag in the system.

        :param tag_data: Pydantic schema for tag creation.
        :return: Newly created Tag object.
        """
        self.ctx.require_user()
        obj = models.Tags(**tag_data.model_dump())
        try:
            self.db.add(obj)
            await self.db.commit()
            return await self.get_tag_or_404(obj.id)
        except IntegrityError:
            await self.db.rollback()
            raise exceptions.ConflictError(
                message=f"Tag with name '{tag_data.name}' already exists."
            )
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Failed to create tag '{tag_data.name}'"
            ) from e

    async def assign_tags(self, data):
        """Assign multiple tags to a specific entity (Machine, Rack, Room, etc.).

        :param data: Tag assignment schema containing entity info and tag IDs.
        :return: Success message with assigned tag names.
        """
        self.ctx.require_user()
        model = ENTITY_MAP.get(data.entity_type.lower())
        if not model:
            raise exceptions.ValidationError(f"Invalid entity type: {data.entity_type}")

        async with redis_service.acquire_lock(
            f"tag_assign_{data.entity_type}:{data.entity_id}"
        ):
            stmt = sql.select(model).filter(model.id == data.entity_id)
            if data.entity_type.lower() != "documentation":
                stmt = self.ctx.team_filter(stmt, model)

            entity = (await self.db.execute(stmt)).scalar_one_or_none()
            if not entity:
                raise exceptions.ObjectNotFoundError(data.entity_type.capitalize())

            tags_to_add = await self.repo.get_tags_by_ids(self.db, data.tag_ids)
            if not tags_to_add:
                raise exceptions.ObjectNotFoundError("Tag")

            await self.db.refresh(entity, ["tags"])
            entity_name = getattr(entity, "name", f"ID {entity.id}")
            new_tags_names = []
            changed = False

            for tag in tags_to_add:
                if tag not in entity.tags:
                    entity.tags.append(tag)
                    new_tags_names.append(tag.name)
                    changed = True

            if changed:
                await self.db.commit()
                return {
                    "message": f"Assigned tags [{', '.join(new_tags_names)}] to {data.entity_type} '{entity_name}'"
                }

            return {"message": f"Tags already assigned to '{entity_name}'"}

    async def detach_tag(self, data):
        """Remove a tag from a specific entity.

        :param data: Tag assignment schema (uses first tag_id from list).
        :return: Success message.
        :raises ObjectNotFoundError: If tag or entity is not found.
        """
        self.ctx.require_user()
        model = ENTITY_MAP.get(data.entity_type.lower())
        if not model:
            raise exceptions.ValidationError(f"Invalid entity type: {data.entity_type}")

        async with redis_service.acquire_lock(
            f"tag_assign_{data.entity_type}:{data.entity_id}"
        ):
            stmt = sql.select(model).filter(model.id == data.entity_id)
            if data.entity_type.lower() != "documentation":
                stmt = self.ctx.team_filter(stmt, model)

            entity = (await self.db.execute(stmt)).scalar_one_or_none()
            if not entity:
                raise exceptions.ObjectNotFoundError(data.entity_type.capitalize())

            tag = await self.get_tag_or_404(data.tag_ids[0])
            await self.db.refresh(entity, ["tags"])
            entity_name = getattr(entity, "name", f"ID {entity.id}")

            if tag in entity.tags:
                entity.tags.remove(tag)
                await self.db.commit()
                return {
                    "message": f"Tag '{tag.name}' detached from {data.entity_type} '{entity_name}'"
                }

            return {"message": f"Tag '{tag.name}' was not assigned to '{entity_name}'"}

    async def update_tag(self, tag_id: int, tag_data):
        """Update tag attributes (name, color).

        :param tag_id: ID of the tag.
        :param tag_data: Update schema.
        :return: Updated Tag object.
        :raises ConflictError: If new name is already taken.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"tag_lock:{tag_id}"):
            tag = await self.get_tag_or_404(tag_id)
            old_name = tag.name
            try:
                update_data = tag_data.model_dump(exclude_unset=True)
                for k, v in update_data.items():
                    setattr(tag, k, v)
                await self.db.commit()
                return tag
            except IntegrityError:
                await self.db.rollback()
                raise exceptions.ConflictError(
                    message=f"Tag name '{tag.name}' is already taken."
                )
            except Exception:
                await self.db.rollback()
                raise exceptions.ValidationError(f"Failed to update tag '{old_name}'")

    async def delete_tag(self, tag_id: int):
        """Delete a tag from the system.

        :param tag_id: ID of the tag.
        :raises ValidationError: If deletion fails.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"tag_lock:{tag_id}"):
            tag = await self.get_tag_or_404(tag_id)
            tag_name = tag.name
            try:
                await self.db.delete(tag)
                await self.db.commit()
            except Exception:
                await self.db.rollback()
                raise exceptions.ValidationError(f"Could not delete tag '{tag_name}'")
