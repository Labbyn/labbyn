"""Router for Inventory Database API CRUD."""

from typing import List

from app.database import get_db
from app.db.models import Inventory
from app.db.schemas import (
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate,
)
from app.utils.redis_service import acquire_lock
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.auth.dependencies import RequestContext

router = APIRouter()


@router.post(
    "/db/inventory/",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Inventory"],
)
def create_item(
    inventory_data: InventoryCreate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Create and add new inventory to database
    :param inventory_data: Inventory data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Inventory item
    """
    data = inventory_data.model_dump()
    if not ctx.is_admin:
        data["team_id"] = ctx.team_id

    obj = Inventory(**inventory_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/db/inventory/", response_model=List[InventoryResponse], tags=["Inventory"]
)
def get_inventory(db: Session = Depends(get_db), ctx: RequestContext = Depends()):
    """
    Fetch all inventory items
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of inventory items
    """
    query = db.query(Inventory)
    query = ctx.team_filter(query, Inventory)
    return query.all()


@router.post(
    "/db/inventory/bulk",
    response_model=List[InventoryResponse],
    status_code=status.HTTP_201_CREATED,
    tags=["Inventory"],
)
def bulk_create_items(
    items_data: List[InventoryCreate],
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Bulk import inventory items
    :param items_data: List of inventory item data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: None
    """
    ctx.require_group_admin()

    new_items = []
    for item_data in items_data:
        data = item_data.model_dump()

        if not ctx.is_admin:
            data["team_id"] = ctx.team_id

        new_items.append(Inventory(**data))

    db.add_all(new_items)
    db.commit()

    for item in new_items:
        db.refresh(item)

    return new_items


@router.get(
    "/db/inventory/{item_id}", response_model=InventoryResponse, tags=["Inventory"]
)
def get_inventory_item(
    item_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch specific inventory item by ID
    :param item_id: Item ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Inventory item
    """
    query = db.query(Inventory).filter(Inventory.id == item_id)
    query = ctx.team_filter(query, Inventory)
    item = query.first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found or access denied",
        )
    return item


@router.put(
    "/db/inventory/{item_id}", response_model=InventoryResponse, tags=["Inventory"]
)
async def update_item(
    item_id: int,
    item_data: InventoryUpdate,
    db: Session = Depends(get_db),
    ctx: RequestContext = Depends(),
):
    """
    Update item in inventory
    :param item_id: Item ID
    :param item_data: Item data schema
    :param db: Active database session
    :return: Updated Inventory item
    """
    async with acquire_lock(f"inventory_lock:{item_id}"):
        query = db.query(Inventory).filter(Inventory.id == item_id)
        query = ctx.team_filter(query, Inventory)
        item = query.first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found or access denied",
            )
        for k, v in item_data.model_dump(exclude_unset=True).items():
            setattr(item, k, v)
        db.commit()
        db.refresh(item)
        return item


@router.delete(
    "/db/inventory/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["Inventory"],
)
async def delete_item(
    item_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Delete item in inventory
    :param item_id: Item ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"inventory_lock:{item_id}"):
        query = db.query(Inventory).filter(Inventory.id == item_id)
        query = ctx.team_filter(query, Inventory)
        item = query.first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found or access denied",
            )
        db.delete(item)
        db.commit()
