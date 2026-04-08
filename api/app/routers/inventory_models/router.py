"""Router for Inventory Models API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.database import get_async_db
from app.schemas import inventory_schemas

from .service import InventoryModelService

router = APIRouter(prefix="/db/inventory_models", tags=["Inventory Models"])


@router.post(
    "",
    response_model=inventory_schemas.InventoryModelResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_inventory_model(
    model_data: inventory_schemas.InventoryModelCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create a new dictionary model for equipment (e.g. 'HDMI Cable 2.0')."""
    return await InventoryModelService(db, ctx).create_model(model_data)


@router.get("", response_model=List[inventory_schemas.InventoryModelResponse])
async def get_inventory_models(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all available equipment models from the inventory."""
    return await InventoryModelService(db, ctx).repo.get_all(db)


@router.get("/{model_id}", response_model=inventory_schemas.InventoryModelResponse)
async def get_inventory_model(
    model_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch a specific dictionary model by ID."""
    return await InventoryModelService(db, ctx).get_model_or_404(model_id)


@router.patch("/{model_id}", response_model=inventory_schemas.InventoryModelResponse)
async def update_inventory_model(
    model_id: int,
    model_data: inventory_schemas.InventoryModelCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update a specific dictionary model."""
    return await InventoryModelService(db, ctx).update_model(model_id, model_data)


@router.delete("/{model_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_inventory_model(
    model_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete a dictionary model (Only if no physical items are linked to it)."""
    await InventoryModelService(db, ctx).delete_model(model_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)