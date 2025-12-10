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

router = APIRouter()


@router.post(
    "/db/inventory/",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Inventory"],
)
def create_item(inventory_data: InventoryCreate, db: Session = Depends(get_db)):
    """
    Create and add new inventory to database
    :param inventory_data: Inventory data
    :param db: Active database session
    :return: Inventory item
    """
    obj = Inventory(**inventory_data.model_dump())
    db.add(obj)
    db.commit()
    db.refresh(obj)
    return obj


@router.get(
    "/db/inventory/", response_model=List[InventoryResponse], tags=["Inventory"]
)
def get_inventory(db: Session = Depends(get_db)):
    """
    Fetch all inventory items
    :param db: Active database session
    :return: List of inventory items
    """
    return db.query(Inventory).all()


@router.get(
    "/db/inventory/{item_id}", response_model=InventoryResponse, tags=["Inventory"]
)
def get_inventory_item(item_id: int, db: Session = Depends(get_db)):
    """
    Fetch specific inventory item by ID
    :param item_id: Item ID
    :param db: Active database session
    :return: Inventory item
    """
    item = db.query(Inventory).filter(Inventory.id == item_id).first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
        )
    return item


@router.put(
    "/db/inventory/{item_id}", response_model=InventoryResponse, tags=["Inventory"]
)
async def update_item(
    item_id: int, item_data: InventoryUpdate, db: Session = Depends(get_db)
):
    """
    Update item in inventory
    :param item_id: Item ID
    :param item_data: Item data schema
    :param db: Active database session
    :return: Updated Inventory item
    """
    async with acquire_lock(f"inventory_lock:{item_id}"):
        item = db.query(Inventory).filter(Inventory.id == item_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
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
async def delete_item(item_id: int, db: Session = Depends(get_db)):
    """
    Delete item in inventory
    :param item_id: Item ID
    :param db: Active database session
    :return: None
    """
    async with acquire_lock(f"inventory_lock:{item_id}"):
        item = db.query(Inventory).filter(Inventory.id == item_id).first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Item not found"
            )
        db.delete(item)
        db.commit()
