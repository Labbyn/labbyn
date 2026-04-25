"""Router for Inventory Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status

from app.auth import dependencies
from app.schemas import inventory_schemas

from .service import InventoryService

router = APIRouter(prefix="/db/inventory", tags=["Inventory"])


@router.post(
    "",
    response_model=inventory_schemas.InventoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_item(
    inventory_data: inventory_schemas.InventoryCreate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create and add new inventory to database.

    :param inventory_data: Inventory data
    :param ctx: Request context for user and team info
    :return: Inventory item.
    """
    return await InventoryService(ctx.db, ctx).create_item(inventory_data)


@router.get("", response_model=List[inventory_schemas.InventoryResponse])
async def get_inventory(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all inventory items.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of inventory items.
    """
    return await InventoryService(ctx.db, ctx).repo.get_all(ctx.db, ctx)


@router.get("/details", response_model=List[inventory_schemas.InventoryDetailResponse])
async def get_inventory_details(
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all inventory items with detailed information.

    Related tables (team, room, machine, category).

    :param ctx: Request context for user and team info
    :return: List of inventory items.
    """
    return await InventoryService(ctx.db, ctx).get_all_details()


@router.post(
    "/bulk",
    response_model=List[inventory_schemas.InventoryResponse],
    status_code=status.HTTP_201_CREATED,
)
async def bulk_create_items(
    items_data: List[inventory_schemas.InventoryCreate],
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Bulk import inventory items.

    :param items_data: List of inventory item data
    :param ctx: Request context for user and team info
    :return: Inventory items
    """
    return await InventoryService(ctx.db, ctx).bulk_create_items(items_data)


@router.get(
    "/details/{item_id}", response_model=inventory_schemas.InventoryDetailResponse
)
async def get_inventory_item_details(
    item_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all specific item with detailed information.
    Related tables (team, room, machine, category).

    :param item_id: Item ID
    :param ctx: Request context for user and team info
    :return: Inventory item with details.
    """
    return await InventoryService(ctx.db, ctx).get_item_details(item_id)


@router.get("/{item_id}", response_model=inventory_schemas.InventoryResponse)
async def get_inventory_item(
    item_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific inventory item by ID.

    :param item_id: Item ID
    :param ctx: Request context for user and team info
    :return: Inventory item.
    """
    return await InventoryService(ctx.db, ctx).get_inventory_or_404(item_id)


@router.patch("/{item_id}", response_model=inventory_schemas.InventoryResponse)
async def update_item(
    item_id: int,
    item_data: inventory_schemas.InventoryUpdate,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update item in inventory.

    :param item_id: Item ID
    :param item_data: Item data schema
    :return: Updated Inventory item.
    """
    return await InventoryService(ctx.db, ctx).update_item(item_id, item_data)


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_item(
    item_id: int,
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete item in inventory.

    :param item_id: Item ID
    :param db: Active database session
    :return: 204 No Content as success
    """
    await InventoryService(ctx.db, ctx).delete_item(item_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
