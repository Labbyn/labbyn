from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.db import models

from .repository import InventoryModelRepository


class InventoryModelService:
    """Service for managing the Inventory Model"""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        self.db = db
        self.ctx = ctx
        self.repo = InventoryModelRepository()

    async def get_model_or_404(self, model_id: int) -> models.InventoryModel:
        """Fetch specific inventory model or raise 404."""
        self.ctx.require_user()
        item_model = await self.repo.get_by_id(self.db, model_id)
        if not item_model:
            raise exceptions.ObjectNotFoundError("Inventory Model")
        return item_model

    async def create_model(self, model_data) -> models.InventoryModel:
        """Create new dictionary entry for equipment."""
        self.ctx.require_user()
        
        try:
            obj = models.InventoryModel(**model_data.model_dump())
            self.db.add(obj)
            await self.db.commit()
            await self.db.refresh(obj, attribute_names=["category"])
            return obj
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Could not create inventory model '{model_data.name}'"
            ) from e

    async def update_model(self, model_id: int, model_data) -> models.InventoryModel:
        """Update dictionary entry."""
        self.ctx.require_user()
        item_model = await self.get_model_or_404(model_id)
        
        data = model_data.model_dump(exclude_unset=True)
        try:
            for k, v in data.items():
                setattr(item_model, k, v)
            await self.db.commit()
            await self.db.refresh(item_model, attribute_names=["category"])
            return item_model
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Failed to update model '{item_model.name}'"
            ) from e

    async def delete_model(self, model_id: int):
        """Delete dictionary entry. Will fail if physical items exist for this model."""
        self.ctx.require_user()
        item_model = await self.get_model_or_404(model_id)
        try:
            await self.db.delete(item_model)
            await self.db.commit()
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Could not delete inventory model. Make sure no physical inventory items are attached to it."
            ) from e