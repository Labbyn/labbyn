from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from datetime import datetime

from app.auth import dependencies
from app.core import exceptions
from app.db import models
from app.utils import redis_service

from .repository import CategoryRepository


class CategoryService:
    """Service for managing Category business logic."""

    def __init__(self, db: AsyncSession, ctx: dependencies.RequestContext):
        """Init Category Service.

        Args:
            db (AsyncSession): Active database session.
            ctx (RequestContext): Request context for user and team info.
        """
        self.db = db
        self.ctx = ctx
        self.repo = CategoryRepository()

    async def get_category_or_404(self, cat_id: int) -> models.Categories:
        """Internal helper to fetch Disk or raise 404.

        :param cat_id: Unique ID of the disk.
        :return: Disk model instance.
        :raises ObjectNotFoundError: If disk is not found or access is denied.
        """
        self.ctx.require_admin()
        cat = await self.repo.get_by_id(self.db, cat_id)
        if not cat:
            raise exceptions.ObjectNotFoundError("Category")
        return cat

    async def create_category(self, category_data):
        """Create a new category with admin requirement.

        :param category_data: Data for new category.
        :return: Created category object.
        """
        self.ctx.require_admin()
        obj = models.Categories(**category_data.model_dump())

        try:
            self.db.add(obj)
            await self.db.flush()
            await self.db.commit()
            return await self.repo.get_by_id(self.db, obj.id)

        except IntegrityError:
            await self.db.rollback()
            raise exceptions.ConflictError(
                message=f"Category with name '{category_data.name}' already exists."
            )
        except Exception as e:
            await self.db.rollback()
            raise exceptions.ValidationError(
                f"Could not create category: '{category_data.name}'"
            ) from e

    async def get_categories(self):
        """Fetch all categories for authorized users."""
        self.ctx.require_user()
        return await self.repo.get_all(self.db)

    async def update_category(self, cat_id: int, cat_data):
        """Update an existing category with locking mechanism.

        :param cat_id: ID of the category to update.
        :param cat_data: Data to update.
        :return: Updated category object.
        """
        self.ctx.require_admin()

        async with redis_service.acquire_lock(f"category_lock:{cat_id}"):
            cat = await self.repo.get_by_id(self.db, cat_id)
            if not cat:
                raise exceptions.ObjectNotFoundError("Category")

            old_name = cat.name
            update_dict = cat_data.model_dump(exclude_unset=True)

            try:
                for k, v in update_dict.items():
                    setattr(cat, k, v)

                await self.db.flush()
                await self.db.commit()
                return await self.repo.get_by_id(self.db, cat_id)

            except IntegrityError:
                await self.db.rollback()
                new_name = update_dict.get("name") or old_name
                raise exceptions.ConflictError(
                    message=f"Update failed. Category name '{new_name}' is already taken."
                )
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Failed to update category '{old_name}'"
                ) from e

    async def delete_category(self, cat_id: int):
        """Delete a category with locking mechanism.

        :param cat_id: ID of the category to delete.
        """
        self.ctx.require_admin()

        async with redis_service.acquire_lock(f"category_lock:{cat_id}"):
            cat = await self.repo.get_by_id(self.db, cat_id)
            if not cat:
                raise exceptions.ObjectNotFoundError("Category")

            try:
                await self.repo.delete(self.db, cat)
                await self.db.commit()
            except Exception as e:
                await self.db.rollback()
                raise exceptions.ValidationError(
                    f"Could not delete category '{cat.name}'"
                ) from e

    async def get_grouped_categories(self):
        """Fetch categories grouped with their detailed associated inventory items."""
        self.ctx.require_user()
        today = datetime.now().date()

        cat_stmt = select(models.Categories)
        cat_result = await self.db.execute(cat_stmt)
        all_categories = cat_result.scalars().all()

        categories_map = {
            cat.name: {"category_name": cat.name, "quantity": 0, "item_group": []}
            for cat in all_categories
        }

        inv_stmt = select(models.Inventory).options(
            selectinload(models.Inventory.category),
            selectinload(models.Inventory.team),
            selectinload(models.Inventory.room),
            selectinload(models.Inventory.rental_history),
        )

        if not self.ctx.is_admin:
            inv_stmt = inv_stmt.where(models.Inventory.team_id.in_(self.ctx.team_ids))

        inv_result = await self.db.execute(inv_stmt)
        inventory_items = inv_result.scalars().all()

        for item in inventory_items:
            cat_name = item.category.name if item.category else "Uncategorized"

            if cat_name not in categories_map:
                categories_map[cat_name] = {
                    "category_name": cat_name,
                    "quantity": 0,
                    "item_group": [],
                }

            active_rentals = [r for r in item.rental_history if r.end_date >= today]
            is_rented = len(active_rentals) > 0
            current_rental_id = active_rentals[0].id if is_rented else None

            item_detail = {
                "id": item.id,
                "name": item.name,
                "quantity": item.quantity,
                "team_id": item.team_id,
                "team_name": item.team.name if item.team else None,
                "localization_id": item.localization_id,
                "room_name": item.room.name if item.room else None,
                "category_id": item.category_id,
                "category_name": item.category.name if item.category else None,
                "rental_status": is_rented,
                "rental_id": current_rental_id,
            }

            categories_map[cat_name]["quantity"] += item.quantity
            categories_map[cat_name]["item_group"].append(item_detail)

        return list(categories_map.values())
