"""Router for Inventory Database API CRUD."""

from datetime import datetime
from typing import List

from app.database import get_db
from app.db.models import Inventory, Rentals, User, UsersTeams
from app.db.schemas import (
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate,
    InventoryDetailResponse,
)
from app.utils.redis_service import acquire_lock
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from app.auth.dependencies import RequestContext
from app.utils.database_service import resolve_target_team_id

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
    data["team_id"] = resolve_target_team_id(ctx, data.get("team_id"))

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
    ctx.require_user()
    query = db.query(Inventory)
    query = ctx.team_filter(query, Inventory)
    return query.all()


@router.get(
    "/db/inventory/details",
    response_model=List[InventoryDetailResponse],
    tags=["Inventory"],
)
def get_inventory_details(
    db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch all inventory items with detailed information from related tables (team, room, machine, category).
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of inventory items
    """
    ctx.require_user()
    query = db.query(Inventory).options(
        joinedload(Inventory.team),
        joinedload(Inventory.room),
        joinedload(Inventory.machine),
        joinedload(Inventory.category),
        joinedload(Inventory.rental_history)
        .joinedload(Rentals.user)
        .joinedload(User.teams)
        .joinedload(UsersTeams.team),
    )

    query = ctx.team_filter(query, Inventory)
    items = query.all()
    today = datetime.now().date()

    results = []
    for item in items:
        active_rentals_list = [
            {
                "id": r.id,
                "borrower_name": f"{r.user.name} {r.user.surname}",
                "borrower_team": (
                    ", ".join([ut.team.name for ut in r.user.teams])
                    if r.user.teams
                    else "N/A"
                ),
                "quantity": r.quantity,
                "end_date": r.end_date,
            }
            for r in item.rental_history
            if r.end_date >= today
        ]

        total_rented = sum(r["quantity"] for r in active_rentals_list)

        results.append(
            {
                "id": item.id,
                "name": item.name,
                "total_quantity": item.quantity,
                "in_stock_quantity": item.quantity - total_rented,
                "team_name": item.team.name if item.team else "N/A",
                "room_name": item.room.name if item.room else "N/A",
                "machine_info": item.machine.name if item.machine else "None",
                "category_name": item.category.name if item.category else "N/A",
                "location_link": f"room/{item.localization_id}",
                "active_rentals": active_rentals_list,
            }
        )

    return results


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
        data["team_id"] = resolve_target_team_id(ctx, data.get("team_id"))
        new_items.append(Inventory(**data))

    db.add_all(new_items)
    db.commit()

    for item in new_items:
        db.refresh(item)

    return new_items


@router.get(
    "/db/inventory/details/{item_id}",
    response_model=InventoryDetailResponse,
    tags=["Inventory"],
)
def get_inventory_item_details(
    item_id: int, db: Session = Depends(get_db), ctx: RequestContext = Depends()
):
    """
    Fetch all specific item with detailed information from related tables (team, room, machine, category).
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of inventory items
    """
    ctx.require_user()
    query = (
        db.query(Inventory)
        .filter(Inventory.id == item_id)
        .options(
            joinedload(Inventory.team),
            joinedload(Inventory.room),
            joinedload(Inventory.machine),
            joinedload(Inventory.category),
            joinedload(Inventory.rental_history)
            .joinedload(Rentals.user)
            .joinedload(User.teams)
            .joinedload(UsersTeams.team),
        )
    )

    query = ctx.team_filter(query, Inventory)
    item = query.first()

    if not item:
        raise HTTPException(status_code=404, detail="Item not found or access denied")

    today = datetime.now().date()

    active_rentals_list = [
        {
            "id": r.id,
            "borrower_name": f"{r.user.name} {r.user.surname}",
            "borrower_team": (
                ", ".join([ut.team.name for ut in r.user.teams])
                if r.user.teams
                else "N/A"
            ),
            "quantity": r.quantity,
            "end_date": r.end_date,
        }
        for r in item.rental_history
        if r.end_date >= today
    ]

    total_rented = sum(r["quantity"] for r in active_rentals_list)

    return {
        "id": item.id,
        "name": item.name,
        "total_quantity": item.quantity,
        "in_stock_quantity": item.quantity - total_rented,
        "team_name": item.team.name if item.team else "N/A",
        "room_name": item.room.name if item.room else "N/A",
        "machine_info": item.machine.name if item.machine else "None",
        "category_name": item.category.name if item.category else "N/A",
        "location_link": f"room/{item.localization_id}",
        "active_rentals": active_rentals_list,
    }


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
    ctx.require_user()
    query = db.query(Inventory).filter(Inventory.id == item_id)
    query = ctx.team_filter(query, Inventory)
    item = query.first()
    if not item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Item not found or access denied",
        )
    return item


@router.patch(
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
    ctx.require_user()
    async with acquire_lock(f"inventory_lock:{item_id}"):
        query = db.query(Inventory).filter(Inventory.id == item_id)
        query = ctx.team_filter(query, Inventory)
        item = query.first()
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Item not found or access denied",
            )
        data = item_data.model_dump(exclude_unset=True)
        if "team_id" in data and not ctx.is_admin:
            if data["team_id"] not in ctx.team_ids:
                raise HTTPException(
                    status_code=403, detail="Access to specified team is denied"
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
    ctx.require_user()
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
