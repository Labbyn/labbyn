from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.utils import redis_service

from .repository import MetadataRepository


class MetadataService:
    """Service for managing machine metadata records."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Metadata Service.

        :param db: Active asynchronous database session.
        :param ctx: Request context containing current user information.
        """
        self.db = db
        self.ctx = ctx
        self.repo = MetadataRepository()

    async def get_metadata_or_404(
        self, meta_id: int, with_machines: bool = False
    ) -> models.Metadata:
        """Fetch specific metadata or raise ObjectNotFoundError.

        :param meta_id: Metadata ID.
        :param with_machines: Whether to load machine relations.
        :return: Metadata model instance.
        :raises ObjectNotFoundError: If record is not found or access denied.
        """
        obj = await self.repo.get_by_id(
            self.db, meta_id, self.ctx, with_machines=with_machines
        )
        if not obj:
            raise exceptions.ObjectNotFoundError("Metadata")
        return obj

    async def create_metadata(self, meta_data):
        """Create and add new metadata record.

        :param meta_data: Pydantic schema for metadata creation.
        :return: Newly created Metadata model instance.
        :raises ValidationError: If database operation fails.
        """
        self.ctx.require_user()
        try:
            obj = models.Metadata(**meta_data.model_dump())
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj)
            return obj
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError("Failed to create metadata record") from e

    async def update_metadata(self, meta_id: int, data):
        """Update existing metadata record with locking.

        :param meta_id: Metadata ID to update.
        :param data: Pydantic schema with update fields.
        :return: Updated Metadata model instance.
        :raises ValidationError: If update operation fails.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"meta_lock:{meta_id}"):
            obj = await self.get_metadata_or_404(meta_id, with_machines=True)
            m_name = obj.machines[0].name if obj.machines else f"ID {meta_id}"

            try:
                for k, v in data.model_dump(exclude_unset=True).items():
                    setattr(obj, k, v)
                await self.db.commit()
                return obj
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Failed to update metadata for machine '{m_name}'"
                ) from e

    async def delete_metadata(self, meta_id: int):
        """Delete metadata record with locking.

        :param meta_id: Metadata ID to delete.
        :raises ValidationError: If deletion fails.
        """
        self.ctx.require_user()
        async with redis_service.acquire_lock(f"meta_lock:{meta_id}"):
            obj = await self.get_metadata_or_404(meta_id, with_machines=True)
            m_name = obj.machines[0].name if obj.machines else f"ID {meta_id}"

            try:
                await self.db.delete(obj)
                await self.db.commit()
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Could not delete metadata for machine '{m_name}'"
                ) from e
