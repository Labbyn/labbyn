"""Router for Category Database API CRUD."""

from typing import List

from fastapi import APIRouter, Depends, Response, status
from sqlalchemy import sql
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import dependencies
from app.core import exceptions
from app.database import get_async_db
from app.db import models
from app.schemas import category_schemas
from app.utils import redis_service

router = APIRouter(prefix="/db", tags=["Categories"])


@router.post(
    "/categories",
    response_model=category_schemas.CategoriesResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Categories"],
)
async def create_category(
    category_data: category_schemas.CategoriesCreate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Create new category.

    :param category_data: Category data
    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: Category object.
    """
    ctx.require_admin()

    obj = models.Categories(**category_data.model_dump())

    try:
        db.add(obj)
        await db.flush()
        await db.commit()

        res = await db.execute(
            sql.select(models.Categories).where(models.Categories.id == obj.id)
        )
        return res.scalar_one()

    except IntegrityError:
        await db.rollback()
        raise exceptions.ConflictError(
            message=f"Category with name '{category_data.name}' already exists."
        )
    except Exception as e:
        await db.rollback()
        if isinstance(e, exceptions.ConflictError):
            raise e
        raise exceptions.ValidationError(
            f"Could not create category: '{category_data.name}'"
        ) from e


@router.get("/categories", response_model=List[category_schemas.CategoriesResponse])
async def get_categories(
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch all categories.

    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: List of all categories.
    """
    ctx.require_user()

    result = await db.execute(sql.select(models.Categories))
    return result.scalars().all()


@router.get("/categories/{cat_id}", response_model=category_schemas.CategoriesResponse)
async def get_category_by_id(
    cat_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Fetch specific category by ID.

    :param cat_id: Category ID
    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: Category object.
    """
    ctx.require_user()

    result = await db.execute(
        sql.select(models.Categories).where(models.Categories.id == cat_id)
    )
    cat = result.scalar_one_or_none()

    if not cat:
        raise exceptions.ObjectNotFoundError("Category")
    return cat


@router.patch(
    "/categories/{cat_id}", response_model=category_schemas.CategoriesResponse
)
async def update_category(
    cat_id: int,
    cat_data: category_schemas.CategoriesUpdate,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Update Category.

    :param cat_id: Category ID
    :param cat_data: Category data schema
    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: Updated Category.
    """
    ctx.require_admin()

    async with redis_service.acquire_lock(f"category_lock:{cat_id}"):
        result = await db.execute(
            sql.select(models.Categories).where(models.Categories.id == cat_id)
        )
        cat = result.scalar_one_or_none()

        if not cat:
            raise exceptions.ObjectNotFoundError("Category")

        old_name = cat.name

        try:
            update_data = cat_data.model_dump(exclude_unset=True)
            for k, v in update_data.items():
                setattr(cat, k, v)

            await db.flush()
            await db.commit()

            res = await db.execute(
                sql.select(models.Categories).where(models.Categories.id == cat_id)
            )
            return res.scalar_one()

        except IntegrityError:
            await db.rollback()
            new_name = update_data.get("name") or old_name
            raise exceptions.ConflictError(
                message=f"Update failed. Category name '{new_name}' is already taken."
            )
        except Exception as e:
            await db.rollback()
            if isinstance(e, exceptions.ConflictError):
                raise e
            raise exceptions.ValidationError(
                f"Failed to update category '{old_name}'"
            ) from e


@router.delete(
    "/categories/{cat_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_category(
    cat_id: int,
    db: AsyncSession = Depends(get_async_db),
    ctx: dependencies.RequestContext = Depends(dependencies.RequestContext.create),
):
    """Delete category.

    :param cat_id: Category ID
    :param db: Async database session
    :param ctx: Request context for user and team info
    :return: 204 No Content as success
    """
    ctx.require_admin()

    async with redis_service.acquire_lock(f"category_lock:{cat_id}"):
        result = await db.execute(
            sql.select(models.Categories).where(models.Categories.id == cat_id)
        )
        cat = result.scalar_one_or_none()

        if not cat:
            raise exceptions.ObjectNotFoundError("Category")

        try:
            await db.delete(cat)
            await db.commit()
            return Response(status_code=status.HTTP_204_NO_CONTENT)
        except Exception as e:
            await db.rollback()
            raise exceptions.ValidationError(
                f"Could not delete category '{cat.name}'"
            ) from e
