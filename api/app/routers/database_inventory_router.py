"""Router for Inventory Database API CRUD."""

from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import sql, orm
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import inventory_schemas
from app.utils import redis_service

router = APIRouter(prefix="/db", tags=["Inventory"])


@router.post(
    "/inventory/",
    response_model=inventory_schemas.InventoryResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_item(
    inventory_data: inventory_schemas.InventoryCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create and add new inventory to database.

    :param inventory_data: Inventory data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Inventory item.
    """
    ctx.require_user()

    try:
        data = inventory_data.model_dump()
        await ctx.validate_team_access(data["team_id"])

        obj = models.Inventory(**data)
        db.add(obj)
        await db.commit()
        await db.refresh(obj, attribute_names=["category", "team"])
        return obj
    except Exception as e:
        await db.rollback()
        raise exceptions.ValidationError(
            f"Could not create inventory item '{inventory_data.name}'"
        ) from e


@router.get("/inventory/", response_model=List[inventory_schemas.InventoryResponse])
async def get_inventory(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all inventory items.

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of inventory items.
    """
    ctx.require_user()
    stmt = sql.select(models.Inventory)
    stmt = ctx.team_filter(stmt, models.Inventory)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.get(
    "/inventory/details",
    response_model=List[inventory_schemas.InventoryDetailResponse],
)
async def get_inventory_details(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all inventory items with detailed information.

    Related tables (team, room, machine, category).

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of inventory items.
    """
    ctx.require_user()
    stmt = sql.select(models.Inventory).options(
        orm.joinedload(models.Inventory.team),
        orm.joinedload(models.Inventory.room),
        orm.joinedload(models.Inventory.machine),
        orm.joinedload(models.Inventory.category),
        orm.joinedload(models.Inventory.rental_history),
        orm.joinedload(models.Rentals.user),
        orm.joinedload(models.User.teams),
        orm.joinedload(models.UsersTeams.team),
    )

    stmt = ctx.team_filter(stmt, models.Inventory)
    result = await db.execute(stmt)
    items = result.unique().scalars().all()
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
                "team_id": item.team_id,
                "team_name": item.team.name if item.team else "N/A",
                "room_name": item.room.name if item.room else "N/A",
                "room_id": item.room.id if item.room else 1,
                "machine_info": item.machine.name if item.machine else "None",
                "category_id": item.category_id,
                "category_name": item.category.name if item.category else "N/A",
                "location_link": f"/labs/{item.localization_id}",
                "active_rentals": active_rentals_list,
            }
        )

    return results


@router.post(
    "/inventory/bulk",
    response_model=List[inventory_schemas.InventoryResponse],
    status_code=status.HTTP_201_CREATED,
)
async def bulk_create_items(
    items_data: List[inventory_schemas.InventoryCreate],
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Bulk import inventory items.

    :param items_data: List of inventory item data
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Inventory items
    """
    ctx.require_group_admin()

    new_items = []
    for item_data in items_data:
        data = item_data.model_dump()
        new_items.append(models.Inventory(**data))

    try:
        db.add_all(new_items)
        await db.commit()
    except Exception as e:
        await db.rollback()
        raise exceptions.ValidationError(
            "Bulk import failed: database integrity error or invalid data"
        ) from e

    for item in new_items:
        await db.refresh(item, attribute_names=["category", "team"])

    return new_items


@router.get(
    "/inventory/details/{item_id}",
    response_model=inventory_schemas.InventoryDetailResponse,
)
async def get_inventory_item_details(
    item_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all specific item with detailed information.

    Related tables (team, room, machine, category).

    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: List of inventory items.
    """
    ctx.require_user()
    stmt = (
        sql.select(models.Inventory)
        .filter(models.Inventory.id == item_id)
        .options(
            orm.joinedload(models.Inventory.team),
            orm.joinedload(models.Inventory.room),
            orm.joinedload(models.Inventory.machine),
            orm.joinedload(models.Inventory.category),
            orm.joinedload(models.Inventory.rental_history)
            .joinedload(models.Rentals.user)
            .joinedload(models.User.teams)
            .joinedload(models.UsersTeams.team),
        )
    )

    stmt = ctx.team_filter(stmt, models.Inventory)
    result = await db.execute(stmt)
    item = result.unique().scalar_one_or_none()

    if not item:
        raise exceptions.ObjectNotFoundError("Inventory item")

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
        "team_id": item.team_id,
        "team_name": item.team.name if item.team else "N/A",
        "room_name": item.room.name if item.room else "N/A",
        "room_id": item.room.id if item.room else 1,
        "machine_info": item.machine.name if item.machine else "None",
        "category_id": item.category_id,
        "category_name": item.category.name if item.category else "N/A",
        "location_link": f"/labs/{item.localization_id}",
        "active_rentals": active_rentals_list,
    }


@router.get("/inventory/{item_id}", response_model=inventory_schemas.InventoryResponse)
async def get_inventory_item(
    item_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific inventory item by ID.

    :param item_id: Item ID
    :param db: Active database session
    :param ctx: Request context for user and team info
    :return: Inventory item.
    """
    ctx.require_user()
    stmt = sql.select(models.Inventory).filter(models.Inventory.id == item_id)
    stmt = ctx.team_filter(stmt, models.Inventory)
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()

    if not item:
        raise exceptions.ObjectNotFoundError("Inventory item")
    return item


@router.patch(
    "/inventory/{item_id}", response_model=inventory_schemas.InventoryResponse
)
async def update_item(
    item_id: int,
    item_data: inventory_schemas.InventoryUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update item in inventory.

    :param item_id: Item ID
    :param item_data: Item data schema
    :param db: Active database session
    :return: Updated Inventory item.
    """
    ctx.require_user()
    async with redis_service.acquire_lock(f"inventory_lock:{item_id}"):
        stmt = sql.select(models.Inventory).filter(models.Inventory.id == item_id)
        stmt = ctx.team_filter(stmt, models.Inventory)
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()

        if not item:
            raise exceptions.ObjectNotFoundError("Inventory item")

        data = item_data.model_dump(exclude_unset=True)
        if "team_id" in data and not ctx.is_admin:
            if data["team_id"] not in ctx.team_ids:
                raise exceptions.AccessDeniedError("Cannot move item to this team")

        try:
            for k, v in data.items():
                setattr(item, k, v)
            await db.commit()
            await db.refresh(item, attribute_names=["category", "team"])
            return item
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Failed to update item '{item.name}'"
            ) from e


@router.delete(
    "/inventory/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_item(
    item_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete item in inventory.

    :param item_id: Item ID
    :param db: Active database session
    :return: 204 No Content as success
    """
    ctx.require_user()
    async with redis_service.acquire_lock(f"inventory_lock:{item_id}"):
        stmt = sql.select(models.Inventory).filter(models.Inventory.id == item_id)
        stmt = ctx.team_filter(stmt, models.Inventory)
        result = await db.execute(stmt)
        item = result.scalar_one_or_none()

        if not item:
            raise exceptions.ObjectNotFoundError("Inventory item")

        try:
            await db.delete(item)
            await db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Could not delete item '{item.name}'"
            ) from e
